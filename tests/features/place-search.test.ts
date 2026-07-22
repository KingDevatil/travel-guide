import { describe, expect, it, vi } from "vitest";
import { searchKnownPlaces, searchPlaces } from "../../src/services/place-search";

describe("place search", () => {
  it("matches precise Shanghai landmarks and airports", () => {
    expect(searchKnownPlaces({ query: "上海外滩", city: "上海", country: "中国" })[0]).toMatchObject({ name: "外滩", latitude: 31.24 });
    expect(searchKnownPlaces({ query: "PVG", city: "上海", country: "中国" })[0]).toMatchObject({ name: "上海浦东国际机场" });
  });

  it("uses an explicit remote search for arbitrary hotels and addresses", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify([{ place_id: 88, name: "上海浦东香格里拉", display_name: "上海浦东香格里拉, 陆家嘴, 上海市, 中国", lat: "31.2387", lon: "121.5019" }]), { status: 200 }));
    const results = await searchPlaces({ query: "浦东香格里拉", city: "上海", country: "中国" }, fetcher as typeof fetch);
    expect(results[0]).toMatchObject({ name: "上海浦东香格里拉", latitude: 31.2387, longitude: 121.5019 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(String(fetcher.mock.calls[0][0]))).toContain("浦东香格里拉");
  });
});
