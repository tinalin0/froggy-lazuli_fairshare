import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { DollarSign, Equal, Percent, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { useGroup } from '../hooks/useGroup';
import { computeShares } from '../lib/splitLogic';
import { supabase } from '../lib/supabase';
import { addMember as addMemberToGroup } from '../lib/members';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const SPLIT_MODES = [
  { id: 'equal', label: 'Equal', icon: Equal },
  { id: 'amount', label: 'Amount ($)', icon: DollarSign },
  { id: 'percent', label: 'Percent (%)', icon: Percent },
];

export default function NewExpense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [listening, setListening] = useState(false);
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);
  const pendingVoiceRef = useRef(null); // stores parsed voice data while new members are being added
  const voiceResultAppliedRef = useRef(false); // prevents voiceResult useEffect from running twice

  const [scannedItems, setScannedItems] = useState([]);
  const [itemAssignments, setItemAssignments] = useState({});
  const [expandedItem, setExpandedItem] = useState(null);

  const isItemMode = scannedItems.filter((item) => (item.price ?? 0) > 0).length > 0;

  useEffect(() => {
    if (!group) return;
    if (!payerId && group.members.length > 0) setPayerId(group.members[0].id);
    if (Object.keys(participants).length === 0) {
      setParticipants(Object.fromEntries(group.members.map((m) => [m.id, true])));
    }
  }, [group]);

  // Normalize first-person pronouns/placeholders to "me" so they match the "me" member
  const normalizeName = (name) => {
    const lower = name.toLowerCase().trim();
    if (['i', 'me', 'myself', "i'm", 'user', 'the user', 'speaker'].includes(lower)) return 'me';
    return name;
  };

  // Helper: apply parsed voice data (items + payer) onto the form using the current member list
  const applyVoiceData = (data, members) => {
    if (data.description) setDescription(data.description);
    if (data.payer_name) {
      const normalized = normalizeName(data.payer_name);
      const payerMatch = members.find((m) => m.name.toLowerCase() === normalized.toLowerCase());
      if (payerMatch) setPayerId(payerMatch.id);
    }

    if (Array.isArray(data.items) && data.items.length > 0) {
      const items = data.items.map((item) => ({ name: item.name, price: item.price ?? 0 }));
      setScannedItems(items);

      const assignments = {};
      data.items.forEach((item, i) => {
        const ids = new Set();
        (item.claimants ?? []).forEach((name) => {
          const normalized = normalizeName(name);
          const match = members.find((m) => m.name.toLowerCase() === normalized.toLowerCase());
          if (match) ids.add(match.id);
        });
        assignments[i] = ids;
      });
      setItemAssignments(assignments);

      const itemsTotal = data.items.reduce((s, item) => s + (item.price ?? 0), 0);
      setTotal((data.total_amount ?? itemsTotal).toFixed(2));
    } else if (Array.isArray(data.participants)) {
      const matched = Object.fromEntries(members.map((m) => [m.id, false]));
      data.participants.forEach((name) => {
        const normalized = normalizeName(name);
        const match = members.find((m) => m.name.toLowerCase() === normalized.toLowerCase());
        if (match) matched[match.id] = true;
      });
      if (Object.values(matched).some(Boolean)) setParticipants(matched);
    }
  };

  // After adding new members via voice, apply the pending data once group reloads
  useEffect(() => {
    if (!group || !pendingVoiceRef.current) return;
    const data = pendingVoiceRef.current;
    pendingVoiceRef.current = null;
    applyVoiceData(data, group.members);
  }, [group]);

  useEffect(() => {
    const scan = location.state?.scanResult;
    if (!scan) return;
    if (scan.description) setDescription(scan.description);
    if (scan.total != null) setTotal(String(Number(scan.total).toFixed(2)));
    if (Array.isArray(scan.items) && scan.items.length > 0) setScannedItems(scan.items);
  }, []);

  // Apply pre-parsed voice data if navigated here from the mic FAB (run only once)
  useEffect(() => {
    if (!group || !location.state?.voiceResult || voiceResultAppliedRef.current) return;
    voiceResultAppliedRef.current = true;
    const data = location.state.voiceResult;

    // Collect all names mentioned, normalizing first-person pronouns to "me"
    const rawNames = [
      ...(data.payer_name ? [normalizeName(data.payer_name)] : []),
      ...(Array.isArray(data.items)
        ? data.items.flatMap((item) => (item.claimants ?? []).map(normalizeName))
        : (Array.isArray(data.participants) ? data.participants.map(normalizeName) : [])),
    ];
    const uniqueNames = [...new Map(rawNames.map((n) => [n.toLowerCase(), n])).values()];
    const newNames = uniqueNames.filter(
      (name) => !group.members.some((m) => m.name.toLowerCase() === name.toLowerCase())
    );

    if (newNames.length > 0) {
      (async () => {
        for (const name of newNames) {
          await addMemberToGroup(id, name);
        }
        pendingVoiceRef.current = data;
        await reload();
      })();
    } else {
      applyVoiceData(data, group.members);
    }
  }, [group]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!group) return null;

  const parsedTotal = parseFloat(total) || 0;
  const activeMembers = group.members.filter((m) => participants[m.id]);
  const equalShare = activeMembers.length > 0 ? parsedTotal / activeMembers.length : 0;

  const toggleMemberOnItem = (itemIndex, memberId) => {
    setItemAssignments((prev) => {
      const current = new Set(prev[itemIndex] ?? []);
      current.has(memberId) ? current.delete(memberId) : current.add(memberId);
      return { ...prev, [itemIndex]: current };
    });
    setSplitError(null);
  };

  const computeItemShares = () => {
    const itemsSubtotal = scannedItems.reduce((s, item) => s + (item.price ?? 0), 0);
    const taxTip = Math.max(0, parsedTotal - itemsSubtotal);

    const memberSubtotals = {};
    group.members.forEach((m) => { memberSubtotals[m.id] = 0; });

    scannedItems.forEach((item, i) => {
      const claimants = itemAssignments[i] ?? new Set();
      if (claimants.size === 0) return;
      const share = (item.price ?? 0) / claimants.size;
      claimants.forEach((mid) => { memberSubtotals[mid] = (memberSubtotals[mid] ?? 0) + share; });
    });

    const totalClaimed = Object.values(memberSubtotals).reduce((s, v) => s + v, 0);
    const memberTotals = {};
    group.members.forEach((m) => {
      const proportion = totalClaimed > 0 ? memberSubtotals[m.id] / totalClaimed : 0;
      memberTotals[m.id] = memberSubtotals[m.id] + taxTip * proportion;
    });

    return memberTotals;
  };

  const pricedItems = scannedItems.filter((item) => (item.price ?? 0) > 0);
  const unassignedItems = pricedItems.filter((_, i) => (itemAssignments[i]?.size ?? 0) === 0);
  const itemShareTotals = isItemMode ? computeItemShares() : {};

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
  const sumOver = splitMode === 'percent'
    ? inputSum > 100 + 0.01
    : splitMode === 'amount'
    ? inputSum > parsedTotal + 0.01
    : false;

  const clearReceipt = () => {
    setScannedItems([]);
    setItemAssignments({});
    setExpandedItem(null);
  };

  const handleVoice = () => {
    setVoiceError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true; // keep listening through pauses

    let finalTranscript = '';

    recognition.onstart = () => setListening(true);
    recognition.onerror = (e) => {
      // 'no-speech' is harmless in continuous mode — just keep listening
      if (e.error === 'no-speech') return;
      setListening(false);
      setVoiceError('Could not capture voice. Please try again.');
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
    };

    recognition.onend = async () => {
      setListening(false);
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
        if (!res.ok) throw new Error(data.error ?? 'Failed to parse expense.');

        if (data.description) setDescription(data.description);

        // Collect all names mentioned (from items claimants + payer + participants fallback)
        const rawNames = [
          ...(data.payer_name ? [data.payer_name] : []),
          ...(Array.isArray(data.items)
            ? data.items.flatMap((item) => item.claimants ?? [])
            : Array.isArray(data.participants) ? data.participants : []),
        ];
        const uniqueNames = [...new Map(rawNames.map((n) => [n.toLowerCase(), n])).values()];

        // Find names not yet in the group
        const newNames = uniqueNames.filter(
          (name) => !group.members.some((m) => m.name.toLowerCase() === name.toLowerCase())
        );

        if (newNames.length > 0) {
          for (const name of newNames) {
            await addMemberToGroup(id, name);
          }
          // Store full parsed data — useEffect applies it after group reloads
          pendingVoiceRef.current = data;
          await reload();
        } else {
          applyVoiceData(data, group.members);
        }
      } catch (err) {
        setVoiceError(err.message);
      } finally {
        setVoiceParsing(false);
      }
    };

    recognition.start();
  };

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

  return (
    <div className="px-4 py-6">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-[#344F52] mb-2">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner, Uber, Hotel…"
            required
            autoFocus
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#588884] bg-white"
          />
        </div>

        {/* Total amount */}
        <div>
          <label className="block text-sm font-semibold text-[#344F52] mb-2">Total amount</label>
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
              className="w-full pl-8 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#588884] bg-white"
            />
          </div>
        </div>

        {/* Paid by */}
        <div>
          <label className="block text-sm font-semibold text-[#344F52] mb-2">Paid by</label>
          <div className="flex flex-wrap gap-2">
            {group.members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPayerId(m.id)}
                className={`px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  payerId === m.id
                    ? 'bg-[#588884] text-white border-[#588884]'
                    : 'bg-white text-[#344F52] border-gray-200'
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
              <label className="text-sm font-semibold text-[#344F52] flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-[#588884]" />
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

            <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {pricedItems.map((item, i) => {
                const assignees = itemAssignments[i] ?? new Set();
                const isExpanded = expandedItem === i;
                const assigneeNames = group.members.filter((m) => assignees.has(m.id)).map((m) => m.name);

                return (
                  <div key={i} className="bg-white">
                    <button
                      type="button"
                      onClick={() => setExpandedItem(isExpanded ? null : i)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        assignees.size > 0 ? 'bg-[#ED9854]' : 'bg-gray-200'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#344F52] truncate">{item.name}</p>
                        {assignees.size > 0 ? (
                          <p className="text-xs text-[#ED9854] truncate">
                            {assigneeNames.join(', ')}
                            {assignees.size > 1 && ` · $${((item.price ?? 0) / assignees.size).toFixed(2)} each`}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-500">Not assigned — tap to assign</p>
                        )}
                      </div>

                      <span className="text-sm font-semibold text-[#344F52] flex-shrink-0 mr-2">
                        {item.price != null ? `$${Number(item.price).toFixed(2)}` : '—'}
                      </span>

                      {isExpanded
                        ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
                        : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                      }
                    </button>

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
                                  ? 'bg-[#588884] text-white border-[#588884]'
                                  : 'bg-white text-[#344F52] border-gray-200'
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

            {group.members.some((m) => itemShareTotals[m.id] > 0) && (
              <div className="p-4 bg-[#EFF6F5] rounded-2xl border border-[#CFE0D8] space-y-2">
                <p className="text-xs font-semibold text-[#344F52] mb-1">Split summary</p>
                {group.members
                  .filter((m) => itemShareTotals[m.id] > 0)
                  .map((m) => (
                    <div key={m.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{m.name}</span>
                      <span className="font-semibold text-[#344F52]">
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
          <>
            {/* Participants */}
            <div>
              <label className="block text-sm font-semibold text-[#344F52] mb-2">Split between</label>
              <div className="flex flex-wrap gap-2">
                {group.members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleParticipant(m.id)}
                    className={`px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors ${
                      participants[m.id]
                        ? 'bg-[#FDF3E9] text-[#D4813F] border-[#F5C99A]'
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
              <label className="block text-sm font-semibold text-[#344F52] mb-2">Split method</label>
              <div className="grid grid-cols-3 gap-2">
                {SPLIT_MODES.map(({ id: modeId, label, icon: Icon }) => (
                  <button
                    key={modeId}
                    type="button"
                    onClick={() => { setSplitMode(modeId); setSplitError(null); setInputs({}); }}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors ${
                      splitMode === modeId
                        ? 'bg-[#588884] text-white border-[#588884]'
                        : 'bg-white text-[#344F52] border-gray-200'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {splitMode === 'equal' && parsedTotal > 0 && activeMembers.length > 0 && (
              <div className="p-4 bg-[#EFF6F5] rounded-xl border border-[#CFE0D8]">
                <p className="text-sm text-[#344F52]">
                  Split equally among <span className="font-semibold">{activeMembers.length}</span> people —{' '}
                  <span className="font-bold">${equalShare.toFixed(2)} each</span>
                </p>
              </div>
            )}

            {splitMode !== 'equal' && activeMembers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[#344F52]">
                    {splitMode === 'amount' ? 'Amount per person' : 'Percent per person'}
                  </label>
                  {parsedTotal > 0 && (
                    <span className={`text-xs font-medium ${sumOk ? 'text-green-500' : sumOver ? 'text-rose-500' : 'text-amber-500'}`}>
                      {sumLabel}
                    </span>
                  )}
                </div>
                {activeMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-sm text-[#344F52] w-24 truncate">{m.name}</span>
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
                        onBlur={(e) => {
                          if (splitMode === 'amount') {
                            const val = e.target.value;
                            if (val !== '' && !isNaN(val)) {
                              const othersSum = activeMembers
                                .filter((om) => om.id !== m.id)
                                .reduce((s, om) => s + (parseFloat(inputs[om.id] ?? '0') || 0), 0);
                              const max = Math.max(0, parsedTotal - othersSum);
                              const capped = Math.min(parseFloat(val), max);
                              updateInput(m.id, capped.toFixed(2));
                            }
                          }
                        }}
                        placeholder="0"
                        className={`w-full py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#588884] bg-white ${
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
          className="w-full py-3.5 text-sm font-semibold text-white bg-[#588884] rounded-xl shadow-sm disabled:opacity-40 active:bg-[#467370] transition-colors"
        >
          {saving ? 'Saving…' : 'Add expense'}
        </button>
      </form>
    </div>
  );
}
