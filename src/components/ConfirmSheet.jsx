import { X } from 'lucide-react';

/**
 * In-app bottom sheet confirmation dialog — replaces browser confirm().
 *
 * @param {string}   title
 * @param {string}   [message]
 * @param {string}   [confirmLabel]   default "Confirm"
 * @param {string}   [confirmClass]   tailwind classes for confirm button
 * @param {function} onConfirm
 * @param {function} onClose
 */
export default function ConfirmSheet({
  title,
  message,
  confirmLabel = 'Confirm',
  confirmClass = 'bg-[#588884]',
  onConfirm,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <h2 className="font-bold text-[#344F52] text-base pr-4">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        {message && <p className="text-sm text-gray-500 mb-5">{message}</p>}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-[#344F52] bg-gray-100 rounded-xl active:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-3 text-sm font-semibold text-white rounded-xl active:opacity-80 transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
