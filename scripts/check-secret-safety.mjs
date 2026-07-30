import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const allowedEnvironmentTemplate = ".env.example";
const clientExposedKeyName = ["VITE", "GEOAPIFY", "API", "KEY"].join("_");
const serverKeyName = ["GEOAPIFY", "API", "KEY"].join("_");
const textExtensions = new Set([
  "",
  ".css",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

export function findSecretSafetyIssues(entries) {
  const findings = entries
    .filter(({ path }) => (
      /(^|\/)\.env(?:\.|$)/.test(path) && path !== allowedEnvironmentTemplate
    ))
    .map(({ path }) => (
      `${path}: environment files with runtime values must not be committed`
    ));
  const credentialAssignment = new RegExp(
    `["']?(?:${serverKeyName}|apiKey)["']?\\s*(?:=|:)\\s*["']?([A-Za-z0-9_-]{24,})`,
    "g",
  );

  for (const { path, content } of entries) {
    if (content.includes(clientExposedKeyName)) {
      findings.push(`${path}: client-exposed Geoapify environment variable is forbidden`);
    }
    credentialAssignment.lastIndex = 0;
    if (credentialAssignment.test(content)) {
      findings.push(`${path}: credential-like Geoapify value must be moved to a runtime secret`);
    }
  }
  return findings;
}

async function readRepositoryEntries() {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const sourceFiles = [...new Set(output.split("\0").filter(Boolean))]
    .map((file) => file.replaceAll("\\", "/"));
  const entries = [];

  for (const path of sourceFiles) {
    if (!textExtensions.has(extname(path).toLowerCase())) continue;
    try {
      entries.push({ path, content: await readFile(path, "utf8") });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return entries;
}

export async function checkRepositorySecretSafety() {
  const entries = await readRepositoryEntries();
  return {
    findings: findSecretSafetyIssues(entries),
    inspectedFiles: entries.length,
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  const { findings, inspectedFiles } = await checkRepositorySecretSafety();
  if (findings.length > 0) {
    console.error("Secret safety check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  } else {
    console.log(`Secret safety check passed (${inspectedFiles} source files inspected)`);
  }
}
