'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot, 
  collection, 
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, USERS_PATH, ITEMS_PATH, TX_PATH, STATS_PATH } from './firebase';
import { supabase, isSupabaseConfigured, safeSupabase } from './supabase';

export interface DbUser {
  id: string;
  username: string;
  icName?: string;
  password?: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved' | 'rejected';
  whiteMoney: number;
  joinedAt?: any;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  vault: string;
  stock: number;
  inShop?: boolean;
  price?: number;
  image?: string;
}

export interface Transaction {
  id: string;
  type: string;
  user: string;
  asset?: string;
  details?: string;
  items?: string;
  totalPrice?: number;
  amount?: number;
  note?: string;
  paymentMethod?: string;
  timestamp?: any;
  createdAtMs?: number;
  status?: 'pending' | 'approved' | 'rejected';
  validatedBy?: string;
  validatedAt?: any;
  itemsPayload?: Array<{ id: string; name: string; qty: number; price: number }>;
  targetAdminId?: string;
  selectedItemId?: string;
  itemQty?: number;
}

interface NewTransactionInput {
  type: string;
  user: string;
  asset?: string;
  details?: string;
  items?: string;
  totalPrice?: number;
  amount?: number;
  itemQty?: number;
  note?: string;
  paymentMethod?: string;
  createdAtMs?: number;
  status?: 'pending' | 'approved' | 'rejected';
  itemsPayload?: Array<{ id: string; name: string; qty: number; price: number }>;
  targetAdminId?: string;
  selectedItemId?: string;
}

interface GangContextType {
  user: User | null;
  dbUser: DbUser | null;
  authLoading: boolean;
  users: DbUser[];
  admins: DbUser[];
  isAdmin: boolean;
  items: Item[];
  transactions: Transaction[];
  gangStats: { dirtyMoney: number };
  handleLogin: (username: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  handleRegister?: (username: string, pass: string, icName?: string) => Promise<{ success: boolean; message?: string; isPending?: boolean }>;
  handleLogout: () => Promise<void>;
  addTransaction: (data: NewTransactionInput) => string;
  approveTransaction: (txId: string) => Promise<void>;
  rejectTransaction: (txId: string) => Promise<void>;
  updateItemStock: (itemId: string, newStock: number) => Promise<void>;
  updateItemImage: (itemId: string, newImage: string) => void;
  addNewItem: (data: Omit<Item, 'id'>) => Promise<string>;
  editItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  updateShopSettings: (shopData: Record<string, { inShop: boolean; price: number }>) => Promise<void>;
  updateUserStatus: (userId: string, status: 'approved' | 'rejected') => Promise<void>;
  updateUserRole: (userId: string, role: string) => Promise<void>;
  updateDirtyMoney: (newTotal: number) => Promise<void>;
  updateWhiteMoney: (userId: string, newTotal: number) => Promise<void>;
  handleJoinGang?: (username: string) => Promise<void>;
}

// Akun Admin Uji Coba Default
export const DEFAULT_ADMIN_ACCOUNT: DbUser = {
  id: 'user_alvaro',
  username: 'alvaro',
  icName: 'Alvaro Cortez',
  password: '112233',
  role: 'admin',
  status: 'approved',
  whiteMoney: 25000000,
};

// Akun Member / User Pembeli Default
export const DEFAULT_MEMBER_ACCOUNT: DbUser = {
  id: 'user_member_1',
  username: 'member_sindikat',
  icName: 'Marcus Vance',
  password: '112233',
  role: 'member',
  status: 'approved',
  whiteMoney: 0,
};

export const INITIAL_SAMPLE_USERS: DbUser[] = [];

const INITIAL_SAMPLE_ITEMS: Item[] = [];

export const getMillis = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts > 0 ? ts : 0;
  if (typeof ts?.toMillis === 'function') {
    const val = ts.toMillis();
    return val > 0 ? val : 0;
  }
  if (typeof ts?.toDate === 'function') {
    const d = ts.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : 0;
  }
  if (ts?.seconds !== undefined) {
    return Number(ts.seconds) * 1000 + (ts.nanoseconds ? Math.floor(Number(ts.nanoseconds) / 1000000) : 0);
  }
  if (ts?._seconds !== undefined) {
    return Number(ts._seconds) * 1000;
  }
  if (ts instanceof Date) {
    const val = ts.getTime();
    return !isNaN(val) ? val : 0;
  }
  if (typeof ts === 'string') {
    const parsed = new Date(ts).getTime();
    return !isNaN(parsed) ? parsed : 0;
  }
  return 0;
};

export const getTxMillis = (item: any): number => {
  if (!item) return 0;
  if (typeof item === 'object') {
    if (typeof item.createdAtMs === 'number' && item.createdAtMs > 0) return item.createdAtMs;
    if (item.timestamp) {
      const m = getMillis(item.timestamp);
      if (m > 0) return m;
    }
    if (item.createdAt) {
      const m = getMillis(item.createdAt);
      if (m > 0) return m;
    }
  }
  return getMillis(item);
};

export const deduplicateTransactions = (list: Transaction[]): Transaction[] => {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: Transaction[] = [];

  for (const tx of list) {
    if (!tx || !tx.id) continue;
    if (seenIds.has(tx.id)) continue;

    // Duplikasi hanya di-drop jika transaksi identik persis dieksekusi bersamaan dalam rentang 3 detik
    const txTime = getTxMillis(tx);
    const timeBucket = Math.floor(txTime / 3000);
    const sigContent = `${(tx.user || '').toLowerCase()}_${tx.type || ''}_${tx.details || tx.items || ''}_${tx.amount || tx.totalPrice || 0}_${timeBucket}`;
    if (timeBucket > 0 && seenSignatures.has(sigContent)) continue;

    seenIds.add(tx.id);
    if (timeBucket > 0) seenSignatures.add(sigContent);
    result.push(tx);
  }

  return result;
};

const GangContext = createContext<GangContextType | undefined>(undefined);

export function GangProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [users, setUsers] = useState<DbUser[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gangStats, setGangStats] = useState<{ dirtyMoney: number }>({ dirtyMoney: 0 });

  // 1. Muat sesi login tersimpan & data persisten
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem('gang_active_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.username) {
            setDbUser(parsed);
          }
        }

        const savedAllUsers = localStorage.getItem('gang_all_users');
        if (savedAllUsers) {
          try {
            const parsed = JSON.parse(savedAllUsers);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setUsers(parsed);
            }
          } catch (e) {}
        }

        const savedTx = localStorage.getItem('gang_transactions');
        if (savedTx) {
          const parsed = JSON.parse(savedTx);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleanList = parsed.filter(t => t && typeof t === 'object' && t.id);
            const sorted = deduplicateTransactions(cleanList).sort((a, b) => {
              const diff = getTxMillis(b) - getTxMillis(a);
              if (diff !== 0) return diff;
              return (b?.id || '').localeCompare(a?.id || '');
            });
            setTransactions(sorted);
          }
        }

        const savedStats = localStorage.getItem('gang_stats');
        if (savedStats) {
          try {
            const parsed = JSON.parse(savedStats);
            if (parsed && typeof parsed === 'object') {
              setGangStats(parsed);
            }
          } catch (e) {}
        }

        const savedItems = localStorage.getItem('gang_items');
        if (savedItems) {
          try {
            const parsed = JSON.parse(savedItems);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleanItems = parsed.filter(i => i && typeof i === 'object' && i.id && i.name);
              if (cleanItems.length > 0) {
                setItems(cleanItems);
              }
            }
          } catch (e) {}
        }
      } catch (e) {
        console.warn("Storage sync:", e);
      } finally {
        setAuthLoading(false);
      }
    } else {
      setAuthLoading(false);
    }
  }, []);

  // 1.5. Sinkronisasi Global Real-Time (Users, Items, Kas Stats, Transaksi) lintas Admin & Member
  useEffect(() => {
    let isMounted = true;
    const syncAllFromApi = async () => {
      // Jika Supabase aktif, Supabase adalah sumber utama database online (Single Source of Truth).
      // Jangan timpa data Supabase dengan file statis lokal /api/sync.
      if (isSupabaseConfigured) return;

      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            // 1. Sync Users
            if (Array.isArray(data.users) && data.users.length > 0) {
              setUsers(data.users);
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('gang_all_users', JSON.stringify(data.users));
                } catch (e) {}
              }
              // Jika user aktif mengalami perubahan saldo / role / status dari server, perbarui dbUser
              setDbUser(prev => {
                if (!prev) return null;
                const fresh = data.users.find((u: any) => 
                  (u.id && prev.id && u.id === prev.id) || 
                  ((u.username || '').toLowerCase() === (prev.username || '').replace('@', '').toLowerCase())
                );
                if (fresh) {
                  // Jika role, status, atau saldo berubah di server (misal di-promote ke admin atau didowngrade ke member)
                  if (prev.role !== fresh.role || prev.status !== fresh.status || prev.whiteMoney !== fresh.whiteMoney) {
                    const updatedUser = { ...prev, ...fresh };
                    if (typeof window !== 'undefined') {
                      try {
                        localStorage.setItem('gang_active_user', JSON.stringify(updatedUser));
                      } catch (e) {}
                    }
                    return updatedUser;
                  }
                }
                return prev;
              });
            }

            // 2. Sync Items
            if (Array.isArray(data.items) && data.items.length > 0) {
              setItems(data.items);
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('gang_items', JSON.stringify(data.items));
                } catch (e) {}
              }
            }

            // 3. Sync Kas Stats
            if (data.stats && typeof data.stats.dirtyMoney === 'number') {
              setGangStats(data.stats);
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('gang_stats', JSON.stringify(data.stats));
                } catch (e) {}
              }
            }

            // 4. Sync Transactions (Hanya jika ada data, JANGAN timpa jika kosong)
            if (Array.isArray(data.transactions) && data.transactions.length > 0) {
              setTransactions(prev => {
                const merged = deduplicateTransactions([...data.transactions, ...prev]);
                return merged;
              });
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('gang_transactions', JSON.stringify(data.transactions));
                } catch (e) {}
              }
            }
          }
        }
      } catch (e) {
        // Fallback jika offline
      }
    };

    syncAllFromApi();
    const interval = setInterval(syncAllFromApi, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 2. Firebase Auth
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        const initialToken = (globalThis as any).__initial_auth_token;
        if (typeof initialToken !== 'undefined' && initialToken) {
          await signInWithCustomToken(auth, initialToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        // Fallback lokal
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;
      if (currentUser) {
        setUser(currentUser);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, []);

  // 3. Listener Firestore Real-time
  useEffect(() => {
    let isMounted = true;

    // Listen to users
    const unsubUsers = onSnapshot(collection(db, USERS_PATH), (snap) => {
      if (!isMounted) return;
      if (!snap.empty) {
        const usersData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as DbUser[];
        setUsers(prev => {
          const map = new Map<string, DbUser>();
          INITIAL_SAMPLE_USERS.forEach(u => map.set(u.username.toLowerCase(), u));
          prev.forEach(u => map.set(u.username.toLowerCase(), u));
          usersData.forEach(u => map.set(u.username.toLowerCase(), u));
          return Array.from(map.values());
        });
      }
    }, (err) => console.warn("Users sync:", err));

    // Listen to items
    const unsubItems = onSnapshot(collection(db, ITEMS_PATH), (snap) => {
      if (!isMounted) return;
      if (!snap.empty) {
        const firestoreItems = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Item[];
        setItems(firestoreItems);
      }
    }, (err) => console.warn("Items sync:", err));

    // Listen to transactions
    const unsubTx = onSnapshot(collection(db, TX_PATH), (snap) => {
      if (!isMounted) return;
      if (!snap.empty) {
        const firestoreTx = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
        setTransactions(prev => {
          const merged = deduplicateTransactions([...firestoreTx, ...prev]);
          merged.sort((a, b) => {
            const diff = getTxMillis(b) - getTxMillis(a);
            if (diff !== 0) return diff;
            return (b?.id || '').localeCompare(a?.id || '');
          });
          return merged;
        });
      }
    }, (err) => console.warn("Tx sync:", err));

    // Listen to stats
    const unsubStats = onSnapshot(doc(db, STATS_PATH, 'main'), (docSnap) => {
      if (!isMounted) return;
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGangStats({ dirtyMoney: Number(data.dirtyMoney) || 85000000 });
      }
    }, (err) => console.warn("Stats sync:", err));

    return () => {
      isMounted = false;
      unsubUsers();
      unsubItems();
      unsubTx();
      unsubStats();
    };
  }, []);

  // 4. Listener & Sinkronisasi Supabase Real-time & Polling (Jika Aktif)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let isMounted = true;

    const fetchAllFromSupabase = async () => {
      try {
        // Ambil Data Pengguna
        const { data: suUsers } = await supabase.from('users').select('*');
        if (isMounted && suUsers && Array.isArray(suUsers)) {
          const mappedUsers: DbUser[] = suUsers.map(u => ({
            id: u.id,
            username: u.username,
            icName: u.ic_name || u.icName || '',
            password: u.password,
            role: (u.role as any) || 'member',
            status: (u.status as any) || 'approved',
            whiteMoney: Number(u.white_money ?? u.whiteMoney) || 0,
            joinedAt: u.created_at
          }));
          setUsers(mappedUsers);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('gang_all_users', JSON.stringify(mappedUsers));
            } catch (e) {}
          }
          // Sinkronkan status/role akun aktif jika berubah di Supabase
          setDbUser(prev => {
            if (!prev) return null;
            const fresh = mappedUsers.find(u => 
              (u.id && prev.id && u.id === prev.id) || 
              (u.username.replace('@', '').toLowerCase() === prev.username.replace('@', '').toLowerCase()) ||
              (u.icName && prev.icName && u.icName.toLowerCase() === prev.icName.toLowerCase())
            );
            if (fresh && (prev.role !== fresh.role || prev.status !== fresh.status || prev.whiteMoney !== fresh.whiteMoney)) {
              const updatedUser = { ...prev, ...fresh };
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('gang_active_user', JSON.stringify(updatedUser));
                } catch (e) {}
              }
              return updatedUser;
            }
            return prev;
          });
        }

        // Ambil Data Barang Brankas
        const { data: suItems } = await supabase.from('items').select('*');
        if (isMounted && suItems && Array.isArray(suItems) && suItems.length > 0) {
          const mappedItems: Item[] = suItems.map(i => ({
            id: i.id,
            name: i.name,
            category: i.category || 'ITEM',
            vault: i.vault || 'Brankas Utama',
            stock: Number(i.stock) || 0,
            inShop: Boolean(i.in_shop ?? i.inShop),
            price: Number(i.price) || 0,
            image: i.image
          }));
          setItems(mappedItems);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('gang_items', JSON.stringify(mappedItems));
            } catch (e) {}
          }
        }

        // Ambil Data Transaksi & Antrean ACC
        const { data: suTx, error: txError } = await supabase.from('transactions').select('*');
        if (txError) {
          console.warn("Supabase tx fetch error:", txError);
        }
        if (isMounted && suTx && Array.isArray(suTx)) {
          const mappedTx: Transaction[] = suTx.map(t => {
            let detectedAsset = t.asset;
            const detailsText = String(t.details || t.items || '');
            const hasQtyParen = Boolean(detailsText.match(/\(\d+x\)/));

            if (!detectedAsset || detectedAsset.includes('(')) {
              if (t.type === 'SHOP_PURCHASE' || hasQtyParen) {
                detectedAsset = 'barang';
              } else if ((t.payment_method || '').toLowerCase() === 'uang_merah' || detailsText.toLowerCase().includes('uang merah')) {
                detectedAsset = 'uang_merah';
              } else {
                detectedAsset = 'uang_putih';
              }
            }

            const targetAdminIdMatch = (t.note || '').match(/\[id:([^\]]+)\]/)?.[1]?.trim();

            return {
              id: t.id,
              type: t.type,
              user: t.user,
              asset: detectedAsset,
              details: t.details || t.items,
              items: t.items,
              amount: Number(t.amount) || 0,
              totalPrice: Number(t.total_price ?? t.totalPrice ?? t.amount) || 0,
              paymentMethod: t.payment_method || (detectedAsset === 'barang' ? '' : 'uang_putih'),
              status: ((t.status || 'pending').toLowerCase()) as any,
              note: t.note || '',
              timestamp: t.created_at || new Date().toISOString(),
              createdAtMs: Number(t.created_at_ms) || (t.created_at ? new Date(t.created_at).getTime() : Date.now()),
              approvedBy: t.approved_by,
              rejectedBy: t.rejected_by,
              targetAdminId: targetAdminIdMatch || t.target_admin_id || undefined
            };
          });

          // Urutkan transaksi dari yang paling baru
          mappedTx.sort((a, b) => {
            const timeB = getTxMillis(b);
            const timeA = getTxMillis(a);
            if (timeB !== timeA) return timeB - timeA;
            return (b.id || '').localeCompare(a.id || '');
          });

          setTransactions(mappedTx);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('gang_transactions', JSON.stringify(mappedTx.slice(0, 100)));
            } catch (e) {}
          }
        }

        // Ambil Data Kas Faksi
        const { data: suStats } = await supabase.from('gang_stats').select('*').eq('id', 'main').maybeSingle();
        if (isMounted && suStats) {
          const dirty = Number(suStats.dirty_money) || 0;
          setGangStats({ dirtyMoney: dirty });
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('gang_stats', JSON.stringify({ dirtyMoney: dirty }));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("Supabase fetch warning:", err);
      }
    };

    fetchAllFromSupabase();

    // Polling berkala setiap 2.5 detik agar transaksi selalu muncul otomatis tanpa reload
    const pollInterval = setInterval(fetchAllFromSupabase, 2500);

    // Subscribe ke Postgres Changes Realtime Supabase
    const channel = supabase
      .channel('golden_gang_realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchAllFromSupabase();
      })
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Fungsi Login dengan Akun Alvaro (Admin), Member, & Kredensial Khusus
  const handleLogin = async (usernameInput: string, passwordInput: string) => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    // Verifikasi langsung ke Supabase jika aktif
    if (isSupabaseConfigured) {
      try {
        const { data: suUser } = await supabase.from('users').select('*').ilike('username', cleanUser).maybeSingle();
        if (suUser) {
          const userObj: DbUser = {
            id: suUser.id,
            username: suUser.username,
            icName: suUser.ic_name || suUser.icName || '',
            password: suUser.password,
            role: (suUser.role as any) || 'member',
            status: (suUser.status as any) || 'approved',
            whiteMoney: Number(suUser.white_money ?? suUser.whiteMoney) || 0,
            joinedAt: suUser.created_at
          };
          if (userObj.password && userObj.password !== cleanPass) {
            return { success: false, message: 'Kata sandi akun salah!' };
          }
          // Jika username alvaro atau admin utama, pastikan status approved
          if (userObj.username.toLowerCase() === 'alvaro' && userObj.status === 'pending') {
            userObj.status = 'approved';
            userObj.role = 'admin';
            safeSupabase(supabase.from('users').update({ status: 'approved', role: 'admin' }).eq('id', userObj.id));
          }
          if (userObj.status === 'pending') {
            return { 
              success: false, 
              message: `Akun @${userObj.username} (${userObj.icName || 'Anggota'}) masih MENUNGGU ACC / PERSETUJUAN Admin di menu Data Member!` 
            };
          }
          if (userObj.status === 'rejected') {
            return { 
              success: false, 
              message: `Akses akun @${userObj.username} telah DITOLAK atau DICABUT oleh Administrator sindikat.` 
            };
          }
          setDbUser(userObj);
          if (typeof window !== 'undefined') {
            localStorage.setItem('gang_active_user', JSON.stringify(userObj));
          }
          return { success: true };
        }
      } catch (err) {
        console.warn("Supabase login check:", err);
      }
    }

    // Selalu ambil status user teranyar dari server API & storage agar login instan detik itu juga setelah di-ACC
    let latestUsers = [...users];
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          latestUsers = data.users;
          setUsers(data.users);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('gang_all_users', JSON.stringify(data.users));
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    // Verifikasi User Terdaftar
    const matched = latestUsers.find(
      u => (u?.username || '').toLowerCase() === cleanUser && (u.password ? u.password === cleanPass : true)
    );

    if (matched) {
      if (matched.status === 'pending') {
        return { 
          success: false, 
          message: `Akun @${matched.username} (${matched.icName || 'Anggota'}) masih MENUNGGU ACC / PERSETUJUAN Admin di menu Data Member!` 
        };
      }

      if (matched.status === 'rejected') {
        return { 
          success: false, 
          message: `Akses akun @${matched.username} telah DITOLAK atau DICABUT oleh Administrator sindikat.` 
        };
      }

      setDbUser(matched);
      if (typeof window !== 'undefined') {
        localStorage.setItem('gang_active_user', JSON.stringify(matched));
      }
      return { success: true };
    }

    return { 
      success: false, 
      message: 'Username atau kata sandi tidak ditemukan! Silakan daftar akun baru jika belum terdaftar.' 
    };
  };

  const handleRegister = async (usernameInput: string, passwordInput: string, icNameInput?: string) => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();
    const cleanIc = (icNameInput || '').trim();

    if (!cleanIc) {
      return { success: false, message: 'Harap masukkan Nama IC (In-Character Roleplay)!' };
    }
    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Username dan kata sandi tidak boleh kosong!' };
    }

    if (users.some(u => (u?.username || '').toLowerCase() === cleanUser)) {
      return { success: false, message: 'Username sudah terdaftar! Silakan gunakan username lain atau login.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { data: suExisting } = await supabase.from('users').select('id, username').ilike('username', cleanUser).maybeSingle();
        if (suExisting) {
          return { success: false, message: 'Username sudah terdaftar di database! Silakan login.' };
        }
      } catch (e) {}
    }

    // Hanya akun alvaro yang otomatis jadi Admin dan langsung approved
    const isMasterAdmin = cleanUser === 'alvaro';
    const newMember: DbUser = {
      id: `user_${Date.now()}`,
      username: cleanUser,
      icName: cleanIc,
      password: cleanPass,
      role: isMasterAdmin ? 'admin' : 'member',
      status: isMasterAdmin ? 'approved' : 'pending', // Selain alvaro, SEMUA WAJIB MENUNGGU ACC ADMIN
      whiteMoney: isMasterAdmin ? 25000000 : 0,
      joinedAt: new Date().toISOString()
    };

    // HANYA alvaro yang langsung login otomatis. Member pending TIDAK BOLEH login langsung!
    if (isMasterAdmin) {
      setDbUser(newMember);
      if (typeof window !== 'undefined') {
        localStorage.setItem('gang_active_user', JSON.stringify(newMember));
      }
    }

    setUsers(prev => {
      const updated = [...prev.filter(u => (u?.username || '').toLowerCase() !== cleanUser), newMember];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_all_users', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    // Sinkronisasi ke Server API Lokal
    try {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', user: newMember })
      }).catch(() => {});
    } catch (e) {}

    setDoc(doc(db, USERS_PATH, newMember.id), {
      username: cleanUser,
      icName: cleanIc,
      password: cleanPass,
      role: newMember.role,
      status: newMember.status,
      whiteMoney: newMember.whiteMoney,
      joinedAt: serverTimestamp()
    }).catch(() => {});

    // Sinkronisasi ke Supabase jika aktif
    if (isSupabaseConfigured) {
      safeSupabase(
        supabase.from('users').upsert({
          id: newMember.id,
          username: cleanUser,
          ic_name: cleanIc,
          password: cleanPass,
          role: newMember.role,
          status: newMember.status,
          white_money: newMember.whiteMoney
        })
      );
    }

    return { 
      success: true, 
      isPending: !isMasterAdmin,
      message: isMasterAdmin 
        ? 'Pendaftaran akun Admin utama @alvaro berhasil! Anda dapat langsung masuk.' 
        : `Pendaftaran berhasil! Akun @${cleanUser} (${cleanIc}) telah masuk ke Data Member dan sedang MENUNGGU ACC dari Admin sebelum dapat masuk ke sistem.` 
    };
  };

  const handleLogout = async () => {
    setDbUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gang_active_user');
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Logout error:", err);
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // Helper Tambah Transaksi
  const addTransaction = (data: NewTransactionInput): string => {
    const newDocRef = doc(collection(db, TX_PATH));
    const docId = newDocRef.id;
    const now = data.createdAtMs || Date.now();

    const newTx: Transaction = {
      id: docId,
      ...data,
      items: data.items || data.details || '',
      user: data.user || (dbUser?.role === 'member' ? dbUser.username : 'member_sindikat'),
      timestamp: new Date(now).toISOString(),
      createdAtMs: now,
      status: data.status || 'pending',
      itemQty: data.itemQty ?? (data.asset === 'barang' ? (Number(data.details?.match(/\((\d+)x\)/)?.[1]) || 1) : 0),
      selectedItemId: data.selectedItemId
    };

    setTransactions(prev => {
      // Masukkan transaksi terbaru tepat di indeks 0 (paling atas)
      const merged = [newTx, ...prev.filter(t => t.id !== docId)];
      merged.sort((a, b) => {
        const diff = getTxMillis(b) - getTxMillis(a);
        if (diff !== 0) return diff;
        return (b.id || '').localeCompare(a.id || '');
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_transactions', JSON.stringify(merged.slice(0, 100)));
        } catch (e) {}
      }
      return merged;
    });

    // Sanitasi payload agar tidak ada field bernilai undefined yang ditolak oleh Firestore
    const rawPayload = {
      ...data,
      user: data.user || (dbUser?.role === 'member' ? dbUser.username : 'member_sindikat'),
      createdAtMs: now,
      status: data.status || 'pending',
      itemQty: data.itemQty ?? (data.asset === 'barang' ? (Number(data.details?.match(/\((\d+)x\)/)?.[1]) || 1) : 0),
      timestamp: serverTimestamp()
    };
    const cleanPayload = Object.fromEntries(
      Object.entries(rawPayload).filter(([_, v]) => v !== undefined)
    );

    setDoc(newDocRef, cleanPayload).catch((err) => console.warn("Firestore setDoc tx warning:", err));

    // Sinkronisasi transaksi ke Supabase jika aktif
    if (isSupabaseConfigured) {
      safeSupabase(
        supabase.from('transactions').upsert({
          id: docId,
          type: data.type,
          user: data.user || (dbUser?.role === 'member' ? dbUser.username : 'member_sindikat'),
          asset: data.asset || (data.type === 'SHOP_PURCHASE' ? 'barang' : 'uang_putih'),
          items: data.items || data.details || '',
          details: data.details || data.items || '',
          amount: Number(data.amount) || 0,
          total_price: Number(data.totalPrice) || 0,
          payment_method: data.paymentMethod || '',
          status: data.status || 'pending',
          note: data.note || '',
          created_at_ms: now
        })
      );
    }

    // Sinkronisasi ke server API lokal real-time
    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_transaction', transaction: newTx })
      }).catch(() => {});
    } catch (e) {}

    return docId;
  };

  const approveTransaction = async (txId: string) => {
    const adminName = dbUser?.username || 'admin';
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status === 'approved') return;

    // 1. Eksekusi Pembelian Toko Internal
    if (tx.type === 'SHOP_PURCHASE') {
      if (Array.isArray(tx.itemsPayload) && tx.itemsPayload.length > 0) {
        for (const cartItem of tx.itemsPayload) {
          // Cari item: prioritaskan exact ID, lalu exact nama barang
          let currentItem = items.find(i => i.id === cartItem.id);
          if (!currentItem) {
            const cName = (cartItem?.name || '').toLowerCase().trim();
            currentItem = items.find(i => (i?.name || '').toLowerCase().trim() === cName);
          }
          if (currentItem) {
            let currentStock = Number(currentItem.stock) || 0;
            if (isSupabaseConfigured) {
              try {
                let { data: suItem } = await supabase.from('items').select('stock').eq('id', currentItem.id).maybeSingle();
                if (!suItem && currentItem.name) {
                  const res = await supabase.from('items').select('stock').ilike('name', currentItem.name).maybeSingle();
                  suItem = res.data;
                }
                if (suItem && typeof suItem.stock === 'number') {
                  currentStock = Number(suItem.stock);
                }
              } catch (e) {}
            }
            const newStock = Math.max(0, currentStock - (Number(cartItem.qty) || 1));
            await updateItemStock(currentItem.id, newStock);
          }
        }
      } else {
        // Fallback: Parsing teks nama barang & kuantitas dari tx.details atau tx.items (misal: "Box Ammo-Rifle (1x)")
        const rawItems = tx.details || tx.items || '';
        const parts = rawItems.split(',').map((s: string) => s.trim()).filter(Boolean);
        
        for (const part of parts) {
          const match = part.match(/^(.*?)\s*\((\d+)x\)$/);
          const itemName = match ? match[1].trim() : part.replace(/\(\d+x\)/g, '').trim();
          const qty = match ? Number(match[2]) || 1 : (Number(tx.itemQty) || 1);
          const cleanName = itemName.toLowerCase().trim();

          // 1. Prioritaskan EXACT MATCH nama barang terlebih dahulu agar tidak salah potong item lain!
          let currentItem = items.find(i => (i?.name || '').trim().toLowerCase() === cleanName);

          // 2. Jika tidak ada exact name, cari via selectedItemId
          if (!currentItem && tx.selectedItemId) {
            currentItem = items.find(i => i.id === tx.selectedItemId);
          }

          // 3. Fallback partial match hanya untuk nama panjang
          if (!currentItem) {
            currentItem = items.find(i => {
              const iName = (i?.name || '').trim().toLowerCase();
              return iName.length > 3 && (cleanName.includes(iName) || iName.includes(cleanName));
            });
          }

          if (currentItem) {
            let currentStock = Number(currentItem.stock) || 0;
            if (isSupabaseConfigured) {
              try {
                let { data: suItem } = await supabase.from('items').select('stock').eq('id', currentItem.id).maybeSingle();
                if (!suItem && currentItem.name) {
                  const res = await supabase.from('items').select('stock').ilike('name', currentItem.name).maybeSingle();
                  suItem = res.data;
                }
                if (suItem && typeof suItem.stock === 'number') {
                  currentStock = Number(suItem.stock);
                }
              } catch (e) {}
            }
            const newStock = Math.max(0, currentStock - qty);
            await updateItemStock(currentItem.id, newStock);
          }
        }
      }

      const totalCost = Number(tx.totalPrice || tx.amount) || 0;
      const isRed = tx.paymentMethod === 'uang_merah' || (tx.note || '').toLowerCase().includes('merah');
      if (isRed) {
        // Pembelian pakai Uang Merah: Kas faksi bertambah karena pembeli menyetor uang merah
        let curDirty = Number(gangStats?.dirtyMoney) || 0;
        if (isSupabaseConfigured) {
          try {
            const { data: suStats } = await supabase.from('gang_stats').select('dirty_money').eq('id', 'main').maybeSingle();
            if (suStats && typeof suStats.dirty_money === 'number') {
              curDirty = Number(suStats.dirty_money);
            }
          } catch (e) {}
        }
        await updateDirtyMoney(curDirty + totalCost);
      } else {
        // Pembelian pakai Uang Putih (Transfer ke Rekening Admin):
        // 1. Duit di rekening ADMIN tujuan BERTAMBAH (+ totalCost)!
        const explicitId = tx.targetAdminId || (tx.note || '').match(/\[id:([^\]]+)\]/)?.[1]?.trim();
        let targetAdmin = explicitId
          ? users.find(u => u.id === explicitId || (u.username || '').replace('@', '').toLowerCase() === explicitId.replace('@', '').toLowerCase())
          : null;

        if (!targetAdmin) {
          const combined = `${tx.details || ''} ${tx.note || ''}`;
          const rekMatch = combined.match(/Rek:\s*@?([^\)\,\-\|]+)/i)?.[1]?.trim() ||
                           combined.match(/\(@?([^\)\,\-\|]+)\)/i)?.[1]?.trim() ||
                           combined.match(/@(\w+)/)?.[1];
          if (rekMatch) {
            const clean = rekMatch.toLowerCase();
            targetAdmin = users.find(u => 
              (u.username || '').replace('@', '').toLowerCase() === clean ||
              (u.icName || '').toLowerCase() === clean ||
              u.id === rekMatch
            );
          }
        }

        if (!targetAdmin) {
          targetAdmin = admins.find(a => a.status === 'approved') || admins[0] || dbUser;
        }

        if (targetAdmin) {
          let currentBalance = Number(targetAdmin.whiteMoney) || 0;
          if (isSupabaseConfigured) {
            try {
              let suUser = null;
              if (targetAdmin.id) {
                const res = await supabase.from('users').select('id, username, white_money').eq('id', targetAdmin.id).maybeSingle();
                if (res?.data) suUser = res.data;
              }
              if (!suUser && targetAdmin.username) {
                const cleanU = targetAdmin.username.replace('@', '');
                const res = await supabase.from('users').select('id, username, white_money').ilike('username', cleanU).maybeSingle();
                if (res?.data) suUser = res.data;
              }
              if (!suUser && (targetAdmin.icName || targetAdmin.username)) {
                const cleanN = targetAdmin.icName || targetAdmin.username.replace('@', '');
                const res = await supabase.from('users').select('id, username, white_money').ilike('ic_name', cleanN).maybeSingle();
                if (res?.data) suUser = res.data;
              }
              if (suUser && typeof suUser.white_money === 'number') {
                currentBalance = Number(suUser.white_money);
              }
            } catch (e) {
              console.warn("Fetch fresh white_money in shop purchase err:", e);
            }
          }
          await updateWhiteMoney(targetAdmin.id, currentBalance + totalCost);
        }
      }
    }

    // Helper deteksi tipe mutasi secara tegas & mutlak
    const detailsStr = String(tx.details || tx.items || '').trim();
    const hasItemQty = Boolean(detailsStr.match(/\(\d+x\)/));
    const isItemTx = tx.asset === 'barang' || hasItemQty;

    const isRedTx = !isItemTx && (
      tx.asset === 'uang_merah' || 
      tx.paymentMethod === 'uang_merah' || 
      detailsStr.toLowerCase().includes('uang merah') || 
      (tx.note || '').toLowerCase().includes('uang merah')
    );

    const isWhiteTx = !isItemTx && !isRedTx && (
      tx.asset === 'uang_putih' || 
      tx.paymentMethod === 'uang_putih' || 
      detailsStr.toLowerCase().includes('uang putih') || 
      detailsStr.toLowerCase().includes('kas legal') || 
      (tx.note || '').toLowerCase().includes('uang putih') || 
      (tx.note || '').toLowerCase().includes('rek:')
    );

    // 2. Eksekusi Mutasi Deposit Ledger
    if (tx.type === 'DEPOSIT') {
      const qty = Number(tx.amount || tx.totalPrice) || 0;

      if (isRedTx) {
        // Setor Kas Uang Merah
        let cur = Number(gangStats?.dirtyMoney) || 0;
        if (isSupabaseConfigured) {
          try {
            const { data: suStats } = await supabase.from('gang_stats').select('dirty_money').eq('id', 'main').maybeSingle();
            if (suStats && typeof suStats.dirty_money === 'number') {
              cur = Number(suStats.dirty_money);
            }
          } catch (e) {}
        }
        await updateDirtyMoney(cur + qty);
      } else if (isWhiteTx) {
        // Setor Uang Putih: Rekening Kas Admin yang dipilih BERTAMBAH!
        const explicitId = tx.targetAdminId || (tx.note || '').match(/\[id:([^\]]+)\]/)?.[1]?.trim();
        let targetAdmin = explicitId
          ? users.find(u => u.id === explicitId || (u.username || '').replace('@', '').toLowerCase() === explicitId.replace('@', '').toLowerCase())
          : null;

        if (!targetAdmin) {
          const combinedText = `${tx.details || ''} ${tx.note || ''}`;
          const rekAdminMatch = combinedText.match(/Rek:\s*@?([^\)\,\-\|]+)/i)?.[1]?.trim() ||
                                combinedText.match(/\(@?([^\)\,\-\|]+)\)/i)?.[1]?.trim() ||
                                combinedText.match(/@(\w+)/)?.[1];
          if (rekAdminMatch) {
            const clean = rekAdminMatch.toLowerCase();
            targetAdmin = users.find(u => 
              (u.username || '').replace('@', '').toLowerCase() === clean ||
              (u.icName || '').toLowerCase() === clean ||
              u.id === rekAdminMatch
            );
          }
        }

        if (!targetAdmin) {
          targetAdmin = admins.find(a => a.status === 'approved') || admins[0] || dbUser;
        }

        if (targetAdmin) {
          let currentBalance = Number(targetAdmin.whiteMoney) || 0;
          if (isSupabaseConfigured) {
            try {
              let suUser = null;
              if (targetAdmin.id) {
                const res = await supabase.from('users').select('id, username, white_money').eq('id', targetAdmin.id).maybeSingle();
                if (res?.data) suUser = res.data;
              }
              if (!suUser && targetAdmin.username) {
                const cleanU = targetAdmin.username.replace('@', '');
                const res = await supabase.from('users').select('id, username, white_money').ilike('username', cleanU).maybeSingle();
                if (res?.data) suUser = res.data;
              }
              if (!suUser && (targetAdmin.icName || targetAdmin.username)) {
                const cleanN = targetAdmin.icName || targetAdmin.username.replace('@', '');
                const res = await supabase.from('users').select('id, username, white_money').ilike('ic_name', cleanN).maybeSingle();
                if (res?.data) suUser = res.data;
              }
              if (suUser && typeof suUser.white_money === 'number') {
                currentBalance = Number(suUser.white_money);
              }
            } catch (e) {
              console.warn("Fetch fresh white_money in deposit err:", e);
            }
          }
          await updateWhiteMoney(targetAdmin.id, currentBalance + qty);
        }
      } else {
        // Setor Barang ke Brankas: Stok bertambah!
        const match = detailsStr.match(/\((\d+)x\)/);
        const physicalQty = Number(tx.itemQty || match?.[1]) || 1;
        const cleanName = detailsStr
          .replace(/^(setoran|penarikan)\s*(barang\s*)?[-–—:]\s*/i, '')
          .replace(/\(\d+x\)/g, '')
          .trim()
          .toLowerCase();

        let curItem = tx.selectedItemId ? items.find(i => i.id === tx.selectedItemId || String(i.id) === String(tx.selectedItemId)) : null;
        if (!curItem) {
          curItem = items.find(i => (i.name || '').trim().toLowerCase() === cleanName);
        }
        if (!curItem) {
          curItem = items.find(i => {
            const iName = (i.name || '').trim().toLowerCase();
            return iName && (cleanName.includes(iName) || iName.includes(cleanName));
          });
        }

        if (curItem) {
          let currentStock = Number(curItem.stock) || 0;
          if (isSupabaseConfigured) {
            try {
              let { data: suItem } = await supabase.from('items').select('stock').eq('id', curItem.id).maybeSingle();
              if (!suItem && curItem.name) {
                const res = await supabase.from('items').select('stock').ilike('name', curItem.name).maybeSingle();
                suItem = res.data;
              }
              if (suItem && typeof suItem.stock === 'number') {
                currentStock = Number(suItem.stock);
              }
            } catch (e) {
              console.warn("Fetch fresh stock in deposit err:", e);
            }
          }
          const newStock = currentStock + physicalQty;
          await updateItemStock(curItem.id, newStock);
        }
      }
    }

    // 3. Eksekusi Mutasi Withdraw Ledger
    if (tx.type === 'WITHDRAW') {
      const qty = Number(tx.amount || tx.totalPrice) || 0;

      if (isRedTx) {
        // Tarik Kas Uang Merah
        let cur = Number(gangStats?.dirtyMoney) || 0;
        if (isSupabaseConfigured) {
          try {
            const { data: suStats } = await supabase.from('gang_stats').select('dirty_money').eq('id', 'main').maybeSingle();
            if (suStats && typeof suStats.dirty_money === 'number') {
              cur = Number(suStats.dirty_money);
            }
          } catch (e) {}
        }
        await updateDirtyMoney(Math.max(0, cur - qty));
      } else if (isWhiteTx) {
        // Tarik Uang Putih: Rekening Kas Admin yang dipilih BERKURANG!
        const explicitId = tx.targetAdminId || (tx.note || '').match(/\[id:([^\]]+)\]/)?.[1]?.trim();
        let targetAdmin = explicitId
          ? users.find(u => u.id === explicitId || (u.username || '').replace('@', '').toLowerCase() === explicitId.replace('@', '').toLowerCase())
          : null;

        if (!targetAdmin) {
          const combinedText = `${tx.details || ''} ${tx.note || ''}`;
          const rekAdminMatch = combinedText.match(/Rek:\s*@?([^\)\,\-\|]+)/i)?.[1]?.trim() ||
                                combinedText.match(/\(@?([^\)\,\-\|]+)\)/i)?.[1]?.trim() ||
                                combinedText.match(/@(\w+)/)?.[1];
          if (rekAdminMatch) {
            const clean = rekAdminMatch.toLowerCase();
            targetAdmin = users.find(u => 
              (u.username || '').replace('@', '').toLowerCase() === clean ||
              (u.icName || '').toLowerCase() === clean ||
              u.id === rekAdminMatch
            );
          }
        }

        if (!targetAdmin) {
          targetAdmin = admins.find(a => a.status === 'approved') || admins[0] || dbUser;
        }

        if (targetAdmin) {
          let currentBalance = Number(targetAdmin.whiteMoney) || 0;
          if (isSupabaseConfigured) {
            try {
              let suUser = null;
              if (targetAdmin.id) {
                const res = await supabase.from('users').select('id, username, white_money').eq('id', targetAdmin.id).maybeSingle();
                if (res?.data) suUser = res.data;
              }
              if (!suUser && targetAdmin.username) {
                const cleanU = targetAdmin.username.replace('@', '');
                const res = await supabase.from('users').select('id, username, white_money').ilike('username', cleanU).maybeSingle();
                if (res?.data) suUser = res.data;
              }
              if (!suUser && (targetAdmin.icName || targetAdmin.username)) {
                const cleanN = targetAdmin.icName || targetAdmin.username.replace('@', '');
                const res = await supabase.from('users').select('id, username, white_money').ilike('ic_name', cleanN).maybeSingle();
                if (res?.data) suUser = res.data;
              }
              if (suUser && typeof suUser.white_money === 'number') {
                currentBalance = Number(suUser.white_money);
              }
            } catch (e) {
              console.warn("Fetch fresh white_money in withdraw err:", e);
            }
          }
          await updateWhiteMoney(targetAdmin.id, Math.max(0, currentBalance - qty));
        }
      } else {
        // Tarik Barang dari Brankas: Stok berkurang!
        const match = detailsStr.match(/\((\d+)x\)/);
        const physicalQty = Number(tx.itemQty || match?.[1]) || 1;
        const cleanName = detailsStr
          .replace(/^(setoran|penarikan)\s*(barang\s*)?[-–—:]\s*/i, '')
          .replace(/\(\d+x\)/g, '')
          .trim()
          .toLowerCase();

        let curItem = tx.selectedItemId ? items.find(i => i.id === tx.selectedItemId || String(i.id) === String(tx.selectedItemId)) : null;
        if (!curItem) {
          curItem = items.find(i => (i.name || '').trim().toLowerCase() === cleanName);
        }
        if (!curItem) {
          curItem = items.find(i => {
            const iName = (i.name || '').trim().toLowerCase();
            return iName && (cleanName.includes(iName) || iName.includes(cleanName));
          });
        }

        if (curItem) {
          let currentStock = Number(curItem.stock) || 0;
          if (isSupabaseConfigured) {
            try {
              let { data: suItem } = await supabase.from('items').select('stock').eq('id', curItem.id).maybeSingle();
              if (!suItem && curItem.name) {
                const res = await supabase.from('items').select('stock').ilike('name', curItem.name).maybeSingle();
                suItem = res.data;
              }
              if (suItem && typeof suItem.stock === 'number') {
                currentStock = Number(suItem.stock);
              }
            } catch (e) {
              console.warn("Fetch fresh stock in withdraw err:", e);
            }
          }
          const newStock = Math.max(0, currentStock - physicalQty);
          await updateItemStock(curItem.id, newStock);
        }
      }
    }

    const now = Date.now();
    // Update status transaksi ke APPROVED dan posisikan di waktu ACC terbaru
    setTransactions(prev => {
      const updated = prev.map(t => t.id === txId ? { 
        ...t, 
        status: 'approved' as const, 
        validatedBy: adminName, 
        validatedAt: new Date(now).toISOString(),
        createdAtMs: now,
        timestamp: new Date(now).toISOString()
      } : t);
      updated.sort((a, b) => {
        const diff = getTxMillis(b) - getTxMillis(a);
        if (diff !== 0) return diff;
        return (b.id || '').localeCompare(a.id || '');
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_transactions', JSON.stringify(updated.slice(0, 100)));
        } catch (e) {}
      }
      return updated;
    });

    updateDoc(doc(db, TX_PATH, txId), {
      status: 'approved',
      validatedBy: adminName,
      validatedAt: serverTimestamp(),
      createdAtMs: now,
      timestamp: serverTimestamp()
    }).catch(() => {});

    if (isSupabaseConfigured) {
      safeSupabase(
        supabase.from('transactions').update({
          status: 'approved',
          created_at_ms: now
        }).eq('id', txId)
      );
    }

    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_tx_status', txId, status: 'approved', validatedBy: adminName })
      }).catch(() => {});
    } catch (e) {}
  };

  const rejectTransaction = async (txId: string) => {
    const adminName = dbUser?.username || 'admin';
    setTransactions(prev => {
      const updated = prev.map(t => t.id === txId ? { ...t, status: 'rejected' as const, validatedBy: adminName, validatedAt: new Date().toISOString() } : t);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_transactions', JSON.stringify(updated.slice(0, 100)));
        } catch (e) {}
      }
      return updated;
    });

    updateDoc(doc(db, TX_PATH, txId), {
      status: 'rejected',
      validatedBy: adminName,
      validatedAt: serverTimestamp()
    }).catch(() => {});

    if (isSupabaseConfigured) {
      safeSupabase(
        supabase.from('transactions').update({
          status: 'rejected',
          rejected_by: adminName
        }).eq('id', txId)
      );
    }

    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_tx_status', txId, status: 'rejected', validatedBy: adminName })
      }).catch(() => {});
    } catch (e) {}
  };

  const updateItemStock = async (itemId: string, newStock: number) => {
    const updatedStock = Math.max(0, Math.round(Number(newStock) || 0));
    const targetItem = items.find(i => i.id === itemId || (i.name && itemId && i.name.toLowerCase() === itemId.toLowerCase()));
    const actualId = targetItem?.id || itemId;
    const itemName = targetItem?.name || '';

    setItems(prev => {
      const updated = prev.map(item => 
        (item.id === actualId || (itemName && item.name.toLowerCase() === itemName.toLowerCase())) 
          ? { ...item, stock: updatedStock } 
          : item
      );
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_items', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    updateDoc(doc(db, ITEMS_PATH, actualId), { stock: updatedStock }).catch(() => {});

    if (isSupabaseConfigured) {
      try {
        if (actualId) {
          await supabase.from('items').update({ stock: updatedStock }).eq('id', actualId);
        }
        if (itemName) {
          await supabase.from('items').update({ stock: updatedStock }).ilike('name', itemName);
        }
      } catch (err) {
        console.warn("Supabase updateItemStock err:", err);
      }
    }

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_item_stock', itemId: actualId, newStock: updatedStock })
      });
    } catch (e) {}
  };

  const updateItemImage = (itemId: string, newImage: string) => {
    setItems(prev => {
      const updated = prev.map(item => item.id === itemId ? { ...item, image: newImage } : item);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_items', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    updateDoc(doc(db, ITEMS_PATH, itemId), { image: newImage }).catch(() => {});

    if (isSupabaseConfigured) {
      safeSupabase(supabase.from('items').update({ image: newImage }).eq('id', itemId));
    }

    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_item_image', itemId, image: newImage })
      }).catch(() => {});
    } catch (e) {}
  };

  const addNewItem = async (data: Omit<Item, 'id'>): Promise<string> => {
    const newDocRef = doc(collection(db, ITEMS_PATH));
    const docId = newDocRef.id;
    const newItem: Item = {
      id: docId,
      ...data,
      stock: Number(data.stock) || 0,
      price: Number(data.price) || 5000,
      inShop: data.inShop ?? true
    };

    setItems(prev => {
      const updated = [newItem, ...prev];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_items', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    try {
      await setDoc(newDocRef, newItem);
    } catch (err) {
      console.warn("Firestore addItem error:", err);
    }

    if (isSupabaseConfigured) {
      safeSupabase(
        supabase.from('items').upsert({
          id: docId,
          name: newItem.name,
          category: newItem.category,
          vault: newItem.vault,
          stock: newItem.stock,
          in_shop: Boolean(newItem.inShop),
          price: newItem.price,
          image: newItem.image || ''
        })
      );
    }

    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_item', item: newItem })
      }).catch(() => {});
    } catch (e) {}

    return docId;
  };

  const editItem = async (itemId: string, updates: Partial<Item>): Promise<void> => {
    setItems(prev => {
      const updated = prev.map(item => item.id === itemId ? { ...item, ...updates } : item);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_items', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    try {
      updateDoc(doc(db, ITEMS_PATH, itemId), { ...updates }).catch(() => {});
    } catch (e) {}

    if (isSupabaseConfigured) {
      safeSupabase(
        supabase.from('items').update({
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.category ? { category: updates.category } : {}),
          ...(updates.vault ? { vault: updates.vault } : {}),
          ...(updates.stock !== undefined ? { stock: Number(updates.stock) } : {}),
          ...(updates.price !== undefined ? { price: Number(updates.price) } : {}),
          ...(updates.inShop !== undefined ? { in_shop: Boolean(updates.inShop) } : {}),
          ...(updates.image !== undefined ? { image: updates.image } : {})
        }).eq('id', itemId)
      );
    }

    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit_item', itemId, updates })
      }).catch(() => {});
    } catch (e) {}
  };

  const deleteItem = async (itemId: string): Promise<void> => {
    setItems(prev => {
      const updated = prev.filter(item => item.id !== itemId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_items', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    try {
      deleteDoc(doc(db, ITEMS_PATH, itemId)).catch(() => {});
    } catch (e) {}

    if (isSupabaseConfigured) {
      safeSupabase(supabase.from('items').delete().eq('id', itemId));
    }

    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_item', itemId })
      }).catch(() => {});
    } catch (e) {}
  };

  const updateShopSettings = async (shopData: Record<string, { inShop: boolean; price: number }>) => {
    setItems(prev => {
      const updated = prev.map(item => {
        if (shopData[item.id]) {
          return {
            ...item,
            inShop: Boolean(shopData[item.id].inShop),
            price: Number(shopData[item.id].price) || 0
          };
        }
        return item;
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_items', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    for (const itemId of Object.keys(shopData)) {
      const updates = shopData[itemId];
      updateDoc(doc(db, ITEMS_PATH, itemId), {
        inShop: Boolean(updates.inShop),
        price: Number(updates.price) || 0
      }).catch(() => {});
      if (isSupabaseConfigured) {
        safeSupabase(
          supabase.from('items').update({
            in_shop: Boolean(updates.inShop),
            price: Number(updates.price) || 0
          }).eq('id', itemId)
        );
      }
    }

    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_shop', shopData })
      }).catch(() => {});
    } catch (e) {}
  };

  const updateUserStatus = async (userId: string, status: 'approved' | 'rejected') => {
    setUsers(prev => {
      const updated = prev.map(u => (u.id === userId || (u.username && u.username.toLowerCase() === String(userId).toLowerCase())) ? { ...u, status } : u);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_all_users', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    if (dbUser?.id === userId || (dbUser?.username && dbUser.username.toLowerCase() === String(userId).toLowerCase())) {
      setDbUser(prev => prev ? ({ ...prev, status }) : null);
    }

    // 1. Eksekusi lokal sync backend terlebih dahulu secara instan
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', userId, status })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('gang_all_users', JSON.stringify(data.users));
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    try {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', userId, status })
      }).catch(() => {});
    } catch (e) {}

    // 2. Background Firestore & Supabase (non-blocking)
    updateDoc(doc(db, USERS_PATH, userId), { status }).catch(() => {});
    if (isSupabaseConfigured) {
      safeSupabase(supabase.from('users').update({ status }).eq('id', userId));
      safeSupabase(supabase.from('users').update({ status }).eq('username', userId));
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    setUsers(prev => {
      const updated = prev.map(u => (u.id === userId || (u.username && u.username.toLowerCase() === String(userId).toLowerCase())) ? { ...u, role: role as 'admin' | 'member' } : u);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_all_users', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    if (dbUser?.id === userId || (dbUser?.username && dbUser.username.toLowerCase() === String(userId).toLowerCase())) {
      const updatedSelf = { ...dbUser, role: role as 'admin' | 'member' };
      setDbUser(updatedSelf);
      if (typeof window !== 'undefined') {
        localStorage.setItem('gang_active_user', JSON.stringify(updatedSelf));
      }
    }

    // 1. Eksekusi lokal sync backend terlebih dahulu secara instan
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', userId, role })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('gang_all_users', JSON.stringify(data.users));
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    try {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', userId, role })
      }).catch(() => {});
    } catch (e) {}

    // 2. Background Firestore & Supabase (non-blocking)
    updateDoc(doc(db, USERS_PATH, userId), { role }).catch(() => {});
    if (isSupabaseConfigured) {
      safeSupabase(supabase.from('users').update({ role }).eq('id', userId));
      safeSupabase(supabase.from('users').update({ role }).eq('username', userId));
    }
  };

  const updateDirtyMoney = async (newTotal: number) => {
    const finalAmount = Math.max(0, Math.round(Number(newTotal) || 0));
    setGangStats({ dirtyMoney: finalAmount });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gang_stats', JSON.stringify({ dirtyMoney: finalAmount }));
      } catch (e) {}
    }
    updateDoc(doc(db, STATS_PATH, 'main'), { dirtyMoney: finalAmount }).catch(() => {});

    if (isSupabaseConfigured) {
      try {
        await supabase.from('gang_stats').upsert({ id: 'main', dirty_money: finalAmount });
      } catch (err) {
        console.warn("Supabase updateDirtyMoney err:", err);
      }
    }

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_dirty_money', dirtyMoney: finalAmount })
      });
    } catch (e) {}
  };

  const updateWhiteMoney = async (userId: string, newTotal: number) => {
    const cleanId = (userId || '').trim();
    const finalAmount = Math.max(0, Math.round(Number(newTotal) || 0));

    const targetUser = users.find(u => 
      (u.id && u.id === cleanId) || 
      (u.username && u.username.replace('@', '').toLowerCase() === cleanId.replace('@', '').toLowerCase()) ||
      (u.icName && u.icName.toLowerCase() === cleanId.toLowerCase())
    ) || (dbUser && (
      dbUser.id === cleanId || 
      dbUser.username.replace('@', '').toLowerCase() === cleanId.replace('@', '').toLowerCase() ||
      (dbUser.icName && dbUser.icName.toLowerCase() === cleanId.toLowerCase())
    ) ? dbUser : null);

    const actualId = targetUser?.id || cleanId;
    const actualUsername = (targetUser?.username || cleanId).replace('@', '');
    const actualIcName = targetUser?.icName || '';

    if (dbUser && (
      dbUser.id === actualId || 
      dbUser.username.replace('@', '').toLowerCase() === actualUsername.toLowerCase() ||
      (actualIcName && dbUser.icName && dbUser.icName.toLowerCase() === actualIcName.toLowerCase()) ||
      (targetUser && dbUser.id === targetUser.id)
    )) {
      setDbUser(prev => prev ? ({ ...prev, whiteMoney: finalAmount }) : null);
      if (typeof window !== 'undefined') {
        try {
          const current = localStorage.getItem('gang_active_user');
          if (current) {
            const parsed = JSON.parse(current);
            parsed.whiteMoney = finalAmount;
            localStorage.setItem('gang_active_user', JSON.stringify(parsed));
          }
        } catch (e) {}
      }
    }

    setUsers(prev => {
      const next = prev.map(u => 
        (u.id === actualId || 
         (u.username && u.username.replace('@', '').toLowerCase() === actualUsername.toLowerCase()) ||
         (actualIcName && u.icName && u.icName.toLowerCase() === actualIcName.toLowerCase()))
          ? { ...u, whiteMoney: finalAmount } 
          : u
      );
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gang_all_users', JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    if (actualId) {
      updateDoc(doc(db, USERS_PATH, actualId), { whiteMoney: finalAmount }).catch(() => {});

      if (isSupabaseConfigured) {
        try {
          if (actualId) {
            await supabase.from('users').update({ white_money: finalAmount }).eq('id', actualId);
          }
          if (actualUsername) {
            await supabase.from('users').update({ white_money: finalAmount }).ilike('username', actualUsername);
            await supabase.from('users').update({ white_money: finalAmount }).ilike('username', `@${actualUsername}`);
          }
          if (actualIcName) {
            await supabase.from('users').update({ white_money: finalAmount }).ilike('ic_name', actualIcName);
          }
        } catch (err) {
          console.warn("Supabase updateWhiteMoney err:", err);
        }
      }

      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_white_money', userId: actualId, whiteMoney: finalAmount })
        });
      } catch (e) {}
    }
  };

  const activeUser = users.find(u => 
    (u.username && dbUser?.username && u.username.toLowerCase() === dbUser.username.replace('@', '').toLowerCase()) ||
    (u.id && dbUser?.id && u.id === dbUser.id)
  ) || dbUser;

  const currentRole = activeUser?.role || dbUser?.role || 'member';
  const currentStatus = activeUser?.status || dbUser?.status || 'approved';
  const isAdmin = currentRole === 'admin' && currentStatus === 'approved';
  const effectiveDbUser = dbUser ? { 
    ...dbUser, 
    role: currentRole, 
    status: currentStatus, 
    whiteMoney: activeUser?.whiteMoney ?? dbUser.whiteMoney 
  } : null;

  const admins = users.filter(u => u.role === 'admin' && u.status === 'approved');
  if (admins.length === 0 && effectiveDbUser?.role === 'admin') admins.push(effectiveDbUser);

  return (
    <GangContext.Provider
      value={{
        user,
        dbUser: effectiveDbUser,
        authLoading,
        users: users.length > 0 ? users : [DEFAULT_ADMIN_ACCOUNT],
        admins: admins.length > 0 ? admins : [DEFAULT_ADMIN_ACCOUNT],
        isAdmin: !!isAdmin,
        items,
        transactions,
        gangStats,
        handleLogin,
        handleRegister,
        handleLogout,
        addTransaction,
        approveTransaction,
        rejectTransaction,
        updateItemStock,
        updateItemImage,
        addNewItem,
        editItem,
        deleteItem,
        updateShopSettings,
        updateUserStatus,
        updateUserRole,
        updateDirtyMoney,
        updateWhiteMoney
      }}
    >
      {children}
    </GangContext.Provider>
  );
}

export function useGang() {
  const context = useContext(GangContext);
  if (!context) {
    throw new Error('useGang must be used within a GangProvider');
  }
  return context;
}
