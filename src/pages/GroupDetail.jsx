import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Receipt, ArrowRightLeft, X, Camera, Mic, Loader2, Users, ChevronDown } from 'lucide-react';
import { useGroup } from '../hooks/useGroup';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';
import ConfirmSheet from '../components/ConfirmSheet';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ReceiptScanner from '../components/ReceiptScanner';

function ExpenseDetailSheet({ expense, memberMap, onClose }) {
  const payer = memberMap[expense.payer_id];
  const total = Number(expense.total_amount);
  const date = new Date(expense.created_at).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return createPortal(
    <div className="sheet-backdrop z-50 flex items-start justify-center px-4 pt-[22vh]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 bg-[#EFF6F5] rounded-xl flex items-center justify-center flex-shrink-0">
                <Receipt size={20} className="text-[#588884]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-[#344F52] text-base leading-tight truncate">{expense.description}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{date}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0">
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total paid by <span className="font-semibold text-[#344F52]">{payer?.name ?? 'Unknown'}</span></span>
            <span className="text-xl font-bold text-[#344F52]">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Shares breakdown */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users size={12} /> Breakdown
          </p>
          <div className="space-y-2">
            {expense.expense_shares.map((share) => {
              const member = memberMap[share.member_id];
              const isPayer = share.member_id === expense.payer_id;
              const isSettled = share.is_settled;
              return (
                <div
                  key={share.id ?? share.member_id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isSettled ? 'bg-gray-50' : isPayer ? 'bg-[#EFF6F5]' : 'bg-rose-50'
                  }`}
                >
                  <Avatar name={member?.name ?? '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#344F52] truncate">{member?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-400">
                      {isPayer ? 'Paid' : isSettled ? 'Settled ✓' : 'Owes'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isPayer ? (
                      <p className="text-sm font-bold text-[#588884]">
                        +${(total - Number(share.amount_owed)).toFixed(2)}
                      </p>
                    ) : (
                      <p className={`text-sm font-bold ${isSettled ? 'text-gray-400 line-through' : 'text-rose-500'}`}>
                        ${Number(share.amount_owed).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>,
    document.body
  );
}

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

  return createPortal(
    <div className="sheet-backdrop z-50 flex items-start justify-center px-4 pt-[22vh]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[#344F52] text-base">Add member</h2>
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
            className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#588884] bg-white"
          />
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="px-5 py-3 text-sm font-semibold text-white bg-[#588884] rounded-xl disabled:opacity-40"
          >
            {saving ? '…' : 'Add'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

function EditWalletSheet({ member, onSave, onClose }) {
  const [address, setAddress] = useState(member?.wallet_address ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    const v = address.trim();
    if (v && !/^0x[a-fA-F0-9]{40}$/.test(v)) {
      setErr('Use 0x followed by 40 hex characters.');
      return;
    }
    setSaving(true);
    try {
      await onSave(member.id, v || null);
      onClose();
    } catch (e) {
      setErr(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (!member) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[#344F52] text-base">Wallet for {member.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#588884] bg-white font-mono"
          />
          {err && <p className="text-sm text-rose-600 mt-2">{err}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full py-3 text-sm font-semibold text-white bg-[#588884] rounded-xl disabled:opacity-40"
          >
            {saving ? '…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { group, loading, error, reload, balances, settlements, memberMap, addMember, removeMember, deleteExpense, updateMemberWallet } = useGroup(id);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [walletMember, setWalletMember] = useState(null);
  const [fabHovered, setFabHovered] = useState(false);
  const [fabPressed, setFabPressed] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const pendingTimerRef = useRef(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceParsing, setVoiceParsing] = useState(false);
  const recognitionRef = useRef(null);

  const cancelPending = () => {
    clearTimeout(pendingTimerRef.current);
    setPendingRemoveId(null);
  };

  const handleScanResult = (data) => {
    setShowScanner(false);
    navigate(`/groups/${id}/expenses/new`, { state: { scanResult: data } });
  };

  const handleMic = () => {
    if (voiceListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    let finalTranscript = '';

    recognition.onstart = () => setVoiceListening(true);
    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      setVoiceListening(false);
    };
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
    };
    recognition.onend = async () => {
      setVoiceListening(false);
      const transcript = finalTranscript.trim();
      if (!transcript) return;

      setVoiceParsing(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-expense`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ transcript }),
          }
        );
        const data = await res.json();
        if (res.ok) {
          navigate(`/groups/${id}/expenses/new`, { state: { voiceResult: data } });
        }
      } catch {
        // silently fail — user lands on empty form
        navigate(`/groups/${id}/expenses/new`);
      } finally {
        setVoiceParsing(false);
      }
    };

    recognition.start();
  };

  // Returns true if a member has a non-zero net balance (i.e. owes or is owed money)
  const hasOutstandingExpenses = (memberId) => {
    return Math.round((balances[memberId] ?? 0) * 100) / 100 !== 0;
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!group) return null;

  const youMember = group.members.find((m) => m.name.toLowerCase() === 'me') ?? group.members[0];
  const net = youMember ? (balances[youMember.id] ?? 0) : 0;

  return (
    <div>
      {/* Balance banner */}
      <div
        className={`mx-4 mt-4 p-5 rounded-2xl flex items-center justify-between ${
          net === 0
            ? 'bg-gray-50 border border-gray-100'
            : net > 0
            ? 'bg-[#FDF3E9] border border-[#FAE4CA]'
            : 'bg-rose-50 border border-rose-100'
        }`}
      >
        <div>
          <p className={`text-xs font-medium ${net === 0 ? 'text-gray-400' : net > 0 ? 'text-[#ED9854]' : 'text-rose-500'}`}>
            {net === 0 ? "You're settled up" : net > 0 ? 'Owed to me' : 'I owe'}
          </p>
          {net !== 0 && (
            <p className={`text-3xl font-bold mt-0.5 ${net > 0 ? 'text-[#ED9854]' : 'text-rose-500'}`}>
              ${Math.abs(net).toFixed(2)}
            </p>
          )}
        </div>
        {settlements.length > 0 && (
          <Link
            to={`/groups/${id}/settle`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#588884] rounded-xl"
          >
            <ArrowRightLeft size={15} /> Settle
          </Link>
        )}
      </div>

      {/* Members */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</p>
        </div>
<<<<<<< HEAD
        <div className="flex gap-4 flex-wrap">
          {group.members.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => handleRemoveMember(m)}
                  className="group flex flex-col items-center"
                  title={`Remove ${m.name}`}
                >
                  <Avatar name={m.name} size="lg" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-200 group-hover:bg-rose-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <X size={9} className="text-white" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setWalletMember(m)}
                  className="mt-1 block w-full text-xs text-[#588884] hover:underline text-center"
                  title="Set wallet for on-chain settlement"
                >
                  {m.wallet_address ? `${String(m.wallet_address).slice(0, 6)}…${String(m.wallet_address).slice(-4)}` : 'Set wallet'}
                </button>
              </div>
              <span className="text-sm text-[#344F52] font-medium max-w-[64px] truncate">{m.name}</span>
            </div>
          ))}
=======
        <div className="relative z-[6] flex gap-4 flex-wrap" onClick={cancelPending}>
          {group.members.map((m) => {
            const outstanding = hasOutstandingExpenses(m.id);
            const isPending = pendingRemoveId === m.id;

            const handleTap = (e) => {
              e.stopPropagation();
              setRemoveError('');

              if (isPending) {
                // Second tap — commit
                clearTimeout(pendingTimerRef.current);
                setPendingRemoveId(null);
                if (outstanding) {
                  setRemoveError(
                    `${m.name} has outstanding expenses and cannot be removed until all their expenses are settled.`
                  );
                } else {
                  removeMember(m.id).catch(() =>
                    setRemoveError(`Could not remove ${m.name}. Please try again.`)
                  );
                }
              } else {
                // First tap — arm the X
                clearTimeout(pendingTimerRef.current);
                setPendingRemoveId(m.id);
                pendingTimerRef.current = setTimeout(() => setPendingRemoveId(null), 3000);
              }
            };

            return (
              <div key={m.id} className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleTap}
                  className="relative rounded-full"
                  title={outstanding ? `${m.name} has outstanding expenses` : `Double-tap to remove ${m.name}`}
                >
                  <Avatar name={m.name} size="lg" />
                  {isPending && outstanding && (
                    <span className="animate-pop-in absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                      <span className="text-white font-bold leading-none" style={{ fontSize: 11 }}>!</span>
                    </span>
                  )}
                  {isPending && !outstanding && (
                    <span className="animate-pop-in absolute inset-0 flex items-center justify-center">
                      <X size={46} strokeWidth={2.5} className="text-rose-500" />
                    </span>
                  )}
                </button>
                <span className={`text-sm font-medium max-w-[64px] truncate transition-colors duration-100 ${isPending && outstanding ? 'text-amber-400' : isPending ? 'text-rose-500' : 'text-[#344F52]'}`}>
                  {m.name}
                </span>
              </div>
            );
          })}
>>>>>>> 9874ac69f31da3533f2fa1a554833ece5e43f5e1

          {/* Add member — inline circle matching avatar format */}
          <button
            onClick={() => setShowAddMember(true)}
            className="flex flex-col items-center gap-1.5 group"
            aria-label="Add member"
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#CFE0D8] bg-[#EFF6F5] flex items-center justify-center text-[#588884] group-hover:bg-[#CFE0D8] group-hover:border-[#588884] group-hover:scale-110 transition-all">
              <Plus size={22} />
            </div>
            <span className="text-sm text-[#588884] font-medium">Add</span>
          </button>
        </div>
      </div>

      {/* Expenses */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Expenses</p>
        </div>

        {group.expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses yet"
          />
        ) : (
          <div className="space-y-2">
            {group.expenses.map((e) => {
              const payer = memberMap[e.payer_id];
              const isYouPayer = payer?.name?.toLowerCase() === 'me';
              const yourShare = e.expense_shares.find(
                (s) => s.member_id === youMember?.id
              );
              const youLent = isYouPayer
                ? e.expense_shares
                    .filter((s) => s.member_id !== youMember?.id && !s.is_settled)
                    .reduce((sum, s) => sum + Number(s.amount_owed), 0)
                : 0;
              const youOwe = !isYouPayer && !yourShare?.is_settled
                ? yourShare?.amount_owed ?? 0
                : 0;

              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedExpense(e)}
                  className="w-full text-left flex items-center gap-3 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-[#A8C5BA] hover:shadow-md active:scale-[0.99] transition-all"
                >
                  <div className="w-12 h-12 bg-[#EFF6F5] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Receipt size={20} className="text-[#588884]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#344F52] text-base truncate">{e.description}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {payer?.name?.toLowerCase() === 'me' ? 'I' : (payer?.name ?? 'Unknown')} paid ${Number(e.total_amount).toFixed(2)} ·{' '}
                      {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {youMember && (
                    <div className="text-right flex-shrink-0">
                      {isYouPayer && youLent > 0 ? (
                        <>
                          <p className="text-xs text-gray-400">I lent</p>
                          <p className="text-base font-bold text-[#ED9854]">+${youLent.toFixed(2)}</p>
                        </>
                      ) : youOwe > 0 ? (
                        <>
                          <p className="text-xs text-gray-400">I owe</p>
                          <p className="text-base font-bold text-rose-500">${youOwe.toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">not involved</p>
                      )}
                    </div>
                  )}
                  <ChevronDown size={15} className="text-gray-300 flex-shrink-0 ml-1" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-36" />

      {/* Add expense button */}
      <Link
        to={`/groups/${id}/expenses/new`}
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => { setFabHovered(false); setFabPressed(false); }}
        onMouseDown={() => setFabPressed(true)}
        onMouseUp={() => setFabPressed(false)}
        onTouchStart={() => setFabPressed(true)}
        onTouchEnd={() => setFabPressed(false)}
        className={`fixed bottom-3 left-1/2 -translate-x-1/2 w-20 h-20 bg-[#588884] text-white rounded-full shadow-xl flex items-center justify-center z-[50] active:scale-95 transition-all ${
          fabPressed ? 'ring-[3px] ring-gray-700' : fabHovered ? 'ring-2 ring-gray-600' : ''
        }`}
        aria-label="Add expense"
      >
        <Plus size={36} strokeWidth={2.5} />
      </Link>

      {/* Camera + Mic — bottom sides, constrained to app container width */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg pointer-events-none z-30">
        <button
          onClick={() => setShowScanner(true)}
          className="absolute bottom-28 right-4 w-20 h-20 bg-white border-2 border-[#CFE0D8] text-[#588884] rounded-full shadow-lg flex items-center justify-center pointer-events-auto hover:bg-[#EFF6F5] hover:border-[#A8C5BA] active:bg-[#CFE0D8] active:border-[#76A09C] active:scale-95 transition-all"
          aria-label="Scan receipt"
        >
          <Camera size={32} />
        </button>
        <button
          onClick={handleMic}
          disabled={voiceParsing}
          className={`absolute bottom-28 left-4 w-20 h-20 rounded-full shadow-lg flex items-center justify-center pointer-events-auto active:scale-95 transition-all border-2 ${
            voiceListening
              ? 'bg-rose-500 border-rose-500 text-white animate-pulse'
              : voiceParsing
              ? 'bg-white border-[#CFE0D8] text-gray-300'
              : 'bg-white border-[#CFE0D8] text-[#588884] hover:bg-[#EFF6F5] hover:border-[#A8C5BA]'
          }`}
          aria-label="Voice input"
        >
          {voiceParsing ? <Loader2 size={32} className="animate-spin" /> : <Mic size={32} />}
        </button>
      </div>

      {/* Transparent overlay — cancels armed member state on any outside click */}
      {pendingRemoveId && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-[5]" onClick={cancelPending} />
      )}

      {showScanner && (
        <ReceiptScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showAddMember && (
        <AddMemberSheet
          onAdd={addMember}
          onClose={() => setShowAddMember(false)}
        />
      )}
<<<<<<< HEAD
      {walletMember && (
        <EditWalletSheet
          member={walletMember}
          onSave={updateMemberWallet}
          onClose={() => setWalletMember(null)}
=======

      {removeError && (
        <ConfirmSheet
          title="Cannot remove member"
          message={removeError}
          confirmLabel="OK"
          confirmClass="bg-[#588884]"
          onConfirm={() => setRemoveError('')}
          onClose={() => setRemoveError('')}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailSheet
          expense={selectedExpense}
          memberMap={memberMap}
          onClose={() => setSelectedExpense(null)}
>>>>>>> 9874ac69f31da3533f2fa1a554833ece5e43f5e1
        />
      )}
    </div>
  );
}
