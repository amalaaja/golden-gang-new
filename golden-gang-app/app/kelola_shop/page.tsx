'use client';

import React, { useState, useEffect } from 'react';
import { Store, ShieldAlert, Check, Search, Edit3, Trash2, X } from 'lucide-react';
import { useGang, Item } from '@/lib/GangContext';

export default function KelolaShopPage() {
  const { items, isAdmin, updateShopSettings, editItem, deleteItem } = useGang();
  const [shopData, setShopData] = useState<Record<string, { inShop: boolean; price: number }>>({});
  const [categoryFilter, setCategoryFilter] = useState('SEMUA');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // State Edit Modal
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'ITEM',
    vault: 'Brankas Utama',
    stock: 0,
    price: 5000,
    inShop: true,
    image: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // State Hapus Konfirmasi
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const CATEGORIES = ['SEMUA', 'DRUG', 'WEAPON', 'ITEM', 'MAGAZINE', 'EXTENDE WEAPON'];

  const filteredItems = items.filter(item => {
    const matchCat = categoryFilter === 'SEMUA' || item.category === categoryFilter;
    const matchSearch = (item.name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  useEffect(() => {
    setShopData(prev => {
      const next = { ...prev };
      items.forEach(i => {
        if (!next[i.id]) {
          next[i.id] = { inShop: !!i.inShop, price: i.price || 0 };
        }
      });
      return next;
    });
  }, [items]);

  if (!isAdmin) {
    return (
      <div className="glass-panel p-10 rounded-3xl text-center max-w-lg mx-auto my-12">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4 opacity-80" />
        <h2 className="text-xl font-display font-extrabold text-white mb-2">Akses Dibatasi</h2>
        <p className="text-gray-400 text-xs">Halaman ini hanya dapat diakses oleh Administrator / Petinggi Faksi.</p>
      </div>
    );
  }

  const handleSaveAll = async () => {
    setSaving(true);
    setMsg('');
    try {
      await updateShopSettings(shopData);
      setMsg('Perubahan etalase dan harga berhasil disimpan.');
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setMsg('Gagal menyinkronkan data.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateLocal = (id: string, field: 'inShop' | 'price', value: any) => {
    setShopData(prev => ({
      ...prev,
      [id]: { 
        ...(prev[id] || { inShop: false, price: 0 }), 
        [field]: value 
      }
    }));
  };

  const handleOpenEdit = (item: Item) => {
    const local = shopData[item.id] || { inShop: !!item.inShop, price: item.price || 0 };
    setEditingItem(item);
    setEditForm({
      name: item.name || '',
      category: item.category || 'ITEM',
      vault: item.vault || 'Brankas Utama',
      stock: item.stock || 0,
      price: local.price || item.price || 0,
      inShop: local.inShop,
      image: item.image || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      await editItem(editingItem.id, {
        name: editForm.name.trim(),
        category: editForm.category,
        vault: editForm.vault.trim(),
        stock: Number(editForm.stock) || 0,
        price: Number(editForm.price) || 0,
        inShop: Boolean(editForm.inShop),
        image: editForm.image.trim() || undefined
      });
      // Update local state shop
      updateLocal(editingItem.id, 'price', Number(editForm.price) || 0);
      updateLocal(editingItem.id, 'inShop', Boolean(editForm.inShop));
      setEditingItem(null);
      setMsg('Aset berhasil diperbarui!');
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      console.error("Error editing item:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    setDeletingId(null);
    setMsg('Aset berhasil dihapus dari sistem!');
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Store size={20} />
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              Pengaturan <span className="text-gold">Etalase Toko</span>
            </h1>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Konfigurasi etalase dan penetapan harga aset gelap.</p>
        </div>

        <div className="flex items-center gap-3 bg-[#080A0E] border border-white/10 p-1.5 rounded-2xl w-full sm:w-auto justify-between">
          {msg && (
            <span className={`text-xs font-bold px-3 flex items-center gap-1.5 ${msg.includes('Gagal') ? 'text-rose-400' : 'text-emerald-400'}`}>
              <Check size={14} /> {msg}
            </span>
          )}
          <button 
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="glow-gold-btn border border-amber-400/40 text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 w-full sm:w-auto"
          >
            {saving ? 'Menyimpan...' : 'Terapkan Perubahan'}
          </button>
        </div>
      </header>

      {/* Filter Kategori & Pencarian */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all uppercase whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-black shadow-glow-gold'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari aset etalase..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#07080B] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-gray-600 shadow-inner"
          />
        </div>
      </div>

      {/* Tabel Etalase Toko */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#080A0E] border-b border-white/10 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Katalog Barang</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Kategori</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-center">Status Etalase (Tampil)</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-right w-52">Harga Satuan (USD)</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredItems.length === 0 && (
                <tr><td colSpan={5} className="text-center py-16 text-gray-500 italic">Katalog Master kosong.</td></tr>
              )}
              {filteredItems.map(item => {
                const local = shopData[item.id] || { inShop: false, price: 0 };
                return (
                  <tr key={item.id} className="table-row-hover transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Store size={15} className="text-amber-400" />
                          )}
                        </div>
                        <span className="text-gray-200 font-bold">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-bold uppercase text-[10px]">{item.category}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center">
                        <label className="relative flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={local.inShop}
                            onChange={(e) => updateLocal(item.id, 'inShop', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#050608] border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-black peer-checked:shadow-glow-gold"></div>
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <div className="flex items-center bg-[#050608] border border-white/10 focus-within:border-amber-500/50 rounded-xl w-36 overflow-hidden transition-all shadow-inner">
                          <span className="pl-3.5 pr-1.5 text-amber-400 font-mono-tech font-bold">$</span>
                          <input 
                            type="number" 
                            value={local.price}
                            onChange={(e) => updateLocal(item.id, 'price', Number(e.target.value))}
                            className="w-full bg-transparent text-amber-400 font-mono-tech font-bold p-2 focus:outline-none text-right pr-3.5"
                            min="0"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deletingId === item.id ? (
                        <div className="flex justify-end items-center gap-2">
                          <span className="text-[10px] text-rose-400 font-bold mr-1">Hapus?</span>
                          <button 
                            type="button" 
                            onClick={() => handleDelete(item.id)} 
                            className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl transition-all shadow-glow-sm"
                          >
                            Ya, Hapus
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setDeletingId(null)} 
                            className="text-[10px] font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1.5 rounded-xl transition-all"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            type="button" 
                            onClick={() => handleOpenEdit(item)} 
                            className="text-amber-400 hover:text-amber-300 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5"
                            title="Edit Detail Aset"
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setDeletingId(item.id)} 
                            className="text-rose-400/80 hover:text-rose-400 text-[10px] font-bold uppercase tracking-wider bg-rose-950/20 border border-rose-900/30 hover:bg-rose-900/40 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5"
                            title="Hapus Aset dari Sistem"
                          >
                            <Trash2 size={13} /> Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Aset Toko */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel p-6 sm:p-7 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Edit3 size={18} />
                </span>
                <h3 className="text-base font-display font-extrabold text-white">
                  Edit Aset Toko: <span className="text-amber-400">{editingItem.name}</span>
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">
                  Nama Aset
                </label>
                <input 
                  type="text" 
                  required
                  value={editForm.name} 
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-[#050608] border border-white/10 text-white rounded-xl p-3 text-xs focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">
                    Kategori
                  </label>
                  <select 
                    value={editForm.category} 
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-[#050608] border border-white/10 text-white rounded-xl p-3 text-xs focus:border-amber-500/60 focus:outline-none"
                  >
                    {CATEGORIES.filter(c => c !== 'SEMUA').map(c => (
                      <option key={c} value={c} className="bg-[#0b0d13]">{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">
                    Harga Satuan (USD)
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    required
                    value={editForm.price} 
                    onChange={e => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#050608] border border-white/10 text-amber-400 font-mono-tech font-bold rounded-xl p-3 text-xs focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">
                    Stok Tersedia
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    required
                    value={editForm.stock} 
                    onChange={e => setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#050608] border border-white/10 text-amber-400 font-mono-tech font-bold rounded-xl p-3 text-xs focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">
                    Status Etalase Toko
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer mt-1">
                    <input 
                      type="checkbox" 
                      checked={editForm.inShop}
                      onChange={e => setEditForm({ ...editForm, inShop: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[#050608] border border-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-black"></div>
                    <span className="text-xs text-gray-300 font-bold">{editForm.inShop ? 'Tampil di Shop' : 'Disembunyikan'}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">
                  URL Gambar (Opsional)
                </label>
                <input 
                  type="text" 
                  value={editForm.image} 
                  onChange={e => setEditForm({ ...editForm, image: e.target.value })}
                  placeholder="/items/nama_file.png atau link https://..."
                  className="w-full bg-[#050608] border border-white/10 text-white rounded-xl p-3 text-xs focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setEditingItem(null)} 
                  className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={savingEdit}
                  className="glow-gold-btn px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-amber-400/40 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingEdit ? 'Menyimpan...' : <><Check size={14} /> Simpan Perubahan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
