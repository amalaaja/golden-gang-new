'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, Check, AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useGang } from '@/lib/GangContext';
import { formatMoney } from '@/lib/firebase';

export default function TransaksiPage() {
  const { 
    items, 
    admins, 
    users,
    gangStats, 
    dbUser, 
    isAdmin,
    addTransaction, 
    updateItemStock, 
    updateDirtyMoney, 
    updateWhiteMoney 
  } = useGang();

  const [assetType, setAssetType] = useState<'barang' | 'uang_merah' | 'uang_putih'>('barang');
  const [txType, setTxType] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('SEMUA');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Hanya akun Admin yang memiliki Rekening Kas Uang Putih Faksi (Duit per member dihilangkan)
  const eligibleAccounts = React.useMemo(() => {
    if (!admins || admins.length === 0) return [];
    const approvedAdmins = admins.filter(a => a && a.status === 'approved');
    if (approvedAdmins.length === 0) return [];
    
    // Jika user aktif adalah admin, tempatkan akunnya di urutan pertama
    if (dbUser) {
      const myAdmin = approvedAdmins.find(a => 
        a.id === dbUser.id || 
        (a.username || '').toLowerCase() === (dbUser.username || '').toLowerCase()
      );
      if (myAdmin) {
        const others = approvedAdmins.filter(a => a.id !== myAdmin.id);
        return [myAdmin, ...others];
      }
    }
    return approvedAdmins;
  }, [admins, dbUser]);

  React.useEffect(() => {
    if (eligibleAccounts && eligibleAccounts.length > 0) {
      if (!selectedAdminId || !eligibleAccounts.some(a => a.id === selectedAdminId)) {
        setSelectedAdminId(eligibleAccounts[0].id);
      }
    }
  }, [eligibleAccounts, selectedAdminId]);

  const itemCategories = React.useMemo(() => {
    const defaultCats = ['SEMUA', 'DRUG', 'WEAPON', 'ITEM', 'MAGAZINE', 'EXTENDE WEAPON'];
    const dynamicCats = (items || []).map(i => (i.category || 'ITEM').toUpperCase());
    return Array.from(new Set([...defaultCats, ...dynamicCats]));
  }, [items]);

  const filteredItems = React.useMemo(() => {
    if (!items || items.length === 0) return [];
    if (selectedCategory === 'SEMUA') return items;
    return items.filter(i => (i.category || 'ITEM').toUpperCase() === selectedCategory);
  }, [items, selectedCategory]);

  React.useEffect(() => {
    if (filteredItems.length > 0) {
      if (!selectedItemId || !filteredItems.some(i => i.id === selectedItemId)) {
        setSelectedItemId(filteredItems[0].id);
      }
    } else {
      setSelectedItemId('');
    }
  }, [filteredItems, selectedItemId]);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUser) return;
    setLoading(true);
    setMsg({ type: '', text: '' });
    const qty = Number(amount);

    try {
      if (isNaN(qty) || qty <= 0) throw new Error("Nominal atau jumlah harus lebih besar dari 0");

      let logDetails = '';
      let paymentMethod = '';
      let totalVal = 0;
      let assetLabel = 'Aset';
      let chosenItemId = '';

      if (assetType === 'barang') {
        const validItems = items || [];
        const item = validItems.find(i => i && i.id === selectedItemId) || validItems[0];
        if (!item) throw new Error("Pilih barang dari katalog terlebih dahulu");
        chosenItemId = item.id;
        
        const currentStock = Number(item.stock) || 0;
        if (txType === 'withdraw' && currentStock < qty) {
          throw new Error(`Stok ${item.name} di brankas (${currentStock}) tidak mencukupi untuk penarikan ${qty}x`);
        }
        logDetails = `${item.name || 'Barang'} (${qty}x)`;
        paymentMethod = '';
        totalVal = 0;
        assetLabel = item.name || 'Barang';

        // Mutasi stok fisik brankas WAJIB diverifikasi & di-ACC di menu Validasi Transaksi!
      } 
      else if (assetType === 'uang_merah') {
        const currentDirty = Number(gangStats?.dirtyMoney) || 0;
        if (txType === 'withdraw' && currentDirty < qty) {
          throw new Error("Saldo Kas Uang Merah faksi tidak mencukupi untuk penarikan");
        }
        logDetails = `Uang Merah ${formatMoney(qty)}`;
        paymentMethod = 'uang_merah';
        totalVal = qty;
        assetLabel = 'Kas Uang Merah';

        // Mutasi Kas Uang Merah WAJIB diverifikasi & di-ACC di menu Validasi Transaksi!
      }
      else if (assetType === 'uang_putih') {
        const targetAccount = eligibleAccounts.find(a => a && a.id === selectedAdminId) || eligibleAccounts[0] || dbUser;
        const targetDisplayName = targetAccount?.icName || targetAccount?.username || 'admin';
        const currentBal = Number(targetAccount?.whiteMoney) || 0;
        if (txType === 'withdraw' && currentBal < qty) {
          throw new Error(`Saldo Uang Putih pada rekening kas ${targetDisplayName} (${formatMoney(currentBal)}) tidak mencukupi untuk penarikan ${formatMoney(qty)}`);
        }
        logDetails = `Kas Uang Putih (${targetDisplayName})`;
        paymentMethod = 'uang_putih';
        totalVal = qty;
        assetLabel = `Kas Uang Putih (${targetDisplayName})`;

        // Mutasi Kas Uang Putih WAJIB diverifikasi & di-ACC di menu Validasi Transaksi!
      }

      const targetAdmin = eligibleAccounts.find(a => a && a.id === selectedAdminId) || eligibleAccounts[0] || dbUser;
      const adminDisplayName = targetAdmin?.icName || targetAdmin?.username || 'admin';

      addTransaction({
        type: txType === 'deposit' ? 'DEPOSIT' : 'WITHDRAW',
        user: dbUser?.icName || dbUser?.username || 'member_sindikat',
        asset: assetType,
        details: logDetails,
        itemQty: qty,
        amount: totalVal,
        totalPrice: totalVal,
        paymentMethod: paymentMethod,
        note: assetType === 'uang_putih'
          ? (note ? `${note} (Rek: ${adminDisplayName} [id:${targetAdmin?.id || ''}])` : `Rek: ${adminDisplayName} [id:${targetAdmin?.id || ''}]`)
          : (note || (assetType === 'barang' 
              ? `${txType === 'deposit' ? 'Setoran Barang' : 'Penarikan Barang'} - ${logDetails}` 
              : (txType === 'deposit' ? `Setoran ${logDetails}` : `Penarikan ${logDetails}`))),
        createdAtMs: Date.now(),
        status: 'pending',
        selectedItemId: assetType === 'barang' ? (chosenItemId || selectedItemId) : undefined,
        targetAdminId: assetType === 'uang_putih' ? (targetAdmin?.id || dbUser?.id) : undefined
      });

      setMsg({ 
        type: 'success', 
        text: `Pengajuan mutasi ${txType === 'deposit' ? 'Deposit (+)' : 'Withdraw (-)'} ${assetLabel} berhasil dicatat! Menunggu verifikasi & ACC dari Administrator di menu Validasi Transaksi.` 
      });
      setAmount('');
      setNote('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Gagal memproses transaksi.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <header>
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ArrowRightLeft size={22} />
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
            Menu <span className="text-gold">Transaksi</span>
          </h1>
        </div>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">
          Entri manual mutasi aset fisik dan penyesuaian likuiditas kas.
        </p>
      </header>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 relative overflow-hidden">
        {msg.text && (
          <div className={`p-4 mb-6 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 backdrop-blur-sm border ${
            msg.type === 'error' ? 'bg-rose-950/40 text-rose-400 border-rose-900/50' : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
          }`}>
            {msg.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleTransaction} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">
                Jenis Operasi Mutasi
              </label>
              <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                <button 
                  type="button" 
                  onClick={() => setTxType('deposit')} 
                  className={`py-3 px-3 sm:px-4 text-xs sm:text-sm tracking-wider font-bold rounded-xl transition-all flex items-center justify-center gap-2 uppercase border ${
                    txType === 'deposit' 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30' 
                      : 'bg-[#050608] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <ArrowDownLeft size={16} className={txType === 'deposit' ? 'text-emerald-400' : 'text-gray-500'} /> 
                  <span>Deposit (+)</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setTxType('withdraw')} 
                  className={`py-3 px-3 sm:px-4 text-xs sm:text-sm tracking-wider font-bold rounded-xl transition-all flex items-center justify-center gap-2 uppercase border ${
                    txType === 'withdraw' 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/30' 
                      : 'bg-[#050608] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <ArrowUpRight size={16} className={txType === 'withdraw' ? 'text-rose-400' : 'text-gray-500'} /> 
                  <span>Withdraw (-)</span>
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">
                Klasifikasi Aset
              </label>
              <select 
                value={assetType} 
                onChange={(e) => setAssetType(e.target.value as any)} 
                className="w-full bg-[#050608] border border-white/10 text-white rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-500/60 shadow-inner h-[48px]"
              >
                <option value="barang">Aset Fisik / Item Brankas</option>
                <option value="uang_merah">Kas Uang Merah (Dirty Money)</option>
                <option value="uang_putih">Kas Uang Putih (Rekening Admin)</option>
              </select>
            </div>
          </div>

          {assetType === 'barang' && (
            <div className="space-y-4 sm:space-y-5 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-amber-400/90 font-bold mb-2 block">
                  Kategori Aset Fisik
                </label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)} 
                  className="w-full bg-[#050608] border border-white/10 text-white rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-500/60 shadow-inner"
                >
                  {itemCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'SEMUA' ? 'Semua Kategori' : cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-amber-400/90 font-bold mb-2 block">
                  Pilih Aset Fisik
                </label>
                <select 
                  value={selectedItemId} 
                  onChange={(e) => setSelectedItemId(e.target.value)} 
                  className="w-full bg-[#050608] border border-white/10 text-white rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-500/60 shadow-inner"
                  required
                >
                  {filteredItems.length === 0 ? (
                    <option value="">-- Tidak ada aset pada kategori ini --</option>
                  ) : (
                    filteredItems.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Tersedia: {i.stock || 0})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}

          {assetType === 'uang_putih' && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="text-[11px] uppercase tracking-widest text-amber-400/90 font-bold mb-2 block">
                Pilih Rekening Kas Admin (Uang Putih Sindikat)
              </label>
              <select 
                value={selectedAdminId} 
                onChange={(e) => setSelectedAdminId(e.target.value)} 
                className="w-full bg-[#050608] border border-white/10 text-white rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-500/60 shadow-inner"
              >
                {eligibleAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    Rekening Kas Admin {a.icName || a.username}{a.id === dbUser?.id ? ' (Akun Saya)' : ''} - {formatMoney(a.whiteMoney)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">
              Kuantitas / Jumlah Nominal
            </label>
            <input 
              type="number" 
              min="1"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              className="w-full bg-[#050608] border border-white/10 text-white font-mono-tech text-sm sm:text-base rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/60 shadow-inner placeholder:text-gray-700" 
              placeholder="0"
              required 
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">
              Keterangan / Berita Acara (Opsional)
            </label>
            <input 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              className="w-full bg-[#050608] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/60 shadow-inner placeholder:text-gray-700 text-xs sm:text-sm" 
              placeholder="cth. Operasi Pelabuhan, Pemasukan Narkotika, dll." 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full glow-gold-btn font-display font-bold py-3.5 sm:py-4 rounded-xl uppercase tracking-wider text-xs sm:text-sm border border-amber-400/30 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Menyinkronkan Ledger...' : 'Otorisasi & Eksekusi Mutasi'}
          </button>
        </form>
      </div>
    </div>
  );
}
