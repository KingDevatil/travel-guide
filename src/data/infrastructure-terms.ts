export interface InfrastructureTerm {
  id: string;
  aliases: readonly string[];
  englishTerms: readonly string[];
}

export const infrastructureTerms: readonly InfrastructureTerm[] = [
  { id: "airport", aliases: ["国际机场", "航空港", "机场"], englishTerms: ["international airport", "airport"] },
  { id: "airport-terminal", aliases: ["机场航站楼", "航站楼", "候机楼"], englishTerms: ["airport terminal", "terminal"] },
  { id: "railway", aliases: ["高速铁路站", "高铁站", "火车站", "铁路站", "动车站"], englishTerms: ["railway station", "train station"] },
  { id: "metro", aliases: ["轨道交通站", "轻轨站", "地铁站"], englishTerms: ["metro station", "subway station"] },
  { id: "bus", aliases: ["长途汽车站", "汽车客运站", "客运站", "公交总站", "巴士站", "公交站"], englishTerms: ["coach station", "bus station"] },
  { id: "ferry", aliases: ["客运码头", "轮渡码头", "渡轮码头", "渡口"], englishTerms: ["ferry terminal", "ferry"] },
  { id: "port", aliases: ["邮轮港", "港口", "海港"], englishTerms: ["cruise terminal", "port"] },
  { id: "hospital", aliases: ["急救中心", "医疗中心", "医院"], englishTerms: ["hospital", "medical center"] },
  { id: "clinic", aliases: ["诊所", "门诊部"], englishTerms: ["clinic", "medical clinic"] },
  { id: "pharmacy", aliases: ["药房", "药店"], englishTerms: ["pharmacy", "drugstore"] },
  { id: "police", aliases: ["派出所", "警察局", "公安局"], englishTerms: ["police station", "police"] },
  { id: "fire-station", aliases: ["消防站", "消防局"], englishTerms: ["fire station"] },
  { id: "fuel", aliases: ["加油站", "加气站"], englishTerms: ["fuel station", "gas station"] },
  { id: "charging", aliases: ["充电站", "充电桩"], englishTerms: ["charging station", "ev charging"] },
  { id: "parking", aliases: ["停车场", "停车库"], englishTerms: ["parking", "car park"] },
  { id: "toilet", aliases: ["公共厕所", "洗手间", "卫生间", "厕所"], englishTerms: ["public toilet", "restroom"] },
  { id: "bank", aliases: ["银行网点", "银行"], englishTerms: ["bank"] },
  { id: "atm", aliases: ["自动取款机", "取款机", "ATM机"], englishTerms: ["ATM", "cash machine"] },
  { id: "tourist-information", aliases: ["游客中心", "旅游咨询中心", "旅游信息中心"], englishTerms: ["tourist information", "visitor center"] },
];

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");

function replaceTerm(query: string, alias: string, replacement: string) {
  const index = query.toLocaleLowerCase().indexOf(alias.toLocaleLowerCase());
  if (index < 0) return query;
  return normalizeWhitespace([
    query.slice(0, index),
    replacement,
    query.slice(index + alias.length),
  ].filter(Boolean).join(" "));
}

export function expandInfrastructureQueries(value: string): string[] {
  const query = normalizeWhitespace(value);
  if (!query) return [];

  const expanded = [query];
  const match = infrastructureTerms
    .flatMap((term) => term.aliases.map((alias) => ({ term, alias })))
    .filter(({ alias }) => query.toLocaleLowerCase().includes(alias.toLocaleLowerCase()))
    .sort((left, right) => right.alias.length - left.alias.length)[0];

  if (match) {
    for (const englishTerm of match.term.englishTerms) {
      expanded.push(replaceTerm(query, match.alias, englishTerm));
    }
    expanded.push(...match.term.englishTerms);
  }

  return [...new Set(expanded.map(normalizeWhitespace).filter(Boolean))].slice(0, 7);
}
