'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home, Landmark } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Captured Client Exception:', error);
  }, [error]);

  const handleClearCacheAndReload = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gang_transactions');
        localStorage.removeItem('gang_stats');
        localStorage.removeItem('gang_items');
        window.location.href = '/';
      }
    } catch (e) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] flex items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-lg glass-panel p-8 sm:p-10 rounded-3xl border border-rose-900/40 bg-rose-950/20 backdrop-blur-2xl shadow-2xl relative overflow-hidden text-center">
        <div className="w-16 h-16 mx-auto bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 mb-6 shadow-[0_0_25px_rgba(244,63,94,0.25)]">
          <AlertTriangle size={32} />
        </div>

        <h2 className="text-2xl font-display font-extrabold text-white tracking-tight mb-2">
          Terjadi Kendala Sesi Klien
        </h2>
        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          Sistem mendeteksi inkonsistensi cache lokal atau sesi browser. Silakan muat ulang atau pulihkan data lokal Anda.
        </p>

        {error?.message && (
          <div className="p-3 mb-6 bg-black/60 rounded-xl border border-white/10 text-left font-mono-tech text-[11px] text-rose-300 break-words max-h-28 overflow-y-auto custom-scrollbar">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-wider transition-all shadow-glow-gold"
          >
            <RefreshCw size={14} /> Coba Muat Ulang
          </button>

          <button
            type="button"
            onClick={handleClearCacheAndReload}
            className="flex-1 py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-500/40 text-gray-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
            title="Bersihkan cache transaksi lokal yang rusak"
          >
            <Trash2 size={14} className="text-rose-400" /> Pulihkan Data
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <a
            href="/"
            className="text-[11px] text-gray-400 hover:text-amber-400 inline-flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Home size={12} /> Kembali ke Halaman Utama
          </a>
        </div>
      </div>
    </div>
  );
}
