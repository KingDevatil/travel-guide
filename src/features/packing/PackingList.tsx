import { useCallback, useEffect, useState } from "react";
import type { PackingItem, Trip } from "../../domain/models";
import { addPackingItem, copyPackingItems, deletePackingItem, getPackingItems, updatePackingItem } from "../../db/trip-repository";
import { packingTemplates } from "./templates";

const categories = ["证件", "衣物", "洗护", "药品", "数码", "充电", "钱款", "户外", "儿童", "其他"];

export function PackingList({ trip, trips = [] }: { trip: Trip; trips?: Trip[] }) {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("其他");
  const [quantity, setQuantity] = useState("1");
  const [required, setRequired] = useState(false);
  const [notes, setNotes] = useState("");
  const [hidePacked, setHidePacked] = useState(false);
  const [editing, setEditing] = useState<PackingItem>();
  const [sourceTripId, setSourceTripId] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => setItems(await getPackingItems(trip.id)), [trip.id]);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setTitle(""); setCategory("其他"); setQuantity("1"); setRequired(false); setNotes(""); setEditing(undefined); };
  const addTemplate = async (name: keyof typeof packingTemplates) => { let added = 0; for (const value of packingTemplates[name]) { if (!items.some((item) => item.title === value && item.category === "其他")) { await addPackingItem({ id: crypto.randomUUID(), tripId: trip.id, category: "其他", title: value, quantity: 1, required: false, packed: false, sortOrder: items.length + added }); added += 1; } } setMessage(`已从${name}模板添加 ${added} 项，重复项已跳过。`); await load(); };
  return <section className="feature-panel packing-list" aria-label="行李清单"><header className="feature-heading"><div><h2>行李清单</h2><p>{items.filter((item) => item.packed).length} / {items.length} 已准备</p></div><label className="check-row"><input type="checkbox" checked={hidePacked} onChange={(event) => setHidePacked(event.target.checked)} />隐藏已完成</label></header>
    <form className="feature-form packing-form" onSubmit={async (event) => { event.preventDefault(); const count = Number(quantity); if (!title.trim() || !Number.isInteger(count) || count < 1) return; const item: PackingItem = { id: editing?.id ?? crypto.randomUUID(), tripId: trip.id, category, title: title.trim(), quantity: count, required, packed: editing?.packed ?? false, notes: notes.trim() || undefined, sortOrder: editing?.sortOrder ?? items.length }; if (editing) await updatePackingItem(item); else await addPackingItem(item); reset(); await load(); }}><label>物品<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>分类<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label>数量<input type="number" min="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><label>备注<input value={notes} onChange={(event) => setNotes(event.target.value)} /></label><label className="check-row"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />必需品</label><div className="form-actions">{editing && <button type="button" onClick={reset}>取消编辑</button>}<button className="primary-action">{editing ? "保存物品" : "添加物品"}</button></div></form>
    <div className="packing-tools"><div>{Object.keys(packingTemplates).map((name) => <button key={name} onClick={() => void addTemplate(name as keyof typeof packingTemplates)}>{name}模板</button>)}</div><button onClick={() => void Promise.all(items.filter((item) => item.packed).map((item) => updatePackingItem({ ...item, packed: false }))).then(load)}>全部标为未准备</button>{trips.some((value) => value.id !== trip.id) && <div className="copy-packing"><label>复制其他行程清单<select value={sourceTripId} onChange={(event) => setSourceTripId(event.target.value)}><option value="">选择行程</option>{trips.filter((value) => value.id !== trip.id).map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label><button disabled={!sourceTripId} onClick={() => void copyPackingItems(sourceTripId, trip.id).then((count) => { setMessage(`已复制 ${count} 项，重复项已跳过。`); return load(); })}>复制清单</button></div>}</div>{message && <p role="status">{message}</p>}
    <ul className="feature-list">{items.filter((item) => !hidePacked || !item.packed).map((item) => <li key={item.id} className={item.required && !item.packed ? "required-item" : ""}><label className="check-row"><input type="checkbox" checked={item.packed} onChange={() => void updatePackingItem({ ...item, packed: !item.packed }).then(load)} /><span><strong>{item.title} × {item.quantity}</strong><small>{item.category}{item.notes ? ` · ${item.notes}` : ""}{item.required ? " · 必需" : ""}</small></span></label><div className="row-actions"><button onClick={() => { setEditing(item); setTitle(item.title); setCategory(item.category); setQuantity(String(item.quantity)); setRequired(item.required); setNotes(item.notes ?? ""); }}>编辑</button><button onClick={() => void deletePackingItem(item.id).then(load)}>删除</button></div></li>)}</ul>
  </section>;
}
