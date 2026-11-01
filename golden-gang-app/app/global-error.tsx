'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Critical Global Error:', error);
  }, [error]);

  const handleCleanStorageAndReload = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      }
    } catch (e) {
      window.location.reload();
    }
  };

  return (
    <html lang="id">
      <body className="bg-[#050608] text-white font-sans min-h-screen flex items-center justify-center p-6 selection:bg-amber-500/30">
        <div className="w-full max-w-lg p-8 sm:p-10 rounded-3xl bg-[#090b10] border border-amber-500/30 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 mx-auto bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 mb-6 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
            Terjadi Kendala Sesi Browser
          </h2>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Data lokal pada sesi browser mengalami inkonsistensi. Klik tombol di bawah untuk menyegarkan atau memulihkan data sistem ke kondisi normal.
          </p>

          {error?.message && (
            <div className="p-3 mb-6 bg-black/60 rounded-xl border border-white/10 text-left font-mono text-[11px] text-amber-300 break-words max-h-24 overflow-y-auto">
              {error.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              Coba Muat Ulang
            </button>
            <button
              type="button"
              onClick={handleCleanStorageAndReload}
              className="flex-1 py-3 px-5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
            >
              Reset Cache & Pulihkan
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
