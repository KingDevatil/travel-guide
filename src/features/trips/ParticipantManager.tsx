import { useCallback, useEffect, useState } from "react";
import type { Participant, Trip } from "../../domain/models";
import { addParticipant, deleteParticipant, getParticipants, updateParticipant } from "../../db/trip-repository";
import { subscribeTripChanges } from "../../db/change-events";
import { ConfirmDialog } from "../../components/ConfirmDialog";

export function ParticipantManager({ trip, onChanged }: { trip: Trip; onChanged?: () => void }) {
  const [people, setPeople] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Participant>();
  const load = useCallback(async () => setPeople(await getParticipants(trip.id)), [trip.id]);
  useEffect(() => {
    setName("");
    setError("");
    setPendingDelete(undefined);
    void load();
    return subscribeTripChanges((changedTripId) => {
      if (changedTripId === trip.id) void load();
    });
  }, [load, trip.id]);
  return <section className="participant-manager"><h3>AA 费用成员</h3><p>成员仅用于本机账单分摊，不会创建账号、发送邀请或进行实时协作。</p><form onSubmit={async (event) => { event.preventDefault(); if (!name.trim()) return; await addParticipant({ id: crypto.randomUUID(), tripId: trip.id, name: name.trim() }); setName(""); await load(); onChanged?.(); }}><label>成员姓名<input value={name} onChange={(event) => setName(event.target.value)} /></label><button>添加 AA 成员</button></form>{error && <p role="alert">{error}</p>}<ul>{people.map((person) => <li key={person.id}><input aria-label={`${person.name}姓名`} value={person.name} onChange={(event) => setPeople((current) => current.map((item) => item.id === person.id ? { ...item, name: event.target.value } : item))} onBlur={() => void updateParticipant(person)} /><button onClick={() => setPendingDelete(person)}>删除</button></li>)}</ul>
    <ConfirmDialog open={Boolean(pendingDelete)} title="删除 AA 费用成员？" message={`将删除“${pendingDelete?.name ?? ""}”。其分摊记录会被移除；如果仍是已支付消费的付款人，将阻止删除。`} confirmLabel="删除成员" onClose={() => setPendingDelete(undefined)} onConfirm={() => { if (!pendingDelete) return; void deleteParticipant(pendingDelete.id).then(load).then(onChanged).then(() => setPendingDelete(undefined)).catch((reason) => { setError(reason instanceof Error ? reason.message : "删除失败"); setPendingDelete(undefined); }); }} />
  </section>;
}
