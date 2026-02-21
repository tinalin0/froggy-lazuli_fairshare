import { useEffect, useState } from 'react';
import { Receipt, Activity as ActivityIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

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
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
        >
          <Avatar name={item.payer?.name ?? '?'} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
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
