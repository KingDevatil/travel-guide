import type { Trip } from "../../domain/models";

interface TripListProps { trips: Trip[]; activeTripId?: string; onSelect: (id: string) => void; onCreate: () => void; onEdit: (trip: Trip) => void; onDuplicate: (trip: Trip) => void; onArchive: (trip: Trip) => void; onRestore: (trip: Trip) => void; onDelete: (trip: Trip) => void; }

export function TripList({ trips, activeTripId, onSelect, onCreate, onEdit, onDuplicate, onArchive, onRestore, onDelete }: TripListProps) {
  return <section className="trip-list" aria-label="我的行程"><div className="trip-list__header"><h2>我的行程</h2><button className="trip-list__create" onClick={onCreate}>新建行程</button></div>
    {trips.length === 0 ? <p className="trip-list__empty">还没有行程，创建第一份旅行计划吧。</p> : <ul>{trips.map((trip) => <li key={trip.id} className={trip.id === activeTripId ? "trip-list__item trip-list__item--active" : "trip-list__item"}>
      <button className="trip-list__select" aria-label={`打开 ${trip.title}`} onClick={() => onSelect(trip.id)}><strong>{trip.title}</strong><span>{trip.startDate} 至 {trip.endDate}</span>{trip.archivedAt && <em>已归档</em>}</button>
      <div className="trip-list__actions"><button onClick={() => onEdit(trip)}>编辑</button><button onClick={() => onDuplicate(trip)}>复制</button>{trip.archivedAt ? <button onClick={() => onRestore(trip)}>恢复</button> : <button onClick={() => onArchive(trip)}>归档</button>}<button onClick={() => onDelete(trip)}>删除</button></div>
    </li>)}</ul>}</section>;
}
