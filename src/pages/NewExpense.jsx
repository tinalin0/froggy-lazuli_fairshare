import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DollarSign, Equal, Percent, Camera, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { useGroup } from '../hooks/useGroup'; // useGroup lives in src/hooks/useGroup.js
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
  const [participants, setParticipants] = useState({});
  const [inputs, setInputs] = useState({});
  const [splitError, setSplitError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  // Receipt item-based splitting state
  // scannedItems: all items from the receipt (full list)
  // itemAssignments: { itemIndex → Set<memberId> } — which members claimed each item
  const [scannedItems, setScannedItems] = useState([]);
  const [itemAssignments, setItemAssignments] = useState({});
  const [expandedItem, setExpandedItem] = useState(null);

  const isItemMode = scannedItems.length > 0;

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

  // ── Item-mode helpers ──────────────────────────────────────────────────────

  // Toggle a member's claim on an item. Multiple members can share one item equally.
  const toggleMemberOnItem = (itemIndex, memberId) => {
    setItemAssignments((prev) => {
      const current = new Set(prev[itemIndex] ?? []);
      current.has(memberId) ? current.delete(memberId) : current.add(memberId);
      return { ...prev, [itemIndex]: current };
    });
    setSplitError(null);
  };

  // How much each member owes based on item assignments.
  // Each item's price is split equally among all members who claimed it.
  // Remaining tax/tip (difference between receipt total and items sum) is
  // split proportionally by each member's item subtotal.
  const computeItemShares = () => {
    const itemsSubtotal = scannedItems.reduce((s, item) => s + (item.price ?? 0), 0);
    const taxTip = Math.max(0, parsedTotal - itemsSubtotal);

    // Member item subtotals
    const memberSubtotals = {};
    group.members.forEach((m) => { memberSubtotals[m.id] = 0; });

    scannedItems.forEach((item, i) => {
      const claimants = itemAssignments[i] ?? new Set();
      if (claimants.size === 0) return;
      const share = (item.price ?? 0) / claimants.size;
      claimants.forEach((mid) => { memberSubtotals[mid] = (memberSubtotals[mid] ?? 0) + share; });
    });

    // Distribute tax/tip proportionally
    const totalClaimed = Object.values(memberSubtotals).reduce((s, v) => s + v, 0);
    const memberTotals = {};
    group.members.forEach((m) => {
      const proportion = totalClaimed > 0 ? memberSubtotals[m.id] / totalClaimed : 0;
      memberTotals[m.id] = memberSubtotals[m.id] + taxTip * proportion;
    });

    return memberTotals; // { memberId → amount }
  };

  // Validation: every item must have at least one person assigned
  const unassignedItems = scannedItems.filter((_, i) => (itemAssignments[i]?.size ?? 0) === 0);

  // Per-member total owed in item mode
  const itemShareTotals = isItemMode ? computeItemShares() : {};

  // ── Standard split helpers ─────────────────────────────────────────────────

  const toggleParticipant = (memberId) => {
    setParticipants((p) => ({ ...p, [memberId]: !p[memberId] }));
    setSplitError(null);
  };

  const updateInput = (memberId, value) => {
    setInputs((p) => ({ ...p, [memberId]: value }));
    setSplitError(null);
  };

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

  // ── Scanner result ─────────────────────────────────────────────────────────

  const handleScanResult = ({ description: desc, total: receiptTotal, items: allItems }) => {
    if (desc) setDescription(desc);
    if (receiptTotal != null) setTotal(String(Number(receiptTotal).toFixed(2)));
    if (allItems?.length) {
      setScannedItems(allItems);
      // Default: assign all items to no one so users must actively choose
      setItemAssignments({});
    }
    setShowScanner(false);
  };

  const clearReceipt = () => {
    setScannedItems([]);
    setItemAssignments({});
    setExpandedItem(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    setSplitError(null);

    let shares;

    if (isItemMode) {
      if (unassignedItems.length > 0) {
        setSplitError(`${unassignedItems.length} item(s) haven't been assigned to anyone yet.`);
        return;
      }
      // Build shares array from item assignments
      const memberTotals = computeItemShares();
      shares = group.members
        .filter((m) => memberTotals[m.id] > 0)
        .map((m) => ({ memberId: m.id, amountOwed: parseFloat(memberTotals[m.id].toFixed(2)) }));
    } else {
      try {
        shares = computeShares(splitMode, activeMembers, parsedTotal, inputs);
      } catch (err) {
        setSplitError(err.message);
        return;
      }
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

  // ── Render ─────────────────────────────────────────────────────────────────

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

        {/* Total amount */}
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

        {/* ── ITEM-BASED SPLIT (receipt scanned) ── */}
        {isItemMode ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-indigo-500" />
                Who ordered what?
              </label>
              <button
                type="button"
                onClick={clearReceipt}
                className="text-xs text-gray-400 hover:text-rose-500 transition-colors"
              >
                Clear receipt
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Tap each item to assign it to the people who ordered it. Shared items are split equally between assignees.
            </p>

            {/* Item rows */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {scannedItems.map((item, i) => {
                const assignees = itemAssignments[i] ?? new Set();
                const isExpanded = expandedItem === i;
                const assigneeNames = group.members.filter((m) => assignees.has(m.id)).map((m) => m.name);

                return (
                  <div key={i} className="bg-white">
                    {/* Item header — tap to expand */}
                    <button
                      type="button"
                      onClick={() => setExpandedItem(isExpanded ? null : i)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      {/* Assignment indicator dot */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        assignees.size > 0 ? 'bg-emerald-400' : 'bg-gray-200'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        {assignees.size > 0 ? (
                          <p className="text-xs text-emerald-600 truncate">
                            {assigneeNames.join(', ')}
                            {assignees.size > 1 && ` · $${((item.price ?? 0) / assignees.size).toFixed(2)} each`}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-500">Not assigned — tap to assign</p>
                        )}
                      </div>

                      <span className="text-sm font-semibold text-gray-700 flex-shrink-0 mr-2">
                        {item.price != null ? `$${Number(item.price).toFixed(2)}` : '—'}
                      </span>

                      {isExpanded
                        ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
                        : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                      }
                    </button>

                    {/* Expanded member selector */}
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 bg-gray-50 flex flex-wrap gap-2">
                        {group.members.map((m) => {
                          const checked = assignees.has(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleMemberOnItem(i, m.id)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                checked
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-gray-600 border-gray-200'
                              }`}
                            >
                              {m.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Per-member totals summary */}
            {group.members.some((m) => itemShareTotals[m.id] > 0) && (
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-2">
                <p className="text-xs font-semibold text-indigo-700 mb-1">Split summary</p>
                {group.members
                  .filter((m) => itemShareTotals[m.id] > 0)
                  .map((m) => (
                    <div key={m.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{m.name}</span>
                      <span className="font-semibold text-indigo-800">
                        ${itemShareTotals[m.id].toFixed(2)}
                      </span>
                    </div>
                  ))
                }
                {unassignedItems.length > 0 && (
                  <p className="text-xs text-amber-500 pt-1">
                    {unassignedItems.length} item(s) still unassigned
                  </p>
                )}
              </div>
            )}
          </div>

        ) : (
          /* ── STANDARD SPLIT (no receipt) ── */
          <>
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
                        placeholder="0"
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
          </>
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
          disabled={
            !description.trim() ||
            parsedTotal <= 0 ||
            !payerId ||
            (!isItemMode && activeMembers.length === 0) ||
            saving
          }
          className="w-full py-3.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl shadow-sm disabled:opacity-40 active:bg-indigo-700 transition-colors"
        >
          {saving ? 'Saving…' : 'Add expense'}
        </button>
      </form>
    </div>
  );
}