import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2, Link2 } from 'lucide-react';
import { useGroup } from '../hooks/useGroup';
import { settleByPair as settleByPairRaw } from '../lib/expenses';
import Avatar from '../components/Avatar';
import ConfirmSheet from '../components/ConfirmSheet';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function SettleUp() {
  const { id } = useParams();
  const { group, loading, error, reload, settlements, memberMap, settleByPair, settleAll } = useGroup(id);

  const [confirm, setConfirm] = useState(null); // { type: 'all' }
  const [settlingKeys, setSettlingKeys] = useState(new Set()); // keys currently animating
  const settlingKeysRef = useRef(new Set()); // always-current mirror for use inside async handlers
  const [settlingAll, setSettlingAll] = useState(false);
  const [doneKeys, setDoneKeys] = useState(new Set()); // pair keys that finished settling
  const tokenRef = useRef(new Map()); // key → latest token; null means cancelled

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

  const ANIM_MS = 1400; // must match animate-fill-btn duration

  const removeSettlingKey = (key) => {
    settlingKeysRef.current.delete(key);
    setSettlingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleSettlePair = async (s) => {
    const key = `${s.from}-${s.to}`;

    // Re-click while animating → cancel by invalidating the token
    if (settlingKeysRef.current.has(key)) {
      tokenRef.current.set(key, null);
      removeSettlingKey(key);
      return;
    }

    // Assign a unique token for this attempt
    const myToken = Symbol();
    tokenRef.current.set(key, myToken);
    settlingKeysRef.current.add(key);
    setSettlingKeys((prev) => new Set(prev).add(key));

    // Wait for animation to finish first
    await new Promise((r) => setTimeout(r, ANIM_MS));

    // Only proceed if our token is still the latest (not cancelled or superseded)
    if (tokenRef.current.get(key) !== myToken) return;

    // Animation done and not cancelled — now update the DB
    try {
      await settleByPairRaw(id, s.from, s.to);
      // Check token again in case something changed during the API call
      if (tokenRef.current.get(key) !== myToken) return;
      setDoneKeys((prev) => new Set(prev).add(key));
      setSettlingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        settlingKeysRef.current.delete(key);
        // Reload once all animations are done
        if (next.size === 0) setTimeout(() => reload(), 600);
        return next;
      });
    } catch {
      removeSettlingKey(key);
    }
  };

  const handleSettleAll = async () => {
    setConfirm(null);
    setSettlingAll(true);
    try {
      await settleAll();
      // Don't navigate — settlements will be empty and the page shows "All settled up!"
      // User can tap back once to return to GroupDetail naturally
    } catch {
      setSettlingAll(false);
    }
  };

  return (
    <div className="px-4 py-6">
      <p className="text-sm text-gray-500 mb-1">
        Minimum payments to clear all balances in{' '}
        <span className="font-semibold text-[#344F52]">{group.name}</span>:
      </p>
      <p className="sm:hidden text-sm font-medium text-[#588884] text-center mb-5">Tap a card to settle</p>
      <div className="hidden sm:block mb-5" />

      <div className="space-y-3 mb-8">
        {settlements.map((s, i) => {
          const from = memberMap[s.from];
          const to = memberMap[s.to];
          const key = `${s.from}-${s.to}`;
          const isSettling = settlingKeys.has(key);

          return (
            <div
              key={i}
              onClick={() => handleSettlePair(s)}
              className={`relative overflow-hidden flex items-center gap-3 p-5 rounded-2xl border shadow-sm cursor-pointer sm:cursor-default transition-colors ${
                doneKeys.has(key)
                  ? 'bg-emerald-50 border-emerald-200 sm:bg-white sm:border-gray-100'
                  : 'bg-white border-gray-100'
              }`}
            >
              {/* Mobile-only card fill animation */}
              {isSettling && (
                <span className="absolute inset-0 bg-[#ED9854]/20 animate-fill-btn rounded-2xl sm:hidden pointer-events-none" />
              )}

              {/* All content sits above the fill */}
              <div className="relative z-10 flex items-center gap-3 w-full min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar name={from?.name ?? '?'} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-[#344F52] truncate">
                      {from?.name ?? '?'}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">pays</span>
                  </div>
                </div>

                <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />

                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <div className="flex flex-col items-end min-w-0">
                    <span className="text-sm font-semibold text-[#344F52] truncate">
                      {to?.name ?? '?'}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">receives</span>
                  </div>
                  <Avatar name={to?.name ?? '?'} size="md" />
                </div>

                <div className="flex-shrink-0 ml-2 text-right min-w-[60px]">
                  <p className="text-lg font-bold text-[#344F52]">${s.amount.toFixed(2)}</p>
                </div>

                {/* Desktop-only settle button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleSettlePair(s); }}
                  disabled={doneKeys.has(key) || settlingAll}
                  className={`relative overflow-hidden flex-shrink-0 ml-1 px-3 py-2 text-xs font-semibold rounded-xl transition-colors hidden sm:flex items-center gap-1.5 ${
                    doneKeys.has(key)
                      ? 'bg-emerald-500 text-white'
                      : isSettling
                      ? 'bg-gray-100 text-[#588884] border border-[#CFE0D8]'
                      : 'bg-[#588884] text-white active:bg-[#467370]'
                  }`}
                >
                  {isSettling && (
                    <span className="absolute inset-y-0 left-0 bg-[#ED9854] animate-fill-btn rounded-xl" />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <CheckCircle size={13} />
                    {doneKeys.has(key) ? 'Settled' : 'Settle'}
                  </span>
                </button>
              </div>
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

      <Link
        to={`/groups/${id}/finalize`}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white bg-[#588884] rounded-xl shadow-sm active:bg-[#476d6a] transition-colors mb-3"
      >
        <Link2 size={16} /> Commit to chain (Polygon Amoy)
      </Link>

      <button
        onClick={() => setConfirm({ type: 'all' })}
        disabled={settlingKeys.size > 0 || settlingAll}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white bg-[#ED9854] rounded-xl shadow-sm disabled:opacity-50 active:bg-[#D4813F] transition-colors"
      >
        {settlingAll ? (
          <><Loader2 size={16} className="animate-spin" /> Settling…</>
        ) : (
          <><CheckCircle size={16} /> Mark all as settled</>
        )}
      </button>

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
