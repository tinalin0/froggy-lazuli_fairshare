import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DollarSign, Equal, Percent, Camera } from 'lucide-react';
import { useGroup } from '../hooks/useGroup';
import { computeShares } from '../lib/splitLogic';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ReceiptScanner from '../components/ReceiptScanner';

const SPLIT_MODES = [
  { id: 'equal', label: 'Equal', icon: Equal },
  { id: 'amount', label: 'Amount ($)', icon: DollarSign },
  { id: 'percent', label: 'Percent (%)', icon: Percent },
];

export default function NewExpense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { group, loading, error, reload, addExpense } = useGroup(id);

  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('');
  const [payerId, setPayerId] = useState('');
  const [splitMode, setSplitMode] = useState('equal');
  const [participants, setParticipants] = useState({}); // memberId → true
  const [inputs, setInputs] = useState({});             // memberId → string value
  const [splitError, setSplitError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  // Initialise payer + participants once group loads
  useEffect(() => {
    if (!group) return;
    if (!payerId && group.members.length > 0) setPayerId(group.members[0].id);
    if (Object.keys(participants).length === 0) {
      setParticipants(Object.fromEntries(group.members.map((m) => [m.id, true])));
    }
  }, [group]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!group) return null;

  const parsedTotal = parseFloat(total) || 0;
  const activeMembers = group.members.filter((m) => participants[m.id]);
  const equalShare = activeMembers.length > 0 ? parsedTotal / activeMembers.length : 0;

  const toggleParticipant = (memberId) => {
    setParticipants((p) => ({ ...p, [memberId]: !p[memberId] }));
    setSplitError(null);
  };

  const updateInput = (memberId, value) => {
    setInputs((p) => ({ ...p, [memberId]: value }));
    setSplitError(null);
  };

  // Live percent/amount sum for feedback
  const inputSum = activeMembers.reduce((s, m) => s + (parseFloat(inputs[m.id] ?? '0') || 0), 0);
  const sumLabel = splitMode === 'percent'
    ? `${inputSum.toFixed(1)}% of 100%`
    : splitMode === 'amount'
    ? `$${inputSum.toFixed(2)} of $${parsedTotal.toFixed(2)}`
    : null;
  const sumOk = splitMode === 'percent'
    ? Math.abs(inputSum - 100) < 0.01
    : splitMode === 'amount'
    ? Math.abs(inputSum - parsedTotal) < 0.01
    : true;

  const handleScanResult = ({ description: desc, total: t }) => {
    if (desc) setDescription(desc);
    if (t) setTotal(String(t));
    setShowScanner(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    setSplitError(null);

    let shares;
    try {
      shares = computeShares(splitMode, activeMembers, parsedTotal, inputs);
    } catch (err) {
      setSplitError(err.message);
      return;
    }

    setSaving(true);
    try {
      await addExpense({
        groupId: id,
        payerId,
        description: description.trim(),
        totalAmount: parsedTotal,
        shares,
        receiptImageUrl: null,
      });
      navigate(`/groups/${id}`, { replace: true });
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-6">
      {showScanner && (
        <ReceiptScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Description + scan button */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner, Uber, Hotel…"
              required
              autoFocus
              className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="px-3.5 py-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-1.5 text-sm font-medium"
              title="Scan receipt"
            >
              <Camera size={18} />
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Total amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="0.00"
              required
              className="w-full pl-8 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Paid by */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Paid by</label>
          <div className="flex flex-wrap gap-2">
            {group.members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPayerId(m.id)}
                className={`px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  payerId === m.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Split between</label>
          <div className="flex flex-wrap gap-2">
            {group.members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleParticipant(m.id)}
                className={`px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  participants[m.id]
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white text-gray-400 border-gray-200'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Split mode */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Split method</label>
          <div className="grid grid-cols-3 gap-2">
            {SPLIT_MODES.map(({ id: modeId, label, icon: Icon }) => (
              <button
                key={modeId}
                type="button"
                onClick={() => { setSplitMode(modeId); setSplitError(null); setInputs({}); }}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors ${
                  splitMode === modeId
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Split detail */}
        {splitMode === 'equal' && parsedTotal > 0 && activeMembers.length > 0 && (
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-sm text-indigo-700">
              Split equally among <span className="font-semibold">{activeMembers.length}</span> people —{' '}
              <span className="font-bold">${equalShare.toFixed(2)} each</span>
            </p>
          </div>
        )}

        {splitMode !== 'equal' && activeMembers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                {splitMode === 'amount' ? 'Amount per person' : 'Percent per person'}
              </label>
              {parsedTotal > 0 && (
                <span className={`text-xs font-medium ${sumOk ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {sumLabel}
                </span>
              )}
            </div>
            {activeMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-24 truncate">{m.name}</span>
                <div className="relative flex-1">
                  {splitMode === 'amount' && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  )}
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step={splitMode === 'percent' ? '1' : '0.01'}
                    max={splitMode === 'percent' ? '100' : undefined}
                    value={inputs[m.id] ?? ''}
                    onChange={(e) => updateInput(m.id, e.target.value)}
                    placeholder={splitMode === 'equal' ? equalShare.toFixed(2) : '0'}
                    className={`w-full py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
                      splitMode === 'amount' ? 'pl-7 pr-3' : 'pl-3 pr-7'
                    } border-gray-200`}
                  />
                  {splitMode === 'percent' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {splitError && (
          <p className="text-sm text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            {splitError}
          </p>
        )}

        {saveError && (
          <p className="text-sm text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            {saveError}
          </p>
        )}

        <button
          type="submit"
          disabled={!description.trim() || parsedTotal <= 0 || !payerId || activeMembers.length === 0 || saving}
          className="w-full py-3.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl shadow-sm disabled:opacity-40 active:bg-indigo-700 transition-colors"
        >
          {saving ? 'Saving…' : 'Add expense'}
        </button>
      </form>
    </div>
  );
}
