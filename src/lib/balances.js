/**
 * Given a fully-loaded group (from getGroup()), compute each member's
 * net balance: positive = owed money, negative = owes money.
 *
 * @param {object} group  - result of getGroup()
 * @returns {Record<string, number>}  memberId → net balance
 */
export function computeBalances(group) {
  const balances = {};

  for (const member of group.members) {
    balances[member.id] = 0;
  }

  for (const expense of group.expenses) {
    for (const share of expense.expense_shares) {
      if (share.is_settled) continue;

      const { payer_id } = expense;
      const { member_id, amount_owed } = share;

      if (member_id === payer_id) continue; // payer's own share — no net movement

      // Debtor owes the payer
      balances[member_id] = (balances[member_id] ?? 0) - amount_owed;
      balances[payer_id] = (balances[payer_id] ?? 0) + amount_owed;
    }
  }

  return balances;
}

/**
 * Given a balance map, produce the minimal set of transactions to settle
 * all debts using a greedy creditor/debtor algorithm.
 *
 * @param {Record<string, number>} balances  memberId → net balance
 * @returns {Array<{from: string, to: string, amount: number}>}
 */
export function minimizeTransactions(balances) {
  const creditors = []; // owed money
  const debtors = [];   // owe money

  for (const [id, amount] of Object.entries(balances)) {
    const rounded = Math.round(amount * 100) / 100;
    if (rounded > 0) creditors.push({ id, amount: rounded });
    if (rounded < 0) debtors.push({ id, amount: -rounded });
  }

  // Sort largest first for fewer iterations
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const payment = Math.min(credit.amount, debt.amount);

    transactions.push({
      from: debt.id,
      to: credit.id,
      amount: Math.round(payment * 100) / 100,
    });

    credit.amount -= payment;
    debt.amount -= payment;

    if (credit.amount < 0.01) ci++;
    if (debt.amount < 0.01) di++;
  }

  return transactions;
}
