import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Receipt, ArrowRightLeft, UserPlus, Trash2, X } from 'lucide-react';
import { useGroup } from '../hooks/useGroup';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

function AddMemberSheet({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onAdd(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-base">Add member</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Member name"
            autoFocus
            required
            className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="px-5 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl disabled:opacity-40"
          >
            {saving ? '…' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { group, loading, error, reload, balances, settlements, memberMap, addMember, removeMember, deleteExpense } = useGroup(id);
  const [showAddMember, setShowAddMember] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!group) return null;

  // Net balance for "you" — first member named "You" or the first member
  const youMember = group.members.find((m) => m.name.toLowerCase() === 'you') ?? group.members[0];
  const net = youMember ? (balances[youMember.id] ?? 0) : 0;

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Delete this expense?')) return;
    await deleteExpense(expenseId);
  };

  const handleRemoveMember = async (member) => {
    if (!confirm(`Remove ${member.name} from the group?`)) return;
    try {
      await removeMember(member.id);
    } catch {
      alert('Cannot remove a member who has expenses. Delete their expenses first.');
    }
  };

  return (
    <div>
      {/* Balance banner */}
      <div
        className={`mx-4 mt-4 p-4 rounded-2xl flex items-center justify-between ${
          net === 0
            ? 'bg-gray-50 border border-gray-100'
            : net > 0
            ? 'bg-emerald-50 border border-emerald-100'
            : 'bg-rose-50 border border-rose-100'
        }`}
      >
        <div>
          <p className={`text-xs font-medium ${net === 0 ? 'text-gray-400' : net > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {net === 0 ? 'All settled up' : net > 0 ? 'You are owed' : 'You owe'}
          </p>
          {net !== 0 && (
            <p className={`text-2xl font-bold mt-0.5 ${net > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              ${Math.abs(net).toFixed(2)}
            </p>
          )}
        </div>
        {settlements.length > 0 && (
          <Link
            to={`/groups/${id}/settle`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl"
          >
            <ArrowRightLeft size={15} /> Settle
          </Link>
        )}
      </div>

      {/* Members */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</p>
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600"
          >
            <UserPlus size={14} /> Add
          </button>
        </div>
        <div className="flex gap-4 flex-wrap">
          {group.members.map((m) => (
            <button
              key={m.id}
              onClick={() => handleRemoveMember(m)}
              className="flex flex-col items-center gap-1.5 group"
              title={`Tap to remove ${m.name}`}
            >
              <div className="relative">
                <Avatar name={m.name} size="lg" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-200 group-hover:bg-rose-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <X size={9} className="text-white" />
                </span>
              </div>
              <span className="text-xs text-gray-600 font-medium max-w-[56px] truncate">{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expenses */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Expenses</p>
          <Link
            to={`/groups/${id}/expenses/new`}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600"
          >
            <Plus size={14} /> Add
          </Link>
        </div>

        {group.expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses yet"
            description="Add the first expense for this group."
            action={
              <Link
                to={`/groups/${id}/expenses/new`}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl"
              >
                <Plus size={16} /> Add Expense
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {group.expenses.map((e) => {
              const payer = memberMap[e.payer_id];
              const isYouPayer = payer?.name?.toLowerCase() === 'you';
              const yourShare = e.expense_shares.find(
                (s) => s.member_id === youMember?.id
              );
              const youLent = isYouPayer
                ? e.total_amount - (yourShare?.amount_owed ?? 0)
                : 0;
              const youOwe = !isYouPayer ? yourShare?.amount_owed ?? 0 : 0;

              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Receipt size={18} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{e.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {payer?.name ?? 'Unknown'} paid ${Number(e.total_amount).toFixed(2)} ·{' '}
                      {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {youMember && (
                      <div className="text-right">
                        {isYouPayer && youLent > 0 ? (
                          <>
                            <p className="text-xs text-gray-400">you lent</p>
                            <p className="text-sm font-bold text-emerald-600">+${youLent.toFixed(2)}</p>
                          </>
                        ) : youOwe > 0 ? (
                          <>
                            <p className="text-xs text-gray-400">you owe</p>
                            <p className="text-sm font-bold text-rose-500">${youOwe.toFixed(2)}</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400">not involved</p>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteExpense(e.id)}
                      className="p-1.5 text-gray-300 hover:text-rose-400 rounded-lg transition-colors"
                      aria-label="Delete expense"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-6" />

      {showAddMember && (
        <AddMemberSheet
          onAdd={addMember}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </div>
  );
}
