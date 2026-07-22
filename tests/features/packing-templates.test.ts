import { describe, expect, it } from "vitest";
import { defaultPackingTemplates, loadPackingTemplates, savePackingTemplates, type PackingTemplate } from "../../src/features/packing/templates";

function memoryStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => { value = next; },
    value: () => value,
  };
}

describe("packing templates", () => {
  it("loads defaults when no customized templates exist", () => {
    expect(loadPackingTemplates(memoryStorage())).toEqual(defaultPackingTemplates);
  });

  it("persists edited template names and items", () => {
    const storage = memoryStorage();
    const customized: PackingTemplate[] = [{ id: "japan", name: "日本自由行", items: ["护照", "交通卡"] }];
    savePackingTemplates(customized, storage);
    expect(loadPackingTemplates(storage)).toEqual(customized);
  });

  it("recovers from malformed stored data", () => {
    expect(loadPackingTemplates(memoryStorage("not-json"))).toEqual(defaultPackingTemplates);
  });
});
