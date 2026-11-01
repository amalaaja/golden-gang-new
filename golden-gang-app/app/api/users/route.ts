import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const usersFilePath = path.join(dataDir, 'users.json');

const INITIAL_DEFAULT_USERS: any[] = [];

function readUsersFromFile() {
  try {
    if (!fs.existsSync(dataDir)) {
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    }
    if (!fs.existsSync(usersFilePath)) {
      return [];
    }
    const raw = fs.readFileSync(usersFilePath, 'utf8');
    const cleanRaw = raw.replace(/^\uFEFF/, '').trim();
    if (!cleanRaw) return [];
    const parsed = JSON.parse(cleanRaw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

function writeUsersToFile(users: any[]) {
  try {
    if (!fs.existsSync(dataDir)) {
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    }
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing users file:', err);
  }
}

export async function GET() {
  const users = readUsersFromFile();
  return NextResponse.json({ success: true, users });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentUsers = readUsersFromFile();

    if (body.action === 'register') {
      const newUser = body.user;
      if (!newUser || !newUser.username) {
        return NextResponse.json({ success: false, message: 'Data user tidak valid' }, { status: 400 });
      }

      // Pastikan username unik
      const existing = currentUsers.find(
        (u: any) => u.username.toLowerCase() === newUser.username.toLowerCase()
      );
      if (existing) {
        return NextResponse.json({ success: false, message: 'Username sudah terdaftar' }, { status: 400 });
      }

      // Selalu simpan dengan status pending agar wajib di-ACC admin!
      const userToSave = {
        ...newUser,
        status: 'pending',
        joinedAt: new Date().toISOString()
      };

      currentUsers.push(userToSave);
      writeUsersToFile(currentUsers);
      return NextResponse.json({ success: true, users: currentUsers, user: userToSave });
    }

    if (body.action === 'update_status') {
      const { userId, status } = body;
      const updated = currentUsers.map((u: any) => 
        (u.id === userId || (u.username && u.username.toLowerCase() === String(userId).toLowerCase())) 
          ? { ...u, status } 
          : u
      );
      writeUsersToFile(updated);
      return NextResponse.json({ success: true, users: updated });
    }

    if (body.action === 'update_role') {
      const { userId, role } = body;
      const updated = currentUsers.map((u: any) => 
        (u.id === userId || (u.username && u.username.toLowerCase() === String(userId).toLowerCase())) 
          ? { ...u, role } 
          : u
      );
      writeUsersToFile(updated);
      return NextResponse.json({ success: true, users: updated });
    }

    return NextResponse.json({ success: false, message: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
