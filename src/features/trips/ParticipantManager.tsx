import { useCallback, useEffect, useState } from "react";
import type { Participant, Trip } from "../../domain/models";
import { addParticipant, deleteParticipant, getParticipants, updateParticipant } from "../../db/trip-repository";

export function ParticipantManager({ trip, onChanged }: { trip: Trip; onChanged?: () => void }) {
  const [people, setPeople] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => setPeople(await getParticipants(trip.id)), [trip.id]);
  useEffect(() => { void load(); }, [load]);
  return <section className="participant-manager"><h3>同行成员</h3><form onSubmit={async (event) => { event.preventDefault(); if (!name.trim()) return; await addParticipant({ id: crypto.randomUUID(), tripId: trip.id, name: name.trim() }); setName(""); await load(); onChanged?.(); }}><label>成员姓名<input value={name} onChange={(event) => setName(event.target.value)} /></label><button>添加成员</button></form>{error && <p role="alert">{error}</p>}<ul>{people.map((person) => <li key={person.id}><input aria-label={`${person.name}姓名`} value={person.name} onChange={(event) => setPeople((current) => current.map((item) => item.id === person.id ? { ...item, name: event.target.value } : item))} onBlur={() => void updateParticipant(person)} /><button onClick={() => void deleteParticipant(person.id).then(load).then(onChanged).catch((reason) => setError(reason instanceof Error ? reason.message : "删除失败"))}>删除</button></li>)}</ul></section>;
}
