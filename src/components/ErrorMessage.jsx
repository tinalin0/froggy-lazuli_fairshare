import { AlertCircle } from 'lucide-react';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="mx-4 mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-rose-700">Something went wrong</p>
          <p className="text-xs text-rose-500 mt-0.5 break-all">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="self-start text-xs font-semibold text-rose-600 underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}
