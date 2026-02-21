import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useGroup } from '../hooks/useGroup';
import Avatar from '../components/Avatar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function SettleUp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { group, loading, error, reload, settlements, memberMap, settleAll } = useGroup(id);
  const [settling, setSettling] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!group) return null;

  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={32} className="text-emerald-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">All settled up!</h2>
        <p className="text-sm text-gray-500">No outstanding balances in this group.</p>
      </div>
    );
  }

  const handleSettleAll = async () => {
    if (!confirm('Mark all balances as settled? This cannot be undone.')) return;
    setSettling(true);
    try {
      await settleAll();
      navigate(`/groups/${id}`, { replace: true });
    } catch {
      setSettling(false);
      alert('Failed to settle. Please try again.');
    }
  };

  return (
    <div className="px-4 py-6">
      <p className="text-sm text-gray-500 mb-5">
        Minimum payments to clear all balances in <span className="font-semibold text-gray-700">{group.name}</span>:
      </p>

      <div className="space-y-3 mb-8">
        {settlements.map((s, i) => {
          const from = memberMap[s.from];
          const to = memberMap[s.to];
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar name={from?.name ?? '?'} size="md" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {from?.name ?? '?'}
                  </span>
                  <span className="text-xs text-gray-400">pays</span>
                </div>
              </div>

              <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />

              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <div className="flex flex-col items-end min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {to?.name ?? '?'}
                  </span>
                  <span className="text-xs text-gray-400">receives</span>
                </div>
                <Avatar name={to?.name ?? '?'} size="md" />
              </div>

              <div className="flex-shrink-0 ml-2 text-right min-w-[60px]">
                <p className="text-base font-bold text-gray-900">${s.amount.toFixed(2)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
        <p className="text-xs text-gray-500 font-medium mb-2">Balance summary</p>
        <div className="space-y-1.5">
          {group.members.map((m) => {
            // Compute this member's net from settlements
            const owes = settlements.filter(s => s.from === m.id).reduce((sum, s) => sum + s.amount, 0);
            const receives = settlements.filter(s => s.to === m.id).reduce((sum, s) => sum + s.amount, 0);
            const net = receives - owes;
            if (Math.abs(net) < 0.01) return null;
            return (
              <div key={m.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{m.name}</span>
                <span className={`text-sm font-semibold ${net > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {net > 0 ? '+' : ''}${net.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSettleAll}
        disabled={settling}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl shadow-sm disabled:opacity-50 active:bg-emerald-700 transition-colors"
      >
        {settling ? (
          <><Loader2 size={16} className="animate-spin" /> Settling…</>
        ) : (
          <><CheckCircle size={16} /> Mark all as settled</>
        )}
      </button>
    </div>
  );
}
