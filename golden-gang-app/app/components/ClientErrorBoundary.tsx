'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ClientErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Captured in ClientErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHardReset = () => {
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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="w-full max-w-lg glass-panel p-8 rounded-3xl border border-rose-900/40 bg-rose-950/20 text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Terjadi Kendala Memuat Data</h3>
            <p className="text-xs text-gray-400 mb-4">
              Ada inkonsistensi cache pada tampilan ini. Silakan segarkan atau pulihkan data lokal Anda.
            </p>
            {this.state.error?.message && (
              <div className="p-3 mb-5 bg-black/60 rounded-xl border border-white/10 text-left font-mono-tech text-[11px] text-rose-300 break-words max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-glow-gold"
              >
                <RefreshCw size={13} /> Coba Lagi
              </button>
              <button
                type="button"
                onClick={this.handleHardReset}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={13} className="text-rose-400" /> Pulihkan Data Lokal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
