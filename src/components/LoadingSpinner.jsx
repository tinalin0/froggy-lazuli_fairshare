export default function LoadingSpinner({ fullPage = true }) {
  return (
    <div className={`flex items-center justify-center ${fullPage ? 'py-24' : 'py-6'}`}>
      <div className="w-8 h-8 border-[3px] border-[#CFE0D8] border-t-[#588884] rounded-full animate-spin" />
    </div>
  );
}
