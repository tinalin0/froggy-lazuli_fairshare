import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Activity } from 'lucide-react';

const tabs = [
  { to: '/', icon: Users, label: 'Groups', end: true },
  { to: '/activity', icon: Activity, label: 'Activity' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-300 z-40 flex items-stretch">
      {tabs.map(({ to, icon: Icon, label, end }, i) => (
        <Fragment key={to}>
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-4 text-sm font-medium transition-colors ${
                isActive ? 'text-[#588884]' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-[#EFF6F5]' : ''}`}>
                  <Icon size={23} strokeWidth={isActive ? 2.5 : 1.75} />
                </div>
                {label}
              </>
            )}
          </NavLink>
          {i === 0 && <div className="w-20 flex-shrink-0" />}
        </Fragment>
      ))}
    </nav>
  );
}
