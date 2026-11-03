'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Box, 
  Wallet, 
  Landmark, 
  AlertCircle, 
  ChevronDown, 
  Search, 
  PackageSearch,
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
  Camera
} from 'lucide-react';
import { useGang, Item } from '@/lib/GangContext';
import { formatMoney } from '@/lib/firebase';
import ChangeImageModal from '@/app/components/ChangeImageModal';

export default function DashboardPage() {
  const { items, gangStats, admins, dbUser } = useGang();
  const [filter, setFilter] = useState('SEMUA');
  const [search, setSearch] = useState('');
  const [showAdminVaults, setShowAdminVaults] = useState(false);
  const [selectedItemForImage, setSelectedItemForImage] = useState<Item | null>(null);

  const filteredItems = items.filter(item => {
    const matchCat = filter === 'SEMUA' || item.category === filter;
    const matchSearch = (item.name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalWhiteMoney = (admins || [])
    .filter(a => a && a.status === 'approved')
    .reduce((sum, a) => sum + (Number(a.whiteMoney) || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Layers size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
              Dasbor <span className="text-gold">Inventory & Likuiditas</span>
            </h1>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">
            Ringkasan likuiditas keuangan gelap, rekening legal, dan seluruh brankas aset sindikat.
          </p>
        </div>

        <Link
          href="/shop"
          className="glow-gold-btn px-4 py-2 rounded-xl text-xs font-bold text-black flex items-center gap-1.5 uppercase tracking-wider"
        >
          Masuk Marketplace <ArrowRight size={13} />
        </Link>
      </div>
      
      {/* Finance Stats Grid (Uang Merah & Uang Putih) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dirty Money Card */}
        <div className="glass-red p-4 sm:p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-36 h-36 bg-rose-600/15 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
            <Wallet size={44} className="text-rose-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              <p className="text-rose-400/90 text-[10px] font-bold tracking-widest uppercase">Uang Merah (Dirty Money)</p>
            </div>
            <h3 className="text-2xl sm:text-3xl font-mono-tech font-extrabold text-white tracking-tight">
              {formatMoney(gangStats?.dirtyMoney)}
            </h3>
            <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1.5">
              <AlertCircle size={13} className="text-rose-400/80 shrink-0" /> Total kas operasional brankas faksi sindikat
            </p>
          </div>
        </div>

        {/* White Money Card */}
        <div className="glass-gold p-4 sm:p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <p className="text-amber-400/90 text-[10px] font-bold tracking-widest uppercase">
                    Uang Putih (Legal Funds)
                  </p>
                </div>
                <h3 className="text-2xl sm:text-3xl font-mono-tech font-extrabold text-white text-gold-shimmer tracking-tight">
                  {formatMoney(totalWhiteMoney)}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAdminVaults(!showAdminVaults)} 
                className="bg-[#050608] hover:bg-black border border-white/10 hover:border-amber-500/40 text-gray-300 hover:text-white flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all shadow-sm shrink-0"
              >
                Rekening <ChevronDown size={12} className={`transform transition-transform duration-300 ${showAdminVaults ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {showAdminVaults && (
              <div className="mt-4 pt-3 border-t border-white/10 space-y-2 animate-in slide-in-from-top-2 duration-300 relative z-10 max-h-48 overflow-y-auto custom-scrollbar">
                {(admins || []).filter(a => a && a.status === 'approved').map(acc => (
                  <div key={acc.id} className="flex justify-between items-center bg-[#07090D] p-2.5 rounded-xl border border-white/5 hover:border-amber-500/30 transition-colors">
                    <span className="text-gray-300 text-xs font-bold">
                      Rekening Kas <span className="text-amber-400">{acc.icName || acc.username}</span>
                      <span className="text-[9.5px] text-amber-500/80 ml-1.5 font-normal uppercase">
                        (ADMIN{acc.id === dbUser?.id ? ' • AKUN SAYA' : ''})
                      </span>
                    </span>
                    <span className="text-white font-mono-tech font-bold text-xs">{formatMoney(acc.whiteMoney)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {!showAdminVaults && (
              <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1.5 relative z-10">
                <Landmark size={13} className="text-amber-400/80 shrink-0" /> Total kas legal di brankas rekening administrator sindikat
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Vault Inventory Catalog (Compact) */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 gap-4 relative z-10">
          <div>
            <h3 className="text-lg font-display font-extrabold text-white tracking-tight">Katalog Inventaris Aset</h3>
            <p className="text-xs text-gray-400 mt-0.5">Aset fisik dan logistik yang tersimpan di brankas sindikat.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="flex bg-[#050608] border border-white/10 rounded-xl p-1 overflow-x-auto no-scrollbar">
              {['SEMUA', 'DRUG', 'WEAPON', 'ITEM', 'MAGAZINE', 'EXTENDE WEAPON'].map(tab => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                    filter === tab 
                      ? 'bg-amber-500 text-black shadow-glow-gold' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Telusuri barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#050608] border border-white/10 text-white text-xs rounded-xl pl-9 pr-3.5 py-2 w-full focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-14 text-gray-500 relative z-10">
            <PackageSearch className="w-12 h-12 mx-auto mb-2 opacity-20 text-amber-400" />
            <p className="font-display font-bold text-sm text-gray-300">Katalog Kosong</p>
            <p className="text-xs mt-0.5 text-gray-500">Tidak ada aset fisik yang ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5 relative z-10">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className="bg-[#080B0F]/90 border border-white/[0.08] rounded-2xl p-3 flex flex-col items-center text-center glass-card-hover group"
              >
                {/* Visual Thumbnail (Klik untuk ganti gambar) */}
                <div 
                  onClick={() => setSelectedItemForImage(item)}
                  className="w-full aspect-square max-w-[105px] sm:max-w-[120px] rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mb-2.5 group-hover:border-amber-500/60 group-hover:scale-105 transition-all duration-300 relative cursor-pointer overflow-hidden group/img shadow-glow-gold"
                  title="Klik untuk ganti gambar aset"
                >
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-110" 
                    />
                  ) : (
                    <Box className="w-10 h-10 text-amber-400 group-hover/img:text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-transform duration-300" />
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/65 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center text-amber-400 backdrop-blur-[2px]">
                    <Camera size={18} />
                    <span className="text-[9px] font-extrabold uppercase tracking-wider mt-0.5">Ganti Gambar</span>
                  </div>
                </div>

                <h4 className="text-gray-100 font-bold text-xs mb-1 tracking-tight line-clamp-1">{item.name}</h4>
                <span className="text-[8.5px] font-bold tracking-widest bg-white/5 text-amber-400/80 border border-amber-500/20 px-2 py-0.5 rounded-full mb-3">
                  {item.category}
                </span>
                <div className="mt-auto w-full pt-2.5 border-t border-white/10 flex justify-between items-center">
                  <span className="text-[9.5px] text-gray-500 truncate pr-1" title={item.vault || 'Brankas Utama'}>
                    {item.vault || 'Brankas'}
                  </span>
                  <span className="text-xs font-mono-tech font-extrabold text-white bg-white/5 px-2 py-0.5 rounded-lg">
                    {item.stock || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ganti Gambar Aset */}
      <ChangeImageModal
        item={selectedItemForImage}
        isOpen={!!selectedItemForImage}
        onClose={() => setSelectedItemForImage(null)}
      />
    </div>
  );
}
