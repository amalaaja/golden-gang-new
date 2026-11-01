'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Link as LinkIcon, 
  Sparkles, 
  Check, 
  Trash2, 
  Image as ImageIcon,
  Package
} from 'lucide-react';
import { Item, useGang } from '@/lib/GangContext';

interface ChangeImageModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
}

// Preset ikon / gambar populer untuk Roleplay Gang
const RP_IMAGE_PRESETS = [
  {
    name: 'Meth / Narkoba Kristal',
    category: 'DRUG',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80',
    icon: '💎'
  },
  {
    name: 'Ganja / Herbal Hijau',
    category: 'DRUG',
    url: 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?auto=format&fit=crop&w=300&q=80',
    icon: '🌿'
  },
  {
    name: 'Glock-19 Pistol',
    category: 'WEAPON',
    url: 'https://images.unsplash.com/photo-1584281722572-887e411f531d?auto=format&fit=crop&w=300&q=80',
    icon: '🔫'
  },
  {
    name: 'Senapan Serbu Tactical AK',
    category: 'WEAPON',
    url: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=300&q=80',
    icon: '⚔️'
  },
  {
    name: 'Combat Medical Kit',
    category: 'ITEM',
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    icon: '💊'
  },
  {
    name: 'Rompi Kevlar Mk4',
    category: 'ITEM',
    url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=300&q=80',
    icon: '🛡️'
  },
  {
    name: 'Radio Enkripsi Satelit',
    category: 'ITEM',
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80',
    icon: '📡'
  },
  {
    name: 'Extended Magazine (Clip)',
    category: 'MAGAZINE',
    url: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=300&q=80',
    icon: '🔋'
  },
  {
    name: 'Extende Weapon Mod (Attachment)',
    category: 'EXTENDE WEAPON',
    url: 'https://images.unsplash.com/photo-1584281722572-887e411f531d?auto=format&fit=crop&w=300&q=80',
    icon: '⚙️'
  },
  {
    name: 'Emas Batangan & Kas',
    category: 'ITEM',
    url: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=300&q=80',
    icon: '🪙'
  }
];

export default function ChangeImageModal({ item, isOpen, onClose }: ChangeImageModalProps) {
  const { updateItemImage } = useGang();
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'preset'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(item?.image || '');
  const [urlInput, setUrlInput] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (item) {
      setPreviewUrl(item.image || '');
      setUrlInput(item.image || '');
      setUploadError('');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Harap pilih file gambar (JPG, PNG, WEBP, GIF)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Ukuran gambar maksimal 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawData = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/webp', 0.85);
          setPreviewUrl(compressed);
          setUploadError('');
        } else {
          setPreviewUrl(rawData);
          setUploadError('');
        }
      };
      img.onerror = () => {
        setPreviewUrl(rawData);
        setUploadError('');
      };
      img.src = rawData;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateItemImage(item.id, previewUrl);
    onClose();
  };

  const handleReset = () => {
    updateItemImage(item.id, '');
    setPreviewUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel p-6 sm:p-7 rounded-3xl max-w-lg w-full border border-white/10 relative shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ImageIcon size={18} />
              </span>
              <h3 className="text-lg font-display font-extrabold text-white">
                Ganti Gambar Aset
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Sesuaikan tampilan visual untuk barang <strong className="text-amber-400">{item.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#050608] border border-white/10 mb-5">
          <div className="w-20 h-20 rounded-2xl bg-[#090C10] border border-amber-500/30 flex items-center justify-center overflow-hidden shrink-0 relative group shadow-glow-gold">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => setUploadError('URL gambar tidak valid atau tidak bisa dimuat')}
              />
            ) : (
              <Package size={32} className="text-amber-400 opacity-60" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold tracking-widest uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full inline-block mb-1">
              {item.category}
            </span>
            <p className="font-bold text-white text-sm truncate">{item.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
              {previewUrl ? 'Gambar baru siap disimpan' : 'Menggunakan ikon default'}
            </p>
          </div>
          {previewUrl && (
            <button
              type="button"
              onClick={() => setPreviewUrl('')}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-colors shrink-0"
              title="Hapus gambar (Kembali ke default)"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Option Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#050608] border border-white/10 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-black shadow-glow-gold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Upload size={13} /> Upload File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'preset'
                ? 'bg-amber-500 text-black shadow-glow-gold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles size={13} /> Preset RP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'url'
                ? 'bg-amber-500 text-black shadow-glow-gold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LinkIcon size={13} /> Link URL
          </button>
        </div>

        {/* Tab 1: Upload File */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-amber-500/50 rounded-2xl p-6 text-center cursor-pointer bg-[#050608]/50 hover:bg-amber-500/[0.03] transition-all group"
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <p className="font-bold text-white text-xs">Pilih Gambar dari Komputer</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Format PNG, JPG, WEBP (Maksimal 4MB)</p>
            </div>
          </div>
        )}

        {/* Tab 2: Preset Gambar GTA RP */}
        {activeTab === 'preset' && (
          <div className="grid grid-cols-4 gap-2.5 max-h-52 overflow-y-auto custom-scrollbar p-1">
            {RP_IMAGE_PRESETS.map((preset, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setPreviewUrl(preset.url);
                  setUploadError('');
                }}
                className={`p-2 rounded-2xl border text-center cursor-pointer transition-all flex flex-col items-center justify-center relative overflow-hidden group ${
                  previewUrl === preset.url
                    ? 'bg-amber-500/20 border-amber-500 shadow-glow-gold'
                    : 'bg-[#050608] border-white/10 hover:border-amber-500/40'
                }`}
                title={preset.name}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden mb-1.5 border border-white/10 relative">
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[10px] font-bold text-gray-300 truncate w-full">{preset.name}</span>
                {previewUrl === preset.url && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: URL Link Gambar */}
        {activeTab === 'url' && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">
                Alamat URL Gambar Web
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://contoh-link.com/gambar.png"
                  className="flex-1 bg-[#050608] border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/50 shadow-inner font-mono-tech"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (urlInput.trim()) {
                      setPreviewUrl(urlInput.trim());
                      setUploadError('');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <p className="text-xs text-rose-400 mt-3">{uploadError}</p>
        )}

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-rose-400 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Reset Default
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="glow-gold-btn px-6 py-2.5 rounded-xl text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <Check size={14} /> Simpan Gambar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
