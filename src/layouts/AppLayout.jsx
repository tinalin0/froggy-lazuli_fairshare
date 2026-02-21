import { Outlet } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import TopBar from '../components/TopBar';

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-white shadow-xl">
      <TopBar />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
