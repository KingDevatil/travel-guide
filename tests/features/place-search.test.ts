import { describe, expect, it, vi } from "vitest";
import { buildPlaceSearchParams, searchCities, searchKnownPlaces, searchPlaces } from "../../src/services/place-search";

describe("place search", () => {
  it("matches precise Shanghai landmarks and airports", () => {
    expect(searchKnownPlaces({ query: "上海外滩", city: "上海", country: "中国" })[0]).toMatchObject({ name: "外滩", latitude: 31.24 });
    expect(searchKnownPlaces({ query: "PVG", city: "上海", country: "中国" })[0]).toMatchObject({ name: "上海浦东国际机场" });
  });

  it.each(["素万那普机场", "苏万那普机场", "Suvarnabhumi Airport", "BKK"])("matches Bangkok Suvarnabhumi Airport by %s", (query) => {
    expect(searchKnownPlaces({ query, city: "曼谷", country: "泰国" })[0]).toMatchObject({
      name: "素万那普国际机场",
      latitude: 13.69,
      longitude: 100.7501,
    });
  });

  it("uses the selected city as a geographic bias instead of a required address term", () => {
    const params = buildPlaceSearchParams({ query: "素万那普国际机场", city: "曼谷", country: "泰国" });
    expect(params.get("q")).toBe("素万那普国际机场");
    expect(params.get("q")).not.toContain("曼谷");
    expect(params.get("countrycodes")).toBe("th");
    expect(params.get("viewbox")).toBe("99.0018,15.2563,102.0018,12.2563");
    expect(params.get("bounded")).toBe("0");
  });

  it.each([
    ["香港", "中国", "hk"],
    ["澳门", "中国", "mo"],
    ["台北", "中国", "tw"],
  ])("uses the correct search territory for %s", (city, country, countryCode) => {
    expect(buildPlaceSearchParams({ query: "机场", city, country }).get("countrycodes")).toBe(countryCode);
  });

  it("uses an explicit remote search for arbitrary hotels and addresses", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify([{ place_id: 88, name: "上海浦东香格里拉", display_name: "上海浦东香格里拉, 陆家嘴, 上海市, 中国", lat: "31.2387", lon: "121.5019" }]), { status: 200 }));
    const results = await searchPlaces({ query: "浦东香格里拉", city: "上海", country: "中国" }, fetcher as typeof fetch);
    expect(results[0]).toMatchObject({ name: "上海浦东香格里拉", latitude: 31.2387, longitude: 121.5019 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = new URL(String(fetcher.mock.calls[0][0]));
    expect(request.searchParams.get("q")).toBe("浦东香格里拉");
    expect(request.searchParams.get("countrycodes")).toBe("cn");
    expect(request.searchParams.get("viewbox")).toBe("119.9737,32.7304,122.9737,29.7304");
  });

  it("searches the global city index instead of relying on a local city catalog", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify([{ place_id: 99, name: "Surabaya", display_name: "Surabaya, Jawa Timur, Indonesia", lat: "-7.2575", lon: "112.7521", address: { city: "Surabaya", country: "Indonesia" } }]), { status: 200 }));
    await expect(searchCities("Surabaya", fetcher as typeof fetch)).resolves.toEqual([expect.objectContaining({ name: "Surabaya", country: "Indonesia", latitude: -7.2575, longitude: 112.7521 })]);
    const request = new URL(String(fetcher.mock.calls[0][0]));
    expect(request.searchParams.get("featureType")).toBe("city");
  });
});
