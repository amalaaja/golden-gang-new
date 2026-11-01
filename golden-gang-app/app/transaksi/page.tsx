'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, Check, AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useGang } from '@/lib/GangContext';
import { formatMoney } from '@/lib/firebase';

export default function TransaksiPage() {
  const { 
    items, 
    admins, 
    gangStats, 
    dbUser, 
    addTransaction, 
    updateItemStock, 
    updateDirtyMoney, 
    updateWhiteMoney 
  } = useGang();

  const [assetType, setAssetType] = useState<'barang' | 'uang_merah' | 'uang_putih'>('barang');
  const [txType, setTxType] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState(admins[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  React.useEffect(() => {
    if (!selectedAdminId && admins && admins.length > 0) {
      setSelectedAdminId(admins[0].id);
    }
  }, [admins, selectedAdminId]);

  React.useEffect(() => {
    if (!selectedItemId && items && items.length > 0) {
      setSelectedItemId(items[0].id);
    }
  }, [items, selectedItemId]);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUser) return;
    setLoading(true);
    setMsg({ type: '', text: '' });
    const qty = Number(amount);

    try {
      if (isNaN(qty) || qty <= 0) throw new Error("Nominal atau jumlah harus lebih besar dari 0");

      let logDetails = '';
      let paymentMethod = 'uang_putih';
      let totalVal = qty;

      if (assetType === 'barang') {
        const validItems = items || [];
        const item = validItems.find(i => i && i.id === selectedItemId) || validItems[0];
        if (!item) throw new Error("Pilih barang dari katalog terlebih dahulu");
        
        const currentStock = Number(item.stock) || 0;
        if (txType === 'withdraw' && currentStock < qty) {
          throw new Error("Stok aset di brankas tidak mencukupi untuk penarikan");
        }
        logDetails = `${item.name || 'Barang'} (${qty}x)`;
        paymentMethod = 'uang_putih'; // Aset fisik / item brankas otomatis Uang Putih
        const unitPrice = Number(item.price) || 5000;
        totalVal = unitPrice * qty;
      } 
      else if (assetType === 'uang_merah') {
        const currentDirty = Number(gangStats?.dirtyMoney) || 0;
        if (txType === 'withdraw' && currentDirty < qty) {
          throw new Error("Saldo Kas Uang Merah tidak mencukupi untuk penarikan");
        }
        logDetails = `Uang Merah ${formatMoney(qty)}`;
        paymentMethod = 'uang_merah';
        totalVal = qty;
      }
      else if (assetType === 'uang_putih') {
        const validAdmins = admins || [];
        const admin = validAdmins.find(a => a && a.id === selectedAdminId) || validAdmins[0];
        const currentBal = Number(admin?.whiteMoney ?? dbUser?.whiteMoney) || 0;
        if (txType === 'withdraw' && currentBal < qty) {
          throw new Error("Saldo Uang Putih pada rekening tidak mencukupi untuk penarikan");
        }
        logDetails = `Uang Putih ${formatMoney(qty)} (Rek: @${admin?.username || dbUser?.username || 'admin'})`;
        paymentMethod = 'uang_putih';
        totalVal = qty;
      }

      addTransaction({
        type: txType === 'deposit' ? 'DEPOSIT' : 'WITHDRAW',
        user: dbUser?.username || 'member_sindikat',
        asset: assetType,
        details: logDetails,
        ...(assetType === 'barang' ? { itemQty: qty } : {}),
        amount: totalVal,
        totalPrice: totalVal,
        paymentMethod: paymentMethod,
        note: note || (assetType === 'barang' 
          ? `${txType === 'deposit' ? 'Setoran Barang' : 'Penarikan Barang'} (Uang Putih)` 
          : (txType === 'deposit' ? 'Setoran Aset/Dana' : 'Penarikan Aset/Dana')),
        createdAtMs: Date.now(),
        status: 'pending',
        selectedItemId: selectedItemId || items[0]?.id,
        targetAdminId: selectedAdminId || admins[0]?.id
      });

      setMsg({ type: 'success', text: 'Pengajuan mutasi ledger berhasil dicatat! Menunggu verifikasi & ACC dari Administrator di menu Validasi Transaksi.' });
      setAmount('');
      setNote('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Gagal memproses transaksi.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-300">
      <header>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ArrowRightLeft size={18} />
          </span>
          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
            Menu <span className="text-gold">Transaksi</span>
          </h1>
        </div>
        <p className="text-gray-400 text-xs mt-0.5">
          Entri manual mutasi aset fisik dan penyesuaian likuiditas kas.
        </p>
      </header>

      <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/10 relative overflow-hidden">
        {msg.text && (
          <div className={`p-3 mb-4 rounded-xl text-xs font-bold flex items-center gap-2.5 backdrop-blur-sm border ${
            msg.type === 'error' ? 'bg-rose-950/40 text-rose-400 border-rose-900/50' : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
          }`}>
            {msg.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleTransaction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[9.5px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">Jenis Operasi Mutasi</label>
              <div className="flex bg-[#050608] border border-white/10 p-1 rounded-xl">
                <button 
                  type="button" 
                  onClick={() => setTxType('deposit')} 
                  className={`flex-1 py-2 text-xs tracking-wider font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase ${
                    txType === 'deposit' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft size={13} /> Deposit (+)
                </button>
                <button 
                  type="button" 
                  onClick={() => setTxType('withdraw')} 
                  className={`flex-1 py-2 text-xs tracking-wider font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase ${
                    txType === 'withdraw' 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  <ArrowUpRight size={13} /> Withdraw (-)
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-[9.5px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">Klasifikasi Aset</label>
              <select 
                value={assetType} 
                onChange={(e) => setAssetType(e.target.value as any)} 
                className="w-full bg-[#050608] border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500/60 shadow-inner"
              >
                <option value="barang">Aset Fisik / Item Brankas</option>
                <option value="uang_merah">Kas Uang Merah (Dirty Money)</option>
                <option value="uang_putih">Kas Uang Putih (Rekening Admin)</option>
              </select>
            </div>
          </div>

          {assetType === 'barang' && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="text-[9.5px] uppercase tracking-widest text-amber-400/90 font-bold mb-1.5 block">Pilih Aset Fisik</label>
              <select 
                value={selectedItemId} 
                onChange={(e) => setSelectedItemId(e.target.value)} 
                className="w-full bg-[#050608] border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500/60 shadow-inner"
              >
                <option value="">-- Buka Katalog Brankas --</option>
                {(items || []).filter(i => i && i.id).map(i => (
                  <option key={i.id} value={i.id}>{i.name} (Tersedia: {i.stock || 0})</option>
                ))}
              </select>
            </div>
          )}

          {assetType === 'uang_putih' && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="text-[9.5px] uppercase tracking-widest text-amber-400/90 font-bold mb-1.5 block">Pilih Rekening Admin</label>
              <select 
                value={selectedAdminId} 
                onChange={(e) => setSelectedAdminId(e.target.value)} 
                className="w-full bg-[#050608] border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500/60 shadow-inner"
              >
                {(admins || []).filter(a => a && a.id).map(a => (
                  <option key={a.id} value={a.id}>Rekening @{a.username} - {formatMoney(a.whiteMoney)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[9.5px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">Kuantitas / Jumlah Nominal</label>
            <input 
              type="number" 
              min="1"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              className="w-full bg-[#050608] border border-white/10 text-white font-mono-tech text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500/60 shadow-inner placeholder:text-gray-700" 
              placeholder="0"
              required 
            />
          </div>

          <div>
            <label className="text-[9.5px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">Keterangan / Berita Acara (Opsional)</label>
            <input 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              className="w-full bg-[#050608] border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500/60 shadow-inner placeholder:text-gray-700 text-xs" 
              placeholder="cth. Operasi Pelabuhan, Pemasukan Narkotika, dll." 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full glow-gold-btn font-display font-bold py-3 rounded-xl uppercase tracking-wider text-xs border border-amber-400/30 transition-all disabled:opacity-50"
          >
            {loading ? 'Menyinkronkan Ledger...' : 'Otorisasi & Eksekusi Mutasi'}
          </button>
        </form>
      </div>
    </div>
  );
}
