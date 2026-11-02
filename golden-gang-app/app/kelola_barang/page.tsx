'use client';

import React, { useState } from 'react';
import { PackageSearch, ShieldAlert, Plus, Trash2, Search, Edit3, X, Check } from 'lucide-react';
import { useGang, Item } from '@/lib/GangContext';

export default function KelolaBarangPage() {
  const { items, isAdmin, addNewItem, editItem, deleteItem, updateItemStock } = useGang();
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'DRUG', vault: 'Brankas Utama', stock: 10, price: 5000, image: '' });
  const [categoryFilter, setCategoryFilter] = useState('SEMUA');
  const [search, setSearch] = useState('');
  
  // State Edit Modal
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'ITEM',
    vault: 'Brankas Utama',
    stock: 0,
    price: 5000,
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

  if (!isAdmin) {
    return (
      <div className="glass-panel p-10 rounded-3xl text-center max-w-lg mx-auto my-12">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4 opacity-80" />
        <h2 className="text-xl font-display font-extrabold text-white mb-2">Akses Dibatasi</h2>
        <p className="text-gray-400 text-xs">Halaman ini hanya dapat diakses oleh Administrator / Petinggi Faksi.</p>
      </div>
    );
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addNewItem({
        name: newItem.name.trim(),
        category: newItem.category,
        vault: newItem.vault.trim(),
        stock: Number(newItem.stock) || 0,
        inShop: true,
        price: Number(newItem.price) || 5000,
        image: newItem.image.trim() || undefined
      });
      setIsAdding(false);
      setNewItem({ name: '', category: 'ITEM', vault: 'Brankas Utama', stock: 10, price: 5000, image: '' });
    } catch (err) {
      console.error("Error adding item:", err);
    }
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || '',
      category: item.category || 'ITEM',
      vault: item.vault || 'Brankas Utama',
      stock: item.stock || 0,
      price: item.price || 0,
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
        stock: Number(editingItem.stock) || 0,
        price: Number(editingItem.price) || 0,
        image: editForm.image.trim() || undefined
      });
      setEditingItem(null);
    } catch (err) {
      console.error("Error editing item:", err);
    } finally {
      setSavingEdit(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    await deleteItem(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <PackageSearch size={20} />
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              Data <span className="text-gold">Inventory</span>
            </h1>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Pengaturan entri katalog aset faksi secara global.</p>
        </div>

        <button 
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className={`text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-2xl transition-all border flex items-center gap-2 ${
            isAdding 
              ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' 
              : 'glow-gold-btn border-amber-400/40'
          }`}
        >
          {isAdding ? 'Tutup Formulir' : <><Plus size={16} /> Tambah Aset Baru</>}
        </button>
      </header>

      {/* Formulir Tambah Aset Baru */}
      {isAdding && (
        <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 shadow-2xl mb-6 animate-in slide-in-from-top-4 duration-200">
          <h3 className="text-xs font-bold text-amber-400 mb-4 uppercase tracking-widest">Formulir Pendaftaran Aset Baru</h3>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">Nama Identifikasi Barang</label>
              <input 
                required 
                type="text" 
                value={newItem.name} 
                onChange={e => setNewItem({...newItem, name: e.target.value})} 
                className="w-full bg-[#050608] border border-white/10 text-white rounded-2xl p-3 text-xs focus:border-amber-500/60 focus:outline-none shadow-inner"
                placeholder="cth. Silencer Tactical 9mm, Kevlar Vest"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">Kategori Aset</label>
              <select 
                value={newItem.category} 
                onChange={e => setNewItem({...newItem, category: e.target.value})} 
                className="w-full bg-[#050608] border border-white/10 text-white rounded-2xl p-3 text-xs focus:border-amber-500/60 focus:outline-none shadow-inner"
              >
                {CATEGORIES.filter(c => c !== 'SEMUA').map(c => (
                  <option key={c} value={c} className="bg-[#0b0d13]">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">Brankas Penyimpanan</label>
              <input 
                required 
                type="text" 
                value={newItem.vault} 
                onChange={e => setNewItem({...newItem, vault: e.target.value})} 
                className="w-full bg-[#050608] border border-white/10 text-white rounded-2xl p-3 text-xs focus:border-amber-500/60 focus:outline-none shadow-inner"
                placeholder="cth. Armory Sector A"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">Stok Awal</label>
              <input 
                required 
                type="number" 
                min="0"
                value={newItem.stock} 
                onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value) || 0})} 
                className="w-full bg-[#050608] border border-white/10 text-white rounded-2xl p-3 text-xs focus:border-amber-500/60 focus:outline-none shadow-inner"
              />
            </div>
            <div className="md:col-span-5 flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="glow-gold-btn px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-amber-400/40"
              >
                Simpan ke Brankas
              </button>
            </div>
          </form>
        </div>
      )}

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
            placeholder="Cari aset master..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#07080B] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-gray-600 shadow-inner"
          />
        </div>
      </div>

      {/* Tabel Data Inventory */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#080A0E] border-b border-white/10 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Nama Aset</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Kategori</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Brankas Penyimpanan</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Stok Tersedia</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredItems.length === 0 && (
                <tr><td colSpan={5} className="text-center py-16 text-gray-500 italic">Katalog Master tidak ditemukan.</td></tr>
              )}
              {filteredItems.map(item => (
                <tr key={item.id} className="table-row-hover transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <PackageSearch size={16} className="text-amber-400" />
                        )}
                      </div>
                      <span className="text-gray-200 font-bold">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-bold uppercase">{item.category}</td>
                  <td className="px-6 py-4 text-gray-400">{item.vault}</td>
                  <td className="px-6 py-4 font-mono-tech font-extrabold text-amber-400 text-sm">{item.stock || 0}</td>
                  <td className="px-6 py-4 text-right">
                    {deletingId === item.id ? (
                      <div className="flex justify-end items-center gap-2">
                        <span className="text-[10px] text-rose-400 font-bold mr-1">Hapus Permanen?</span>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Aset */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel p-6 sm:p-7 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Edit3 size={18} />
                </span>
                <h3 className="text-base font-display font-extrabold text-white">
                  Edit Aset: <span className="text-amber-400">{editingItem.name}</span>
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
                    Brankas Penyimpanan
                  </label>
                  <input 
                    type="text" 
                    required
                    value={editForm.vault} 
                    onChange={e => setEditForm({ ...editForm, vault: e.target.value })}
                    className="w-full bg-[#050608] border border-white/10 text-white rounded-xl p-3 text-xs focus:border-amber-500/60 focus:outline-none"
                  />
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
