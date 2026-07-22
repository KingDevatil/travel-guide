import { X } from "lucide-react";
import { useState } from "react";
import type { Leg, Stop, TransportMode } from "../../domain/models";
import type { LegDraft } from "../../hooks/useItinerary";

const modes: { value: TransportMode; label: string }[] = [
  { value: "walk", label: "步行" }, { value: "bike", label: "骑行" }, { value: "bus", label: "公交" },
  { value: "metro", label: "地铁" }, { value: "taxi", label: "出租车" }, { value: "drive", label: "自驾" },
  { value: "train", label: "火车" }, { value: "highSpeedRail", label: "高铁" }, { value: "flight", label: "飞机" },
  { value: "ferry", label: "轮渡" }, { value: "other", label: "其他" },
];

interface LegEditorProps { leg?: Leg; stops: Stop[]; currency: string; onSave: (draft: LegDraft) => Promise<void>; onClose: () => void; }

export function LegEditor({ leg, stops, currency, onSave, onClose }: LegEditorProps) {
  const [draft, setDraft] = useState<LegDraft>({ fromStopId: leg?.fromStopId ?? stops[0]?.id ?? "", toStopId: leg?.toStopId ?? stops[1]?.id ?? "", mode: leg?.mode ?? "train", departsAt: leg?.departsAt ?? "", arrivesAt: leg?.arrivesAt ?? "", serviceNumber: leg?.serviceNumber ?? "", notes: leg?.notes ?? "" });
  const [error, setError] = useState("");
  const [expense, setExpense] = useState("");

  return <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="leg-editor-title"><form className="dialog-panel dialog-form" onSubmit={async (event) => { event.preventDefault(); if (draft.fromStopId === draft.toStopId) { setError("出发节点和到达节点不能相同。"); return; } try { await onSave(draft); onClose(); } catch (reason) { setError(reason instanceof Error ? reason.message : "保存失败"); } }}>
    <div className="dialog-header dialog-wide"><div><h2 id="leg-editor-title" className="dialog-title">{leg ? "编辑交通" : "添加交通"}</h2><p>连接两个行程节点，可同时记录预计费用。</p></div><button type="button" className="dialog-close-btn" onClick={onClose} aria-label="关闭交通编辑"><X aria-hidden="true" /></button></div>
    <label className="dialog-field">出发节点<select className="dialog-input" value={draft.fromStopId} onChange={(event) => setDraft({ ...draft, fromStopId: event.target.value })}>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.title}</option>)}</select></label>
    <label className="dialog-field">到达节点<select className="dialog-input" value={draft.toStopId} onChange={(event) => setDraft({ ...draft, toStopId: event.target.value })}>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.title}</option>)}</select></label>
    <label className="dialog-field">交通方式<select className="dialog-input" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as TransportMode })}>{modes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
    <label className="dialog-field">班次 / 车次<input className="dialog-input" value={draft.serviceNumber} onChange={(event) => setDraft({ ...draft, serviceNumber: event.target.value })} placeholder="例如：JR 新快速" /></label>
    <label className="dialog-field">出发时间<input className="dialog-input" type="datetime-local" value={draft.departsAt} onChange={(event) => setDraft({ ...draft, departsAt: event.target.value })} /></label>
    <label className="dialog-field">到达时间<input className="dialog-input" type="datetime-local" value={draft.arrivesAt} onChange={(event) => setDraft({ ...draft, arrivesAt: event.target.value })} /></label>
    <label className="dialog-field dialog-wide">备注<textarea className="dialog-input dialog-textarea" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
    {!leg?.expenseId && <label className="dialog-field dialog-wide">预计交通费（{currency}）<input className="dialog-input" inputMode="decimal" value={expense} onChange={(event) => { setExpense(event.target.value); setDraft((current) => ({ ...current, expenseAmountMinor: event.target.value ? Math.round(Number(event.target.value) * (currency === "JPY" ? 1 : 100)) : undefined, expenseCurrency: currency })); }} /></label>}
    {error && <p className="dialog-error dialog-wide" role="alert">{error}</p>}
    <div className="dialog-actions dialog-wide"><button type="button" className="dialog-btn-cancel" onClick={onClose}>取消</button><button className="dialog-btn-submit" disabled={stops.length < 2}>保存</button></div>
  </form></div>;
}
