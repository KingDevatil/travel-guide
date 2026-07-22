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

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const directResponse = serveAsset(url.pathname, request.method);
    if (directResponse) return directResponse;

    if (request.headers.get("accept")?.includes("text/html")) {
      return serveAsset("/index.html", request.method);
    }

    return new Response("Not Found", { status: 404 });
  },
};
`;

await mkdir(serverDirectory, { recursive: true });
await writeFile(join(serverDirectory, "index.js"), workerSource.trimStart());
