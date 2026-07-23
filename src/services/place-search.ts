import { cityCatalog } from "../data/cities";

export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface CitySearchResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  aliases: string[];
}

interface SearchPlacesInput {
  query: string;
  city: string;
  country?: string;
}

const knownPlaces: Array<PlaceSearchResult & { city: string; aliases: string[] }> = [
  { id: "shanghai-bund", city: "上海", name: "外滩", address: "上海市黄浦区中山东一路", latitude: 31.2400, longitude: 121.4907, aliases: ["上海外滩", "the bund", "bund"] },
  { id: "shanghai-pvg", city: "上海", name: "上海浦东国际机场", address: "上海市浦东新区迎宾大道6000号", latitude: 31.1443, longitude: 121.8083, aliases: ["浦东机场", "pvg", "pudong airport"] },
  { id: "shanghai-sha", city: "上海", name: "上海虹桥国际机场", address: "上海市长宁区虹桥路2550号", latitude: 31.1979, longitude: 121.3363, aliases: ["虹桥机场", "sha", "hongqiao airport"] },
  { id: "shanghai-yuyuan", city: "上海", name: "豫园", address: "上海市黄浦区福佑路168号", latitude: 31.2270, longitude: 121.4921, aliases: ["上海豫园", "yu garden"] },
  { id: "shanghai-disney", city: "上海", name: "上海迪士尼度假区", address: "上海市浦东新区川沙新镇黄赵路310号", latitude: 31.1440, longitude: 121.6570, aliases: ["上海迪士尼", "shanghai disney"] },
  {
    id: "bangkok-bkk",
    city: "曼谷",
    name: "素万那普国际机场",
    address: "999 Nong Prue, Bang Phli District, Samut Prakan 10540, Thailand",
    latitude: 13.6900,
    longitude: 100.7501,
    aliases: [
      "素万那普机场",
      "苏万那普国际机场",
      "苏万那普机场",
      "suvarnabhumi international airport",
      "suvarnabhumi airport",
      "bkk",
    ],
  },
];

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s'’.-]/g, "");

const countryCodes: Record<string, string> = {
  日本: "jp",
  中国: "cn",
  韩国: "kr",
  新加坡: "sg",
  泰国: "th",
  印度尼西亚: "id",
  法国: "fr",
  英国: "gb",
  意大利: "it",
  西班牙: "es",
  美国: "us",
  澳大利亚: "au",
  加拿大: "ca",
  阿联酋: "ae",
  土耳其: "tr",
};

const cityCountryCodeOverrides: Record<string, string> = {
  香港: "hk",
  澳门: "mo",
  台北: "tw",
};

export function buildPlaceSearchParams(input: SearchPlacesInput): URLSearchParams {
  const city = cityCatalog.find((option) => option.name === input.city && (!input.country || option.country === input.country));
  const params = new URLSearchParams({
    q: input.query.trim(),
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    "accept-language": "zh-CN,zh,en",
  });

  const countryCode = cityCountryCodeOverrides[input.city] ?? (input.country ? countryCodes[input.country] : undefined);
  if (countryCode) params.set("countrycodes", countryCode);

  if (city) {
    const longitudeRadius = 1.5;
    const latitudeRadius = 1.5;
    params.set("viewbox", [
      city.longitude - longitudeRadius,
      city.latitude + latitudeRadius,
      city.longitude + longitudeRadius,
      city.latitude - latitudeRadius,
    ].map((coordinate) => coordinate.toFixed(4)).join(","));
    params.set("bounded", "0");
  }

  return params;
}

export function searchKnownPlaces({ query, city }: SearchPlacesInput): PlaceSearchResult[] {
  const target = normalize(query);
  if (!target) return [];
  return knownPlaces.filter((place) => place.city === city && [place.name, place.address, ...place.aliases].some((value) => normalize(value).includes(target) || target.includes(normalize(value)))).map(({ aliases: _aliases, city: _city, ...place }) => place);
}

let lastRemoteRequestAt = 0;
const cache = new Map<string, PlaceSearchResult[]>();
const cityCache = new Map<string, CitySearchResult[]>();

async function waitForRemoteSearchSlot() {
  const remainingDelay = 1000 - (Date.now() - lastRemoteRequestAt);
  if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay));
  lastRemoteRequestAt = Date.now();
}

export async function searchCities(query: string, fetcher: typeof fetch = fetch): Promise<CitySearchResult[]> {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const cached = cityCache.get(normalizedQuery);
  if (cached) return cached;

  await waitForRemoteSearchSlot();
  const params = new URLSearchParams({
    q: query.trim(), format: "jsonv2", addressdetails: "1", featureType: "city", limit: "6", dedupe: "1", "accept-language": "zh-CN,zh,en",
  });
  const response = await fetcher(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("城市搜索服务暂时不可用");
  const payload = await response.json() as Array<{ place_id: number; name?: string; display_name: string; lat: string; lon: string; address?: { city?: string; town?: string; village?: string; municipality?: string; county?: string; state?: string; country?: string } }>;
  const results = payload.map((place) => {
    const address = place.address;
    return {
      name: place.name?.trim() || address?.city || address?.town || address?.village || address?.municipality || place.display_name.split(",")[0].trim(),
      country: address?.country || "未标注国家",
      latitude: Number(place.lat), longitude: Number(place.lon), aliases: [],
    };
  }).filter((city) => Number.isFinite(city.latitude) && Number.isFinite(city.longitude));
  cityCache.set(normalizedQuery, results);
  return results;
}

export async function searchPlaces(input: SearchPlacesInput, fetcher: typeof fetch = fetch): Promise<PlaceSearchResult[]> {
  const known = searchKnownPlaces(input);
  if (known.length) return known;

  const cacheKey = normalize(`${input.query}|${input.city}|${input.country ?? ""}`);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  await waitForRemoteSearchSlot();

  const params = buildPlaceSearchParams(input);
  const response = await fetcher(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("地点搜索服务暂时不可用");
  const payload = await response.json() as Array<{ place_id: number; name?: string; display_name: string; lat: string; lon: string }>;
  const results = payload.map((place) => ({ id: String(place.place_id), name: place.name?.trim() || place.display_name.split(",")[0].trim(), address: place.display_name, latitude: Number(place.lat), longitude: Number(place.lon) })).filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
  cache.set(cacheKey, results);
  return results;
}
