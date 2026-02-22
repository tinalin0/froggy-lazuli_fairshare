import { supabase } from './supabase';

/**
 * Fetch all groups with their member count.
 */
export async function getGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*, members(id)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map((g) => ({ ...g, member_count: g.members.length }));
}

/**
 * Fetch a single group with its members and expenses (including shares).
 */
export async function getGroup(groupId) {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      members(*),
      expenses(
        *,
        payer:payer_id(*),
        expense_shares(*, member:member_id(*))
      )
    `)
    .eq('id', groupId)
    .order('created_at', { ascending: false, referencedTable: 'expenses' })
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new group and optionally add members in one transaction.
 * Returns the created group.
 */
export async function createGroup(name, memberNames = []) {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (groupError) throw groupError;

  // Always add "Me" as the first member, then any extra members (excluding duplicates)
  const extras = memberNames.filter((n) => n.trim().toLowerCase() !== 'me');
  const allNames = ['Me', ...extras];
  const rows = allNames.map((n) => ({ group_id: group.id, name: n.trim() }));
  const { error: memberError } = await supabase.from('members').insert(rows);
  if (memberError) throw memberError;

  return group;
}

/**
 * Delete a group (cascades to members, expenses, shares).
 */
export async function deleteGroup(groupId) {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}
