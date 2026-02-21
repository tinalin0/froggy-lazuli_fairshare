export default function LoadingSpinner({ fullPage = true }) {
  return (
    <div className={`flex items-center justify-center ${fullPage ? 'py-24' : 'py-6'}`}>
      <div className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}
