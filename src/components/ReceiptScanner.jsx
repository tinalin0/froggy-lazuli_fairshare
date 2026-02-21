import { useRef, useState } from 'react';
import { Camera, X, Loader2, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Overlay that captures a receipt photo and calls the Edge Function.
 * @param {function} onResult  - called with { description, subtotal, tax, tip, total }
 * @param {function} onClose
 */
export default function ReceiptScanner({ onResult, onClose }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);   // data URL for preview
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');   // idle | scanning | done | error
  const [result, setResult] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStatus('idle');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const scan = async () => {
    if (!file) return;
    setStatus('scanning');
    setErrMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('image', file);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/scan-receipt`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? anonKey}`,
          apikey: anonKey,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? 'Scan failed.');
      }

      setResult(data);
      setStatus('done');
    } catch (err) {
      setErrMsg(err.message);
      setStatus('error');
    }
  };

  const useResult = () => {
    if (!result) return;
    onResult({
      description: result.description ?? '',
      subtotal: result.subtotal,
      tax: result.tax,
      tip: result.tip,
      total: result.total,
    });
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    setStatus('idle');
    setResult(null);
    setErrMsg('');
    inputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <Camera size={18} className="text-indigo-500" /> Scan Receipt
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Hidden file input — triggers camera on mobile */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Capture button */}
        {!preview && (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50 text-indigo-500 active:bg-indigo-100 transition-colors"
          >
            <Camera size={36} strokeWidth={1.5} />
            <span className="text-sm font-medium">Tap to take a photo or choose from library</span>
          </button>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-gray-100">
              <img src={preview} alt="Receipt preview" className="w-full max-h-56 object-contain" />
              <button
                onClick={reset}
                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Status */}
            {status === 'idle' && (
              <button
                onClick={scan}
                className="w-full py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl"
              >
                Scan this receipt
              </button>
            )}

            {status === 'scanning' && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-indigo-600 font-medium">
                <Loader2 size={16} className="animate-spin" />
                Reading receipt…
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <AlertCircle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-600">{errMsg}</p>
                </div>
                <button onClick={scan} className="w-full py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl">
                  Try again
                </button>
              </div>
            )}

            {status === 'done' && result && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-3">
                    <CheckCircle size={15} /> Receipt scanned — please confirm
                  </div>
                  {[
                    { label: 'Merchant / Description', value: result.description },
                    { label: 'Subtotal', value: result.subtotal != null ? `$${Number(result.subtotal).toFixed(2)}` : null },
                    { label: 'Tax', value: result.tax != null ? `$${Number(result.tax).toFixed(2)}` : null },
                    { label: 'Tip', value: result.tip != null ? `$${Number(result.tip).toFixed(2)}` : null },
                    { label: 'Total', value: result.total != null ? `$${Number(result.total).toFixed(2)}` : null },
                  ].map(({ label, value }) =>
                    value ? (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-semibold text-gray-900">{value}</span>
                      </div>
                    ) : null
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl"
                  >
                    Retake
                  </button>
                  <button
                    onClick={useResult}
                    className="flex-1 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl"
                  >
                    Use this
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
