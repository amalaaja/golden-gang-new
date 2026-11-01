'use client';

import React, { useState } from 'react';
import { ShieldAlert, Users, Check, X, UserCheck, ShieldCheck, Clock, Loader2, ChevronDown } from 'lucide-react';
import { useGang } from '@/lib/GangContext';

export default function AdminPage() {
  const { users, user, dbUser, isAdmin, updateUserStatus, updateUserRole } = useGang();
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="glass-panel p-10 rounded-3xl text-center max-w-lg mx-auto my-12">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4 opacity-80" />
        <h2 className="text-xl font-display font-extrabold text-white mb-2">Akses Dibatasi</h2>
        <p className="text-gray-400 text-xs">Halaman ini hanya dapat diakses oleh Administrator / Petinggi Faksi.</p>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      await updateUserStatus(id, status);
    } finally {
      setProcessingId(null);
    }
  };

  const updateRole = async (id: string, role: string) => {
    setProcessingId(id);
    try {
      await updateUserRole(id, role);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <header>
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Users size={20} />
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
            Data <span className="text-gold">Member</span>
          </h1>
        </div>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Manajemen hierarki dan perizinan akses anggota sindikat.</p>
      </header>

      {/* Pending Section */}
      <div className="glass-panel rounded-3xl border border-amber-500/25 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <Clock size={16} /> Menunggu Persetujuan (ACC)
          </h3>
          <span className="bg-amber-500 text-black px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-glow-gold">
            {pendingUsers.length} Permintaan
          </span>
        </div>

        <div className="space-y-3 relative z-10">
          {pendingUsers.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
              <ShieldCheck size={28} className="mx-auto mb-2 text-emerald-400/60" />
              <p className="text-gray-300 text-xs font-bold">Tidak ada identitas baru yang menunggu verifikasi.</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Setiap anggota yang baru mendaftar akan muncul di sini untuk di-ACC.</p>
            </div>
          ) : (
            pendingUsers.map(u => {
              const isBusy = processingId === u.id;
              return (
                <div 
                  key={u.id} 
                  className="flex flex-col sm:flex-row justify-between sm:items-center bg-[#07090D] p-4 rounded-2xl border border-amber-500/30 hover:border-amber-500/60 transition-all gap-4 shadow-inner"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 font-display font-black text-base shadow-glow-gold">
                      {(u.icName || u.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-extrabold text-sm tracking-tight">
                          {u.icName || `@${u.username}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                          MENUNGGU ACC
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono-tech block mt-0.5">
                        Username: @{u.username} • Role: {u.role || 'member'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      disabled={isBusy}
                      onClick={() => updateStatus(u.id, 'approved')} 
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                      {isBusy ? 'Memproses...' : 'Setujui (ACC)'}
                    </button>
                    <button 
                      type="button" 
                      disabled={isBusy}
                      onClick={() => updateStatus(u.id, 'rejected')} 
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                    >
                      <X size={14} /> Tolak
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Approved Members Table */}
      <div className="glass-panel rounded-3xl border border-white/10 p-5 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
            <Users size={16} /> Anggota Aktif Terdaftar
          </h3>
          <span className="bg-white/10 text-gray-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            {approvedUsers.length} Anggota
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#080A0E] border-b border-white/10 text-gray-400">
              <tr>
                <th className="px-5 py-3.5 font-bold uppercase tracking-widest text-[9.5px]">Identitas Anggota</th>
                <th className="px-5 py-3.5 font-bold uppercase tracking-widest text-[9.5px]">Hierarki (Role)</th>
                <th className="px-5 py-3.5 font-bold uppercase tracking-widest text-[9.5px] text-right">Tindakan Otoritas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {approvedUsers.map(u => {
                const isSelf = (u.username && dbUser?.username && u.username.toLowerCase() === dbUser.username.toLowerCase()) || u.id === dbUser?.id || u.id === user?.uid;
                const isBusy = processingId === u.id;
                return (
                  <tr key={u.id} className="table-row-hover transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                          {(u.icName || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-100 font-bold text-xs">
                              {u.icName || `@${u.username}`}
                            </span>
                            {isSelf && (
                              <span className="text-[8.5px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-full uppercase tracking-wider font-extrabold">
                                Anda
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono-tech">
                            @{u.username}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="relative inline-flex items-center">
                        <select 
                          value={u.role || 'member'}
                          onChange={(e) => updateRole(u.id, e.target.value)}
                          disabled={isSelf || isBusy} 
                          className="bg-[#050608] border border-white/10 hover:border-amber-500/40 focus:border-amber-500/60 rounded-xl text-xs pl-3 pr-8 py-1.5 text-gray-200 disabled:opacity-40 appearance-none shadow-inner transition-all uppercase tracking-wider font-bold cursor-pointer disabled:cursor-not-allowed"
                        >
                          <option value="member" className="bg-[#080B0F] text-gray-200 py-1 font-bold">Anggota (Member)</option>
                          <option value="admin" className="bg-[#080B0F] text-amber-400 py-1 font-bold">Petinggi (Admin)</option>
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 text-gray-400 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button 
                        type="button"
                        onClick={() => updateStatus(u.id, 'rejected')}
                        disabled={isSelf || isBusy}
                        className="text-rose-400/80 hover:text-rose-400 text-[10px] font-bold uppercase tracking-wider bg-rose-950/20 border border-rose-900/30 hover:bg-rose-900/40 hover:border-rose-500/30 px-3.5 py-1.5 rounded-xl disabled:opacity-30 transition-all"
                      >
                        Cabut Akses
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
