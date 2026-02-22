import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, SplitSquareHorizontal } from 'lucide-react';

const titles = {
  '/': 'My Groups',
  '/groups/new': 'New Group',
  '/activity': 'Activity',
};

function getTitle(pathname) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.endsWith('/expenses/new')) return 'Add Expense';
  if (pathname.endsWith('/settle')) return 'Settle Up';
  if (pathname.match(/\/groups\/[^/]+$/)) return 'Group';
  return 'FairShare';
}

function isRoot(pathname) {
  return pathname === '/' || pathname === '/activity';
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = getTitle(location.pathname);
  const showBack = !isRoot(location.pathname);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3 flex-shrink-0">
      {showBack ? (
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center">
          {/* <SplitSquareHorizontal size={16} className="text-white" /> */}
        </div>
      )}
      <h1 className="font-semibold text-[#344F52] text-base flex-1">{title}</h1>
    </header>
  );
}
