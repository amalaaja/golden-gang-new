'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Box, 
  ShoppingCart, 
  ArrowRightLeft, 
  History, 
  Users, 
  PackageSearch, 
  Store, 
  LogOut, 
  Landmark, 
  Menu, 
  X,
  User as UserIcon,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { useGang } from '@/lib/GangContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { dbUser, isAdmin, handleLogout, transactions } = useGang();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingCount = (transactions || []).filter(t => {
    if (!t || (t.status || 'approved') !== 'pending') return false;
    if (isAdmin) return true;
    const cleanUser = (t.user || '').toLowerCase();
    const myUser = (dbUser?.username || '').toLowerCase();
    return myUser && cleanUser.includes(myUser);
  }).length;

  const navItems = [
    { href: '/', label: 'Dasbor Inventory', icon: <Box size={18} /> },
    { href: '/shop', label: 'Internal Shop', icon: <ShoppingCart size={18} /> },
    { href: '/transaksi', label: 'Transaksi', icon: <ArrowRightLeft size={18} /> },
    { href: '/riwayat', label: 'Log Riwayat', icon: <History size={18} /> },
    { 
      href: '/validasi', 
      label: 'Validasi Transaksi', 
      icon: <ShieldCheck size={18} />,
      badge: pendingCount > 0 ? pendingCount : null 
    },
  ];

  const adminNavItems = [
    { href: '/admin', label: 'Data Member', icon: <Users size={18} /> },
    { href: '/kelola_barang', label: 'Data Inventory', icon: <PackageSearch size={18} /> },
    { href: '/kelola_shop', label: 'Pengaturan Toko', icon: <Store size={18} /> },
  ];

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="lg:hidden bg-[#080A0E]/90 backdrop-blur-3xl border-b border-white/10 flex items-center justify-between px-6 py-4 z-40 w-full">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Golden Gang" 
            className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]" 
          />
          <h1 className="font-display text-lg text-gold font-extrabold tracking-wider uppercase">Golden Gang</h1>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="text-gray-300 hover:text-amber-400 p-2"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <span className="font-display text-lg text-gold font-bold tracking-widest uppercase">Navigasi Sindikat</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-gray-300 p-2"><X size={24}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {navItems.map(item => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold tracking-wide transition-all ${
                    active ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-amber-500 text-black text-[10px] font-mono-tech font-extrabold px-2 py-0.5 rounded-full shadow-glow-gold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <p className="text-[10px] font-bold text-gray-500 pt-6 pb-2 uppercase tracking-widest">Otoritas Petinggi</p>
                {adminNavItems.map(item => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-xs font-bold tracking-wide transition-all ${
                        active ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </>
            )}

            <div className="pt-6">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-xs font-bold tracking-wide transition-all ${
                  pathname === '/profile' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30' : 'text-gray-400'
                }`}
              >
                <UserIcon size={18} />
                <span>Profil Akun</span>
              </Link>
            </div>
          </div>
          <div className="p-6 border-t border-white/10 bg-black/40">
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center justify-center gap-2 py-3 bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded-2xl font-bold uppercase tracking-wider text-xs mb-3"
            >
              <LogOut size={16} /> Keluar Sesi
            </button>
            <div className="text-center text-[10px] text-gray-500 font-medium tracking-wider">
              Created By <span className="text-amber-400 font-bold tracking-widest">AMALA</span>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Modern Sidebar (Compact) */}
      <div className="hidden lg:flex w-64 bg-[#08090D] border-r border-white/[0.08] flex-col flex-shrink-0 z-30 shadow-2xl h-screen">
        <div className="p-4 border-b border-white/[0.08] flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.08)_0%,_transparent_70%)] pointer-events-none"></div>
          
          <img 
            src="/logo.png" 
            alt="Golden Gang" 
            className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.35)] mb-1" 
          />
          <h1 className="font-display text-base text-gold font-extrabold tracking-wider uppercase">Golden Gang</h1>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 custom-scrollbar">
          <p className="text-[9px] font-bold text-gray-500 mb-2 px-2.5 uppercase tracking-widest">Navigasi Utama</p>
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 relative group overflow-hidden ${
                  active 
                    ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25 shadow-glow-gold' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`transition-transform duration-200 shrink-0 ${active ? 'scale-105 text-amber-400' : 'group-hover:scale-105'}`}>
                    {item.icon}
                  </span> 
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-amber-500 text-black text-[9px] font-mono-tech font-extrabold px-1.5 py-0.2 rounded-full shadow-glow-gold shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <p className="text-[9px] font-bold text-gray-500 mt-5 mb-2 px-2.5 uppercase tracking-widest">Otoritas Petinggi</p>
              {adminNavItems.map(item => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 relative group overflow-hidden ${
                      active 
                        ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25 shadow-glow-gold' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    <span className={`transition-transform duration-200 ${active ? 'scale-105 text-amber-400' : 'group-hover:scale-105'}`}>
                      {item.icon}
                    </span> 
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}

          <div className="pt-4">
            <Link
              href="/profile"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 relative group overflow-hidden ${
                pathname === '/profile' 
                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25 shadow-glow-gold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <UserIcon size={16} />
              <span className="truncate">Profil Akun</span>
            </Link>
          </div>
        </div>

        {dbUser && (
          <div className="p-3 border-t border-white/[0.08] bg-[#06070A]">
            <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 p-2.5 rounded-xl mb-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                  {(dbUser.icName || dbUser.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs text-gray-200 font-bold truncate">{dbUser.icName || dbUser.username || 'User'}</p>
                  <p className={`text-[9px] uppercase tracking-wider font-bold ${dbUser.role === 'admin' ? 'text-amber-400' : 'text-blue-400'}`}>
                    {dbUser.role === 'admin' ? 'Admin Faksi' : 'Anggota Faksi'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 p-1.5 rounded-lg transition-all" 
                title="Keluar Sesi"
              >
                <LogOut size={14} />
              </button>
            </div>
            <div className="text-center text-[10px] text-gray-500 font-medium tracking-wider">
              Created By <span className="text-amber-400 font-bold tracking-widest">AMALA</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
