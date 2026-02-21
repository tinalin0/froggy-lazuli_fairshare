import { supabase } from './supabase';

/**
 * Add a member to an existing group.
 */
export async function addMember(groupId, name) {
  const { data, error } = await supabase
    .from('members')
    .insert({ group_id: groupId, name: name.trim() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a member. Will fail if the member has unsettled expense shares.
 */
export async function removeMember(memberId) {
  const { error } = await supabase.from('members').delete().eq('id', memberId);
  if (error) throw error;
}

/**
 * List all members for a group.
 */
export async function getMembers(groupId) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}
