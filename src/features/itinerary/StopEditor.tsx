import { Building2, MapPin, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Stop } from "../../domain/models";
import { searchCityCatalog, supportedCityTimezones, timezoneForCity, type CityOption } from "../../data/cities";
import { formatTimezoneLabel, isValidTimezone, toDateTimeLocalValue } from "../../domain/timezones";
import type { StopDraft } from "../../hooks/useItinerary";
import { searchPlaces, type PlaceSearchResult } from "../../services/place-search";

interface StopEditorProps {
  stop?: Stop;
  date: string;
  tripStartDate: string;
  tripEndDate: string;
  tripTimezone: string;
  initialCoordinates?: { latitude: number; longitude: number };
  existingStops?: Stop[];
  onSave: (draft: StopDraft) => Promise<void>;
  onClose: () => void;
}

export function StopEditor({ stop, date, tripStartDate, tripEndDate, tripTimezone, initialCoordinates, existingStops = [], onSave, onClose }: StopEditorProps) {
  const initialDate = stop?.date ?? date;
  const [draft, setDraft] = useState<StopDraft>({ date: initialDate, title: stop?.title ?? "", country: stop?.country ?? "", city: stop?.city ?? "", address: stop?.address ?? "", latitude: stop?.latitude ?? initialCoordinates?.latitude ?? 0, longitude: stop?.longitude ?? initialCoordinates?.longitude ?? 0, startsAt: stop?.startsAt ? toDateTimeLocalValue(stop.startsAt) : `${initialDate}T09:00`, endsAt: stop?.endsAt ? toDateTimeLocalValue(stop.endsAt) : `${initialDate}T10:00`, timezone: stop?.timezone ?? tripTimezone, content: stop?.content ?? "", notes: stop?.notes ?? "" });
  const [useLocalTime, setUseLocalTime] = useState(stop ? Boolean(stop.timezone) : true);
  const [cityQuery, setCityQuery] = useState(stop?.city ?? "");
  const [placeQuery, setPlaceQuery] = useState(stop?.address ? stop.title : "");
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeResolved, setPlaceResolved] = useState(Boolean(stop?.address));
  const [placeSearchAttempted, setPlaceSearchAttempted] = useState(false);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [locationResolved, setLocationResolved] = useState(Boolean(stop || initialCoordinates));
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [error, setError] = useState("");
  const suggestions = useMemo(() => locationResolved ? [] : searchCityCatalog(cityQuery), [cityQuery, locationResolved]);
  const timezoneOptions = useMemo(() => Array.from(new Set([tripTimezone, draft.timezone, ...supportedCityTimezones].filter((value): value is string => Boolean(value)))), [draft.timezone, tripTimezone]);
  const update = <K extends keyof StopDraft>(key: K, value: StopDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateDate = (nextDate: string) => setDraft((current) => nextDate ? ({
    ...current,
    date: nextDate,
    startsAt: current.startsAt ? `${nextDate}${current.startsAt.slice(10)}` : `${nextDate}T09:00`,
    endsAt: current.endsAt ? `${nextDate}${current.endsAt.slice(10)}` : `${nextDate}T10:00`,
  }) : ({ ...current, date: "", startsAt: "", endsAt: "" }));

  const selectCity = (city: CityOption) => {
    setCityQuery(city.name);
    setLocationResolved(true);
    setError("");
    setPlaceQuery(""); setPlaceResults([]); setPlaceResolved(false); setPlaceSearchAttempted(false);
    setDraft((current) => ({ ...current, title: current.title.trim() && current.title !== current.city ? current.title : city.name, country: city.country, city: city.name, address: "", latitude: city.latitude, longitude: city.longitude, timezone: useLocalTime ? timezoneForCity(city.name) ?? current.timezone ?? tripTimezone : undefined }));
  };

  const findPlaces = async () => {
    if (!draft.city || !placeQuery.trim()) return;
    setSearchingPlace(true); setPlaceSearchAttempted(false); setError("");
    try { setPlaceResults(await searchPlaces({ query: placeQuery, city: draft.city, country: draft.country })); setPlaceSearchAttempted(true); }
    catch (reason) { setPlaceResults([]); setError(reason instanceof Error ? `${reason.message}，可展开“调整精确位置”手动设置。` : "地点搜索失败"); }
    finally { setSearchingPlace(false); }
  };

  const selectPlace = (place: PlaceSearchResult) => {
    setPlaceQuery(place.name); setPlaceResolved(true); setPlaceResults([]); setPlaceSearchAttempted(false); setError("");
    setDraft((current) => ({ ...current, title: place.name, address: place.address, latitude: place.latitude, longitude: place.longitude }));
  };

  const copyLocation = (source: Stop) => {
    setCityQuery(source.city || source.title);
    setPlaceQuery(source.address ? source.title : "");
    setPlaceResults([]);
    setPlaceResolved(Boolean(source.address));
    setPlaceSearchAttempted(false);
    setLocationResolved(true);
    setDraft((current) => ({ ...current, title: source.title, country: source.country ?? "", city: source.city ?? source.title, address: source.address ?? "", latitude: source.latitude, longitude: source.longitude, timezone: useLocalTime ? source.timezone ?? timezoneForCity(source.city ?? "") ?? current.timezone ?? tripTimezone : undefined }));
  };

  const updateCoordinate = (key: "latitude" | "longitude", value: number) => {
    setLocationResolved(true);
    if (placeQuery.trim()) setPlaceResolved(true);
    setDraft((current) => ({ ...current, [key]: value, address: placeQuery.trim() || current.address }));
  };

  return <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="stop-editor-title">
    <form className="dialog-panel dialog-form dialog-form--wide" onSubmit={async (event) => {
      event.preventDefault();
      if (!locationResolved) { setError("请先从搜索结果选择城市，或前往地图页点选位置。"); return; }
      if (placeQuery.trim() && !placeResolved) { setError("请点击“搜索地点”并选择具体地点；如果只规划城市，可清空具体地点。"); return; }
      const timezone = useLocalTime ? draft.timezone || tripTimezone : undefined;
      if (timezone && !isValidTimezone(timezone)) { setError("请输入有效的 IANA 时区，例如 Asia/Bangkok。"); return; }
      try { await onSave({ ...draft, timezone }); onClose(); } catch (reason) { setError(reason instanceof Error ? reason.message : "保存失败"); }
    }}>
      <div className="dialog-header dialog-wide"><div><h2 id="stop-editor-title" className="dialog-title">{stop ? "编辑节点" : "添加节点"}</h2><p>先选择城市，再定位景点、酒店、机场等具体地点。</p></div><button type="button" className="dialog-close-btn" onClick={onClose} aria-label="关闭节点编辑"><X aria-hidden="true" /></button></div>
      <div className="dialog-field dialog-wide city-search-field">
        <label htmlFor="stop-city-search">所在城市</label>
        <div className="city-search-input"><Search aria-hidden="true" /><input id="stop-city-search" className="dialog-input" autoFocus autoComplete="off" placeholder="搜索城市，如京都、Osaka" value={cityQuery} onChange={(event) => { setCityQuery(event.target.value); setLocationResolved(false); setDraft((current) => ({ ...current, city: event.target.value })); }} /></div>
        {suggestions.length > 0 && <div className="city-search-results" aria-label="城市搜索结果">{suggestions.map((city) => <button type="button" key={`${city.country}-${city.name}`} aria-label={`选择 ${city.name}，${city.country}`} onClick={() => selectCity(city)}><MapPin aria-hidden="true" /><span><strong>{city.name}</strong><small>{city.country}</small></span></button>)}</div>}
        {cityQuery.trim() && !locationResolved && suggestions.length === 0 && <p className="field-hint">未找到匹配城市，可换用中文或英文名称，或在地图页点选位置。</p>}
        {locationResolved && <p className="location-confirmed"><MapPin aria-hidden="true" />已选择城市：{draft.city || "地图选点"}{draft.country ? `，${draft.country}` : ""}</p>}
      </div>
      {locationResolved && draft.city && <div className="dialog-field dialog-wide place-search-field"><label htmlFor="stop-place-search">具体地点或地址（可选）</label><div className="place-search-input"><input id="stop-place-search" className="dialog-input" placeholder="例如：景点、酒店或机场名称" value={placeQuery} onChange={(event) => { setPlaceQuery(event.target.value); setPlaceResolved(false); setPlaceResults([]); setPlaceSearchAttempted(false); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void findPlaces(); } }} /><button type="button" onClick={() => void findPlaces()} disabled={!placeQuery.trim() || searchingPlace}><Search aria-hidden="true" />{searchingPlace ? "搜索中…" : "搜索地点"}</button></div>{placeResults.length > 0 && <div className="place-search-results" aria-label="具体地点搜索结果">{placeResults.map((place) => <button type="button" key={place.id} aria-label={`选择地点 ${place.name}`} onClick={() => selectPlace(place)}><Building2 aria-hidden="true" /><span><strong>{place.name}</strong><small>{place.address}</small></span></button>)}</div>}{placeQuery.trim() && !placeResolved && !searchingPlace && placeResults.length === 0 && <p className="field-hint">{placeSearchAttempted ? "没有找到匹配地点，请补充区县或道路名称后重试。" : "输入地点后点击“搜索地点”，从结果中选择以保存精确位置。"}</p>}{placeResolved && <p className="location-confirmed"><MapPin aria-hidden="true" />已定位具体地点：{draft.title}<small>{draft.address}</small></p>}<p className="place-attribution">地点搜索由 OpenStreetMap Nominatim 提供</p></div>}
      <label className="dialog-field">节点标题<input className="dialog-input" required value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="例如：京都站、酒店入住" /></label>
      <label className="dialog-field">日期<input className="dialog-input" required type="date" min={tripStartDate} max={tripEndDate} value={draft.date} onChange={(event) => updateDate(event.target.value)} /></label>
      {existingStops.some((item) => item.id !== stop?.id) && <label className="dialog-field dialog-wide">使用已有节点位置<select className="dialog-input" defaultValue="" onChange={(event) => { const source = existingStops.find((item) => item.id === event.target.value); if (source) copyLocation(source); }}><option value="">选择已有节点</option>{existingStops.filter((item) => item.id !== stop?.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      <label className="dialog-field">开始时间<input className="dialog-input" type="datetime-local" min={`${tripStartDate}T00:00`} max={`${tripEndDate}T23:59`} value={draft.startsAt} onChange={(event) => update("startsAt", event.target.value)} /></label>
      <label className="dialog-field">结束时间<input className="dialog-input" type="datetime-local" min={`${tripStartDate}T00:00`} max={`${tripEndDate}T23:59`} value={draft.endsAt} onChange={(event) => update("endsAt", event.target.value)} /></label>
      <div className="dialog-field dialog-wide stop-timezone-settings">
        <label className="stop-timezone-toggle"><input type="checkbox" checked={useLocalTime} onChange={(event) => { const enabled = event.target.checked; setUseLocalTime(enabled); setDraft((current) => ({ ...current, timezone: enabled ? timezoneForCity(current.city ?? "") ?? current.timezone ?? tripTimezone : undefined })); }} />使用节点当地时间</label>
        <p className="field-hint">开启后，开始和结束时间按节点所在地解释；关闭后使用行程时区 {tripTimezone}。</p>
        {useLocalTime && <div className="stop-timezone-control"><label htmlFor="stop-timezone">节点时区</label><input id="stop-timezone" className="dialog-input" list="stop-timezone-options" value={draft.timezone ?? ""} onChange={(event) => update("timezone", event.target.value)} /><datalist id="stop-timezone-options">{timezoneOptions.map((timezone) => <option key={timezone} value={timezone} />)}</datalist><span className="timezone-summary">{formatTimezoneLabel(draft.timezone || tripTimezone, draft.date)}</span></div>}
      </div>
      <label className="dialog-field dialog-wide">安排内容<textarea className="dialog-input dialog-textarea" value={draft.content} onChange={(event) => update("content", event.target.value)} placeholder="景点、餐厅、入住信息等" /></label>
      <label className="dialog-field dialog-wide">备注<textarea className="dialog-input dialog-textarea" value={draft.notes} onChange={(event) => update("notes", event.target.value)} /></label>
      <div className="dialog-wide coordinate-settings"><button type="button" onClick={() => setShowCoordinates((value) => !value)} aria-expanded={showCoordinates}>{showCoordinates ? "收起精确位置" : "调整精确位置（可选）"}</button>{showCoordinates && <div className="coordinate-grid"><label className="dialog-field">纬度（WGS84）<input className="dialog-input" required type="number" min="-90" max="90" step="any" value={draft.latitude} onChange={(event) => updateCoordinate("latitude", Number(event.target.value))} /></label><label className="dialog-field">经度（WGS84）<input className="dialog-input" required type="number" min="-180" max="180" step="any" value={draft.longitude} onChange={(event) => updateCoordinate("longitude", Number(event.target.value))} /></label></div>}</div>
      {error && <p className="dialog-error dialog-wide" role="alert">{error}</p>}
      <div className="dialog-actions dialog-wide"><button type="button" className="dialog-btn-cancel" onClick={onClose}>取消</button><button className="dialog-btn-submit">保存节点</button></div>
    </form>
  </div>;
}
