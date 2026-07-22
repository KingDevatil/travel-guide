import { MapPin, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Stop } from "../../domain/models";
import { searchCityCatalog, type CityOption } from "../../data/cities";
import type { StopDraft } from "../../hooks/useItinerary";

interface StopEditorProps {
  stop?: Stop;
  date: string;
  initialCoordinates?: { latitude: number; longitude: number };
  existingStops?: Stop[];
  onSave: (draft: StopDraft) => Promise<void>;
  onClose: () => void;
}

export function StopEditor({ stop, date, initialCoordinates, existingStops = [], onSave, onClose }: StopEditorProps) {
  const [draft, setDraft] = useState<StopDraft>({ date: stop?.date ?? date, title: stop?.title ?? "", country: stop?.country ?? "", city: stop?.city ?? "", latitude: stop?.latitude ?? initialCoordinates?.latitude ?? 0, longitude: stop?.longitude ?? initialCoordinates?.longitude ?? 0, startsAt: stop?.startsAt ?? "", endsAt: stop?.endsAt ?? "", content: stop?.content ?? "", notes: stop?.notes ?? "" });
  const [cityQuery, setCityQuery] = useState(stop?.city ?? "");
  const [locationResolved, setLocationResolved] = useState(Boolean(stop || initialCoordinates));
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [error, setError] = useState("");
  const suggestions = useMemo(() => locationResolved ? [] : searchCityCatalog(cityQuery), [cityQuery, locationResolved]);
  const update = <K extends keyof StopDraft>(key: K, value: StopDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const selectCity = (city: CityOption) => {
    setCityQuery(city.name);
    setLocationResolved(true);
    setError("");
    setDraft((current) => ({ ...current, title: current.title.trim() ? current.title : city.name, country: city.country, city: city.name, latitude: city.latitude, longitude: city.longitude }));
  };

  const copyLocation = (source: Stop) => {
    setCityQuery(source.city || source.title);
    setLocationResolved(true);
    setDraft((current) => ({ ...current, country: source.country ?? "", city: source.city ?? source.title, latitude: source.latitude, longitude: source.longitude }));
  };

  return <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="stop-editor-title">
    <form className="dialog-panel dialog-form dialog-form--wide" onSubmit={async (event) => {
      event.preventDefault();
      if (!locationResolved) { setError("请从搜索结果选择城市，或前往地图页点选位置。"); return; }
      try { await onSave(draft); onClose(); } catch (reason) { setError(reason instanceof Error ? reason.message : "保存失败"); }
    }}>
      <div className="dialog-header dialog-wide"><div><h2 id="stop-editor-title" className="dialog-title">{stop ? "编辑节点" : "添加节点"}</h2><p>先搜索目的地，坐标会自动填写。</p></div><button type="button" className="dialog-close-btn" onClick={onClose} aria-label="关闭节点编辑"><X aria-hidden="true" /></button></div>
      <div className="dialog-field dialog-wide city-search-field">
        <label htmlFor="stop-city-search">城市或目的地</label>
        <div className="city-search-input"><Search aria-hidden="true" /><input id="stop-city-search" className="dialog-input" autoFocus autoComplete="off" placeholder="搜索城市，如京都、Osaka" value={cityQuery} onChange={(event) => { setCityQuery(event.target.value); setLocationResolved(false); setDraft((current) => ({ ...current, city: event.target.value })); }} /></div>
        {suggestions.length > 0 && <div className="city-search-results" aria-label="城市搜索结果">{suggestions.map((city) => <button type="button" key={`${city.country}-${city.name}`} aria-label={`选择 ${city.name}，${city.country}`} onClick={() => selectCity(city)}><MapPin aria-hidden="true" /><span><strong>{city.name}</strong><small>{city.country}</small></span></button>)}</div>}
        {cityQuery.trim() && !locationResolved && suggestions.length === 0 && <p className="field-hint">未找到匹配城市，可换用中文或英文名称，或在地图页点选位置。</p>}
        {locationResolved && <p className="location-confirmed"><MapPin aria-hidden="true" />已定位：{draft.city || "地图选点"}{draft.country ? `，${draft.country}` : ""}</p>}
      </div>
      <label className="dialog-field">节点标题<input className="dialog-input" required value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="例如：京都站、酒店入住" /></label>
      <label className="dialog-field">日期<input className="dialog-input" required type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} /></label>
      {existingStops.some((item) => item.id !== stop?.id) && <label className="dialog-field dialog-wide">使用已有节点位置<select className="dialog-input" defaultValue="" onChange={(event) => { const source = existingStops.find((item) => item.id === event.target.value); if (source) copyLocation(source); }}><option value="">选择已有节点</option>{existingStops.filter((item) => item.id !== stop?.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      <label className="dialog-field">开始时间<input className="dialog-input" type="datetime-local" value={draft.startsAt} onChange={(event) => update("startsAt", event.target.value)} /></label>
      <label className="dialog-field">结束时间<input className="dialog-input" type="datetime-local" value={draft.endsAt} onChange={(event) => update("endsAt", event.target.value)} /></label>
      <label className="dialog-field dialog-wide">安排内容<textarea className="dialog-input dialog-textarea" value={draft.content} onChange={(event) => update("content", event.target.value)} placeholder="景点、餐厅、入住信息等" /></label>
      <label className="dialog-field dialog-wide">备注<textarea className="dialog-input dialog-textarea" value={draft.notes} onChange={(event) => update("notes", event.target.value)} /></label>
      <div className="dialog-wide coordinate-settings"><button type="button" onClick={() => setShowCoordinates((value) => !value)} aria-expanded={showCoordinates}>{showCoordinates ? "收起精确位置" : "调整精确位置（可选）"}</button>{showCoordinates && <div className="coordinate-grid"><label className="dialog-field">纬度（WGS84）<input className="dialog-input" required type="number" min="-90" max="90" step="any" value={draft.latitude} onChange={(event) => { update("latitude", Number(event.target.value)); setLocationResolved(true); }} /></label><label className="dialog-field">经度（WGS84）<input className="dialog-input" required type="number" min="-180" max="180" step="any" value={draft.longitude} onChange={(event) => { update("longitude", Number(event.target.value)); setLocationResolved(true); }} /></label></div>}</div>
      {error && <p className="dialog-error dialog-wide" role="alert">{error}</p>}
      <div className="dialog-actions dialog-wide"><button type="button" className="dialog-btn-cancel" onClick={onClose}>取消</button><button className="dialog-btn-submit">保存节点</button></div>
    </form>
  </div>;
}
