import { app } from '../index.js';
import { initDb } from '../db.js';

// Inisialisasi database (migrasi + seed) cukup sekali per cold start.
let readyPromise = null;

function ensureDb() {
  if (!readyPromise) readyPromise = initDb();
  return readyPromise;
}

// Serverless handler untuk Vercel. Semua request diteruskan ke Express app.
export default async function handler(req, res) {
  try {
    await ensureDb();
  } catch (err) {
    console.error('Gagal menginisialisasi database Turso:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Terjadi kesalahan pada server' }));
    return;
  }
  return app(req, res);
}
