import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Trip } from "../../domain/models";
import type { TripDraft } from "../../hooks/useTrips";
import { getStops } from "../../db/trip-repository";
import { useDialogAccessibility } from "../../hooks/useDialogAccessibility";
import { TRIP_ICON_OPTIONS, getTripIconOption } from "./trip-icon-options";
import { inferTripIconName } from "./infer-trip-icon";

interface TripEditorProps { trip?: Trip; onSave: (draft: TripDraft) => Promise<void>; onClose: () => void; }
const emptyDraft: TripDraft = { title: "", icon: undefined, startDate: "", endDate: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai", defaultCurrency: "CNY" };
const toDraft = (trip?: Trip): TripDraft => trip ? { ...trip } : emptyDraft;

export function TripEditor({ trip, onSave, onClose }: TripEditorProps) {
  const panelRef = useDialogAccessibility<HTMLFormElement>(true, onClose);
  const [draft, setDraft] = useState<TripDraft>(() => toDraft(trip));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setDraft(toDraft(trip)), [trip]);
  const update = <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const automaticIcon = inferTripIconName(draft.title);
  const effectiveIcon = draft.icon ?? automaticIcon;
  const effectiveIconOption = getTripIconOption(effectiveIcon);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.startDate || !draft.endDate) return setError("请填写标题与起止日期。");
    if (draft.endDate < draft.startDate) return setError("结束日期不能早于开始日期。");
    if (trip) { const outside = (await getStops(trip.id)).filter((stop) => stop.date < draft.startDate || stop.date > draft.endDate); if (outside.length) return setError(`有 ${outside.length} 个节点超出新的日期范围，请先调整这些节点日期。`); }
    setSaving(true); setError("");
    try { await onSave({ ...draft, title: draft.title.trim() }); onClose(); } catch { setError("保存失败，请重试。"); } finally { setSaving(false); }
  };
  return <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="trip-editor-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form ref={panelRef} className="dialog-panel dialog-form" onSubmit={submit}>
      <div className="dialog-header dialog-wide"><div><h2 id="trip-editor-title" className="dialog-title">{trip ? "编辑行程" : "新建行程"}</h2><p>修改名称、日期和行程默认设置。</p></div><button type="button" className="dialog-close-btn" onClick={onClose} aria-label="关闭行程编辑"><X aria-hidden="true" /></button></div>
      <label className="dialog-field">行程名称<input className="dialog-input" autoFocus value={draft.title} onChange={(e) => update("title", e.target.value)} /></label>
      <fieldset className="trip-icon-picker dialog-wide">
        <legend>行程图标</legend>
        <div className="trip-icon-picker__summary">
          <p>{draft.icon ? `已手动选择“${effectiveIconOption.label}”。` : `自动匹配：已根据行程名称选择“${effectiveIconOption.label}”。`}</p>
          {draft.icon && <button type="button" onClick={() => update("icon", undefined)}>恢复自动匹配</button>}
        </div>
        <div className="trip-icon-picker__grid">
          {TRIP_ICON_OPTIONS.map(({ value, label, Icon }) => <label key={value}>
            <input type="radio" name="trip-icon" value={value} checked={effectiveIcon === value} onChange={() => update("icon", value)} aria-label={`选择图标：${label}`} />
            <span><Icon aria-hidden="true" /><b>{label}</b>{!draft.icon && effectiveIcon === value && <small>自动</small>}</span>
          </label>)}
        </div>
      </fieldset>
      <label className="dialog-field">开始日期<input className="dialog-input" type="date" value={draft.startDate} onChange={(e) => update("startDate", e.target.value)} /></label>
      <label className="dialog-field">结束日期<input className="dialog-input" type="date" value={draft.endDate} onChange={(e) => update("endDate", e.target.value)} /></label>
      <label className="dialog-field">时区<input className="dialog-input" value={draft.timezone} onChange={(e) => update("timezone", e.target.value)} /></label>
      <label className="dialog-field">默认币种<input className="dialog-input" value={draft.defaultCurrency} maxLength={10} onChange={(e) => update("defaultCurrency", e.target.value.toUpperCase())} /></label>
      {error && <p className="dialog-error dialog-wide" role="alert">{error}</p>}
      <div className="dialog-actions dialog-wide"><button type="button" className="dialog-btn-cancel" onClick={onClose}>取消</button><button className="dialog-btn-submit" disabled={saving}>{saving ? "保存中…" : "保存"}</button></div>
    </form>
  </div>;
}
