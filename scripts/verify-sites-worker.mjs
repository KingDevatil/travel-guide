import { readFile } from "node:fs/promises";
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

const generatedWorker = await readFile("dist/server/index.js", "utf8");
if (!generatedWorker.includes("/index.html")) {
  throw new Error("Generated Sites worker is missing the application shell");
}

console.log("Sites worker verification passed");
