import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGeoapifySearchParams,
  buildNominatimPlaceSearchParams,
  clearPlaceSearchCaches,
  searchCities,
  searchPlaces,
} from "../../src/services/place-search";

const jsonResponse = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "Content-Type": "application/json" },
});

describe("place search", () => {
  beforeEach(() => clearPlaceSearchCaches());

  it("builds localized Geoapify parameters with country filtering and city bias", () => {
    const params = buildGeoapifySearchParams({
      query: "浦东机场",
      city: "上海",
      country: "中国",
      cityCoordinates: { latitude: 31.2304, longitude: 121.4737 },
    });

    expect(params.get("text")).toBe("浦东机场");
    expect(params.get("lang")).toBe("zh");
    expect(params.get("filter")).toBe("countrycode:cn");
    expect(params.get("bias")).toBe("proximity:121.4737,31.2304");
    expect(params.has("apiKey")).toBe(false);
  });

  it("uses Geoapify first and reports the provider that returned the result", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.pathname).toBe("/api/geoapify/geocode");
      return jsonResponse({
        results: [{
          place_id: "geo-pvg",
          name: "上海浦东国际机场",
          formatted: "上海浦东国际机场，迎宾大道，浦东新区，上海市，中国",
          lat: 31.1443,
          lon: 121.8083,
          result_type: "amenity",
          category: "airport.international",
          rank: { confidence: 0.98 },
        }],
      });
    });

    const batch = await searchPlaces({
      query: "浦东机场",
      city: "上海",
      country: "中国",
      cityCoordinates: { latitude: 31.2304, longitude: 121.4737 },
    }, fetcher as typeof fetch);

    expect(batch.provider).toBe("geoapify");
    expect(batch.results).toEqual([expect.objectContaining({
      id: "geo-pvg",
      name: "上海浦东国际机场",
      latitude: 31.1443,
      longitude: 121.8083,
      category: "airport.international",
    })]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("falls back to Nominatim when Geoapify is not configured", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/geoapify/geocode") {
        return jsonResponse({ code: "GEOAPIFY_NOT_CONFIGURED" }, 503);
      }
      return jsonResponse([{
        place_id: 88,
        name: "上海浦东香格里拉",
        display_name: "上海浦东香格里拉, 陆家嘴, 上海市, 中国",
        lat: "31.2387",
        lon: "121.5019",
      }]);
    });

    const batch = await searchPlaces({
      query: "浦东香格里拉",
      city: "上海",
      country: "中国",
      cityCoordinates: { latitude: 31.2304, longitude: 121.4737 },
    }, fetcher as typeof fetch);

    expect(batch.provider).toBe("nominatim");
    expect(batch.results[0]).toMatchObject({ name: "上海浦东香格里拉", latitude: 31.2387 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("uses the infrastructure dictionary for a configured Geoapify search", async () => {
    const requestedTexts: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const text = url.searchParams.get("text") ?? "";
      requestedTexts.push(text);
      if (text === "朱安达 airport") {
        return jsonResponse({ results: [{
          place_id: "geo-sub",
          name: "Juanda International Airport",
          formatted: "Juanda International Airport, Surabaya, Indonesia",
          lat: -7.3797,
          lon: 112.7868,
          category: "airport.international",
        }] });
      }
      return jsonResponse({ results: [] });
    });

    const batch = await searchPlaces({
      query: "朱安达机场",
      city: "泗水",
      country: "印度尼西亚",
      cityCoordinates: { latitude: -7.2575, longitude: 112.7521 },
    }, fetcher as typeof fetch);

    expect(batch.provider).toBe("geoapify");
    expect(batch.results[0]).toMatchObject({ name: "Juanda International Airport" });
    expect(requestedTexts).toEqual(["朱安达机场", "朱安达 international airport", "朱安达 airport"]);
  });

  it("falls back after a Geoapify upstream error", async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValueOnce(jsonResponse([{
        place_id: 101,
        name: "Central Station",
        display_name: "Central Station, Amsterdam, Netherlands",
        lat: "52.3791",
        lon: "4.9003",
      }]));

    const batch = await searchPlaces({
      query: "Central Station",
      city: "Amsterdam",
      country: "荷兰",
      cityCoordinates: { latitude: 52.3676, longitude: 4.9041 },
    }, fetcher as typeof fetch);

    expect(batch.provider).toBe("nominatim");
    expect(batch.results[0]).toMatchObject({ name: "Central Station" });
  });

  it("searches cities through Geoapify and normalizes city results", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ results: [{
      place_id: "geo-surabaya",
      name: "泗水",
      city: "泗水",
      country: "印度尼西亚",
      lat: -7.2575,
      lon: 112.7521,
      result_type: "city",
    }] }));

    const batch = await searchCities("泗水", fetcher as typeof fetch);

    expect(batch.provider).toBe("geoapify");
    expect(batch.results).toEqual([expect.objectContaining({
      name: "泗水",
      country: "印度尼西亚",
      latitude: -7.2575,
      longitude: 112.7521,
    })]);
    const request = new URL(String(fetcher.mock.calls[0][0]), "http://localhost");
    expect(request.searchParams.get("type")).toBe("city");
  });

  it("keeps Nominatim fallback geographically bounded to the selected city", () => {
    const params = buildNominatimPlaceSearchParams({
      query: "机场",
      city: "泗水",
      country: "印度尼西亚",
      cityCoordinates: { latitude: -7.2575, longitude: 112.7521 },
    });

    expect(params.get("q")).toBe("机场");
    expect(params.get("countrycodes")).toBe("id");
    expect(params.get("viewbox")).toBe("111.2521,-5.7575,114.2521,-8.7575");
    expect(params.get("bounded")).toBe("1");
  });

  it.each([
    ["香港", "中国", "hk"],
    ["澳门", "中国", "mo"],
    ["台北", "中国", "tw"],
  ])("uses the correct Nominatim territory for %s", (city, country, countryCode) => {
    expect(buildNominatimPlaceSearchParams({ query: "机场", city, country }).get("countrycodes")).toBe(countryCode);
  });
});
