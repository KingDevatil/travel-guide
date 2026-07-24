import { useCallback, useEffect, useRef, useState } from "react";
import type { Trip } from "./domain/models";
import type { ViewMode } from "./types";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { PrintTrip } from "./components/PrintTrip";
import { TripWorkspace } from "./components/TripWorkspace";
import { BackupPanel } from "./features/transfer/BackupPanel";
import { ParticipantManager } from "./features/trips/ParticipantManager";
import { TripEditor } from "./features/trips/TripEditor";
import { TripList } from "./features/trips/TripList";
import { useTrips, type TripDraft } from "./hooks/useTrips";

export default function App() {
  const [activeView, setActiveView] = useState<ViewMode>("itinerary");
  const { trips, loading, error, add, save, duplicate, archive, restore, remove, refresh } = useTrips();
  const [activeTripId, setActiveTripId] = useState<string>();
  const [managerOpen, setManagerOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [editorTrip, setEditorTrip] = useState<Trip | null | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<Trip>();
  const managerButtonRef = useRef<HTMLButtonElement>(null);
  const managerPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!managerOpen) return; const panel = managerPanelRef.current; requestAnimationFrame(() => panel?.querySelector<HTMLElement>("button")?.focus()); const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setManagerOpen(false); managerButtonRef.current?.focus(); return; } if (event.key === "Tab" && panel) { const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]; if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [managerOpen]);
  const currentTrip = trips.find((trip) => trip.id === activeTripId) ?? trips.find((trip) => !trip.archivedAt);

  const saveTrip = useCallback(async (draft: TripDraft) => {
    if (editorTrip) await save({ ...editorTrip, ...draft });
    else { const trip = await add(draft); setActiveTripId(trip.id); }
  }, [add, editorTrip, save]);

  const openTripEditor = (trip: Trip | null) => { setManagerOpen(false); setEditorTrip(trip); };
  const openDeleteConfirmation = (trip: Trip) => { setManagerOpen(false); setPendingDelete(trip); };

  if (loading) return <main className="app-loading"><h1>旅程册</h1><p>正在读取本机行程…</p></main>;

  if (!currentTrip) return <>
    <main className="app-loading app-empty"><h1>旅程册</h1><h2>还没有行程</h2><p>创建一个旅行计划，开始安排地点、交通、预算和行李。</p><button onClick={() => setEditorTrip(null)}>新建行程</button></main>
    {editorTrip !== undefined && <TripEditor trip={editorTrip ?? undefined} onSave={saveTrip} onClose={() => setEditorTrip(undefined)} />}
  </>;

  return <>
    {error && <div className="app-error" role="alert">{error}</div>}
    <TripWorkspace trip={currentTrip} trips={trips} activeView={activeView} onChangeView={setActiveView} onOpenManager={() => setManagerOpen(true)} onOpenParticipants={() => setParticipantsOpen(true)} managerButtonRef={managerButtonRef} />
    <PrintTrip trip={currentTrip} />
    {managerOpen && <div className="trip-manager-overlay" role="dialog" aria-modal="true" aria-label="我的行程" onMouseDown={(event) => { if (event.target === event.currentTarget) setManagerOpen(false); }}><div ref={managerPanelRef} className="trip-manager-panel"><button className="trip-manager-close" onClick={() => { setManagerOpen(false); managerButtonRef.current?.focus(); }} aria-label="关闭行程管理">×</button>
      <TripList trips={trips} activeTripId={currentTrip.id} onSelect={(id) => { setActiveTripId(id); setManagerOpen(false); }} onCreate={() => openTripEditor(null)} onEdit={(trip) => openTripEditor(trip)} onDuplicate={(trip) => void duplicate(trip).then(setActiveTripId)} onArchive={(trip) => void archive(trip.id).then(() => { if (trip.id === currentTrip.id) setActiveTripId(undefined); })} onRestore={(trip) => void restore(trip.id).then(() => setActiveTripId(trip.id))} onDelete={openDeleteConfirmation} />
      <ParticipantManager trip={currentTrip} onChanged={() => void refresh()} />
      <BackupPanel trip={currentTrip} onImported={(id) => { void refresh().then(() => setActiveTripId(id)); }} />
    </div></div>}
    {participantsOpen && <div className="trip-manager-overlay" role="dialog" aria-modal="true" aria-label="成员管理" onMouseDown={(event) => { if (event.target === event.currentTarget) setParticipantsOpen(false); }}><div className="trip-manager-panel"><button className="trip-manager-close" onClick={() => setParticipantsOpen(false)} aria-label="关闭成员管理">×</button><ParticipantManager trip={currentTrip} onChanged={() => void refresh()} /></div></div>}
    {editorTrip !== undefined && <TripEditor trip={editorTrip ?? undefined} onSave={saveTrip} onClose={() => setEditorTrip(undefined)} />}
    <ConfirmDialog open={Boolean(pendingDelete)} title="删除行程？" message={`将永久删除“${pendingDelete?.title ?? ""}”及其所有节点、交通、消费和行李数据。`} confirmLabel="确认删除" onClose={() => { setPendingDelete(undefined); setManagerOpen(true); }} onConfirm={() => { if (pendingDelete) void remove(pendingDelete.id).then(() => { if (pendingDelete.id === currentTrip.id) setActiveTripId(undefined); setPendingDelete(undefined); }); }} />
  </>;
}
