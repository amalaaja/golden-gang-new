'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  Search, 
  PackageSearch, 
  X, 
  Check, 
  AlertCircle,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  User,
  ChevronDown,
  Layers
} from 'lucide-react';
import { formatMoney } from '@/lib/firebase';
import { useGang, Item } from '@/lib/GangContext';

interface CartItem extends Item {
  qty: number;
}

export default function ShopPage() {
  const { 
    items, 
    admins, 
    users,
    gangStats, 
    dbUser, 
    addTransaction, 
    updateItemStock, 
    updateDirtyMoney, 
    updateWhiteMoney 
  } = useGang();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('SEMUA');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [paymentMethod, setPaymentMethod] = useState<'uang_merah' | 'uang_putih'>('uang_merah');
  const [selectedAdminId, setSelectedAdminId] = useState(admins[0]?.id || '');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const router = useRouter();

  // Sinkronkan selectedAdminId saat daftar admins selesai dimuat
  useEffect(() => {
    if (admins && admins.length > 0) {
      if (!selectedAdminId || !admins.some(a => a.id === selectedAdminId)) {
        const myAdmin = admins.find(a => 
          (dbUser?.id && a.id === dbUser.id) || 
          (dbUser?.username && (a.username || '').toLowerCase() === dbUser.username.toLowerCase())
        );
        setSelectedAdminId(myAdmin ? myAdmin.id : admins[0].id);
      }
    }
  }, [admins, selectedAdminId, dbUser]);
  
  // Checkout Success Modal State
  const [lastCheckout, setLastCheckout] = useState<{
    itemsCount: number;
    total: number;
    method: string;
    details: string;
  } | null>(null);

  const shopItems = items.filter(i => i.inShop);
  
  const defaultCategories = [
    { id: 'SEMUA', label: 'Semua Produk' },
    { id: 'DRUG', label: 'DRUG' },
    { id: 'WEAPON', label: 'WEAPON' },
    { id: 'ITEM', label: 'ITEM' },
    { id: 'MAGAZINE', label: 'MAGAZINE' },
    { id: 'EXTENDE WEAPON', label: 'EXTENDE WEAPON' }
  ];

  const extraCategories = Array.from(new Set(shopItems.map(i => i.category).filter(Boolean)))
    .filter(cat => !defaultCategories.some(d => d.id === cat))
    .map(cat => ({ id: cat, label: cat }));

  const allCategories = [...defaultCategories, ...extraCategories];
  const currentCategory = allCategories.find(c => c.id === categoryFilter) || allCategories[0];

  const filteredShopItems = shopItems.filter(item => {
    const matchCat = categoryFilter === 'SEMUA' || item.category === categoryFilter;
    const matchSearch = (item.name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.qty >= item.stock) return prev;
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setCheckoutError('');
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  
  const changeQty = (id: string, delta: number, maxStock: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.id === id) {
          const nextVal = i.qty + delta;
          if (nextVal <= 0) return null;
          return { ...i, qty: Math.min(nextVal, maxStock) };
        }
        return i;
      }).filter(Boolean) as CartItem[];
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * item.qty), 0);

  const handleCheckout = () => {
    if (cart.length === 0 || !dbUser) return;

    if (paymentMethod === 'uang_putih' && !selectedAdminId && admins.length === 0) {
      setCheckoutError("Pilih rekening admin penerima untuk Uang Putih.");
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError('');

    try {
      const currentDirty = Number(gangStats?.dirtyMoney) || 0;
      if (paymentMethod === 'uang_merah' && currentDirty < cartTotal) {
        throw new Error("Saldo Uang Merah faksi tidak mencukupi untuk pembayaran ini.");
      }

      const targetAdmin = admins.find(a => a.id === selectedAdminId) || admins[0];
      const targetAdminName = targetAdmin?.icName || (targetAdmin ? targetAdmin.username.replace('@', '') : 'Admin');

      // 1. Verifikasi Kecukupan Stok Item
      for (const item of cart) {
        const currentItem = items.find(i => i.id === item.id);
        const currentStock = Number(currentItem?.stock ?? item.stock) || 0;
        if (currentStock < item.qty) {
          throw new Error(`Stok ${item.name} tidak cukup.`);
        }
      }

      // 2. Catat Permintaan Pembelian ke Antrian Validasi (Wajib di-ACC Admin)
      const activeUser = dbUser?.icName || (dbUser?.username || 'member').replace('@', '');
      const itemDetails = cart.map(i => `${i.name} (${i.qty}x)`).join(', ');
      const notePayment = paymentMethod === 'uang_putih' 
        ? `Pembelian Toko Internal (Uang Putih) - Rek: ${targetAdminName} [id:${targetAdmin?.id || selectedAdminId || ''}]`
        : `Pembelian Toko Internal (Uang Merah)`;

      addTransaction({
        type: 'SHOP_PURCHASE',
        user: activeUser,
        items: itemDetails,
        details: itemDetails,
        totalPrice: cartTotal,
        amount: cartTotal,
        paymentMethod: paymentMethod,
        note: notePayment,
        createdAtMs: Date.now(),
        status: 'pending',
        itemsPayload: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: Number(i.price) || 0 })),
        targetAdminId: targetAdmin?.id || selectedAdminId || admins[0]?.id
      });

      setCart([]);
      setIsCheckingOut(false);

      // Langsung arahkan ke halaman Validasi Transaksi
      router.push('/validasi?pending=shop');
    } catch (err: any) {
      setCheckoutError(err?.message || 'Terjadi kesalahan transaksi');
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header (Compact) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Zap size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
              Internal <span className="text-gold">Marketplace</span>
            </h1>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">
            Pengadaan persenjataan, zat kimia, dan perlengkapan khusus sindikat.
          </p>
        </div>

        {/* Quick Balance Status Pill */}
        <div className="flex items-center gap-2.5 bg-[#0D1016] border border-white/10 rounded-xl px-3 py-1.5 shadow-inner">
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Kas Uang Merah</p>
            <p className="text-xs font-mono-tech font-bold text-red-400">{formatMoney(gangStats?.dirtyMoney)}</p>
          </div>
          <div className="w-[1px] h-6 bg-white/10"></div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Kas Legal Admin</p>
            <p className="text-xs font-mono-tech font-bold text-amber-400">
              {formatMoney(admins.reduce((sum, a) => sum + (Number(a.whiteMoney) || 0), 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Products + Cart Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Side: Product Showcase */}
        <div className="flex-1 w-full flex flex-col glass-panel rounded-2xl overflow-hidden relative shadow-2xl min-h-[calc(100vh-14rem)]">
          {/* Filter & Search Bar */}
          <div className="p-3 border-b border-white/10 flex flex-col sm:flex-row gap-3 justify-between items-center bg-[#0B0D12]/60 relative z-20">
            {/* Category Dropdown (No scrollbar, opens on click) */}
            <div className="relative w-full sm:w-auto">
              {isCategoryOpen && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsCategoryOpen(false)} 
                />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isCategoryOpen || categoryFilter !== 'SEMUA'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-glow-gold'
                      : 'bg-[#07080B] border-white/10 text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <Layers size={13} className={categoryFilter !== 'SEMUA' ? 'text-amber-400' : 'text-gray-400'} />
                  <span>
                    Kategori: <strong className="text-white font-extrabold">{currentCategory.label}</strong>
                  </span>
                  <ChevronDown 
                    size={13} 
                    className={`transition-transform duration-200 text-gray-400 ${isCategoryOpen ? 'rotate-180 text-amber-400' : ''}`} 
                  />
                </button>

                {categoryFilter !== 'SEMUA' && (
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('SEMUA')}
                    className="px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-all flex items-center gap-1"
                    title="Kembali ke Semua Produk"
                  >
                    <X size={12} />
                    <span className="text-[10px] uppercase font-bold">Semua</span>
                  </button>
                )}
              </div>

              {/* Dropdown Menu Popup */}
              {isCategoryOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-56 bg-[#0B0D13] border border-amber-500/30 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Pilih Kategori</span>
                    <span className="text-[10px] text-amber-400 font-mono-tech">{shopItems.length} Produk</span>
                  </div>

                  <div className="space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                    {allCategories.map(cat => {
                      const count = cat.id === 'SEMUA' 
                        ? shopItems.length 
                        : shopItems.filter(i => i.category === cat.id).length;
                      const isSelected = categoryFilter === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategoryFilter(cat.id);
                            setIsCategoryOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-black font-bold shadow-glow-gold'
                              : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-amber-400'}`}></span>
                            <span className="truncate">{cat.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono-tech ${
                              isSelected ? 'bg-black/20 text-black' : 'bg-white/5 text-gray-400'
                            }`}>
                              {count}
                            </span>
                            {isSelected && <Check size={12} className="text-black" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Cari aset atau senjata..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#07080B] border border-white/10 text-white text-xs rounded-xl pl-9 pr-3.5 py-1.5 w-full focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all placeholder:text-gray-600 shadow-inner"
              />
            </div>
          </div>
          
          {/* Products Grid */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredShopItems.map(item => {
                const inCart = cart.find(c => c.id === item.id);
                return (
                  <div 
                    key={item.id} 
                    className="bg-[#090C10]/80 border border-white/[0.08] rounded-3xl p-4 flex flex-col glass-card-hover group relative overflow-hidden"
                  >
                    {/* Visual Asset Thumbnail */}
                    <div className="w-full aspect-square bg-gradient-to-b from-white/[0.06] to-transparent rounded-2xl flex items-center justify-center mb-3.5 border border-white/5 group-hover:border-amber-500/30 transition-all relative overflow-hidden">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-500">
                          <PackageSearch size={28} />
                        </div>
                      )}
                      
                      <span className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-gray-300 z-10">
                        {item.category}
                      </span>

                      {Number(item.stock) <= 5 && Number(item.stock) > 0 && (
                        <span className="absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-full border border-rose-500/30 z-10">
                          Sisa {item.stock}
                        </span>
                      )}
                    </div>

                    <h4 className="text-gray-100 font-bold text-sm truncate tracking-tight">{item.name}</h4>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{item.vault || 'Brankas Pusat'}</p>
                    
                    <div className="my-3 flex items-baseline justify-between">
                      <span className="text-base sm:text-lg font-mono-tech font-bold text-amber-400">
                        {formatMoney(item.price)}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Stok: <strong className="text-white font-mono-tech">{item.stock}</strong>
                      </span>
                    </div>
                    
                    <div className="mt-auto">
                      {Number(item.stock) > 0 ? (
                        <button 
                          type="button"
                          onClick={() => addToCart(item)}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
                            inCart 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30' 
                              : 'bg-white/5 hover:bg-amber-500 hover:text-black text-gray-300 border border-white/10 hover:border-transparent hover:shadow-glow-gold'
                          }`}
                        >
                          <Plus size={14} /> {inCart ? `Tambah (${inCart.qty})` : 'Beli Aset'}
                        </button>
                      ) : (
                        <button type="button" disabled className="w-full bg-red-950/20 text-red-400/50 cursor-not-allowed font-bold tracking-wider uppercase py-2.5 rounded-xl text-xs border border-red-900/20">
                          Habis
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredShopItems.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-500">
                  <PackageSearch className="w-16 h-16 mx-auto mb-3 opacity-20 text-amber-400" />
                  <p className="font-display font-bold text-lg text-gray-300">Produk Tidak Ditemukan</p>
                  <p className="text-xs mt-1 text-gray-500">Tidak ada inventaris toko yang cocok dengan pencarian.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Modern Shopping Cart Panel */}
        <div className="w-full lg:w-[420px] glass-panel rounded-3xl flex flex-col flex-shrink-0 relative shadow-2xl border border-white/10 self-start lg:sticky lg:top-2">
          <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0B0D12]/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-glow-gold">
                <ShoppingCart size={18} />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white tracking-tight">Keranjang Aset</h3>
                <p className="text-[11px] text-gray-400">{cart.length} jenis item dipilih</p>
              </div>
            </div>

            {cart.length > 0 && (
              <button 
                type="button" 
                onClick={() => setCart([])} 
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
              >
                Kosongkan
              </button>
            )}
          </div>
          
          {/* Cart Item List */}
          <div className="p-4 sm:p-5 space-y-2.5 max-h-60 sm:max-h-72 overflow-y-auto custom-scrollbar">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-600 space-y-2 opacity-60">
                <ShoppingCart size={38} className="stroke-[1.5]" />
                <p className="text-xs font-bold tracking-widest uppercase">Keranjang Anda Kosong</p>
                <p className="text-[11px] text-gray-500 text-center max-w-[200px]">Pilih aset dari etalase untuk melakukan transaksi pembelian.</p>
              </div>
            ) : (
              cart.map(item => (
                <div 
                  key={item.id} 
                  className="bg-[#090C10] p-3 rounded-2xl border border-white/[0.08] flex items-center justify-between gap-3 hover:border-white/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-100 text-xs font-bold truncate tracking-tight">{item.name}</p>
                    <p className="font-mono-tech text-amber-400 font-bold text-xs mt-0.5">
                      {formatMoney(Number(item.price) * item.qty)}
                    </p>
                  </div>

                  {/* Modern Stepper Button */}
                  <div className="flex items-center gap-1 bg-[#050608] border border-white/10 rounded-xl p-1">
                    <button 
                      type="button"
                      onClick={() => changeQty(item.id, -1, item.stock)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-xs font-mono-tech font-bold text-white">
                      {item.qty}
                    </span>
                    <button 
                      type="button"
                      onClick={() => changeQty(item.id, 1, item.stock)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => removeFromCart(item.id)} 
                    className="text-gray-500 hover:text-rose-400 p-1.5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Checkout Calculation Footer */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#090C10]/95 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-gray-500 text-[10px] tracking-widest uppercase font-bold block">Total Belanja</span>
                <span className="text-xs text-gray-400">{cart.reduce((a, b) => a + b.qty, 0)} Total Unit</span>
              </div>
              <span className="text-white font-mono-tech font-extrabold text-2xl text-gold-shimmer">
                {formatMoney(cartTotal)}
              </span>
            </div>
            
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-amber-400/90 font-bold mb-1.5 block">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('uang_merah')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === 'uang_merah'
                        ? 'bg-rose-950/40 border-rose-500/50 text-white shadow-glow-red'
                        : 'bg-[#050608] border-white/5 text-gray-400 hover:border-white/15'
                    }`}
                  >
                    <p className="text-[11px] font-bold">Uang Merah</p>
                    <p className="text-[9px] text-gray-500 truncate mt-0.5">Kas Gelap Sindikat</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('uang_putih')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === 'uang_putih'
                        ? 'bg-amber-950/40 border-amber-500/50 text-white shadow-glow-gold'
                        : 'bg-[#050608] border-white/5 text-gray-400 hover:border-white/15'
                    }`}
                  >
                    <p className="text-[11px] font-bold">Uang Putih</p>
                    <p className="text-[9px] text-gray-500 truncate mt-0.5">Rekening Resmi Admin</p>
                  </button>
                </div>
              </div>

              {paymentMethod === 'uang_putih' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">
                    Pilih Rekening Admin
                  </label>
                  <select 
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="w-full bg-[#050608] border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/50 shadow-inner"
                  >
                    {admins.map(a => (
                      <option key={a.id} value={a.id}>{a.icName || a.username} ({formatMoney(a.whiteMoney)})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {checkoutError && (
              <div className="text-rose-400 text-xs p-3 bg-rose-950/40 rounded-xl border border-rose-900/50 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            <button 
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut}
              className={`w-full py-4 rounded-2xl font-display font-bold tracking-wider transition-all uppercase text-xs flex justify-center items-center gap-2 ${
                cart.length === 0 || isCheckingOut 
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10' 
                  : 'glow-gold-btn border border-amber-400/40'
              }`}
            >
              {isCheckingOut ? 'Memproses Transaksi...' : 'Konfirmasi & Checkout'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modern Checkout Success Dialog */}
      {lastCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-md w-full border border-amber-500/30 text-center relative shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-5 shadow-glow-gold">
              <Sparkles size={32} />
            </div>

            <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white">
              Transaksi Berhasil!
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Barang telah diotorisasi dan otomatis dicatat ke dalam Ledger Riwayat.
            </p>

            <div className="bg-[#050608] border border-white/10 rounded-2xl p-4 my-5 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Rincian Barang:</span>
                <span className="text-white font-medium text-right truncate max-w-[200px]" title={lastCheckout.details}>
                  {lastCheckout.details}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Nominal:</span>
                <span className="text-amber-400 font-mono-tech font-bold">{formatMoney(lastCheckout.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Metode Bayar:</span>
                <span className="text-gray-300 font-medium">{lastCheckout.method}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/5">
                <span className="text-gray-500">Status Ledger:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck size={14} /> Terverifikasi Masuk Log
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setLastCheckout(null)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-colors uppercase tracking-wider"
              >
                Tutup
              </button>
              <Link 
                href="/riwayat"
                className="flex-1 py-3 glow-gold-btn rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                Buka Log Riwayat <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
