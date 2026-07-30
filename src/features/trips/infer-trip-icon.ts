import { infrastructureTerms } from "../../data/infrastructure-terms";
import type { Trip, TripIconName } from "../../domain/models";

const infrastructureIconById: Readonly<Partial<Record<string, TripIconName>>> = {
  airport: "flight",
  "airport-terminal": "flight",
  railway: "train",
  metro: "train",
  bus: "road",
  ferry: "cruise",
  port: "cruise",
  fuel: "road",
  charging: "road",
  parking: "road",
};

const keywordRules: readonly { icon: TripIconName; terms: readonly string[] }[] = [
  { icon: "flight", terms: ["飞机", "飞行", "航班", "航空", "空港", "转机", "登机", "flight", "flying", "aviation"] },
  { icon: "train", terms: ["高铁", "铁路", "火车", "动车", "列车", "新干线", "地铁", "轨道交通", "rail trip", "railway", "train", "metro", "subway", "shinkansen"] },
  { icon: "road", terms: ["自驾", "公路旅行", "公路", "租车", "房车", "摩托", "开车", "road trip", "self drive", "driving", "rental car", "campervan"] },
  { icon: "cruise", terms: ["邮轮", "游轮", "轮渡", "渡轮", "帆船", "游艇", "航海", "cruise", "ferry", "sailing", "yacht"] },
  { icon: "beach", terms: ["海岛", "海滩", "沙滩", "潜水", "冲浪", "海滨", "海岸", "环岛", "island", "beach", "diving", "surfing", "seaside"] },
  { icon: "nature", terms: ["徒步", "登山", "露营", "雪山", "草原", "森林", "峡谷", "沙漠", "户外", "自然", "hiking", "trekking", "camping", "mountain", "national park"] },
  { icon: "culture", terms: ["博物馆", "美术馆", "古城", "古镇", "寺庙", "教堂", "历史", "文化", "遗址", "艺术", "museum", "gallery", "heritage", "historic", "culture", "temple"] },
  { icon: "food", terms: ["美食", "餐厅", "小吃", "咖啡", "米其林", "夜市", "料理", "甜品", "探店", "food", "restaurant", "cafe", "coffee", "dining", "culinary"] },
  { icon: "camera", terms: ["摄影", "旅拍", "拍照", "极光", "星空", "日出", "日落", "写真", "photography", "photo trip", "aurora", "sunrise", "sunset"] },
  { icon: "business", terms: ["商务", "出差", "会议", "会展", "客户", "差旅", "商旅", "business", "conference", "convention", "trade show", "work trip"] },
] as const;

const normalize = (value: string) => value
  .normalize("NFKC")
  .toLocaleLowerCase()
  .replace(/[._·•/\\-]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function includesTerm(text: string, rawTerm: string) {
  const term = normalize(rawTerm);
  if (!term) return false;
  if (/[\u3400-\u9fff]/u.test(term)) return text.includes(term);
  const pattern = escapeRegExp(term).replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${pattern}(?:$|[^a-z0-9])`, "iu").test(text);
}

export function inferTripIconName(value: string): TripIconName {
  const text = normalize(value);
  if (!text) return "map";

  const scores = new Map<TripIconName, number>();
  const addScore = (icon: TripIconName, score: number) => scores.set(icon, (scores.get(icon) ?? 0) + score);

  for (const infrastructure of infrastructureTerms) {
    const icon = infrastructureIconById[infrastructure.id];
    if (!icon) continue;
    const terms = [...infrastructure.aliases, ...infrastructure.englishTerms];
    if (terms.some((term) => includesTerm(text, term))) addScore(icon, 8);
  }

  for (const rule of keywordRules) {
    for (const term of rule.terms) {
      if (includesTerm(text, term)) addScore(rule.icon, 3);
    }
  }

  let result: TripIconName = "map";
  let bestScore = 0;
  for (const rule of keywordRules) {
    const score = scores.get(rule.icon) ?? 0;
    if (score > bestScore) {
      bestScore = score;
      result = rule.icon;
    }
  }
  return result;
}

export function resolveTripIconName(trip: Pick<Trip, "icon" | "title" | "destination">): TripIconName {
  return trip.icon ?? inferTripIconName(`${trip.title} ${trip.destination ?? ""}`);
}
