import { describe, expect, it } from "vitest";
import { inferTripIconName, resolveTripIconName } from "../../src/features/trips/infer-trip-icon";
import type { Trip } from "../../src/domain/models";

describe("trip icon inference", () => {
  it.each([
    ["浦东国际机场接送", "flight"],
    ["京都火车站到大阪", "train"],
    ["北海道充电站自驾", "road"],
    ["地中海邮轮港", "cruise"],
  ] as const)("uses infrastructure terms in %s", (title, expected) => {
    expect(inferTripIconName(title)).toBe(expected);
  });

  it.each([
    ["三亚海岛潜水", "beach"],
    ["川西雪山徒步", "nature"],
    ["西安古城博物馆", "culture"],
    ["成都美食与夜市", "food"],
    ["冰岛极光摄影", "camera"],
    ["深圳客户会议出差", "business"],
  ] as const)("recognizes common travel keywords in %s", (title, expected) => {
    expect(inferTripIconName(title)).toBe(expected);
  });

  it("uses word boundaries for English keywords and falls back to the city icon", () => {
    expect(inferTripIconName("railway and food tour")).toBe("train");
    expect(inferTripIconName("training retreat")).toBe("map");
    expect(inferTripIconName("日本关西六日")).toBe("map");
  });

  it("keeps an explicitly selected icon ahead of automatic inference", () => {
    const trip = { title: "浦东国际机场接送", icon: "beach" } as Pick<Trip, "title" | "icon">;
    expect(resolveTripIconName(trip)).toBe("beach");
    expect(resolveTripIconName({ title: trip.title })).toBe("flight");
  });
});
