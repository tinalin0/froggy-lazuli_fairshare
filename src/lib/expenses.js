import { supabase } from './supabase';

/**
 * Add an expense and its per-member shares atomically.
 */
export async function addExpense({ groupId, payerId, description, totalAmount, shares, receiptImageUrl = null }) {
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      group_id: groupId,
      payer_id: payerId,
      description: description.trim(),
      total_amount: totalAmount,
      receipt_image_url: receiptImageUrl,
    })
    .select()
    .single();

  if (expenseError) throw expenseError;

  const shareRows = shares.map(({ memberId, amountOwed }) => ({
    expense_id: expense.id,
    member_id: memberId,
    amount_owed: amountOwed,
  }));

  const { error: sharesError } = await supabase.from('expense_shares').insert(shareRows);
  if (sharesError) throw sharesError;

  return expense;
}

/**
 * Delete expenses in a group where every share is settled.
 */
async function deleteFullySettledExpenses(groupId) {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('id, expense_shares(id, is_settled)')
    .eq('group_id', groupId);

  if (error) throw error;

  const fullySettled = expenses.filter(
    (e) => e.expense_shares.length > 0 && e.expense_shares.every((s) => s.is_settled)
  );

  if (fullySettled.length === 0) return;

  const ids = fullySettled.map((e) => e.id);
  const { error: delError } = await supabase.from('expenses').delete().in('id', ids);
  if (delError) throw delError;
}

/**
 * Settle all shares owed by fromMember to toMember (toMember paid).
 * Automatically removes any expenses that become fully settled.
 */
export async function settleByPair(groupId, fromMemberId, toMemberId) {
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('id')
    .eq('group_id', groupId)
    .eq('payer_id', toMemberId);

  if (expError) throw expError;

  const expenseIds = expenses.map((e) => e.id);
  if (expenseIds.length > 0) {
    const { error } = await supabase
      .from('expense_shares')
      .update({ is_settled: true })
      .in('expense_id', expenseIds)
      .eq('member_id', fromMemberId)
      .eq('is_settled', false);

    if (error) throw error;
  }

  await deleteFullySettledExpenses(groupId);
}

/**
 * Mark all unsettled shares in a group as settled, then remove fully settled expenses.
 */
export async function settleAllInGroup(groupId) {
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('id')
    .eq('group_id', groupId);

  if (expError) throw expError;

  const expenseIds = expenses.map((e) => e.id);
  if (expenseIds.length > 0) {
    const { error } = await supabase
      .from('expense_shares')
      .update({ is_settled: true })
      .in('expense_id', expenseIds)
      .eq('is_settled', false);

    if (error) throw error;
  }

  await deleteFullySettledExpenses(groupId);
}

/**
 * Upload a receipt image to Supabase Storage and return its public URL.
 */
export async function uploadReceipt(file) {
  const ext = file.name.split('.').pop();
  const path = `receipts/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('receipts').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from('receipts').getPublicUrl(path);
  return data.publicUrl;
}
