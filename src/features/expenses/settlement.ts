import type { Expense, Participant } from "../../domain/models";

export interface Transfer { fromId: string; toId: string; amountMinor: number; currency: string; }

function allocateWeighted(amountMinor: number, ids: string[], weights: number[]) {
  if (!ids.length) throw new Error("至少需要一位分摊成员");
  if (weights.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("分摊值必须是非负数");
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  if (totalWeight <= 0) throw new Error("分摊值合计必须大于 0");
  const allocations = weights.map((weight) => Math.floor((amountMinor * weight) / totalWeight));
  let remainder = amountMinor - allocations.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % allocations.length) {
    allocations[index] += 1;
    remainder -= 1;
  }
  return Object.fromEntries(ids.map((id, index) => [id, allocations[index]]));
}

export function allocateExpense(expense: Expense, participants: Participant[]): Record<string, number> {
  const participantIds = new Set(participants.map((person) => person.id));
  const ids = (expense.beneficiaryParticipantIds.length ? expense.beneficiaryParticipantIds : participants.map((person) => person.id))
    .filter((id, index, values) => participantIds.has(id) && values.indexOf(id) === index);
  if (!Number.isInteger(expense.amountMinor) || expense.amountMinor < 0) throw new Error("消费金额必须是非负整数");

  if (expense.splitMethod === "equal") return allocateWeighted(expense.amountMinor, ids, ids.map(() => 1));
  if (expense.splitMethod === "shares") return allocateWeighted(expense.amountMinor, ids, ids.map((id) => expense.splitValues[id] ?? 0));
  if (expense.splitMethod === "percentage") {
    const percentages = ids.map((id) => expense.splitValues[id] ?? 0);
    if (Math.abs(percentages.reduce((sum, value) => sum + value, 0) - 100) > 0.000001) throw new Error("百分比合计必须为 100");
    return allocateWeighted(expense.amountMinor, ids, percentages);
  }

  const fixed = ids.map((id) => expense.splitValues[id] ?? 0);
  if (fixed.some((value) => !Number.isInteger(value) || value < 0)) throw new Error("固定金额必须是非负整数");
  if (fixed.reduce((sum, value) => sum + value, 0) !== expense.amountMinor) throw new Error("固定金额合计必须等于消费金额");
  return Object.fromEntries(ids.map((id, index) => [id, fixed[index]]));
}

export function settle(expenses: Expense[], participants: Participant[]) {
  const byCurrency = new Map<string, Map<string, number>>();
  for (const expense of expenses) {
    if (expense.status !== "paid" || !expense.payerParticipantId) continue;
    const balances = byCurrency.get(expense.currency) ?? new Map(participants.map((person) => [person.id, 0]));
    byCurrency.set(expense.currency, balances);
    balances.set(expense.payerParticipantId, (balances.get(expense.payerParticipantId) ?? 0) + expense.amountMinor);
    const allocations = allocateExpense(expense, participants);
    for (const [id, amountMinor] of Object.entries(allocations)) balances.set(id, (balances.get(id) ?? 0) - amountMinor);
  }

  const transfers: Transfer[] = [];
  for (const [currency, balances] of byCurrency) {
    const debtors = [...balances].filter(([, value]) => value < 0).map(([id, value]) => ({ id, value: -value }));
    const creditors = [...balances].filter(([, value]) => value > 0).map(([id, value]) => ({ id, value }));
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const amountMinor = Math.min(debtors[debtorIndex].value, creditors[creditorIndex].value);
      transfers.push({ fromId: debtors[debtorIndex].id, toId: creditors[creditorIndex].id, amountMinor, currency });
      debtors[debtorIndex].value -= amountMinor;
      creditors[creditorIndex].value -= amountMinor;
      if (debtors[debtorIndex].value === 0) debtorIndex += 1;
      if (creditors[creditorIndex].value === 0) creditorIndex += 1;
    }
  }
  return transfers;
}
