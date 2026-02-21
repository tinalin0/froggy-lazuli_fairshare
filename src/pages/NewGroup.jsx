import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Users } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';

export default function NewGroup() {
  const navigate = useNavigate();
  const { createGroup } = useGroups();

  const [name, setName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (trimmed && !members.includes(trimmed)) {
      setMembers((prev) => [...prev, trimmed]);
      setMemberInput('');
    }
  };

  const removeMember = (m) => setMembers((prev) => prev.filter((x) => x !== m));

  const handleMemberKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addMember(); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const group = await createGroup(name.trim(), members);
      navigate(`/groups/${group.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Group name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Group name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Barcelona Trip"
            required
            autoFocus
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
          />
        </div>

        {/* Members */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Add members <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={handleMemberKeyDown}
              placeholder="Member name"
              className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
            />
            <button
              type="button"
              onClick={addMember}
              disabled={!memberInput.trim()}
              className="px-4 py-3 bg-indigo-600 text-white rounded-xl disabled:opacity-40 active:bg-indigo-700 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {members.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {members.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => removeMember(m)}
                    className="text-indigo-400 hover:text-indigo-600"
                    aria-label={`Remove ${m}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {members.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">
              You can also add members after creating the group.
            </p>
          )}
        </div>

        {/* Info */}
        <div className="flex gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <Users size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 leading-relaxed">
            Members are added by name — no account needed.
          </p>
        </div>

        {error && (
          <p className="text-sm text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full py-3.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl shadow-sm disabled:opacity-40 active:bg-indigo-700 transition-colors"
        >
          {saving ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </div>
  );
}
