import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const usersFilePath = path.join(dataDir, 'users.json');
const itemsFilePath = path.join(dataDir, 'items.json');
const statsFilePath = path.join(dataDir, 'stats.json');
const txFilePath = path.join(dataDir, 'transactions.json');

function ensureDir() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (err) {}
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    ensureDir();
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
      } catch (e) {}
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const cleanRaw = raw.replace(/^\uFEFF/, '').trim();
    if (!cleanRaw) return fallback;
    return JSON.parse(cleanRaw);
  } catch (err) {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: any) {
  try {
    ensureDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {}
}

export async function GET() {
  const users = readJsonFile(usersFilePath, []);
  const items = readJsonFile(itemsFilePath, []);
  const stats = readJsonFile(statsFilePath, { dirtyMoney: 0 });
  const transactions = readJsonFile(txFilePath, []);

  return NextResponse.json({
    success: true,
    users,
    items,
    stats,
    transactions
  });
}

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      const text = await req.text();
      body = JSON.parse(text);
    }

    const { action } = body;

    // 1. Tambah Barang Baru
    if (action === 'add_item') {
      const currentItems = readJsonFile<any[]>(itemsFilePath, []);
      const newItem = body.item;
      const updated = [newItem, ...currentItems.filter(i => i.id !== newItem.id)];
      writeJsonFile(itemsFilePath, updated);
      return NextResponse.json({ success: true, items: updated });
    }

    // 1b. Edit Detail Barang
    if (action === 'edit_item') {
      const { itemId, updates } = body;
      const currentItems = readJsonFile<any[]>(itemsFilePath, []);
      const updated = currentItems.map(i => i.id === itemId ? { ...i, ...updates } : i);
      writeJsonFile(itemsFilePath, updated);
      return NextResponse.json({ success: true, items: updated });
    }

    // 1c. Hapus Barang Permanen
    if (action === 'delete_item') {
      const { itemId } = body;
      const currentItems = readJsonFile<any[]>(itemsFilePath, []);
      const updated = currentItems.filter(i => i.id !== itemId);
      writeJsonFile(itemsFilePath, updated);
      return NextResponse.json({ success: true, items: updated });
    }

    // 2. Update Stok Barang
    if (action === 'update_item_stock') {
      const { itemId, newStock } = body;
      const currentItems = readJsonFile<any[]>(itemsFilePath, []);
      const updated = currentItems.map(i => i.id === itemId ? { ...i, stock: Number(newStock) || 0 } : i);
      writeJsonFile(itemsFilePath, updated);
      return NextResponse.json({ success: true, items: updated });
    }

    // 3. Update Gambar Barang
    if (action === 'update_item_image') {
      const { itemId, image } = body;
      const currentItems = readJsonFile<any[]>(itemsFilePath, []);
      const updated = currentItems.map(i => i.id === itemId ? { ...i, image } : i);
      writeJsonFile(itemsFilePath, updated);
      return NextResponse.json({ success: true, items: updated });
    }

    // 4. Update Pengaturan Toko
    if (action === 'update_shop') {
      const { shopData } = body;
      const currentItems = readJsonFile<any[]>(itemsFilePath, []);
      const updated = currentItems.map(item => {
        if (shopData && shopData[item.id]) {
          return {
            ...item,
            inShop: Boolean(shopData[item.id].inShop),
            price: Number(shopData[item.id].price) || 0
          };
        }
        return item;
      });
      writeJsonFile(itemsFilePath, updated);
      return NextResponse.json({ success: true, items: updated });
    }

    // 5. Update Kas Uang Merah (Stats)
    if (action === 'update_dirty_money') {
      const { dirtyMoney } = body;
      const newStats = { dirtyMoney: Number(dirtyMoney) || 0 };
      writeJsonFile(statsFilePath, newStats);
      return NextResponse.json({ success: true, stats: newStats });
    }

    // 6. Update Saldo Uang Putih User
    if (action === 'update_white_money') {
      const { userId, whiteMoney } = body;
      const cleanTarget = String(userId || '').replace('@', '').toLowerCase();
      const currentUsers = readJsonFile<any[]>(usersFilePath, []);
      const updated = currentUsers.map((u: any) => {
        const uId = String(u.id || '').toLowerCase();
        const uName = String(u.username || '').replace('@', '').toLowerCase();
        const uIc = String(u.icName || u.ic_name || '').toLowerCase();
        if (uId === cleanTarget || uName === cleanTarget || (uIc && uIc === cleanTarget)) {
          return { ...u, whiteMoney: Number(whiteMoney) || 0 };
        }
        return u;
      });
      writeJsonFile(usersFilePath, updated);
      return NextResponse.json({ success: true, users: updated });
    }

    // 6.5. Update Role User (Admin <-> Member)
    if (action === 'update_role') {
      const { userId, role } = body;
      const currentUsers = readJsonFile<any[]>(usersFilePath, []);
      const updated = currentUsers.map((u: any) => 
        (u.id === userId || (u.username && u.username.toLowerCase() === String(userId).toLowerCase())) 
          ? { ...u, role } 
          : u
      );
      writeJsonFile(usersFilePath, updated);
      return NextResponse.json({ success: true, users: updated });
    }

    // 6.6. Update Status User (Approved / Rejected)
    if (action === 'update_status') {
      const { userId, status } = body;
      const currentUsers = readJsonFile<any[]>(usersFilePath, []);
      const updated = currentUsers.map((u: any) => 
        (u.id === userId || (u.username && u.username.toLowerCase() === String(userId).toLowerCase())) 
          ? { ...u, status } 
          : u
      );
      writeJsonFile(usersFilePath, updated);
      return NextResponse.json({ success: true, users: updated });
    }

    // 7. Tambah Transaksi Baru
    if (action === 'add_transaction') {
      const newTx = body.transaction;
      const currentTx = readJsonFile<any[]>(txFilePath, []);
      const updated = [newTx, ...currentTx.filter(t => t.id !== newTx.id)];
      writeJsonFile(txFilePath, updated);
      return NextResponse.json({ success: true, transactions: updated });
    }

    // 8. Update Status Transaksi (ACC / Tolak)
    if (action === 'update_tx_status') {
      const { txId, status, validatedBy } = body;
      const currentTx = readJsonFile<any[]>(txFilePath, []);
      const updated = currentTx.map(t => t.id === txId ? { ...t, status, validatedBy, validatedAt: new Date().toISOString() } : t);
      writeJsonFile(txFilePath, updated);
      return NextResponse.json({ success: true, transactions: updated });
    }

    // 9. Sync Batch Items (jika client mengunggah state lokal)
    if (action === 'sync_items') {
      const { items } = body;
      if (Array.isArray(items) && items.length > 0) {
        writeJsonFile(itemsFilePath, items);
        return NextResponse.json({ success: true, items });
      }
    }

    return NextResponse.json({ success: false, message: 'Aksi sync tidak dikenali' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/sync POST error:', err);
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
