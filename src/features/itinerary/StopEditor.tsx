import { useState } from "react";
import type { Stop } from "../../domain/models";
import type { StopDraft } from "../../hooks/useItinerary";

interface StopEditorProps { stop?: Stop; date: string; initialCoordinates?: { latitude: number; longitude: number }; existingStops?: Stop[]; onSave: (draft: StopDraft) => Promise<void>; onClose: () => void; }
export function StopEditor({ stop, date, initialCoordinates, existingStops = [], onSave, onClose }: StopEditorProps) {
  const [draft, setDraft] = useState<StopDraft>({ date: stop?.date ?? date, title: stop?.title ?? "", country: stop?.country ?? "", city: stop?.city ?? "", latitude: stop?.latitude ?? initialCoordinates?.latitude ?? 0, longitude: stop?.longitude ?? initialCoordinates?.longitude ?? 0, startsAt: stop?.startsAt ?? "", endsAt: stop?.endsAt ?? "", content: stop?.content ?? "", notes: stop?.notes ?? "" });
  const [error, setError] = useState("");
  const update = <K extends keyof StopDraft>(key: K, value: StopDraft[K]) => setDraft((value0) => ({ ...value0, [key]: value }));
  return <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="编辑节点"><form className="dialog-panel dialog-form" onSubmit={async (event) => { event.preventDefault(); try { await onSave(draft); onClose(); } catch (reason) { setError(reason instanceof Error ? reason.message : "保存失败"); } }}>
    <div className="dialog-header"><h2 className="dialog-title">{stop ? "编辑节点" : "添加节点"}</h2></div>
    <label className="dialog-field">标题<input className="dialog-input" required autoFocus value={draft.title} onChange={(e) => update("title", e.target.value)} /></label>
    <label className="dialog-field">日期<input className="dialog-input" required type="date" value={draft.date} onChange={(e) => update("date", e.target.value)} /></label>
    <label className="dialog-field">城市<input className="dialog-input" value={draft.city} onChange={(e) => update("city", e.target.value)} /></label>
    {existingStops.length > 0 && <label className="dialog-field">复制已有节点坐标<select className="dialog-input" defaultValue="" onChange={(event) => { const source = existingStops.find((item) => item.id === event.target.value); if (source) setDraft((current) => ({ ...current, country: source.country ?? current.country, city: source.city ?? current.city, latitude: source.latitude, longitude: source.longitude })); }}><option value="">选择节点</option>{existingStops.filter((item) => item.id !== stop?.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
    <label className="dialog-field">纬度（WGS84）<input className="dialog-input" required type="number" min="-90" max="90" step="any" value={draft.latitude} onChange={(e) => update("latitude", Number(e.target.value))} /></label>
    <label className="dialog-field">经度（WGS84）<input className="dialog-input" required type="number" min="-180" max="180" step="any" value={draft.longitude} onChange={(e) => update("longitude", Number(e.target.value))} /></label>
    <label className="dialog-field">开始时间<input className="dialog-input" type="datetime-local" value={draft.startsAt} onChange={(e) => update("startsAt", e.target.value)} /></label>
    <label className="dialog-field">结束时间<input className="dialog-input" type="datetime-local" value={draft.endsAt} onChange={(e) => update("endsAt", e.target.value)} /></label>
    <label className="dialog-field">内容<textarea className="dialog-input dialog-textarea" value={draft.content} onChange={(e) => update("content", e.target.value)} /></label>
    <label className="dialog-field">备注<textarea className="dialog-input dialog-textarea" value={draft.notes} onChange={(e) => update("notes", e.target.value)} /></label>{error && <p className="dialog-error">{error}</p>}<div className="dialog-actions"><button type="button" className="dialog-btn-cancel" onClick={onClose}>取消</button><button className="dialog-btn-submit">保存</button></div>
  </form></div>;
}
