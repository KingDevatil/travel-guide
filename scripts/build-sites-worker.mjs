import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const distDirectory = resolve("dist");
const serverDirectory = join(distDirectory, "server");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "server" || entry.name === ".openai" || entry.name.endsWith(".tar.gz")) {
      continue;
    }

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath));
    } else {
      files.push(absolutePath);
    }
  }

  return files;
}

const files = (await collectFiles(distDirectory)).sort();
const assets = {};

for (const file of files) {
  const pathname = `/${relative(distDirectory, file).split(sep).join("/")}`;
  assets[pathname] = {
    body: (await readFile(file)).toString("base64"),
    extension: extname(file).toLowerCase(),
  };
}

if (!assets["/index.html"]) {
  throw new Error("Sites worker build requires dist/index.html");
}

const workerSource = `
const ASSETS = ${JSON.stringify(assets)};
const GEOAPIFY_PARAMETER_NAMES = new Set([
  "text",
  "type",
  "lang",
  "filter",
  "bias",
  "format",
  "limit",
]);
const GEOAPIFY_ALLOWED_TYPES = new Set(["city", "amenity"]);
const GEOAPIFY_MAX_TEXT_LENGTH = 120;
const GEOAPIFY_MAX_LIMIT = 6;
const GEOAPIFY_CACHE_TTL_MS = 5 * 60 * 1000;
const GEOAPIFY_CACHE_MAX_ENTRIES = 500;
const GEOAPIFY_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const GEOAPIFY_RATE_LIMIT_MAX_REQUESTS = 30;
const GEOAPIFY_RATE_LIMIT_MAX_CLIENTS = 5000;
const GEOAPIFY_UPSTREAM_TIMEOUT_MS = 5000;
const GEOAPIFY_CACHE = new Map();
const GEOAPIFY_RATE_LIMITS = new Map();
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function decodeBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function serveAsset(pathname, method) {
  const asset = ASSETS[pathname];
  if (!asset) return undefined;

  const body = decodeBase64(asset.body);
  const headers = new Headers({
    "Content-Length": String(body.byteLength),
    "Content-Type": CONTENT_TYPES[asset.extension] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  headers.set("Cache-Control", pathname.startsWith("/assets/")
    ? "public, max-age=31536000, immutable"
    : "no-cache");
  return new Response(method === "HEAD" ? null : body, { status: 200, headers });
}

function jsonResponse(status, payload, additionalHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...additionalHeaders,
    },
  });
}

function sanitizeGeoapifyParameters(requestUrl) {
  const text = (requestUrl.searchParams.get("text") || "").trim().replace(/\\s+/g, " ");
  if (!text || text.length > GEOAPIFY_MAX_TEXT_LENGTH) {
    return { error: "INVALID_SEARCH_TEXT" };
  }

  const requestedType = requestUrl.searchParams.get("type");
  if (requestedType && !GEOAPIFY_ALLOWED_TYPES.has(requestedType)) {
    return { error: "INVALID_SEARCH_TYPE" };
  }

  const requestedLanguage = requestUrl.searchParams.get("lang") || "zh";
  if (!/^[a-z]{2}$/i.test(requestedLanguage)) {
    return { error: "INVALID_SEARCH_LANGUAGE" };
  }

  const requestedFilter = requestUrl.searchParams.get("filter");
  if (requestedFilter && !/^countrycode:[a-z]{2}$/i.test(requestedFilter)) {
    return { error: "INVALID_COUNTRY_FILTER" };
  }

  const requestedBias = requestUrl.searchParams.get("bias");
  if (requestedBias) {
    const match = requestedBias.match(/^proximity:(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)$/);
    const longitude = Number(match?.[1]);
    const latitude = Number(match?.[2]);
    if (!match || !Number.isFinite(longitude) || !Number.isFinite(latitude)
      || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return { error: "INVALID_LOCATION_BIAS" };
    }
  }

  const requestedLimit = Number.parseInt(requestUrl.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), GEOAPIFY_MAX_LIMIT)
    : GEOAPIFY_MAX_LIMIT;
  const params = new URLSearchParams({
    text,
    format: "json",
    lang: requestedLanguage.toLowerCase(),
    limit: String(limit),
  });
  if (requestedType) params.set("type", requestedType);
  if (requestedFilter) params.set("filter", requestedFilter.toLowerCase());
  if (requestedBias) params.set("bias", requestedBias);
  return { params };
}

function clientIdentifier(request) {
  return request.headers.get("CF-Connecting-IP")
    || request.headers.get("X-Real-IP")
    || request.headers.get("X-Forwarded-For")?.split(",")[0].trim();
}

function checkGeoapifyRateLimit(request, now) {
  const client = clientIdentifier(request);
  if (!client) return undefined;

  let entry = GEOAPIFY_RATE_LIMITS.get(client);
  if (!entry || now - entry.windowStartedAt >= GEOAPIFY_RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStartedAt: now };
    GEOAPIFY_RATE_LIMITS.set(client, entry);
  }
  if (entry.count >= GEOAPIFY_RATE_LIMIT_MAX_REQUESTS) {
    return Math.max(1, Math.ceil(
      (GEOAPIFY_RATE_LIMIT_WINDOW_MS - (now - entry.windowStartedAt)) / 1000,
    ));
  }
  entry.count += 1;

  if (GEOAPIFY_RATE_LIMITS.size > GEOAPIFY_RATE_LIMIT_MAX_CLIENTS) {
    for (const [key, value] of GEOAPIFY_RATE_LIMITS) {
      if (now - value.windowStartedAt >= GEOAPIFY_RATE_LIMIT_WINDOW_MS) {
        GEOAPIFY_RATE_LIMITS.delete(key);
      }
    }
    while (GEOAPIFY_RATE_LIMITS.size > GEOAPIFY_RATE_LIMIT_MAX_CLIENTS) {
      GEOAPIFY_RATE_LIMITS.delete(GEOAPIFY_RATE_LIMITS.keys().next().value);
    }
  }
  return undefined;
}

function cacheGeoapifyResponse(key, body, status, contentType, now) {
  GEOAPIFY_CACHE.set(key, {
    body,
    status,
    contentType,
    expiresAt: now + GEOAPIFY_CACHE_TTL_MS,
  });
  while (GEOAPIFY_CACHE.size > GEOAPIFY_CACHE_MAX_ENTRIES) {
    GEOAPIFY_CACHE.delete(GEOAPIFY_CACHE.keys().next().value);
  }
}

function geoapifyResponse(body, status, contentType, cacheStatus) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "X-Geoapify-Cache": cacheStatus,
    },
  });
}

async function proxyGeoapify(request, apiKey) {
  if (request.method !== "GET") {
    return jsonResponse(405, { code: "METHOD_NOT_ALLOWED" });
  }
  if (!apiKey) {
    return jsonResponse(503, { code: "GEOAPIFY_NOT_CONFIGURED" });
  }
  if (request.headers.get("Sec-Fetch-Site") === "cross-site") {
    return jsonResponse(403, { code: "CROSS_SITE_REQUEST_BLOCKED" });
  }

  const requestUrl = new URL(request.url);
  const sanitized = sanitizeGeoapifyParameters(requestUrl);
  if (!sanitized.params) {
    return jsonResponse(400, { code: sanitized.error });
  }

  const now = Date.now();
  const retryAfter = checkGeoapifyRateLimit(request, now);
  if (retryAfter !== undefined) {
    return jsonResponse(429, { code: "RATE_LIMITED" }, {
      "Retry-After": String(retryAfter),
    });
  }

  const cacheKey = sanitized.params.toString();
  const cached = GEOAPIFY_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return geoapifyResponse(cached.body, cached.status, cached.contentType, "HIT");
  }
  if (cached) GEOAPIFY_CACHE.delete(cacheKey);

  const target = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  for (const [name, value] of sanitized.params) {
    if (GEOAPIFY_PARAMETER_NAMES.has(name)) target.searchParams.set(name, value);
  }
  target.searchParams.set("apiKey", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOAPIFY_UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(target, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    if (upstream.ok) {
      cacheGeoapifyResponse(cacheKey, body, upstream.status, contentType, now);
    }
    return geoapifyResponse(body, upstream.status, contentType, "MISS");
  } catch (error) {
    return jsonResponse(error?.name === "AbortError" ? 504 : 502, {
      code: error?.name === "AbortError" ? "GEOAPIFY_UPSTREAM_TIMEOUT" : "GEOAPIFY_UPSTREAM_ERROR",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/geoapify/geocode") {
      return proxyGeoapify(request, env?.GEOAPIFY_API_KEY);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const directResponse = serveAsset(url.pathname, request.method);
    if (directResponse) return directResponse;

    const lastSegment = url.pathname.split("/").pop() || "";
    const isApplicationRoute = url.pathname === "/" || !lastSegment.includes(".");
    if (isApplicationRoute || request.headers.get("accept")?.includes("text/html")) {
      return serveAsset("/index.html", request.method);
    }

    return new Response("Not Found", { status: 404 });
  },
};
`;

await mkdir(serverDirectory, { recursive: true });
await writeFile(join(serverDirectory, "index.js"), workerSource.trimStart());
