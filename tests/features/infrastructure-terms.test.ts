import { describe, expect, it } from "vitest";
import { expandInfrastructureQueries, infrastructureTerms } from "../../src/data/infrastructure-terms";

describe("infrastructure terms", () => {
  it.each([
    ["浦东国际机场", ["浦东 international airport", "浦东 airport"]],
    ["虹桥火车站", ["虹桥 railway station", "虹桥 train station"]],
    ["静安寺地铁站", ["静安寺 metro station", "静安寺 subway station"]],
    ["南站长途汽车站", ["南站 coach station", "南站 bus station"]],
  ])("expands %s without translating the proper-name portion", (query, expected) => {
    const expanded = expandInfrastructureQueries(query);
    expect(expanded[0]).toBe(query);
    expect(expanded).toEqual(expect.arrayContaining(expected));
  });

  it("prefers the longest infrastructure phrase when terms overlap", () => {
    const expanded = expandInfrastructureQueries("浦东机场航站楼");
    expect(expanded).toContain("浦东 airport terminal");
    expect(expanded).not.toContain("浦东 international airport 航站楼");
  });

  it("contains reusable public-facility categories instead of named-place exceptions", () => {
    const ids = infrastructureTerms.map((term) => term.id);
    expect(ids).toEqual(expect.arrayContaining([
      "airport",
      "railway",
      "metro",
      "hospital",
      "police",
      "charging",
      "toilet",
      "atm",
    ]));
    expect(JSON.stringify(infrastructureTerms)).not.toMatch(/上海|曼谷|浦东|素万那普/);
  });

  it("returns a normalized original query only when no dictionary term matches", () => {
    expect(expandInfrastructureQueries("  巴黎卢浮宫  ")).toEqual(["巴黎卢浮宫"]);
  });
});
