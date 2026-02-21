/**
 * Given a split mode and inputs, compute the amount each member owes.
 * Returns an array of { memberId, amountOwed } or throws a validation error.
 *
 * @param {'equal'|'amount'|'percent'} mode
 * @param {Array<{id: string, name: string}>} members   - all participants
 * @param {number} totalAmount
 * @param {Record<string, string>} inputs  - memberId → raw string value (for amount/percent modes)
 * @returns {Array<{memberId: string, amountOwed: number}>}
 */
export function computeShares(mode, members, totalAmount, inputs = {}) {
  if (members.length === 0) throw new Error('Select at least one participant.');
  if (totalAmount <= 0) throw new Error('Total must be greater than zero.');

  if (mode === 'equal') {
    const each = round2(totalAmount / members.length);
    // Distribute rounding remainder to the first member
    const sum = each * members.length;
    const remainder = round2(totalAmount - sum);
    return members.map((m, i) => ({
      memberId: m.id,
      amountOwed: i === 0 ? round2(each + remainder) : each,
    }));
  }

  if (mode === 'amount') {
    const shares = members.map((m) => ({
      memberId: m.id,
      amountOwed: round2(parseFloat(inputs[m.id] ?? '0') || 0),
    }));
    const sum = round2(shares.reduce((s, x) => s + x.amountOwed, 0));
    if (Math.abs(sum - totalAmount) > 0.01) {
      throw new Error(`Amounts must sum to $${totalAmount.toFixed(2)} (currently $${sum.toFixed(2)}).`);
    }
    return shares;
  }

  if (mode === 'percent') {
    const percents = members.map((m) => ({
      memberId: m.id,
      pct: parseFloat(inputs[m.id] ?? '0') || 0,
    }));
    const totalPct = round2(percents.reduce((s, x) => s + x.pct, 0));
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new Error(`Percentages must sum to 100% (currently ${totalPct}%).`);
    }
    return percents.map(({ memberId, pct }) => ({
      memberId,
      amountOwed: round2((pct / 100) * totalAmount),
    }));
  }

  throw new Error(`Unknown split mode: ${mode}`);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
