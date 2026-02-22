import { useEffect, useState } from 'react';
import { Receipt, Activity as ActivityIcon, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

function exportCSV(items) {
  const headers = ['Date', 'Group', 'Description', 'Paid By', 'Amount'];
  const rows = items.map((item) => [
    new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    item.group?.name ?? '',
    item.description,
    item.payer?.name ?? '',
    Number(item.total_amount).toFixed(2),
  ]);

  const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fairshare-activity-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Activity() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('expenses')
        .select('*, payer:payer_id(name), group:group_id(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (err) throw err;
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="No activity yet"
        description="Expenses added across all your groups will appear here."
      />
    );
  }

  return (
    <div className="px-4 py-4 space-y-2">
      <div className="flex justify-end mb-1">
        <button
          onClick={() => exportCSV(items)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#588884] border border-[#CFE0D8] bg-white rounded-xl hover:bg-[#EFF6F5] active:bg-[#CFE0D8] transition-colors"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm"
        >
          <Avatar name={item.payer?.name ?? '?'} />
          <div className="flex-1 min-w-0">
            <p className="text-base text-gray-900">
              <span className="font-semibold">{item.payer?.name ?? 'Someone'}</span>{' '}
              <span className="text-gray-500">added</span>{' '}
              <span className="font-medium">{item.description}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {item.group?.name} ·{' '}
              {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 text-sm text-gray-500">
            <Receipt size={13} />
            ${Number(item.total_amount).toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
