import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const workerUrl = `${pathToFileURL("dist/server/index.js").href}?build=${Date.now()}`;
const { default: worker } = await import(workerUrl);

async function expectResponse(pathname, expectedStatus, accept = "*/*") {
  const response = await worker.fetch(new Request(`https://travel-guide.example${pathname}`, {
    headers: { accept },
  }));

  if (response.status !== expectedStatus) {
    throw new Error(`${pathname} returned ${response.status}; expected ${expectedStatus}`);
  }

  return response;
}

const indexResponse = await expectResponse("/", 200);
const indexHtml = await indexResponse.text();
if (!indexHtml.includes('id="root"')) {
  throw new Error("The Sites worker root response is not the Vite application shell");
}

const scriptPath = indexHtml.match(/src="([^"?]+\.js)"/)?.[1];
if (!scriptPath) {
  throw new Error("Unable to locate the built application script");
}

const scriptResponse = await expectResponse(scriptPath, 200);
if (!scriptResponse.headers.get("content-type")?.includes("text/javascript")) {
  throw new Error("Built application script has an invalid content type");
}

await expectResponse("/trips/example", 200, "text/html");
await expectResponse("/missing.png", 404);

const unconfiguredGeoapifyResponse = await worker.fetch(
  new Request("https://travel-guide.example/api/geoapify/geocode?text=airport"),
  {},
);
if (unconfiguredGeoapifyResponse.status !== 503) {
  throw new Error(`Unconfigured Geoapify proxy returned ${unconfiguredGeoapifyResponse.status}; expected 503`);
}
const unconfiguredGeoapifyPayload = await unconfiguredGeoapifyResponse.json();
if (unconfiguredGeoapifyPayload.code !== "GEOAPIFY_NOT_CONFIGURED") {
  throw new Error("Unconfigured Geoapify proxy did not return the fallback signal");
}

const runtimeKey = ["runtime", "test"].join("-");
const originalFetch = globalThis.fetch;
const upstreamRequests = [];
globalThis.fetch = async (input) => {
  const url = new URL(input);
  upstreamRequests.push(url);
  return new Response(JSON.stringify({
    results: [{
      place_id: "worker-test-result",
      name: url.searchParams.get("text"),
      formatted: "Worker test result",
      lat: 31.23,
      lon: 121.47,
    }],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

try {
  const missingTextResponse = await worker.fetch(
    new Request("https://travel-guide.example/api/geoapify/geocode"),
    { GEOAPIFY_API_KEY: runtimeKey },
  );
  if (missingTextResponse.status !== 400) {
    throw new Error(`Geoapify proxy accepted missing text with status ${missingTextResponse.status}`);
  }

  const oversizedTextResponse = await worker.fetch(
    new Request(`https://travel-guide.example/api/geoapify/geocode?text=${"a".repeat(121)}`),
    { GEOAPIFY_API_KEY: runtimeKey },
  );
  if (oversizedTextResponse.status !== 400) {
    throw new Error(`Geoapify proxy accepted oversized text with status ${oversizedTextResponse.status}`);
  }

  const firstCachedResponse = await worker.fetch(
    new Request("https://travel-guide.example/api/geoapify/geocode?text=Shanghai%20%20Airport&limit=99", {
      headers: { "CF-Connecting-IP": "203.0.113.10" },
    }),
    { GEOAPIFY_API_KEY: runtimeKey },
  );
  const secondCachedResponse = await worker.fetch(
    new Request("https://travel-guide.example/api/geoapify/geocode?text=Shanghai+Airport&limit=6", {
      headers: { "CF-Connecting-IP": "203.0.113.10" },
    }),
    { GEOAPIFY_API_KEY: runtimeKey },
  );
  if (firstCachedResponse.status !== 200 || secondCachedResponse.status !== 200) {
    throw new Error("Geoapify proxy did not return successful configured responses");
  }
  if (firstCachedResponse.headers.get("X-Geoapify-Cache") !== "MISS"
    || secondCachedResponse.headers.get("X-Geoapify-Cache") !== "HIT") {
    throw new Error("Geoapify proxy did not reuse a normalized cached response");
  }
  if (upstreamRequests.length !== 1) {
    throw new Error(`Geoapify cache made ${upstreamRequests.length} upstream requests; expected 1`);
  }
  if (upstreamRequests[0].searchParams.get("text") !== "Shanghai Airport"
    || upstreamRequests[0].searchParams.get("limit") !== "6"
    || upstreamRequests[0].searchParams.get("apiKey") !== runtimeKey) {
    throw new Error("Geoapify proxy did not sanitize parameters or apply the runtime key");
  }
  if ((await secondCachedResponse.text()).includes(runtimeKey)) {
    throw new Error("Geoapify proxy exposed the runtime key in its response");
  }

  let rateLimitedResponse;
  for (let index = 0; index <= 30; index += 1) {
    rateLimitedResponse = await worker.fetch(
      new Request(`https://travel-guide.example/api/geoapify/geocode?text=rate-${index}`, {
        headers: { "CF-Connecting-IP": "203.0.113.11" },
      }),
      { GEOAPIFY_API_KEY: runtimeKey },
    );
  }
  if (rateLimitedResponse.status !== 429 || rateLimitedResponse.headers.get("Retry-After") === null) {
    throw new Error("Geoapify proxy did not rate-limit excessive client requests");
  }
} finally {
  globalThis.fetch = originalFetch;
}

const generatedWorker = await readFile("dist/server/index.js", "utf8");
if (!generatedWorker.includes("/index.html")) {
  throw new Error("Generated Sites worker is missing the application shell");
}

async function collectClientAssetFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectClientAssetFiles(path));
    } else if (/\.(?:css|html|js|json)$/i.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

const clientKeyName = ["GEOAPIFY", "API", "KEY"].join("_");
const credentialInUrl = /apiKey=[A-Za-z0-9_-]{24,}/;
const clientFiles = ["dist/index.html", ...await collectClientAssetFiles("dist/assets")];
for (const file of clientFiles) {
  const content = await readFile(file, "utf8");
  if (content.includes(clientKeyName) || credentialInUrl.test(content)) {
    throw new Error(`Client build contains Geoapify credential material: ${file}`);
  }
}

console.log("Sites worker verification passed");
