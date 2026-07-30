/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

const geoapifyParameterNames = [
  "text",
  "type",
  "lang",
  "filter",
  "bias",
  "format",
  "limit",
] as const;
const geoapifyAllowedTypes = new Set(["city", "amenity"]);
const geoapifyMaxTextLength = 120;
const geoapifyMaxLimit = 6;
const geoapifyUpstreamTimeoutMs = 5000;

function sanitizeGeoapifyParameters(requestUrl: URL) {
  const text = (requestUrl.searchParams.get("text") ?? "").trim().replace(/\s+/g, " ");
  if (!text || text.length > geoapifyMaxTextLength) {
    return { error: "INVALID_SEARCH_TEXT" };
  }

  const requestedType = requestUrl.searchParams.get("type");
  if (requestedType && !geoapifyAllowedTypes.has(requestedType)) {
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
    const match = requestedBias.match(/^proximity:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    const longitude = Number(match?.[1]);
    const latitude = Number(match?.[2]);
    if (!match || !Number.isFinite(longitude) || !Number.isFinite(latitude)
      || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return { error: "INVALID_LOCATION_BIAS" };
    }
  }

  const requestedLimit = Number.parseInt(requestUrl.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), geoapifyMaxLimit)
    : geoapifyMaxLimit;
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

function sendJson(
  response: import("node:http").ServerResponse,
  status: number,
  payload: unknown,
) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function geoapifyLocalProxy(apiKey: string): Plugin {
  return {
    name: "travel-geoapify-local-proxy",
    configureServer(server) {
      server.middlewares.use("/api/geoapify/geocode", async (request, response) => {
        if (request.method !== "GET") {
          sendJson(response, 405, { code: "METHOD_NOT_ALLOWED" });
          return;
        }
        if (!apiKey) {
          sendJson(response, 503, { code: "GEOAPIFY_NOT_CONFIGURED" });
          return;
        }

        const requestUrl = new URL(request.url ?? "/", "http://localhost");
        const sanitized = sanitizeGeoapifyParameters(requestUrl);
        if (!sanitized.params) {
          sendJson(response, 400, { code: sanitized.error });
          return;
        }
        const target = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
        for (const [name, value] of sanitized.params) {
          if (geoapifyParameterNames.includes(name as typeof geoapifyParameterNames[number])) {
            target.searchParams.set(name, value);
          }
        }
        target.searchParams.set("apiKey", apiKey);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), geoapifyUpstreamTimeoutMs);
        try {
          const upstream = await fetch(target, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          response.statusCode = upstream.status;
          response.setHeader(
            "Content-Type",
            upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
          );
          response.setHeader("Cache-Control", "no-store");
          response.end(await upstream.text());
        } catch (error) {
          sendJson(response, error instanceof Error && error.name === "AbortError" ? 504 : 502, {
            code: error instanceof Error && error.name === "AbortError"
              ? "GEOAPIFY_UPSTREAM_TIMEOUT"
              : "GEOAPIFY_UPSTREAM_ERROR",
          });
        } finally {
          clearTimeout(timeout);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), geoapifyLocalProxy(env.GEOAPIFY_API_KEY ?? "")],
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test-setup.ts",
    },
  };
});
