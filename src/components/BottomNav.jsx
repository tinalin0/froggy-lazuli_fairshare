import { NavLink } from 'react-router-dom';
import { Users, Activity } from 'lucide-react';

const tabs = [
  { to: '/', icon: Users, label: 'Groups', end: true },
  { to: '/activity', icon: Activity, label: 'Activity' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 z-40 flex">
      {tabs.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
              isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-indigo-50' : ''}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              </div>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
