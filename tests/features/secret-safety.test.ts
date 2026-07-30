import { describe, expect, it } from "vitest";
import { findSecretSafetyIssues } from "../../scripts/check-secret-safety.mjs";

const serverKeyName = ["GEOAPIFY", "API", "KEY"].join("_");
const clientKeyName = ["VITE", "GEOAPIFY", "API", "KEY"].join("_");
const credentialLikeValue = "a".repeat(32);

describe("repository secret safety", () => {
  it("allows the empty public environment template", () => {
    expect(findSecretSafetyIssues([{
      path: ".env.example",
      content: `${serverKeyName}=\n`,
    }])).toEqual([]);
  });

  it.each([".env", ".env.production", "config/.env.local"])(
    "rejects committed runtime environment file %s",
    (path) => {
      expect(findSecretSafetyIssues([{ path, content: "" }])).toEqual([
        expect.stringContaining("must not be committed"),
      ]);
    },
  );

  it("rejects client-exposed key names", () => {
    expect(findSecretSafetyIssues([{
      path: "src/config.ts",
      content: `const key = import.meta.env.${clientKeyName};`,
    }])).toEqual([expect.stringContaining("client-exposed")]);
  });

  it("rejects credential-like key assignments", () => {
    expect(findSecretSafetyIssues([{
      path: "README.md",
      content: `${serverKeyName}=${credentialLikeValue}`,
    }])).toEqual([expect.stringContaining("runtime secret")]);
  });

  it("rejects credential-like values in JSON configuration", () => {
    expect(findSecretSafetyIssues([{
      path: "config.json",
      content: JSON.stringify({ apiKey: credentialLikeValue }),
    }])).toEqual([expect.stringContaining("runtime secret")]);
  });
});
