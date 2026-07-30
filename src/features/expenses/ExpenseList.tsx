import { useCallback, useEffect, useMemo, useState } from "react";
import type { Expense, ExpenseStatus, Leg, Participant, SplitMethod, Stop, Trip } from "../../domain/models";
import { addExpense, deleteExpense, getExpenses, getLegs, getParticipants, getStops, updateExpense } from "../../db/trip-repository";
import { subscribeTripChanges } from "../../db/change-events";
import { formatMoney, fromMinorAmount, toMinorAmount } from "../../domain/money";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { allocateExpense, participantBalances, settle } from "./settlement";

const statuses: { value: ExpenseStatus; label: string }[] = [
  { value: "planned", label: "预计" },
  { value: "paid", label: "已支付" },
  { value: "cancelled", label: "已取消" },
];
const splitMethods: { value: SplitMethod; label: string }[] = [
  { value: "equal", label: "平均" },
  { value: "shares", label: "份数" },
  { value: "percentage", label: "比例" },
  { value: "fixed", label: "固定金额" },
];

export function ExpenseList({ trip }: { trip: Trip }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [people, setPeople] = useState<Participant[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [filter, setFilter] = useState<"all" | ExpenseStatus>("all");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(trip.defaultCurrency);
  const [category, setCategory] = useState("其他");
  const [status, setStatus] = useState<ExpenseStatus>("planned");
  const [payerId, setPayerId] = useState("");
  const [beneficiaryIds, setBeneficiaryIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [occurredAt, setOccurredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [stopId, setStopId] = useState("");
  const [legId, setLegId] = useState("");
  const [editing, setEditing] = useState<Expense>();
  const [expandedId, setExpandedId] = useState<string>();
  const [pendingDelete, setPendingDelete] = useState<Expense>();
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [nextExpenses, nextPeople, nextStops, nextLegs] = await Promise.all([
      getExpenses(trip.id),
      getParticipants(trip.id),
      getStops(trip.id),
      getLegs(trip.id),
    ]);
    setExpenses(nextExpenses);
    setPeople(nextPeople);
    setStops(nextStops);
    setLegs(nextLegs);
  }, [trip.id]);

  const reset = useCallback(() => {
    setTitle("");
    setAmount("");
    setCurrency(trip.defaultCurrency);
    setCategory("其他");
    setStatus("planned");
    setPayerId("");
    setBeneficiaryIds([]);
    setSplitMethod("equal");
    setSplitValues({});
    setOccurredAt("");
    setNotes("");
    setStopId("");
    setLegId("");
    setEditing(undefined);
    setError("");
  }, [trip.defaultCurrency]);

  useEffect(() => {
    reset();
    setFilter("all");
    setExpandedId(undefined);
    setPendingDelete(undefined);
    void load();
    return subscribeTripChanges((changedTripId) => {
      if (changedTripId === trip.id) void load();
    });
  }, [load, reset, trip.id]);

  const beginEdit = (expense: Expense) => {
    setEditing(expense);
    setTitle(expense.title);
    setAmount(fromMinorAmount(expense.amountMinor, expense.currency));
    setCurrency(expense.currency);
    setCategory(expense.category);
    setStatus(expense.status);
    setPayerId(expense.payerParticipantId ?? "");
    setBeneficiaryIds(expense.beneficiaryParticipantIds);
    setSplitMethod(expense.splitMethod);
    setSplitValues(Object.fromEntries(Object.entries(expense.splitValues).map(([id, value]) => [
      id,
      String(expense.splitMethod === "fixed" ? fromMinorAmount(value, expense.currency) : value),
    ])));
    setOccurredAt(expense.occurredAt?.slice(0, 16) ?? "");
    setNotes(expense.notes ?? "");
    setStopId(expense.stopId ?? "");
    setLegId(expense.legId ?? "");
    setError("");
  };

  const shown = filter === "all" ? expenses : expenses.filter((expense) => expense.status === filter);
  const totals = expenses.filter((expense) => expense.status !== "cancelled").reduce<Record<string, { planned: number; paid: number }>>((result, expense) => {
    const row = result[expense.currency] ?? { planned: 0, paid: 0 };
    if (expense.status === "planned") row.planned += expense.amountMinor;
    if (expense.status === "paid") row.paid += expense.amountMinor;
    result[expense.currency] = row;
    return result;
  }, {});
  const balances = useMemo(() => people.length ? participantBalances(expenses, people) : [], [expenses, people]);
  const transfers = useMemo(() => people.length > 1 ? settle(expenses, people) : [], [expenses, people]);
  const associationLabel = (expense: Expense) => {
    if (expense.stopId) return `安排：${stops.find((stop) => stop.id === expense.stopId)?.title ?? "已删除节点"}`;
    if (expense.legId) {
      const leg = legs.find((item) => item.id === expense.legId);
      if (!leg) return "交通：已解除关联";
      return `交通：${stops.find((stop) => stop.id === leg.fromStopId)?.title ?? "起点"} → ${stops.find((stop) => stop.id === leg.toStopId)?.title ?? "终点"}`;
    }
    return "";
  };

  return <section className="feature-panel expense-list" aria-label="账单与预算">
    <header className="feature-heading"><div><h2>账单与预算</h2><p>预计、实付与 AA 按币种独立计算</p></div></header>
    <form className="feature-form expense-form" onSubmit={async (event) => {
      event.preventDefault();
      try {
        const normalizedCurrency = currency.trim().toUpperCase();
        const amountMinor = toMinorAmount(Number(amount), normalizedCurrency);
        if (!title.trim() || !normalizedCurrency || amountMinor < 0) throw new Error("请填写有效的名称、金额和币种");
        if (status === "paid" && !payerId) throw new Error("已支付消费必须选择付款人");
        const ids = beneficiaryIds.length ? beneficiaryIds : people.map((person) => person.id);
        const values = Object.fromEntries(ids.map((id) => [
          id,
          splitMethod === "fixed"
            ? toMinorAmount(Number(splitValues[id] || 0), normalizedCurrency)
            : Number(splitValues[id] || 0),
        ]));
        const now = new Date().toISOString();
        const expense: Expense = {
          id: editing?.id ?? crypto.randomUUID(),
          tripId: trip.id,
          title: title.trim(),
          amountMinor,
          currency: normalizedCurrency,
          status,
          category,
          payerParticipantId: payerId || undefined,
          beneficiaryParticipantIds: ids,
          splitMethod,
          splitValues: splitMethod === "equal" ? {} : values,
          occurredAt: occurredAt || undefined,
          stopId: stopId || undefined,
          legId: legId || undefined,
          notes: notes.trim() || undefined,
          createdAt: editing?.createdAt ?? now,
          updatedAt: now,
        };
        if (people.length) allocateExpense(expense, people);
        if (editing) await updateExpense(expense);
        else await addExpense(expense);
        reset();
        await load();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "保存失败");
      }
    }}>
      <label>消费名称<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>金额<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      <label>币种<input required value={currency} maxLength={10} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
      <label>分类<select value={category} onChange={(event) => setCategory(event.target.value)}>{["住宿", "交通", "餐饮", "门票", "购物", "其他"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>状态<select value={status} onChange={(event) => setStatus(event.target.value as ExpenseStatus)}>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>付款人<select value={payerId} onChange={(event) => setPayerId(event.target.value)}><option value="">未指定</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      <label>发生时间<input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></label>
      <label>分摊方式<select value={splitMethod} onChange={(event) => setSplitMethod(event.target.value as SplitMethod)}>{splitMethods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>关联安排<select value={stopId} onChange={(event) => { setStopId(event.target.value); if (event.target.value) setLegId(""); }}><option value="">不关联</option>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.date} · {stop.title}</option>)}</select></label>
      <label>关联交通<select value={legId} onChange={(event) => { setLegId(event.target.value); if (event.target.value) setStopId(""); }}><option value="">不关联</option>{legs.map((leg) => <option key={leg.id} value={leg.id}>{stops.find((stop) => stop.id === leg.fromStopId)?.title ?? "起点"} → {stops.find((stop) => stop.id === leg.toStopId)?.title ?? "终点"}</option>)}</select></label>
      <label className="expense-notes">备注<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {people.length > 0 && <fieldset><legend>分摊成员</legend>{people.map((person) => {
        const checked = beneficiaryIds.includes(person.id);
        return <label className="check-row" key={person.id}><input type="checkbox" checked={checked} onChange={() => setBeneficiaryIds((current) => checked ? current.filter((id) => id !== person.id) : [...current, person.id])} />{person.name}{splitMethod !== "equal" && checked && <input aria-label={`${person.name}分摊值`} inputMode="decimal" placeholder={splitMethod === "percentage" ? "%" : splitMethod === "fixed" ? "金额" : "份数"} value={splitValues[person.id] ?? ""} onChange={(event) => setSplitValues((current) => ({ ...current, [person.id]: event.target.value }))} />}</label>;
      })}</fieldset>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">{editing && <button type="button" onClick={reset}>取消编辑</button>}<button className="primary-action">{editing ? "保存消费" : "添加消费"}</button></div>
    </form>
    <div className="summary-grid">{Object.entries(totals).map(([code, value]) => <article key={code}><strong>{code}</strong><span>预计 {formatMoney(value.planned, code)}</span><span>已支付 {formatMoney(value.paid, code)}</span><span>差额 {formatMoney(value.planned - value.paid, code)}</span></article>)}</div>
    <nav className="filter-tabs" aria-label="消费筛选">{(["all", "planned", "paid", "cancelled"] as const).map((value) => <button aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{value === "all" ? "全部" : statuses.find((item) => item.value === value)?.label}</button>)}</nav>
    <ul className="feature-list">{shown.map((expense) => <li key={expense.id}><div><strong>{expense.title}</strong><span>{formatMoney(expense.amountMinor, expense.currency)} · {statuses.find((item) => item.value === expense.status)?.label} · {expense.category}{associationLabel(expense) ? ` · ${associationLabel(expense)}` : ""}</span>{expense.occurredAt && <small>{expense.occurredAt.replace("T", " ")}</small>}{expense.notes && <small>{expense.notes}</small>}</div><div className="row-actions"><button onClick={() => beginEdit(expense)}>编辑</button><button onClick={() => setExpandedId(expandedId === expense.id ? undefined : expense.id)}>分摊依据</button><button className="danger-action" onClick={() => setPendingDelete(expense)}>删除</button></div>{expandedId === expense.id && <div className="split-details">{people.length ? Object.entries(allocateExpense(expense, people)).map(([id, value]) => <span key={id}>{people.find((person) => person.id === id)?.name}：{formatMoney(value, expense.currency)}</span>) : <span>请先添加同行成员</span>}</div>}</li>)}</ul>
    <section className="settlement-summary"><h3>成员收支与转账建议</h3>{people.length < 2 ? <p>添加至少两位成员后可计算 AA。</p> : <>
      {balances.length ? <div className="participant-balances">{balances.map((balance) => <article key={`${balance.currency}-${balance.participantId}`}><strong>{people.find((person) => person.id === balance.participantId)?.name} · {balance.currency}</strong><span>已支付 {formatMoney(balance.paidMinor, balance.currency)}</span><span>应承担 {formatMoney(balance.owedMinor, balance.currency)}</span><span className={balance.netMinor >= 0 ? "positive" : "negative"}>净额 {formatMoney(balance.netMinor, balance.currency)}</span></article>)}</div> : <p>还没有可结算的已支付消费。</p>}
      {transfers.length > 0 && <><h4>简化后的转账建议</h4><ul>{transfers.map((transfer, index) => <li key={`${transfer.currency}-${index}`}>{people.find((person) => person.id === transfer.fromId)?.name} → {people.find((person) => person.id === transfer.toId)?.name}：{formatMoney(transfer.amountMinor, transfer.currency)}</li>)}</ul></>}
    </>}</section>
    <ConfirmDialog open={Boolean(pendingDelete)} title="删除消费？" message={`将删除“${pendingDelete?.title ?? ""}”；若其关联交通仍存在，交通记录会自动解除费用关联。`} confirmLabel="删除消费" onClose={() => setPendingDelete(undefined)} onConfirm={() => { if (!pendingDelete) return; void deleteExpense(pendingDelete.id).then(load).then(() => setPendingDelete(undefined)); }} />
  </section>;
}
