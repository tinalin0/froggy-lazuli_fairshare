import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function GroupsList() {
  const { groups, loading, error, reload } = useGroups();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <div className="px-4 py-4">
      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description="Create a group to start splitting expenses with friends."
          action={
            <Link
              to="/groups/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#588884] rounded-xl shadow-sm"
            >
              <Plus size={16} /> New Group
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {groups.map((g) => {
              const net = g.net ?? 0;
              return (
                <Link
                  key={g.id}
                  to={`/groups/${g.id}`}
                  className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50 transition-colors"
                >
                  <div className="w-14 h-14 bg-[#CFE0D8] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users size={24} className="text-[#588884]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#344F52] text-base truncate">{g.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {net === 0 ? (
                      <span className="text-xs font-medium text-gray-400">settled up</span>
                    ) : net > 0 ? (
                      <>
                        <p className="text-xs text-gray-400">you are owed</p>
                        <p className="text-base font-bold text-[#ED9854]">+${net.toFixed(2)}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-400">you owe</p>
                        <p className="text-base font-bold text-rose-500">${Math.abs(net).toFixed(2)}</p>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          <Link
            to="/groups/new"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-[#588884] bg-[#EFF6F5] hover:bg-[#CFE0D8] rounded-xl transition-colors"
          >
            <Plus size={16} /> New Group
          </Link>
        </>
      )}
    </div>
  );
}
