'use client';

import React from 'react';
import { User, ShieldCheck, Wallet, Calendar, LogOut, Award } from 'lucide-react';
import { useGang } from '@/lib/GangContext';
import { formatMoney } from '@/lib/firebase';

export default function ProfilePage() {
  const { dbUser, user, handleLogout } = useGang();

  if (!dbUser) return null;

  const joinDate = dbUser.joinedAt?.toDate 
    ? dbUser.joinedAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Anggota Aktif';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <header>
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <User size={20} />
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
            Profil <span className="text-gold">Anggota</span>
          </h1>
        </div>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Identitas dan kredensial terdaftar dalam sindikat.</p>
      </header>

      <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-white/10 relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 font-display font-black text-3xl shadow-glow-gold">
            {(dbUser.icName || dbUser.username).charAt(0).toUpperCase()}
          </div>
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="text-2xl font-display font-extrabold text-white">
                {dbUser.icName || `@${dbUser.username}`}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest">
                VERIFIED
              </span>
            </div>
            {dbUser.icName && (
              <p className="text-xs text-gray-400 font-mono-tech mt-0.5">@{dbUser.username}</p>
            )}
            <p className="text-xs text-amber-400/90 font-bold uppercase tracking-widest mt-1">
              {dbUser.role === 'admin' ? 'Petinggi Sindikat (Admin)' : 'Anggota Faksi (Member)'}
            </p>
            <p className="text-[11px] text-gray-500 mt-2 font-mono-tech">ID: {user?.uid || dbUser.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-8 relative z-10">
          {dbUser.role === 'admin' ? (
            <div className="bg-[#050608] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Wallet size={22} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Kas Rekening Admin</p>
                <p className="text-base font-mono-tech font-extrabold text-white mt-0.5">{formatMoney(dbUser.whiteMoney)}</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#050608] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Akses Faksi</p>
                <p className="text-sm font-bold text-white mt-0.5">Anggota Sindikat Resmi</p>
              </div>
            </div>
          )}

          <div className="bg-[#050608] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Status Otorisasi</p>
              <p className="text-sm font-bold text-emerald-400 capitalize mt-0.5">{dbUser.status}</p>
            </div>
          </div>

          <div className="bg-[#050608] p-4 rounded-2xl border border-white/5 flex items-center gap-4 sm:col-span-2">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400">
              <Calendar size={22} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Masa Aktif Keanggotaan</p>
              <p className="text-xs font-medium text-gray-200 mt-0.5">{joinDate}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button 
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/50 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all"
          >
            <LogOut size={16} /> Keluar Sesi
          </button>
        </div>
      </div>
    </div>
  );
}
