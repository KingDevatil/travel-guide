export interface CityOption {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  aliases: string[];
}

export const cityCatalog: CityOption[] = [
  { name: "京都", country: "日本", latitude: 35.0116, longitude: 135.7681, aliases: ["kyoto", "京都市"] },
  { name: "大阪", country: "日本", latitude: 34.6937, longitude: 135.5023, aliases: ["osaka", "大阪市"] },
  { name: "东京", country: "日本", latitude: 35.6762, longitude: 139.6503, aliases: ["tokyo", "東京"] },
  { name: "奈良", country: "日本", latitude: 34.6851, longitude: 135.8048, aliases: ["nara", "奈良市"] },
  { name: "神户", country: "日本", latitude: 34.6901, longitude: 135.1955, aliases: ["kobe", "神戸"] },
  { name: "札幌", country: "日本", latitude: 43.0618, longitude: 141.3545, aliases: ["sapporo"] },
  { name: "福冈", country: "日本", latitude: 33.5902, longitude: 130.4017, aliases: ["fukuoka", "福岡"] },
  { name: "北京", country: "中国", latitude: 39.9042, longitude: 116.4074, aliases: ["beijing"] },
  { name: "上海", country: "中国", latitude: 31.2304, longitude: 121.4737, aliases: ["shanghai"] },
  { name: "广州", country: "中国", latitude: 23.1291, longitude: 113.2644, aliases: ["guangzhou", "广州"] },
  { name: "深圳", country: "中国", latitude: 22.5431, longitude: 114.0579, aliases: ["shenzhen"] },
  { name: "成都", country: "中国", latitude: 30.5728, longitude: 104.0668, aliases: ["chengdu"] },
  { name: "杭州", country: "中国", latitude: 30.2741, longitude: 120.1551, aliases: ["hangzhou"] },
  { name: "西安", country: "中国", latitude: 34.3416, longitude: 108.9398, aliases: ["xian", "xi'an"] },
  { name: "香港", country: "中国", latitude: 22.3193, longitude: 114.1694, aliases: ["hong kong", "hongkong"] },
  { name: "澳门", country: "中国", latitude: 22.1987, longitude: 113.5439, aliases: ["macau", "macao"] },
  { name: "台北", country: "中国", latitude: 25.033, longitude: 121.5654, aliases: ["taipei", "臺北"] },
  { name: "首尔", country: "韩国", latitude: 37.5665, longitude: 126.978, aliases: ["seoul", "서울"] },
  { name: "新加坡", country: "新加坡", latitude: 1.3521, longitude: 103.8198, aliases: ["singapore"] },
  { name: "曼谷", country: "泰国", latitude: 13.7563, longitude: 100.5018, aliases: ["bangkok"] },
  { name: "清迈", country: "泰国", latitude: 18.7883, longitude: 98.9853, aliases: ["chiang mai"] },
  { name: "巴厘岛", country: "印度尼西亚", latitude: -8.4095, longitude: 115.1889, aliases: ["bali"] },
  { name: "巴黎", country: "法国", latitude: 48.8566, longitude: 2.3522, aliases: ["paris"] },
  { name: "伦敦", country: "英国", latitude: 51.5072, longitude: -0.1276, aliases: ["london"] },
  { name: "罗马", country: "意大利", latitude: 41.9028, longitude: 12.4964, aliases: ["rome", "roma"] },
  { name: "巴塞罗那", country: "西班牙", latitude: 41.3874, longitude: 2.1686, aliases: ["barcelona"] },
  { name: "纽约", country: "美国", latitude: 40.7128, longitude: -74.006, aliases: ["new york", "nyc"] },
  { name: "洛杉矶", country: "美国", latitude: 34.0522, longitude: -118.2437, aliases: ["los angeles", "la"] },
  { name: "旧金山", country: "美国", latitude: 37.7749, longitude: -122.4194, aliases: ["san francisco", "sf"] },
  { name: "悉尼", country: "澳大利亚", latitude: -33.8688, longitude: 151.2093, aliases: ["sydney"] },
  { name: "墨尔本", country: "澳大利亚", latitude: -37.8136, longitude: 144.9631, aliases: ["melbourne"] },
  { name: "温哥华", country: "加拿大", latitude: 49.2827, longitude: -123.1207, aliases: ["vancouver"] },
  { name: "多伦多", country: "加拿大", latitude: 43.6532, longitude: -79.3832, aliases: ["toronto"] },
  { name: "迪拜", country: "阿联酋", latitude: 25.2048, longitude: 55.2708, aliases: ["dubai"] },
  { name: "伊斯坦布尔", country: "土耳其", latitude: 41.0082, longitude: 28.9784, aliases: ["istanbul"] },
];

const cityTimezoneGroups: Array<[timezone: string, cities: string[]]> = [
  ["Asia/Tokyo", ["京都", "大阪", "东京", "奈良", "神户", "札幌", "福冈"]],
  ["Asia/Shanghai", ["北京", "上海", "广州", "深圳", "成都", "杭州", "西安"]],
  ["Asia/Hong_Kong", ["香港"]],
  ["Asia/Macau", ["澳门"]],
  ["Asia/Taipei", ["台北"]],
  ["Asia/Seoul", ["首尔"]],
  ["Asia/Singapore", ["新加坡"]],
  ["Asia/Bangkok", ["曼谷", "清迈"]],
  ["Asia/Makassar", ["巴厘岛"]],
  ["Europe/Paris", ["巴黎"]],
  ["Europe/London", ["伦敦"]],
  ["Europe/Rome", ["罗马"]],
  ["Europe/Madrid", ["巴塞罗那"]],
  ["America/New_York", ["纽约"]],
  ["America/Los_Angeles", ["洛杉矶", "旧金山"]],
  ["Australia/Sydney", ["悉尼"]],
  ["Australia/Melbourne", ["墨尔本"]],
  ["America/Vancouver", ["温哥华"]],
  ["America/Toronto", ["多伦多"]],
  ["Asia/Dubai", ["迪拜"]],
  ["Europe/Istanbul", ["伊斯坦布尔"]],
];

const cityTimezoneLookup = Object.fromEntries(cityTimezoneGroups.flatMap(([timezone, cities]) => cities.map((city) => [city, timezone])));

export const supportedCityTimezones = cityTimezoneGroups.map(([timezone]) => timezone);

export function timezoneForCity(city: string): string | undefined {
  return cityTimezoneLookup[city];
}

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s'’.-]/g, "");

export function searchCityCatalog(query: string, limit = 6): CityOption[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  return cityCatalog
    .map((city) => {
      const names = [city.name, city.country, ...city.aliases].map(normalize);
      const startsWith = names.some((name) => name.startsWith(normalizedQuery));
      const includes = names.some((name) => name.includes(normalizedQuery));
      return { city, score: startsWith ? 0 : includes ? 1 : 2 };
    })
    .filter(({ score }) => score < 2)
    .sort((a, b) => a.score - b.score || a.city.name.localeCompare(b.city.name, "zh-CN"))
    .slice(0, limit)
    .map(({ city }) => city);
}
