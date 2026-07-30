import { useCallback, useRef, useState } from "react";
import type { Trip } from "./domain/models";
import type { ViewMode } from "./types";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { PrintTrip } from "./components/PrintTrip";
import { TripWorkspace } from "./components/TripWorkspace";
import { BackupPanel } from "./features/transfer/BackupPanel";
import { ImportBackupButton } from "./features/transfer/ImportBackupButton";
import { ParticipantManager } from "./features/trips/ParticipantManager";
import { TripEditor } from "./features/trips/TripEditor";
import { TripList } from "./features/trips/TripList";
import { useTrips, type TripDraft } from "./hooks/useTrips";
import { useDialogAccessibility } from "./hooks/useDialogAccessibility";

export default function App() {
  const [activeView, setActiveView] = useState<ViewMode>("overview");
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
    else { const trip = await add(draft); setActiveTripId(trip.id); setActiveView("overview"); }
  }, [add, editorTrip, save]);

  const openTripEditor = (trip: Trip | null) => { setManagerOpen(false); setEditorTrip(trip); };
  const openDeleteConfirmation = (trip: Trip) => { setManagerOpen(false); setPendingDelete(trip); };

  if (loading) return <main className="app-loading"><h1>旅程册</h1><p>正在读取本机行程…</p></main>;

  return <>
    {error && <div className="app-error" role="alert">{error}</div>}
    {currentTrip ? <>
      <TripWorkspace trip={currentTrip} trips={trips} activeView={activeView} onChangeView={setActiveView} onSaveTrip={(trip) => save(trip)} onOpenManager={() => setManagerOpen(true)} onOpenParticipants={() => setParticipantsOpen(true)} managerButtonRef={managerButtonRef} />
      <PrintTrip trip={currentTrip} />
    </> : <main className="app-loading app-empty"><h1>旅程册</h1><h2>{trips.length ? "所有行程都已归档" : "从一段旅程开始"}</h2><p>{trips.length ? "可在行程管理中恢复归档行程、创建新计划，或从备份恢复。" : "新建计划，或导入曾经导出的 JSON 备份继续编辑。"}</p><div className="app-empty__actions"><button onClick={() => setEditorTrip(null)}>新建行程</button><ImportBackupButton className="secondary-action" label="从备份恢复" onImported={(id) => { void refresh().then(() => { setActiveTripId(id); setActiveView("overview"); }); }} />{trips.length > 0 && <button ref={managerButtonRef} className="secondary-action" onClick={() => setManagerOpen(true)}>管理已归档行程</button>}</div></main>}
    {managerOpen && <div className="trip-manager-overlay" role="dialog" aria-modal="true" aria-label="我的行程" onMouseDown={(event) => { if (event.target === event.currentTarget) setManagerOpen(false); }}><div ref={managerPanelRef} className="trip-manager-panel"><button className="trip-manager-close" onClick={() => { setManagerOpen(false); managerButtonRef.current?.focus(); }} aria-label="关闭行程管理">×</button>
      <TripList trips={trips} activeTripId={currentTrip?.id} onSelect={(id) => { const selected = trips.find((trip) => trip.id === id); if (selected?.archivedAt) return; setActiveTripId(id); setActiveView("overview"); setManagerOpen(false); }} onCreate={() => openTripEditor(null)} onEdit={(trip) => openTripEditor(trip)} onDuplicate={(trip) => void duplicate(trip).then((id) => { setActiveTripId(id); setActiveView("overview"); })} onArchive={(trip) => void archive(trip.id).then(() => { if (trip.id === currentTrip?.id) setActiveTripId(undefined); })} onRestore={(trip) => void restore(trip.id).then(() => { setActiveTripId(trip.id); setActiveView("overview"); setManagerOpen(false); })} onDelete={openDeleteConfirmation} />
      {currentTrip && <><ParticipantManager trip={currentTrip} onChanged={() => void refresh()} /><BackupPanel trip={currentTrip} onImported={(id) => { void refresh().then(() => { setActiveTripId(id); setActiveView("overview"); }); }} /></>}
    </div></div>}
    {participantsOpen && currentTrip && <div className="trip-manager-overlay" role="dialog" aria-modal="true" aria-label="AA 费用成员" onMouseDown={(event) => { if (event.target === event.currentTarget) setParticipantsOpen(false); }}><div ref={participantsPanelRef} className="trip-manager-panel"><button className="trip-manager-close" onClick={() => setParticipantsOpen(false)} aria-label="关闭 AA 费用成员">×</button><ParticipantManager trip={currentTrip} onChanged={() => void refresh()} /></div></div>}
    {editorTrip !== undefined && <TripEditor trip={editorTrip ?? undefined} onSave={saveTrip} onClose={() => setEditorTrip(undefined)} />}
    <ConfirmDialog open={Boolean(pendingDelete)} title="删除行程？" message={`将永久删除“${pendingDelete?.title ?? ""}”及其所有安排、交通、消费和行李数据。`} confirmLabel="确认删除" onClose={() => { setPendingDelete(undefined); setManagerOpen(true); }} onConfirm={() => { if (pendingDelete) void remove(pendingDelete.id).then(() => { if (pendingDelete.id === currentTrip?.id) setActiveTripId(undefined); setPendingDelete(undefined); }); }} />
  </>;
}
