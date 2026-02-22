import { useState, useEffect, useCallback } from 'react';
import { getGroup } from '../lib/groups';
import { addMember, removeMember } from '../lib/members';
import { addExpense, settleByPair, settleAllInGroup } from '../lib/expenses';
import { computeBalances, minimizeTransactions } from '../lib/balances';

export function useGroup(groupId) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getGroup(groupId);
      setGroup(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const balances = group ? computeBalances(group) : {};
  const settlements = group ? minimizeTransactions(balances) : [];

  const memberMap = group
    ? Object.fromEntries(group.members.map((m) => [m.id, m]))
    : {};

  return {
    group,
    loading,
    error,
    reload: load,
    balances,
    settlements,
    memberMap,
    addMember: async (name) => {
      await addMember(groupId, name);
      await load();
    },
    removeMember: async (memberId) => {
      await removeMember(memberId);
      await load();
    },
    addExpense: async (params) => {
      await addExpense(params);
      await load();
    },
    settleByPair: async (fromMemberId, toMemberId) => {
      await settleByPair(groupId, fromMemberId, toMemberId);
      await load();
    },
    settleAll: async () => {
      await settleAllInGroup(groupId);
      await load();
    },
  };
}
