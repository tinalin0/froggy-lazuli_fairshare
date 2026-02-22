import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useGroup } from '../hooks/useGroup';
import Avatar from '../components/Avatar';
import ConfirmSheet from '../components/ConfirmSheet';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function SettleUp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { group, loading, error, reload, settlements, memberMap, settleByPair, settleAll } = useGroup(id);

  const [confirm, setConfirm] = useState(null); // { type: 'pair', from, to, amount } | { type: 'all' }
  const [settling, setSettling] = useState(null); // settlement index being settled, or 'all'

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!group) return null;

  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 bg-[#FAE4CA] rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={32} className="text-[#ED9854]" />
        </div>
        <h2 className="text-lg font-bold text-[#344F52] mb-1">All settled up!</h2>
        <p className="text-sm text-gray-500">No outstanding balances in this group.</p>
      </div>
    );
  }

  const handleSettlePair = async (s) => {
    setConfirm(null);
    setSettling(`${s.from}-${s.to}`);
    try {
      await settleByPair(s.from, s.to);
    } finally {
      setSettling(null);
    }
  };

  const handleSettleAll = async () => {
    setConfirm(null);
    setSettling('all');
    try {
      await settleAll();
      navigate(`/groups/${id}`, { replace: true });
    } catch {
      setSettling(null);
    }
  };

  return (
    <div className="px-4 py-6">
      <p className="text-sm text-gray-500 mb-5">
        Minimum payments to clear all balances in{' '}
        <span className="font-semibold text-[#344F52]">{group.name}</span>:
      </p>

      <div className="space-y-3 mb-8">
        {settlements.map((s, i) => {
          const from = memberMap[s.from];
          const to = memberMap[s.to];
          const key = `${s.from}-${s.to}`;
          const isSettling = settling === key;

          return (
            <div
              key={i}
              className="flex items-center gap-3 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar name={from?.name ?? '?'} size="md" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-[#344F52] truncate">
                    {from?.name ?? '?'}
                  </span>
                  <span className="text-xs text-gray-400">pays</span>
                </div>
              </div>

              <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />

              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <div className="flex flex-col items-end min-w-0">
                  <span className="text-sm font-semibold text-[#344F52] truncate">
                    {to?.name ?? '?'}
                  </span>
                  <span className="text-xs text-gray-400">receives</span>
                </div>
                <Avatar name={to?.name ?? '?'} size="md" />
              </div>

              <div className="flex-shrink-0 ml-2 text-right min-w-[60px]">
                <p className="text-lg font-bold text-[#344F52]">${s.amount.toFixed(2)}</p>
              </div>

              <button
                onClick={() => setConfirm({ type: 'pair', ...s })}
                disabled={isSettling || settling === 'all'}
                className="flex-shrink-0 ml-1 px-3 py-2 text-xs font-semibold text-white bg-[#588884] rounded-xl disabled:opacity-40 active:bg-[#467370] transition-colors flex items-center gap-1.5"
              >
                {isSettling
                  ? <Loader2 size={13} className="animate-spin" />
                  : <CheckCircle size={13} />
                }
                Settle
              </button>
            </div>
          );
        })}
      </div>

      {/* Balance summary */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
        <p className="text-xs text-gray-500 font-medium mb-2">Balance summary</p>
        <div className="space-y-1.5">
          {group.members.map((m) => {
            const owes = settlements.filter((s) => s.from === m.id).reduce((sum, s) => sum + s.amount, 0);
            const receives = settlements.filter((s) => s.to === m.id).reduce((sum, s) => sum + s.amount, 0);
            const net = receives - owes;
            if (Math.abs(net) < 0.01) return null;
            return (
              <div key={m.id} className="flex items-center justify-between">
                <span className="text-sm text-[#344F52]">{m.name}</span>
                <span className={`text-sm font-semibold ${net > 0 ? 'text-[#ED9854]' : 'text-rose-500'}`}>
                  {net > 0 ? '+' : ''}${net.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setConfirm({ type: 'all' })}
        disabled={settling !== null}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white bg-[#ED9854] rounded-xl shadow-sm disabled:opacity-50 active:bg-[#D4813F] transition-colors"
      >
        {settling === 'all' ? (
          <><Loader2 size={16} className="animate-spin" /> Settling…</>
        ) : (
          <><CheckCircle size={16} /> Mark all as settled</>
        )}
      </button>

      {/* In-app confirmation sheet */}
      {confirm?.type === 'pair' && (
        <ConfirmSheet
          title={`Settle ${memberMap[confirm.from]?.name}'s payment?`}
          message={`Mark $${confirm.amount.toFixed(2)} from ${memberMap[confirm.from]?.name} to ${memberMap[confirm.to]?.name} as paid. Fully settled expenses will be removed automatically.`}
          confirmLabel="Mark as settled"
          confirmClass="bg-[#588884]"
          onConfirm={() => handleSettlePair(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}

      {confirm?.type === 'all' && (
        <ConfirmSheet
          title="Settle all balances?"
          message="This will mark every outstanding balance as paid and remove all settled expenses. This cannot be undone."
          confirmLabel="Settle all"
          confirmClass="bg-[#ED9854]"
          onConfirm={handleSettleAll}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
