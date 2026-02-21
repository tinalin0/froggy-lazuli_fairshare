import { supabase } from './supabase';

/**
 * Add an expense and its per-member shares atomically.
 *
 * @param {object} params
 * @param {string} params.groupId
 * @param {string} params.payerId        - member UUID who paid
 * @param {string} params.description
 * @param {number} params.totalAmount
 * @param {Array<{memberId: string, amountOwed: number}>} params.shares
 * @param {string|null} params.receiptImageUrl
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
 * Delete an expense (cascades to its shares).
 */
export async function deleteExpense(expenseId) {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

/**
 * Mark a specific share as settled.
 */
export async function settleShare(shareId) {
  const { error } = await supabase
    .from('expense_shares')
    .update({ is_settled: true })
    .eq('id', shareId);

  if (error) throw error;
}

/**
 * Mark all unsettled shares in a group as settled.
 */
export async function settleAllInGroup(groupId) {
  // Get all expense IDs for this group
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('id')
    .eq('group_id', groupId);

  if (expError) throw expError;

  const expenseIds = expenses.map((e) => e.id);
  if (expenseIds.length === 0) return;

  const { error } = await supabase
    .from('expense_shares')
    .update({ is_settled: true })
    .in('expense_id', expenseIds)
    .eq('is_settled', false);

  if (error) throw error;
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
