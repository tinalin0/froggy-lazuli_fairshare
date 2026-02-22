export default function LoadingSpinner({ fullPage = true }) {
  return (
    <div className={`w-full ${fullPage ? 'py-24' : 'py-6'}`}>
      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#ED9854] rounded-full animate-loading-bar" />
      </div>
    </div>
  );
}
