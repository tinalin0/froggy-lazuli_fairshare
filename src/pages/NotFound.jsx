import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <p className="text-6xl font-extrabold text-[#588884] mb-3">404</p>
      <h1 className="text-xl font-bold text-[#344F52] mb-2">Page not found</h1>
      <p className="text-sm text-gray-500 mb-8">This page doesn&apos;t exist.</p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#588884] rounded-xl"
      >
        <ArrowLeft size={16} /> Back to groups
      </Link>
    </div>
  );
}
