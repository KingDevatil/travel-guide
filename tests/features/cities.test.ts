import { describe, expect, it } from "vitest";
import { searchCityCatalog, timezoneForCity } from "../../src/data/cities";

describe("city catalog search", () => {
  it("matches Chinese and English destination names with coordinates", () => {
    expect(searchCityCatalog("京都")[0]).toMatchObject({ name: "京都", country: "日本" });
    expect(searchCityCatalog("osaka")[0]).toMatchObject({ name: "大阪", country: "日本" });
    expect(searchCityCatalog("大阪")[0]).toMatchObject({ latitude: 34.6937, longitude: 135.5023 });
  });

  it("returns no suggestions for blank or unknown input", () => {
    expect(searchCityCatalog(" ")).toEqual([]);
    expect(searchCityCatalog("不存在的城市")).toEqual([]);
  });

  it("maps destinations to their local IANA timezones", () => {
    expect(timezoneForCity("东京")).toBe("Asia/Tokyo");
    expect(timezoneForCity("曼谷")).toBe("Asia/Bangkok");
    expect(timezoneForCity("巴黎")).toBe("Europe/Paris");
    expect(timezoneForCity("纽约")).toBe("America/New_York");
  });
});
