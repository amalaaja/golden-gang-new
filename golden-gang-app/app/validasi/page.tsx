'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Check, 
  X, 
  Clock, 
  ShoppingCart, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  History,
  Zap,
  User as UserIcon,
  BadgeAlert
} from 'lucide-react';
import { useGang, getTxMillis, Transaction } from '@/lib/GangContext';
import { formatMoney } from '@/lib/firebase';

export default function ValidasiTransaksiPage() {
  const { 
    transactions, 
    isAdmin, 
    dbUser, 
    users, 
    approveTransaction, 
    rejectTransaction 
  } = useGang();

  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getUserRole = (username?: string): 'ADMIN' | 'MEMBER' => {
    if (!username) return 'MEMBER';
    const cleanName = username.replace('@', '').toLowerCase();
    if (cleanName === 'alvaro' || cleanName === 'goldenboss') return 'ADMIN';
    const found = users?.find(u => (u?.username || '').toLowerCase() === cleanName);
    if (found && found.role === 'admin') return 'ADMIN';
    return 'MEMBER';
  };

  const getTxItemLabel = (tx: any): string => {
    if (!tx) return '-';
    if (typeof tx.details === 'string' && tx.details.trim()) return tx.details;
    if (typeof tx.items === 'string' && tx.items.trim()) return tx.items;
    if (Array.isArray(tx.itemsPayload) && tx.itemsPayload.length > 0) {
      return tx.itemsPayload.map((i: any) => `${i.name || 'Item'} (${i.qty || 1}x)`).join(', ');
    }
    if (Array.isArray(tx.items)) {
      return tx.items.map((i: any) => typeof i === 'string' ? i : `${i.name || 'Item'} (${i.qty || 1}x)`).join(', ');
    }
    return '-';
  };

  const getTxAssetAndQty = (tx: any) => {
    if (!tx) return { assetName: '-', qtyText: '-', isPositive: false };

    const isPurchase = tx.type === 'SHOP_PURCHASE';
    const isDeposit = tx.type === 'DEPOSIT';
    const isWithdraw = tx.type === 'WITHDRAW';

    // 1. Kas Uang Merah
    if (tx.asset === 'uang_merah' || (tx.details && tx.details.toLowerCase().includes('uang merah'))) {
      const amountVal = formatMoney(tx.totalPrice || tx.amount || 0);
      return {
        assetName: 'Kas Uang Merah',
        qtyText: isDeposit ? `+${amountVal}` : `-${amountVal}`,
        isPositive: isDeposit
      };
    }

    // 2. Kas Uang Putih
    if (tx.asset === 'uang_putih' || (tx.details && tx.details.toLowerCase().includes('uang putih') && !tx.details.toLowerCase().includes('x)'))) {
      const rekMatch = tx.details?.match(/Rek:\s*(@\w+)/i)?.[1] || tx.details?.match(/\((@\w+)\)/i)?.[1] || '';
      const name = rekMatch ? `Kas Uang Putih (${rekMatch})` : (tx.details || 'Kas Uang Putih');
      const amountVal = formatMoney(tx.totalPrice || tx.amount || 0);
      return {
        assetName: name,
        qtyText: isDeposit ? `+${amountVal}` : `-${amountVal}`,
        isPositive: isDeposit
      };
    }

    // 3. Pembelian Toko Internal (SHOP_PURCHASE)
    if (isPurchase) {
      if (Array.isArray(tx.itemsPayload) && tx.itemsPayload.length > 0) {
        const names = tx.itemsPayload.map((i: any) => i.name || 'Item').join(', ');
        const totalUnits = tx.itemsPayload.reduce((sum: number, i: any) => sum + (Number(i.qty) || 1), 0);
        return {
          assetName: names,
          qtyText: `-${totalUnits}x`,
          isPositive: false
        };
      }
      const raw = tx.details || tx.items || 'Barang Toko';
      const match = raw.match(/^(.*?)\s*\((\d+)x\)$/);
      if (match) {
        return {
          assetName: match[1].trim(),
          qtyText: `-${match[2]}x`,
          isPositive: false
        };
      }
      return {
        assetName: raw.replace(/\(\d+x\)/g, '').trim() || 'Barang Toko',
        qtyText: '-1x',
        isPositive: false
      };
    }

    // 4. Barang Fisik / Brankas (DEPOSIT atau WITHDRAW)
    const raw = tx.details || tx.items || '';
    const match = raw.match(/^(.*?)\s*\((\d+)x\)$/);
    const itemName = match ? match[1].trim() : (raw.replace(/\(\d+x\)/g, '').trim() || 'Barang Fisik');
    const unitCount = match ? match[2] : (tx.itemQty || 1);

    if (isDeposit) {
      return {
        assetName: itemName,
        qtyText: `+${unitCount}x`,
        isPositive: true
      };
    } else {
      return {
        assetName: itemName,
        qtyText: `-${unitCount}x`,
        isPositive: false
      };
    }
  };

  const getMoneyType = (tx: any): 'Uang Merah' | 'Uang Putih' | null => {
    if (!tx) return 'Uang Putih';
    const pm = (tx.paymentMethod || '').toLowerCase();
    const asset = (tx.asset || '').toLowerCase();
    if (pm === 'uang_merah' || asset === 'uang_merah') return 'Uang Merah';
    if (pm === 'uang_putih' || asset === 'uang_putih' || asset === 'barang') return 'Uang Putih';

    const full = `${tx.details || ''} ${tx.note || ''} ${typeof tx.items === 'string' ? tx.items : ''}`.toLowerCase();
    if (full.includes('uang merah') || full.includes('kas gelap') || full.includes('uang_merah')) return 'Uang Merah';
    if (full.includes('uang putih') || full.includes('rekening') || full.includes('uang_putih')) return 'Uang Putih';
    if (full.includes('merah')) return 'Uang Merah';
    if (full.includes('putih')) return 'Uang Putih';

    // Seluruh item fisik / aset brankas / mutasi non-merah OTOMATIS Uang Putih
    return 'Uang Putih';
  };

  const formatDate = (item: any) => {
    const millis = getTxMillis(item);
    if (!millis) return 'Baru Saja';
    const d = new Date(millis);
    if (isNaN(d.getTime())) return 'Baru Saja';

    return `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Selalu urutkan transaksi dari yang paling baru
  const sortedTx = [...(transactions || [])].filter(Boolean).sort((a, b) => {
    const timeB = getTxMillis(b);
    const timeA = getTxMillis(a);
    if (timeB !== timeA) return timeB - timeA;
    return (b?.id || '').localeCompare(a?.id || '');
  });

  const pendingCount = (transactions || []).filter(t => t && (t.status || 'approved') === 'pending').length;
  const approvedCount = (transactions || []).filter(t => t && (t.status || 'approved') === 'approved').length;
  const rejectedCount = (transactions || []).filter(t => t && t.status === 'rejected').length;

  const filteredTx = sortedTx.filter(tx => {
    if (!tx) return false;
    const txStatus = tx.status || 'approved';
    const matchStatus = statusFilter === 'all' || txStatus === statusFilter;
    const matchType = typeFilter === 'ALL' || tx.type === typeFilter;
    const target = `${tx.details || ''} ${typeof tx.items === 'string' ? tx.items : ''} ${tx.user || ''} ${tx.note || ''} ${tx.type || ''}`.toLowerCase();
    const matchSearch = target.includes((search || '').toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  const handleApprove = async (txId: string) => {
    setActionLoading(txId);
    setNotice(null);
    try {
      await approveTransaction(txId);
      setNotice({
        type: 'success',
        text: 'Transaksi berhasil di-ACC! Mutasi kas & stok telah dieksekusi dan transaksi otomatis resmi masuk ke Log Riwayat.'
      });
      setTimeout(() => setNotice(null), 5000);
    } catch (e: any) {
      setNotice({ type: 'error', text: e?.message || 'Gagal menyetujui transaksi.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (txId: string) => {
    setActionLoading(txId);
    setNotice(null);
    try {
      await rejectTransaction(txId);
      setNotice({
        type: 'success',
        text: 'Transaksi telah ditolak. Tidak ada mutasi saldo atau pemotongan stok yang terjadi.'
      });
      setTimeout(() => setNotice(null), 5000);
    } catch (e: any) {
      setNotice({ type: 'error', text: e?.message || 'Gagal menolak transaksi.' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Banner (Compact) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck size={16} />
            </span>
            <h1 className="text-lg sm:text-xl font-display font-extrabold text-white tracking-tight">
              Validasi <span className="text-gold">Transaksi</span>
            </h1>
          </div>
          <p className="text-gray-400 text-[11px] mt-0.5">
            Pusat persetujuan resmi petinggi faksi untuk transaksi Internal Shop dan mutasi Ledger.
          </p>
        </div>

        <Link
          href="/riwayat"
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider transition-all"
        >
          <History size={13} /> Buka Log Riwayat
        </Link>
      </div>

      {/* Alert Notification */}
      {notice && (
        <div className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center justify-between gap-2.5 border animate-in slide-in-from-top-1 duration-200 ${
          notice.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{notice.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotice(null)} 
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Non-Admin Notice */}
      {!isAdmin && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] flex items-center gap-2">
          <BadgeAlert size={15} className="shrink-0 text-amber-400" />
          <p>
            Anda masuk sebagai <strong>Anggota (Member)</strong>. Tombol ACC dan Penolakan hanya dapat dieksekusi oleh <strong>Administrator</strong>.
          </p>
        </div>
      )}

      {/* Stats Quick Cards (Compact) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div 
          onClick={() => setStatusFilter('pending')}
          className={`glass-panel p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'border-amber-500/50 bg-amber-500/10 shadow-glow-gold'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
              <Clock size={12} /> Menunggu ACC
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          </div>
          <p className="text-xl sm:text-2xl font-mono-tech font-extrabold text-white mt-1">
            {pendingCount}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Memerlukan persetujuan admin</p>
        </div>

        <div 
          onClick={() => setStatusFilter('approved')}
          className={`glass-panel p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'approved'
              ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
              <Check size={12} /> Telah Di-ACC
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-mono-tech font-extrabold text-white mt-1">
            {approvedCount}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Telah resmi disetujui</p>
        </div>

        <div 
          onClick={() => setStatusFilter('rejected')}
          className={`glass-panel p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'rejected'
              ? 'border-rose-500/50 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400 flex items-center gap-1.5">
              <X size={12} /> Ditolak
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-mono-tech font-extrabold text-white mt-1">
            {rejectedCount}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Dibatalkan tanpa mutasi saldo</p>
        </div>
      </div>

      {/* Filter and Search Bar (Compact) */}
      <div className="glass-panel rounded-2xl p-2 sm:p-2.5 flex flex-col md:flex-row gap-2 justify-between items-center bg-[#0B0D12]/60">
        <div className="flex bg-[#07080B] border border-white/10 rounded-xl p-1 w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'pending', label: `Menunggu ACC (${pendingCount})` },
            { id: 'approved', label: `Telah Di-ACC (${approvedCount})` },
            { id: 'rejected', label: `Ditolak (${rejectedCount})` },
            { id: 'all', label: `Semua (${transactions.length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                statusFilter === f.id
                  ? 'bg-amber-500 text-black shadow-glow-gold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Cari pemohon, barang, nominal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#07080B] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-gray-600 shadow-inner"
          />
        </div>
      </div>

      {/* Modern Validation Table (Compact) */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#090C10] border-b border-white/10 text-gray-400">
              <tr>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9px]">Waktu Pengajuan</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9px]">Pemohon</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9px]">Kategori Ops</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9px]">Barang / Aset</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9px] text-center">Jumlah (Mutasi)</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9px]">Total Nilai</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9px]">Status</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9px]">Keterangan</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9px] text-right">Tindakan Otoritas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <ShieldCheck size={32} className="mx-auto mb-1.5 opacity-30 text-amber-400" />
                    <p className="font-display font-bold text-xs text-gray-300">Tidak Ada Antrian Transaksi</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {statusFilter === 'pending' 
                        ? 'Semua transaksi telah selesai divalidasi oleh administrator.' 
                        : 'Belum ada data untuk filter status yang dipilih.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx, i) => {
                  const isPurchase = tx.type === 'SHOP_PURCHASE';
                  const isDeposit = tx.type === 'DEPOSIT';
                  const isWithdraw = tx.type === 'WITHDRAW';
                  const operatorName = tx.user || 'member';
                  const txStatus = tx.status || 'approved';
                  const isPending = txStatus === 'pending';
                  const isApproved = txStatus === 'approved';
                  const isRejected = txStatus === 'rejected';
                  const isLoading = actionLoading === tx.id;

                  return (
                    <tr 
                      key={tx.id || i} 
                      className={`table-row-hover transition-colors ${
                        isPending ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      {/* Waktu */}
                      <td className="px-3.5 py-2 text-gray-400 font-mono-tech text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {isPending && (
                            <span className="flex h-1.5 w-1.5 relative" title="Menunggu ACC">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                          )}
                          <span className={isPending ? 'text-amber-300 font-bold' : ''}>
                            {formatDate(tx)}
                          </span>
                        </div>
                      </td>

                      {/* Pemohon */}
                      <td className="px-3.5 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[9px]">
                            {operatorName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-gray-200 font-bold text-[11px]">@{operatorName}</span>
                          {getUserRole(operatorName) === 'ADMIN' ? (
                            <span className="text-[8px] bg-amber-500/15 border border-amber-500/35 text-amber-400 px-1.5 py-0.2 rounded-full uppercase font-extrabold tracking-wider">
                              ADMIN
                            </span>
                          ) : (
                            <span className="text-[8px] bg-blue-500/15 border border-blue-500/35 text-blue-400 px-1.5 py-0.2 rounded-full uppercase font-extrabold tracking-wider">
                              MEMBER
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kategori Ops */}
                      <td className="px-3.5 py-2">
                        {isPurchase && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <ShoppingCart size={10} /> Pembelian Toko
                          </span>
                        )}
                        {isDeposit && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <ArrowDownLeft size={10} /> Deposit Masuk
                          </span>
                        )}
                        {isWithdraw && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <ArrowUpRight size={10} /> Withdraw Keluar
                          </span>
                        )}
                      </td>

                      {/* Barang / Aset */}
                      {(() => {
                        const parsed = getTxAssetAndQty(tx);
                        return (
                          <>
                            <td className="px-3.5 py-2 text-white font-medium max-w-[200px] truncate text-[11px]" title={parsed.assetName}>
                              {parsed.assetName}
                            </td>
                            <td className="px-3.5 py-2 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-0.5 font-mono-tech font-extrabold text-[11px] px-2 py-0.5 rounded-md border shadow-sm ${
                                parsed.isPositive 
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
                                  : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                              }`}>
                                {parsed.qtyText}
                              </span>
                            </td>
                          </>
                        );
                      })()}

                      {/* Total Nilai + Badge Uang */}
                      <td className="px-3.5 py-2 font-mono-tech">
                        {tx.totalPrice || tx.amount ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold text-xs ${isWithdraw ? 'text-rose-400' : 'text-amber-400'}`}>
                              {formatMoney(tx.totalPrice || tx.amount)}
                            </span>
                            {getMoneyType(tx) === 'Uang Merah' && (
                              <span className="text-[9px] font-sans font-extrabold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-1.5 py-0.2 rounded whitespace-nowrap">
                                (Uang Merah)
                              </span>
                            )}
                            {getMoneyType(tx) === 'Uang Putih' && (
                              <span className="text-[9px] font-sans font-extrabold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded whitespace-nowrap">
                                (Uang Putih)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse">
                            <Clock size={10} /> Menunggu ACC
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <Check size={10} strokeWidth={3} /> Di-ACC Admin
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <X size={10} strokeWidth={3} /> Ditolak
                          </span>
                        )}
                      </td>

                      {/* Keterangan / Berita Acara */}
                      <td className="px-3.5 py-2 max-w-[220px] text-[11px]" title={tx.note}>
                        {tx.note ? (
                          <span className={`inline-block px-2 py-0.5 rounded-md truncate max-w-[200px] font-medium border ${
                            isPending 
                              ? 'text-amber-200/90 bg-amber-500/10 border-amber-500/25 shadow-sm' 
                              : 'text-gray-300 bg-white/[0.03] border-white/10'
                          }`}>
                            {tx.note}
                          </span>
                        ) : (
                          <span className="text-gray-500 italic text-[10px]">Tanpa keterangan</span>
                        )}
                      </td>

                      {/* Tindakan Otoritas */}
                      <td className="px-3.5 py-2 text-right">
                        {isPending ? (
                          isAdmin ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleApprove(tx.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm hover:scale-105 disabled:opacity-50"
                              >
                                <Check size={11} strokeWidth={3} /> ACC / Setujui
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleReject(tx.id)}
                                className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all hover:scale-105 disabled:opacity-50"
                              >
                                <X size={11} strokeWidth={3} /> Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-400/80 italic font-medium">
                              Menunggu Admin
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-gray-500">
                            {tx.validatedBy ? `Oleh @${tx.validatedBy}` : 'Selesai'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
