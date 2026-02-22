import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Trash2 } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import ConfirmSheet from '../components/ConfirmSheet';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const PASTEL_COLORS = [
  { bg: 'bg-[#CFE0D8]', icon: 'text-[#588884]' },
  { bg: 'bg-purple-100', icon: 'text-purple-500' },
  { bg: 'bg-pink-100',   icon: 'text-pink-500'   },
  { bg: 'bg-amber-100',  icon: 'text-amber-500'  },
  { bg: 'bg-sky-100',    icon: 'text-sky-500'    },
  { bg: 'bg-rose-100',   icon: 'text-rose-400'   },
  { bg: 'bg-lime-100',   icon: 'text-lime-600'   },
  { bg: 'bg-orange-100', icon: 'text-orange-400' },
  { bg: 'bg-teal-100',   icon: 'text-teal-500'   },
  { bg: 'bg-indigo-100', icon: 'text-indigo-400' },
];

function colorForGroup(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
}

export default function GroupsList() {
  const { groups, loading, error, reload, deleteGroup, deleting } = useGroups();
  const [groupToDelete, setGroupToDelete] = useState(null);

  const handleDelete = async () => {
    if (!groupToDelete) return;
    await deleteGroup(groupToDelete.id);
    setGroupToDelete(null);
  };

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
              const color = colorForGroup(g.id);
              return (
                <div
                  key={g.id}
                  className="relative flex items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50 transition-colors"
                >
                  <Link
                    to={`/groups/${g.id}`}
                    className="absolute inset-0 rounded-2xl"
                    aria-label={g.name}
                  />
                  <div className="flex items-center gap-4 flex-1 min-w-0 pointer-events-none">
                    <div className={`w-14 h-14 ${color.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Users size={24} className={color.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#344F52] text-base truncate">{g.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setGroupToDelete(g)}
                    className="relative z-10 text-gray-300 hover:text-rose-400 transition-colors p-1 flex-shrink-0"
                    disabled={deleting}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
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
      {groupToDelete && (
        <ConfirmSheet
          title={`Delete "${groupToDelete.name}"?`}
          message="This will permanently delete the group and all its expenses. This cannot be undone."
          confirmLabel="Delete group"
          confirmClass="bg-rose-500"
          onConfirm={handleDelete}
          onClose={() => setGroupToDelete(null)}
        />
      )}
    </div>
  );
}