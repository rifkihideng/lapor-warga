import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';

const SALT_ROUNDS = 12;
// Wajib diatur lewat environment variable (server/.env). Tanpa secret acak yang kuat,
// penyerang bisa memalsukan token JWT (termasuk eskalasi role).
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET belum diatur. Tambahkan JWT_SECRET (acak & kuat) ke server/.env');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function readUserFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    const rows = (await db.execute('SELECT id, username, role, full_name FROM users WHERE id = ?', [payload.sub])).rows;
    return rows[0] || null;
  } catch {
    return null;
  }
}

// Menandai pengguna bila token valid, tetapi tidak menolak request tanpa token
export function optionalAuth(req, res, next) {
  readUserFromRequest(req)
    .then((user) => {
      req.user = user || null;
      next();
    })
    .catch(() => {
      req.user = null;
      next();
    });
}

// Wajib login
export function authenticate(req, res, next) {
  readUserFromRequest(req)
    .then((user) => {
      if (!user) return res.status(401).json({ error: 'Autentikasi diperlukan' });
      req.user = user;
      next();
    })
    .catch(() => res.status(401).json({ error: 'Autentikasi diperlukan' }));
}

// Wajib role petugas (admin juga diperbolehkan — admin adalah level di atas petugas)
export function requirePetugas(req, res, next) {
  if (!req.user || (req.user.role !== 'petugas' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Akses khusus petugas' });
  }
  next();
}

// Wajib role admin (khusus kelola akun petugas & laporan kinerja)
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus admin' });
  }
  next();
}
