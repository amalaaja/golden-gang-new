'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, User, Lock, ArrowRight, AlertCircle, Eye, EyeOff, UserCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { useGang } from '@/lib/GangContext';

export default function LoginPage() {
  const { dbUser, handleLogin, handleRegister } = useGang();
  const [isRegister, setIsRegister] = useState(false);
  const [icName, setIcName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (dbUser) {
      router.push('/');
    }
  }, [dbUser, router]);

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isRegister) {
      if (!icName.trim()) {
        setErrorMsg('Harap masukkan Nama IC (In-Character Roleplay)!');
        return;
      }
      if (!username.trim() || !password.trim()) {
        setErrorMsg('Harap isi Username dan Kata Sandi!');
        return;
      }

      setLoading(true);
      if (handleRegister) {
        const res = await handleRegister(username, password, icName);
        if (res.success) {
          if (res.isPending) {
            // Member baru WAJIB MENUNGGU ACC ADMIN: JANGAN langsung masuk ke beranda!
            setSuccessMsg(res.message || 'Pendaftaran berhasil! Akun Anda sedang MENUNGGU ACC dari Admin di menu Data Member.');
            setIsRegister(false); // Otomatis pindahkan ke tab Masuk Sistem
            setPassword('');      // Kosongkan password agar tidak terkirim ulang
          } else {
            // Khusus admin utama (alvaro) langsung masuk
            setSuccessMsg(res.message || 'Pendaftaran berhasil!');
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }, 300);
          }
        } else {
          setErrorMsg(res.message || 'Gagal mendaftar akun!');
        }
      }
      setLoading(false);
    } else {
      if (!username.trim() || !password.trim()) {
        setErrorMsg('Harap masukkan username dan password!');
        return;
      }

      setLoading(true);
      const res = await handleLogin(username, password);
      if (res.success) {
        router.push('/');
      } else {
        setErrorMsg(res.message || 'Username atau password salah!');
      }
      setLoading(false);
    }
  };

  const switchMode = (reg: boolean) => {
    setIsRegister(reg);
    setErrorMsg('');
    setSuccessMsg('');
    setIcName('');
    setPassword('');
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh] p-4">
      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Header Logo */}
        <div className="text-center mb-6">
          <img 
            src="/logo.png" 
            alt="Golden Gang" 
            className="w-24 h-24 mx-auto object-contain drop-shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-2" 
          />
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
            Golden <span className="text-gold">Gang</span>
          </h1>
        </div>

        {/* Tab Toggle Masuk / Daftar */}
        <div className="grid grid-cols-2 p-1 bg-[#050608] border border-white/10 rounded-2xl mb-5 shadow-inner">
          <button
            type="button"
            onClick={() => switchMode(false)}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              !isRegister
                ? 'bg-amber-500 text-black shadow-glow-gold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Masuk Sistem
          </button>
          <button
            type="button"
            onClick={() => switchMode(true)}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              isRegister
                ? 'bg-amber-500 text-black shadow-glow-gold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Daftar Anggota
          </button>
        </div>

        {isRegister && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-300">
              Pendaftaran baru memerlukan persetujuan (ACC) dari Admin sindikat.
            </p>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={onFormSubmit} className="space-y-3.5">
          {/* Input Nama IC jika Register */}
          {isRegister && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-1 block">
                Nama IC (In-Character Roleplay) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 w-4 h-4" />
                <input
                  type="text"
                  value={icName}
                  onChange={(e) => setIcName(e.target.value)}
                  placeholder="Contoh: Alvaro Cortez / Marcus Vance"
                  className="w-full bg-[#050608] border border-amber-500/30 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 shadow-inner placeholder:text-gray-600 font-medium"
                  required={isRegister}
                />
              </div>
            </div>
          )}

          {/* Input Username */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1 block">
              {isRegister ? 'Username Akun' : 'Username / Identitas'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegister ? "Username login (huruf kecil)" : "Masukkan username"}
                className="w-full bg-[#050608] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60 shadow-inner transition-all placeholder:text-gray-600 font-medium"
                required
              />
            </div>
          </div>

          {/* Input Kata Sandi */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1 block">
              Kata Sandi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "Buat kata sandi akun" : "Masukkan kata sandi"}
                className="w-full bg-[#050608] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60 shadow-inner transition-all placeholder:text-gray-600 font-mono-tech"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 glow-gold-btn rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-amber-400/40 transition-all disabled:opacity-50 mt-5"
          >
            {loading 
              ? (isRegister ? 'Mendaftarkan...' : 'Mengotentikasi...') 
              : (isRegister ? 'Ajukan Pendaftaran Anggota' : 'Masuk ke Sistem')
            }
            <ArrowRight size={15} />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          {isRegister ? (
            <p className="text-xs text-gray-400">
              Sudah memiliki akun terdaftar?{' '}
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="text-amber-400 font-bold hover:underline"
              >
                Masuk Sekarang
              </button>
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Belum terdaftar sebagai anggota?{' '}
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="text-amber-400 font-bold hover:underline"
              >
                Daftar Akun Baru
              </button>
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-gray-500 font-medium tracking-wider">
            <span>Created By</span>
            <span className="text-amber-400 font-bold tracking-widest">AMALA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
