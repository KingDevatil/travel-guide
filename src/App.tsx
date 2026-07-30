import { useCallback, useRef, useState } from "react";
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
import { useDialogAccessibility } from "./hooks/useDialogAccessibility";

export default function App() {
  const [activeView, setActiveView] = useState<ViewMode>("itinerary");
  const { trips, loading, error, add, save, duplicate, archive, restore, remove, refresh } = useTrips();
  const [activeTripId, setActiveTripId] = useState<string>();
  const [managerOpen, setManagerOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [editorTrip, setEditorTrip] = useState<Trip | null | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<Trip>();
  const managerButtonRef = useRef<HTMLButtonElement>(null);
  const managerPanelRef = useDialogAccessibility<HTMLDivElement>(managerOpen, () => setManagerOpen(false));
  const participantsPanelRef = useDialogAccessibility<HTMLDivElement>(participantsOpen, () => setParticipantsOpen(false));
  const currentTrip = trips.find((trip) => trip.id === activeTripId) ?? trips.find((trip) => !trip.archivedAt);

  const saveTrip = useCallback(async (draft: TripDraft) => {
    if (editorTrip) await save({ ...editorTrip, ...draft });
    else { const trip = await add(draft); setActiveTripId(trip.id); }
  }, [add, editorTrip, save]);

  const openTripEditor = (trip: Trip | null) => { setManagerOpen(false); setEditorTrip(trip); };
  const openDeleteConfirmation = (trip: Trip) => { setManagerOpen(false); setPendingDelete(trip); };

  if (loading) return <main className="app-loading"><h1>旅程册</h1><p>正在读取本机行程…</p></main>;

  return <>
    {error && <div className="app-error" role="alert">{error}</div>}
    {currentTrip ? <>
      <TripWorkspace trip={currentTrip} trips={trips} activeView={activeView} onChangeView={setActiveView} onOpenManager={() => setManagerOpen(true)} onOpenParticipants={() => setParticipantsOpen(true)} managerButtonRef={managerButtonRef} />
      <PrintTrip trip={currentTrip} />
    </> : <main className="app-loading app-empty"><h1>旅程册</h1><h2>{trips.length ? "所有行程都已归档" : "还没有行程"}</h2><p>{trips.length ? "可在行程管理中恢复归档行程，或创建一份新计划。" : "创建一个旅行计划，开始安排地点、交通、预算和行李。"}</p><div className="app-empty__actions"><button onClick={() => setEditorTrip(null)}>新建行程</button>{trips.length > 0 && <button ref={managerButtonRef} className="secondary-action" onClick={() => setManagerOpen(true)}>管理已归档行程</button>}</div></main>}
    {managerOpen && <div className="trip-manager-overlay" role="dialog" aria-modal="true" aria-label="我的行程" onMouseDown={(event) => { if (event.target === event.currentTarget) setManagerOpen(false); }}><div ref={managerPanelRef} className="trip-manager-panel"><button className="trip-manager-close" onClick={() => { setManagerOpen(false); managerButtonRef.current?.focus(); }} aria-label="关闭行程管理">×</button>
      <TripList trips={trips} activeTripId={currentTrip?.id} onSelect={(id) => { const selected = trips.find((trip) => trip.id === id); if (selected?.archivedAt) return; setActiveTripId(id); setManagerOpen(false); }} onCreate={() => openTripEditor(null)} onEdit={(trip) => openTripEditor(trip)} onDuplicate={(trip) => void duplicate(trip).then(setActiveTripId)} onArchive={(trip) => void archive(trip.id).then(() => { if (trip.id === currentTrip?.id) setActiveTripId(undefined); })} onRestore={(trip) => void restore(trip.id).then(() => { setActiveTripId(trip.id); setManagerOpen(false); })} onDelete={openDeleteConfirmation} />
      {currentTrip && <><ParticipantManager trip={currentTrip} onChanged={() => void refresh()} /><BackupPanel trip={currentTrip} onImported={(id) => { void refresh().then(() => setActiveTripId(id)); }} /></>}
    </div></div>}
    {participantsOpen && currentTrip && <div className="trip-manager-overlay" role="dialog" aria-modal="true" aria-label="成员管理" onMouseDown={(event) => { if (event.target === event.currentTarget) setParticipantsOpen(false); }}><div ref={participantsPanelRef} className="trip-manager-panel"><button className="trip-manager-close" onClick={() => setParticipantsOpen(false)} aria-label="关闭成员管理">×</button><ParticipantManager trip={currentTrip} onChanged={() => void refresh()} /></div></div>}
    {editorTrip !== undefined && <TripEditor trip={editorTrip ?? undefined} onSave={saveTrip} onClose={() => setEditorTrip(undefined)} />}
    <ConfirmDialog open={Boolean(pendingDelete)} title="删除行程？" message={`将永久删除“${pendingDelete?.title ?? ""}”及其所有节点、交通、消费和行李数据。`} confirmLabel="确认删除" onClose={() => { setPendingDelete(undefined); setManagerOpen(true); }} onConfirm={() => { if (pendingDelete) void remove(pendingDelete.id).then(() => { if (pendingDelete.id === currentTrip?.id) setActiveTripId(undefined); setPendingDelete(undefined); }); }} />
  </>;
}
