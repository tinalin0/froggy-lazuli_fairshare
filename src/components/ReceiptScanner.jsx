import { useRef, useState } from 'react';
import { Camera, X, Loader2, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Overlay that captures a receipt photo and calls the Gemini Vision API.
 * Returns all scanned items + totals to the parent (NewExpense handles item assignment).
 *
 * @param {function} onResult  - called with { description, items, subtotal, tax, tip, total }
 * @param {function} onClose
 */
export default function ReceiptScanner({ onResult, onClose }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
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

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-receipt`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error((data.error ?? JSON.stringify(data)) + (data.raw ? ` | raw: ${data.raw}` : ''));

      setResult(data);
      setStatus('done');
    } catch (err) {
      setErrMsg(err.message);
      setStatus('error');
    }
  };

  const confirm = () => {
    if (!result) return;
    onResult({
      description: result.description ?? '',
      items: result.items ?? [],
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
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <h2 className="font-bold text-[#344F52] text-base flex items-center gap-2">
            <Camera size={18} className="text-[#588884]" /> Scan Receipt
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-4">

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {!preview && (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-[#CFE0D8] rounded-2xl bg-[#EFF6F5] text-[#588884] active:bg-[#CFE0D8] transition-colors"
            >
              <Camera size={36} strokeWidth={1.5} />
              <span className="text-sm font-medium">Tap to take a photo or choose from library</span>
            </button>
          )}

          {preview && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-gray-100">
                <img src={preview} alt="Receipt preview" className="w-full max-h-48 object-contain" />
                <button
                  onClick={reset}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {status === 'idle' && (
                <button
                  onClick={scan}
                  className="w-full py-3 text-sm font-semibold text-white bg-[#588884] rounded-xl"
                >
                  Scan this receipt
                </button>
              )}

              {status === 'scanning' && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-[#588884] font-medium">
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
                  <button onClick={scan} className="w-full py-3 text-sm font-semibold text-white bg-[#588884] rounded-xl">
                    Try again
                  </button>
                </div>
              )}

              {status === 'done' && result && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#FDF3E9] rounded-2xl border border-[#FAE4CA] space-y-2">
                    <div className="flex items-center gap-2 text-[#D4813F] font-semibold text-sm mb-1">
                      <CheckCircle size={15} /> Receipt scanned — confirm details
                    </div>

                    {result.description && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Merchant</span>
                        <span className="font-semibold text-[#344F52]">{result.description}</span>
                      </div>
                    )}

                    {result.items?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#FAE4CA] space-y-1">
                        <p className="text-xs font-semibold text-gray-500 mb-1">{result.items.length} items found</p>
                        {result.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-[#344F52]">
                            <span className="truncate flex-1 mr-2">
                              {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                            </span>
                            <span className="font-medium flex-shrink-0">
                              {item.price != null ? `$${Number(item.price).toFixed(2)}` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-[#FAE4CA] space-y-1">
                      {[
                        { label: 'Subtotal', value: result.subtotal },
                        { label: 'Tax',      value: result.tax },
                        { label: 'Tip',      value: result.tip },
                        { label: 'Total',    value: result.total },
                      ].map(({ label, value }) =>
                        value != null ? (
                          <div key={label} className="flex justify-between text-sm">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-semibold text-[#344F52]">${Number(value).toFixed(2)}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={reset}
                      className="flex-1 py-3 text-sm font-semibold text-[#344F52] bg-gray-100 rounded-xl"
                    >
                      Retake
                    </button>
                    <button
                      onClick={confirm}
                      className="flex-1 py-3 text-sm font-semibold text-white bg-[#588884] rounded-xl"
                    >
                      Use this receipt
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
