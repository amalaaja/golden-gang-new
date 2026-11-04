'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingCart, 
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  Check,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard
} from 'lucide-react';
import { useGang, deduplicateTransactions, getMillis, getTxMillis } from '@/lib/GangContext';
import { formatMoney } from '@/lib/firebase';

export default function RiwayatPage() {
  const { transactions, dbUser, users } = useGang();
  const [tab, setTab] = useState<'semua' | 'saya'>('semua');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCheckoutSuccessAlert, setShowCheckoutSuccessAlert] = useState(false);
  
  // Paginasi: Maksimal 10 item per halaman
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const getUserRole = (username?: string): 'ADMIN' | 'MEMBER' => {
    if (!username) return 'MEMBER';
    const cleanName = username.replace('@', '').toLowerCase();
    if (cleanName === 'alvaro' || cleanName === 'goldenboss') return 'ADMIN';
    const found = users?.find(u => 
      (u?.username || '').toLowerCase() === cleanName ||
      (u?.icName || '').toLowerCase() === cleanName
    );
    if (found && found.role === 'admin') return 'ADMIN';
    return 'MEMBER';
  };

  const getUserIcName = (identifier?: string): string => {
    if (!identifier) return 'Member';
    const clean = identifier.replace('@', '').toLowerCase().trim();
    const found = users?.find(u => 
      (u?.username || '').toLowerCase() === clean || 
      (u?.icName || '').toLowerCase() === clean ||
      u?.id === identifier
    );
    return found?.icName || identifier.replace('@', '');
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

  const getTxAssetAndQty = (tx: any): { 
    assetName: string; 
    qtyText: string; 
    isPositive: boolean;
    itemList?: string[];
    itemQtys?: number[];
  } => {
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
      const combined = `${tx.details || ''} ${tx.note || ''}`;
      const rekMatch = combined.match(/Rek:\s*@?([^\)\,\-\|]+)/i)?.[1]?.trim() || 
                       combined.match(/\(@?([^\)\,\-\|]+)\)/i)?.[1]?.trim() || 
                       combined.match(/@(\w+)/)?.[1] || '';
      const icAdmin = rekMatch ? getUserIcName(rekMatch) : '';
      const cleanRaw = (tx.details || 'Kas Uang Putih').replace(/\[id:[^\]]+\]/g, '').trim();
      const name = icAdmin ? `Kas Uang Putih (${icAdmin})` : cleanRaw;
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
        const itemList = tx.itemsPayload.map((i: any) => `${i.name || 'Item'} (${Number(i.qty) || 1}x)`);
        const itemQtys = tx.itemsPayload.map((i: any) => Number(i.qty) || 1);
        const names = itemList.join(', ');
        const totalUnits = tx.itemsPayload.reduce((sum: number, i: any) => sum + (Number(i.qty) || 1), 0);
        return {
          assetName: names,
          itemList: itemList,
          itemQtys: itemQtys,
          qtyText: `-${totalUnits}x`,
          isPositive: false
        };
      }
      const raw = tx.details || tx.items || 'Barang Toko';
      const parts = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        let totalUnits = 0;
        const itemQtys: number[] = [];
        const itemList = parts.map((p: string) => {
          const match = p.match(/^(.*?)\s*\((\d+)x\)$/);
          if (match) {
            const q = Number(match[2]) || 1;
            totalUnits += q;
            itemQtys.push(q);
            return `${match[1].trim()} (${match[2]}x)`;
          }
          totalUnits += 1;
          itemQtys.push(1);
          return p;
        });
        return {
          assetName: raw,
          itemList: itemList,
          itemQtys: itemQtys,
          qtyText: `-${totalUnits}x`,
          isPositive: false
        };
      }
      const match = raw.match(/^(.*?)\s*\((\d+)x\)$/);
      if (match) {
        return {
          assetName: match[1].trim(),
          itemList: [raw],
          qtyText: `-${match[2]}x`,
          isPositive: false
        };
      }
      return {
        assetName: raw.replace(/\(\d+x\)/g, '').trim() || 'Barang Toko',
        itemList: [raw],
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
    if (pm === 'uang_putih' || asset === 'uang_putih') return 'Uang Putih';

    const full = `${tx.details || ''} ${tx.note || ''} ${typeof tx.items === 'string' ? tx.items : ''}`.toLowerCase();
    if (full.includes('uang merah') || full.includes('kas gelap') || full.includes('uang_merah')) return 'Uang Merah';
    if (full.includes('uang putih') || full.includes('rekening') || full.includes('uang_putih')) return 'Uang Putih';

    if (full.includes('merah')) return 'Uang Merah';
    if (full.includes('putih')) return 'Uang Putih';

    return 'Uang Putih';
  };

  const getTxAccountName = (tx: any): string => {
    if (!tx) return '-';

    const isWhite = 
      tx.paymentMethod === 'uang_putih' || 
      tx.asset === 'uang_putih' || 
      (typeof tx.details === 'string' && tx.details.toLowerCase().includes('uang putih')) ||
      (typeof tx.note === 'string' && (tx.note.toLowerCase().includes('uang putih') || tx.note.toLowerCase().includes('rek:')));

    if (!isWhite) return '-';

    // 1. Cek explicit targetAdminId atau tag [id:...]
    const targetId = tx.targetAdminId || (tx.note || '').match(/\[id:([^\]]+)\]/)?.[1]?.trim();
    if (targetId) {
      const found = users?.find(u => 
        u.id === targetId || 
        (u.username || '').replace('@', '').toLowerCase() === targetId.replace('@', '').toLowerCase()
      );
      if (found) return found.icName || found.username.replace('@', '');
    }

    // 2. Cek regex dari note atau details
    const combined = `${tx.details || ''} ${tx.note || ''}`;
    const match = combined.match(/Rek:\s*@?([^\)\,\-\|]+)/i)?.[1]?.trim() ||
                  combined.match(/\(@?([^\)\,\-\|]+)\)/i)?.[1]?.trim();
    if (match) {
      const clean = match.replace('@', '').trim().toLowerCase();
      const found = users?.find(u => 
        (u.username || '').replace('@', '').toLowerCase() === clean ||
        (u.icName || '').toLowerCase() === clean ||
        u.id === match
      );
      if (found) return found.icName || found.username.replace('@', '');
      return match.replace('@', '');
    }

    // 3. Fallback jika ada admin
    const defaultAdmin = users?.find(u => u.role === 'admin' && u.status === 'approved') || users?.find(u => u.role === 'admin');
    if (defaultAdmin) {
      return defaultAdmin.icName || defaultAdmin.username.replace('@', '');
    }

    return '-';
  };

  const getCleanNote = (tx: any): string => {
    if (!tx) return 'Tanpa keterangan';
    let clean = (tx.note || '')
      .replace(/\[id:[^\]]+\]/g, '')
      .replace(/\(Rek:\s*[^\)]+\)/gi, '')
      .replace(/Rek:\s*@?[^\s\,\-\|]+/gi, '')
      .replace(/@(\w+)/g, (_: any, u: string) => getUserIcName(u))
      .trim();

    clean = clean.replace(/[-–—\s\(\)]+$/g, '').trim();

    if (clean && clean !== '-' && clean !== '()') return clean;
    if (tx.type === 'SHOP_PURCHASE') return 'Pembelian Toko Internal';
    if (tx.asset === 'uang_putih') return tx.type === 'DEPOSIT' ? 'Setoran Kas Uang Putih' : 'Penarikan Kas Uang Putih';
    return 'Tanpa keterangan';
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Otomatis bersihkan duplikat lawas yang tersimpan di localStorage
      const saved = localStorage.getItem('gang_transactions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const clean = deduplicateTransactions(parsed);
            localStorage.setItem('gang_transactions', JSON.stringify(clean));
          }
        } catch (e) {}
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') === 'success') {
        setShowCheckoutSuccessAlert(true);
        window.history.replaceState({}, '', '/riwayat');
      }
    }
  }, []);

  // Reset ke halaman 1 saat filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, typeFilter, search]);
  
  // Hanya transaksi yang telah di-ACC / Approved yang resmi masuk ke Log Riwayat
  const approvedTransactions = (transactions || []).filter(t => t && (t.status || 'approved') === 'approved');

  const scopedTx = deduplicateTransactions(
    tab === 'semua' 
      ? approvedTransactions 
      : approvedTransactions.filter(t => {
          if (!t) return false;
          const u1 = (t.user || '').replace('@', '').toLowerCase();
          const u2 = (dbUser?.username || '').replace('@', '').toLowerCase();
          const ic = (dbUser?.icName || '').toLowerCase();
          return u1 === u2 || (ic && u1 === ic);
        })
  );

  // Selalu pastikan transaksi terbaru berada di PALING ATAS
  const sortedTx = [...scopedTx].filter(Boolean).sort((a, b) => {
    const timeB = getTxMillis(b);
    const timeA = getTxMillis(a);
    if (timeB !== timeA) return timeB - timeA;
    return (b?.id || '').localeCompare(a?.id || '');
  });

  const filteredTx = sortedTx.filter(t => {
    if (!t) return false;
    const matchType = typeFilter === 'ALL' || t.type === typeFilter;
    const searchTarget = `${t.details || ''} ${typeof t.items === 'string' ? t.items : ''} ${t.user || ''} ${t.note || ''} ${t.type || ''}`.toLowerCase();
    const matchSearch = searchTarget.includes((search || '').toLowerCase());
    return matchType && matchSearch;
  });

  // Kalkulasi data halaman aktif (maksimal 20 item per page)
  const totalItems = filteredTx.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const displayedTx = filteredTx.slice(startIndex, endIndex);

  const shopPurchasesCount = scopedTx.filter(t => t.type === 'SHOP_PURCHASE').length;

  const formatDate = (item: any) => {
    const millis = getTxMillis(item);
    if (!millis) return 'Baru Saja';
    const d = new Date(millis);
    if (isNaN(d.getTime())) return 'Baru Saja';

    return `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const isRecent = (item: any) => {
    const millis = getTxMillis(item);
    if (!millis) return false;
    return (Date.now() - millis) < 180000; // < 3 menit
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alert Notifikasi Checkout Berhasil */}
      {showCheckoutSuccessAlert && (
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="font-display font-extrabold text-white text-sm">
                Transaksi Pembelian Toko Berhasil Dicatat ke Log Riwayat!
              </p>
              <p className="text-emerald-400/80 text-xs mt-0.5">
                Barang yang baru saja Anda checkout telah resmi masuk ke catatan buku ledger di bawah ini.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Link 
              href="/shop" 
              className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
            >
              Belanja Lagi <ArrowRight size={13} />
            </Link>
            <button 
              type="button"
              onClick={() => setShowCheckoutSuccessAlert(false)}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <History size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
              Audit <span className="text-gold">Log Aktivitas</span>
            </h1>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">
            Rekam jejak seluruh transaksi pembelian toko dan pergerakan aset sindikat secara real-time.
          </p>
        </div>
        
        {/* Scope Tabs */}
        <div className="flex bg-[#0A0C10] border border-white/10 rounded-xl p-1 shadow-inner">
          <button 
            type="button" 
            onClick={() => setTab('semua')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
              tab === 'semua' 
                ? 'bg-amber-500 text-black shadow-glow-gold' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Sistem Global ({approvedTransactions.length})
          </button>
          <button 
            type="button" 
            onClick={() => setTab('saya')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
              tab === 'saya' 
                ? 'bg-amber-500 text-black shadow-glow-gold' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Transaksi Saya
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-xl p-3 flex flex-col md:flex-row gap-3 justify-between items-center bg-[#0B0D12]/60">
        <div className="flex bg-[#07080B] border border-white/10 rounded-lg p-0.5 w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: `Semua Tipe (${scopedTx.length})` },
            { id: 'SHOP_PURCHASE', label: `Pembelian Toko (${shopPurchasesCount})` },
            { id: 'DEPOSIT', label: 'Deposit (+)' },
            { id: 'WITHDRAW', label: 'Withdraw (-)' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                typeFilter === f.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
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
            placeholder="Cari operator, memo, barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#07080B] border border-white/10 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-gray-600 shadow-inner"
          />
        </div>
      </div>

      {/* Modern Ledger Table (Compact & Clean) */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#090C10] border-b border-white/10 text-gray-400">
              <tr>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9.5px]">Waktu Pencatatan</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9.5px]">Nama</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9.5px]">Kategori Ops</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9.5px]">Barang / Aset</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9.5px] text-center">Jumlah (Mutasi)</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9.5px]">Total Nilai</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9.5px]">Status Validasi</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9.5px]">Keterangan</th>
                <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[9.5px]">Nama Rekening</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {displayedTx.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-500">
                    <Clock size={30} className="mx-auto mb-2 opacity-30 text-amber-400" />
                    <p className="font-display font-bold text-xs text-gray-300">Belum Ada Catatan Transaksi yang Di-ACC</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Setiap transaksi dari Internal Shop atau Ledger yang telah di-ACC Admin akan otomatis masuk dan resmi tercatat di sini.</p>
                  </td>
                </tr>
              ) : (
                displayedTx.map((tx, i) => {
                  const isPurchase = tx.type === 'SHOP_PURCHASE';
                  const isDeposit = tx.type === 'DEPOSIT';
                  const isWithdraw = tx.type === 'WITHDRAW';
                  const recent = isRecent(tx);

                  // Deteksi apakah transaksi ini adalah mutasi uang (Kas Uang Merah atau Kas Uang Putih)
                  const isMoneyMutation = 
                    tx.asset === 'uang_merah' || 
                    tx.asset === 'uang_putih' || 
                    (Boolean(tx.details) && (
                      tx.details.toLowerCase().includes('kas uang') || 
                      tx.details.toLowerCase().includes('uang merah') || 
                      tx.details.toLowerCase().includes('uang putih')
                    ));

                  // Mutasi murni barang fisik dari Menu Transaksi tidak menampilkan nominal harga
                  const isPureItemMutation = !isPurchase && !isMoneyMutation;

                  // Nama akun yang melakukan transaksi
                  const operatorName = tx.user || 'member';

                  return (
                    <tr key={tx.id || i} className={`table-row-hover transition-colors ${recent ? 'bg-amber-500/[0.04]' : ''}`}>
                      <td className="px-3.5 py-2 text-gray-400 font-mono-tech text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {recent && (
                            <span className="flex h-1.5 w-1.5 relative" title="Transaksi baru">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                          )}
                          <span className={recent ? 'text-amber-300 font-bold' : ''}>
                            {formatDate(tx)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2">
                        {(() => {
                          const icName = getUserIcName(operatorName);
                          return (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[9px]">
                                {icName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-gray-200 font-bold text-xs">{icName}</span>
                              {getUserRole(operatorName) === 'ADMIN' ? (
                                <span className="text-[8.5px] bg-amber-500/15 border border-amber-500/35 text-amber-400 px-1.5 py-0.2 rounded-full uppercase font-extrabold tracking-wider">
                                  ADMIN
                                </span>
                              ) : (
                                <span className="text-[8.5px] bg-blue-500/15 border border-blue-500/35 text-blue-400 px-1.5 py-0.2 rounded-full uppercase font-extrabold tracking-wider">
                                  MEMBER
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3.5 py-2">
                        {isPurchase && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-glow-gold">
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
                        {!isPurchase && !isDeposit && !isWithdraw && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 text-gray-300 border border-white/10">
                            {tx.type}
                          </span>
                        )}
                      </td>
                      {/* Barang / Aset */}
                      {(() => {
                        const parsed = getTxAssetAndQty(tx);
                        const hasMultiple = parsed.itemList && parsed.itemList.length > 1;

                        return (
                          <>
                            <td className="px-3.5 py-2 text-white font-medium text-[11px] min-w-[170px] max-w-[280px]">
                              {hasMultiple ? (
                                <div className="flex flex-col gap-1 py-0.5 whitespace-normal">
                                  {parsed.itemList!.map((it, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-gray-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                      <span className="font-semibold text-[11px] leading-tight">{it}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="truncate block font-semibold text-gray-200" title={parsed.assetName}>
                                  {parsed.assetName}
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2 text-center whitespace-nowrap">
                              {hasMultiple && parsed.itemQtys ? (
                                <div className="flex flex-col gap-1 py-0.5 whitespace-normal">
                                  {parsed.itemQtys.map((q, idx) => (
                                    <div key={idx} className="flex items-center justify-center">
                                      <span className="inline-flex items-center font-mono-tech font-extrabold text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-md shadow-sm">
                                        -{q}x
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className={`inline-flex items-center gap-0.5 font-mono-tech font-extrabold text-[11px] px-2 py-0.5 rounded-md border shadow-sm ${
                                  parsed.isPositive 
                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
                                    : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                                }`}>
                                  {parsed.qtyText}
                                </span>
                              )}
                            </td>
                          </>
                        );
                      })()}
                      <td className="px-3.5 py-2 font-mono-tech">
                        {!isPureItemMutation && (tx.totalPrice || tx.amount) ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold text-xs ${isWithdraw ? 'text-rose-400' : 'text-amber-400'}`}>
                              {formatMoney(tx.totalPrice || tx.amount)}
                            </span>
                            {getMoneyType(tx) === 'Uang Merah' && (
                              <span className="text-[9px] font-sans font-extrabold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-1.5 py-0.2 rounded whitespace-nowrap shadow-sm">
                                (Uang Merah)
                              </span>
                            )}
                            {getMoneyType(tx) === 'Uang Putih' && (
                              <span className="text-[9px] font-sans font-extrabold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded whitespace-nowrap shadow-sm">
                                (Uang Putih)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-[11px] font-mono-tech">-</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2">
                        {(tx.status === 'pending') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse">
                            <Clock size={9} /> Menunggu ACC
                          </span>
                        )}
                        {((tx.status || 'approved') === 'approved') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <Check size={9} strokeWidth={3} /> Di-ACC Admin
                          </span>
                        )}
                        {(tx.status === 'rejected') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <X size={9} strokeWidth={3} /> Ditolak
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-gray-400 max-w-[200px] truncate text-[11px]" title={tx.note}>
                        {getCleanNote(tx)}
                      </td>
                      <td className="px-3.5 py-2">
                        {(() => {
                          const accName = getTxAccountName(tx);
                          if (accName === '-') {
                            return <span className="text-gray-500 text-[11px] font-mono-tech">-</span>;
                          }
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-bold text-[11px] shadow-sm">
                              <CreditCard size={11} className="text-amber-400" />
                              <span>{accName}</span>
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Paginasi (Maks 10 Transaksi Per Halaman) */}
        {totalItems > 0 && (
          <div className="p-3 sm:p-3.5 bg-[#080A0E] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <span>Menampilkan</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono-tech font-bold text-amber-400 text-xs">
                {startIndex + 1} - {endIndex}
              </span>
              <span>dari total <strong className="text-white font-mono-tech">{totalItems}</strong> transaksi</span>
              <span className="text-gray-600 hidden md:inline">•</span>
              <span className="text-gray-500 text-[10px] hidden md:inline">Maks 10 per halaman</span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* Tombol Halaman Pertama */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-amber-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft size={13} />
                </button>

                {/* Tombol Sebelumnya */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-gray-400 hover:text-white hover:border-amber-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
                >
                  <ChevronLeft size={13} />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                {/* Nomor-nomor Halaman */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter(p => {
                      return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                    })
                    .map((p, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && p - prevPage > 1;

                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && (
                            <span className="px-1 text-gray-600 text-xs select-none">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`min-w-[28px] h-7 px-1.5 rounded-lg text-[11px] font-mono-tech font-bold transition-all ${
                              currentPage === p
                                ? 'bg-amber-500 text-black shadow-glow-gold'
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                {/* Tombol Berikutnya */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-gray-400 hover:text-white hover:border-amber-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                  <ChevronRight size={13} />
                </button>

                {/* Tombol Halaman Terakhir */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-amber-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
