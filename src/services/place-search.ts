import { cityCatalog } from "../data/cities";
import { expandInfrastructureQueries } from "../data/infrastructure-terms";

export type PlaceSearchProvider = "geoapify" | "nominatim";

export interface SearchResultBatch<T> {
  results: T[];
  provider: PlaceSearchProvider;
}

export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  resultType?: string;
  confidence?: number;
}

export interface CitySearchResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  aliases: string[];
}

export interface SearchPlacesInput {
  query: string;
  city: string;
  country?: string;
  cityCoordinates?: { latitude: number; longitude: number };
}

const GEOAPIFY_PROXY_ENDPOINT = "/api/geoapify/geocode";
const NOMINATIM_SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";

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
  荷兰: "nl",
  德国: "de",
  瑞士: "ch",
  奥地利: "at",
  马来西亚: "my",
  菲律宾: "ph",
  越南: "vn",
};

const cityCountryCodeOverrides: Record<string, string> = {
  香港: "hk",
  澳门: "mo",
  台北: "tw",
};

function countryCodeFor(input: Pick<SearchPlacesInput, "city" | "country">) {
  return cityCountryCodeOverrides[input.city] ?? (input.country ? countryCodes[input.country] : undefined);
}

function coordinatesFor(input: SearchPlacesInput) {
  return cityCatalog.find((option) => option.name === input.city && (!input.country || option.country === input.country))
    ?? input.cityCoordinates;
}

export function buildGeoapifySearchParams(input: SearchPlacesInput, type?: "city"): URLSearchParams {
  const params = new URLSearchParams({
    text: input.query.trim(),
    format: "json",
    lang: "zh",
    limit: "6",
  });
  const countryCode = countryCodeFor(input);
  if (countryCode) params.set("filter", `countrycode:${countryCode}`);

  const coordinates = coordinatesFor(input);
  if (coordinates) {
    params.set("bias", `proximity:${coordinates.longitude},${coordinates.latitude}`);
  }
  if (type) params.set("type", type);
  return params;
}

export function buildNominatimPlaceSearchParams(input: SearchPlacesInput): URLSearchParams {
  const params = new URLSearchParams({
    q: input.query.trim(),
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    "accept-language": "zh-CN,zh,en",
  });

  const countryCode = countryCodeFor(input);
  if (countryCode) params.set("countrycodes", countryCode);

  const coordinates = coordinatesFor(input);
  if (coordinates) {
    const longitudeRadius = 1.5;
    const latitudeRadius = 1.5;
    params.set("viewbox", [
      coordinates.longitude - longitudeRadius,
      coordinates.latitude + latitudeRadius,
      coordinates.longitude + longitudeRadius,
      coordinates.latitude - latitudeRadius,
    ].map((coordinate) => coordinate.toFixed(4)).join(","));
    params.set("bounded", "1");
  }

  return params;
}

export const buildPlaceSearchParams = buildNominatimPlaceSearchParams;

let lastRemoteRequestAt = 0;
const placeCache = new Map<string, SearchResultBatch<PlaceSearchResult>>();
const cityCache = new Map<string, SearchResultBatch<CitySearchResult>>();

export function clearPlaceSearchCaches() {
  placeCache.clear();
  cityCache.clear();
  lastRemoteRequestAt = 0;
}

async function waitForNominatimSlot(fetcher: typeof fetch) {
  if (fetcher !== fetch) return;
  const remainingDelay = 1000 - (Date.now() - lastRemoteRequestAt);
  if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay));
  lastRemoteRequestAt = Date.now();
}

interface GeoapifyPlace {
  place_id?: string | number;
  name?: string;
  city?: string;
  country?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  lat?: number | string;
  lon?: number | string;
  result_type?: string;
  category?: string;
  rank?: { confidence?: number };
}

interface NominatimPlace {
  place_id: string | number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

function geoapifyPlaceResults(payload: unknown): PlaceSearchResult[] {
  const places = (payload as { results?: GeoapifyPlace[] } | undefined)?.results;
  if (!Array.isArray(places)) return [];
  return places.map((place) => {
    const latitude = Number(place.lat);
    const longitude = Number(place.lon);
    const address = place.formatted
      ?? [place.address_line1, place.address_line2].filter(Boolean).join(", ");
    return {
      id: String(place.place_id ?? `${latitude},${longitude}`),
      name: place.name?.trim() || place.address_line1?.trim() || address.split(",")[0].trim(),
      address,
      latitude,
      longitude,
      category: place.category,
      resultType: place.result_type,
      confidence: place.rank?.confidence,
    };
  }).filter((place) => place.name && Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
}

function geoapifyCityResults(payload: unknown): CitySearchResult[] {
  const places = (payload as { results?: GeoapifyPlace[] } | undefined)?.results;
  if (!Array.isArray(places)) return [];
  return places.map((place) => ({
    name: place.name?.trim()
      || place.city?.trim()
      || place.formatted?.split(",")[0].trim()
      || "",
    country: place.country?.trim() || "未标注国家",
    latitude: Number(place.lat),
    longitude: Number(place.lon),
    aliases: [],
  })).filter((city) => city.name && Number.isFinite(city.latitude) && Number.isFinite(city.longitude));
}

function nominatimPlaceResults(payload: unknown): PlaceSearchResult[] {
  if (!Array.isArray(payload)) return [];
  return (payload as NominatimPlace[]).map((place) => ({
    id: String(place.place_id),
    name: place.name?.trim() || place.display_name.split(",")[0].trim(),
    address: place.display_name,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
  })).filter((place) => place.name && Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
}

function nominatimCityResults(payload: unknown): CitySearchResult[] {
  if (!Array.isArray(payload)) return [];
  return (payload as NominatimPlace[]).map((place) => {
    const address = place.address;
    return {
      name: place.name?.trim()
        || address?.city
        || address?.town
        || address?.village
        || address?.municipality
        || place.display_name.split(",")[0].trim(),
      country: address?.country || "未标注国家",
      latitude: Number(place.lat),
      longitude: Number(place.lon),
      aliases: [],
    };
  }).filter((city) => city.name && Number.isFinite(city.latitude) && Number.isFinite(city.longitude));
}

async function requestGeoapify(
  params: URLSearchParams,
  fetcher: typeof fetch,
): Promise<{ available: boolean; payload?: unknown }> {
  try {
    const response = await fetcher(`${GEOAPIFY_PROXY_ENDPOINT}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { available: false };
    return { available: true, payload: await response.json() };
  } catch {
    return { available: false };
  }
}

async function requestNominatim(params: URLSearchParams, fetcher: typeof fetch): Promise<unknown> {
  await waitForNominatimSlot(fetcher);
  const response = await fetcher(`${NOMINATIM_SEARCH_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("地点搜索服务暂时不可用");
  return response.json();
}

export async function searchCities(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<SearchResultBatch<CitySearchResult>> {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return { results: [], provider: "geoapify" };
  const cached = cityCache.get(normalizedQuery);
  if (cached) return cached;

  const geoapifyParams = new URLSearchParams({
    text: query.trim(),
    format: "json",
    lang: "zh",
    limit: "6",
    type: "city",
  });
  const geoapify = await requestGeoapify(geoapifyParams, fetcher);
  if (geoapify.available) {
    const results = geoapifyCityResults(geoapify.payload);
    if (results.length > 0) {
      const batch = { results, provider: "geoapify" as const };
      cityCache.set(normalizedQuery, batch);
      return batch;
    }
  }

  const params = new URLSearchParams({
    q: query.trim(),
    format: "jsonv2",
    addressdetails: "1",
    featuretype: "city",
    limit: "6",
    dedupe: "1",
    "accept-language": "zh-CN,zh,en",
  });
  const results = nominatimCityResults(await requestNominatim(params, fetcher));
  const batch = { results, provider: "nominatim" as const };
  cityCache.set(normalizedQuery, batch);
  return batch;
}

export async function searchPlaces(
  input: SearchPlacesInput,
  fetcher: typeof fetch = fetch,
): Promise<SearchResultBatch<PlaceSearchResult>> {
  const cacheKey = JSON.stringify([normalize(input.query), input.city, input.country ?? ""]);
  const cached = placeCache.get(cacheKey);
  if (cached) return cached;

  const queries = expandInfrastructureQueries(input.query);
  let geoapifyAvailable = true;
  for (const query of queries) {
    const response = await requestGeoapify(buildGeoapifySearchParams({ ...input, query }), fetcher);
    if (!response.available) {
      geoapifyAvailable = false;
      break;
    }
    const results = geoapifyPlaceResults(response.payload);
    if (results.length > 0) {
      const batch = { results, provider: "geoapify" as const };
      placeCache.set(cacheKey, batch);
      return batch;
    }
  }

  if (!geoapifyAvailable || queries.length > 0) {
    for (const query of queries) {
      const results = nominatimPlaceResults(
        await requestNominatim(buildNominatimPlaceSearchParams({ ...input, query }), fetcher),
      );
      if (results.length > 0) {
        const batch = { results, provider: "nominatim" as const };
        placeCache.set(cacheKey, batch);
        return batch;
      }
    }
  }

  const batch = { results: [], provider: "nominatim" as const };
  placeCache.set(cacheKey, batch);
  return batch;
}
