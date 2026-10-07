import './env.js';
import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import multer from 'multer';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import db, { initDb } from './db.js';
import geohash from 'ngeohash';
import { put } from '@vercel/blob';
import {
  createReportSchema,
  commentSchema,
  statusUpdateSchema,
  listQuerySchema,
  registerSchema,
  loginSchema,
  responseSchema,
  ratingSchema,
  assignSchema,
  updatePetugasSchema,
  resetPasswordSchema
} from './validate.js';
import {
  authenticate,
  optionalAuth,
  requirePetugas,
  requireAdmin,
  hashPassword,
  verifyPassword,
  signToken
} from './auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
try {
  mkdirSync(uploadsDir, { recursive: true });
} catch {
  // Vercel: filesystem read-only — foto disimpan ke Vercel Blob, bukan ke folder lokal.
}

const app = express();
const PORT = process.env.PORT || 3001;

// Di belakang reverse proxy (Render/Railway/Vercel/Nginx), percayai header X-Forwarded-*
// agar req.ip, req.protocol, dan req.secure akurat. Atur lewat TRUST_PROXY:
//   - kosong/tidak diset → tidak percaya proxy (aman untuk dev lokal)
//   - "1" → percaya 1 hop proxy (umum di Render/Railway)
//   - angka lain / IP / subnet → sesuai kebutuhan
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === 'true') {
  app.set('trust proxy', true);
} else if (trustProxy && trustProxy !== 'false') {
  const asNumber = Number(trustProxy);
  app.set('trust proxy', Number.isInteger(asNumber) ? asNumber : trustProxy);
}

const ALLOWED_EXT = {
  '.jpg': '.jpg',
  '.jpeg': '.jpg',
  '.png': '.png',
  '.webp': '.webp',
  '.gif': '.gif'
};

const BLOB_PATH_PREFIX = 'laporan';

function photoFilename(originalname) {
  const ext = ALLOWED_EXT[path.extname(originalname).toLowerCase()] || '.jpg';
  return `photo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
}

// Simpan foto: ke Vercel Blob bila BLOB_READ_WRITE_TOKEN tersedia (produksi),
// selain itu ke folder uploads/ lokal (development).
async function savePhoto(file) {
  const name = photoFilename(file.originalname);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { url } = await put(`${BLOB_PATH_PREFIX}/${name}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype
    });
    return url;
  }
  await writeFile(path.join(uploadsDir, name), file.buffer);
  return name;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Format gambar tidak didukung (gunakan JPG, PNG, WebP, atau GIF)'));
  }
});

app.use(helmet());

// Batasi CORS hanya ke origin yang diizinkan (daftar dipisah koma lewat CORS_ORIGIN)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan, coba lagi nanti' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan masuk, coba lagi nanti' }
});
app.use('/api', apiLimiter);

// Rate limit per pengguna (key: id user bila login, selain itu alamat IP)
const userKeyGenerator = (req) => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip));
const createReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  message: { error: 'Terlalu banyak laporan dalam satu jam, coba lagi nanti' }
});
const commentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  message: { error: 'Terlalu banyak komentar, coba lagi nanti' }
});
const upvoteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  message: { error: 'Terlalu banyak dukungan, coba lagi nanti' }
});

// Jarak antar dua titik koordinat dalam kilometer (rumus Haversine)
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GEOHASH_PRECISION = 7; // presisi tersimpan: ~153 m

// Pilih presisi geohash untuk pre-filter berdasarkan radius (km).
// Sel 3x3 pada presisi ini dijamin menutupi lingkaran radius yang diminta.
function geohashPrecisionForRadius(radiusKm) {
  if (radiusKm <= 0.15) return 7;
  if (radiusKm <= 1.2) return 6;
  if (radiusKm <= 4.9) return 5;
  if (radiusKm <= 39) return 4;
  return 0; // radius terlalu besar → lewati pre-filter
}

// Sel geohash (pusat + 8 tetangga) pada presisi tertentu untuk titik koordinat
function geohashCells(lat, lng, precision) {
  const center = geohash.encode(lat, lng, precision);
  return [center, ...geohash.neighbors(center)];
}

// Cari laporan serupa (kategori sama + dalam radius) untuk deteksi duplikat
async function findDuplicates({ category, lat, lng, radiusKm = 0.5 }) {
  const precision = geohashPrecisionForRadius(radiusKm);
  let sql = "SELECT id, title, category, location, status, created_at, latitude, longitude FROM reports WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status != 'ditolak' AND deleted_at IS NULL";
  const params = [];
  if (category && category !== 'Semua') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (precision > 0) {
    const cells = geohashCells(lat, lng, precision);
    const cond = cells.map(() => '(geohash >= ? AND geohash < ?)').join(' OR ');
    sql += ` AND (${cond})`;
    params.push(...cells.flatMap((c) => [c, `${c}{`]));
  }
  const rows = (await db.execute(sql, params)).rows;
  return rows
    .map((r) => ({ ...r, distance_km: haversineKm(lat, lng, r.latitude, r.longitude) }))
    .filter((r) => r.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}

// Lampirkan foto & jumlah komentar pada satu laporan
async function withExtras(report) {
  const photos = (await db.execute('SELECT filename FROM report_photos WHERE report_id = ? ORDER BY id', [report.id])).rows
    .map((p) => (/^https?:\/\//.test(p.filename) ? p.filename : `/uploads/${p.filename}`));
  const comment_count = Number((await db.execute('SELECT COUNT(*) AS c FROM report_comments WHERE report_id = ?', [report.id])).rows[0].c);
  let assigned_to_name = null;
  if (report.assigned_to) {
    const u = (await db.execute('SELECT full_name, username FROM users WHERE id = ?', [report.assigned_to])).rows[0];
    if (u) assigned_to_name = u.full_name || u.username;
  }
  return { ...report, photos, comment_count, assigned_to_name };
}

// Catat aksi petugas ke audit log
async function logAudit(user, action, reportId = null, detail = '') {
  await db.execute('INSERT INTO audit_logs (user_id, username, action, report_id, detail) VALUES (?, ?, ?, ?, ?)', [
    user?.id || null,
    user?.username || null,
    action,
    reportId,
    detail
  ]);
}

// Cache in-memory untuk statistik (mengurangi beban query berulang)
let statsCache = { at: 0, data: null };
const STATS_TTL_MS = 60 * 1000;
function bustStatsCache() {
  statsCache = { at: 0, data: null };
}

// Ubah kata kunci pencarian menjadi query FTS5 (prefix per kata, digabung AND)
function ftsQuery(q) {
  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
  if (!terms.length) return null;
  return terms.map((t) => `${t}*`).join(' ');
}

// Escape nilai untuk CSV
function csvEscape(value, neutralizeFormula = false) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Cegah CSV/formula injection (sel yang diawali = + - @ dipaksa jadi teks)
  if (neutralizeFormula && /^[=+\-@\t]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Susun filter + FROM + ORDER BY untuk daftar laporan (dipakai daftar & ekspor)
function buildReportQuery({ category, status, q, sort, mine, userId, deleted = false, needsAction = false }) {
  const where = [deleted ? 'r.deleted_at IS NOT NULL' : 'r.deleted_at IS NULL'];
  const params = [];
  if (category && category !== 'Semua') {
    where.push('r.category = ?');
    params.push(category);
  }
  if (status && status !== 'Semua') {
    where.push('r.status = ?');
    params.push(status);
  }
  if (mine && userId != null) {
    where.push('r.user_id = ?');
    params.push(userId);
  }
  if (needsAction) {
    // Antrean: masih aktif tetapi belum ditanggapi atau belum ditugaskan
    where.push("r.status IN ('baru', 'diproses')");
    where.push("(r.official_response IS NULL OR r.official_response = '' OR r.assigned_to IS NULL)");
  }

  let from = 'reports r';
  const qText = (q || '').trim();
  if (qText) {
    const fq = ftsQuery(qText);
    if (fq) {
      from = 'reports r JOIN reports_fts ON reports_fts.rowid = r.id';
      where.push('reports_fts MATCH ?');
      params.push(fq);
    } else {
      where.push('(r.title LIKE ? OR r.description LIKE ? OR r.location LIKE ?)');
      const like = `%${qText}%`;
      params.push(like, like, like);
    }
  }

  let orderBy = 'ORDER BY r.id DESC';
  if (sort === 'upvotes') orderBy = 'ORDER BY r.upvotes DESC, r.id DESC';
  if (sort === 'oldest') orderBy = 'ORDER BY r.id ASC';
  if (needsAction) orderBy = 'ORDER BY r.id ASC';

  return { from, whereClause: `WHERE ${where.join(' AND ')}`, params, orderBy };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Rentang hari (YYYY-MM-DD) untuk tren. Default: 30 hari terakhir. Maksimal 366 hari.
function dayRangeKeys(fromDate, toDate) {
  const start = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date();
  if (!fromDate) start.setDate(start.getDate() - 29);
  const end = toDate ? new Date(`${toDate}T00:00:00`) : new Date();
  const keys = [];
  const d = new Date(start);
  while (d <= end && keys.length < 366) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    keys.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

app.get('/api/stats', async (req, res) => {
  const { from, to } = req.query;
  const fromDate = typeof from === 'string' && DATE_RE.test(from) ? from : null;
  const toDate = typeof to === 'string' && DATE_RE.test(to) ? to : null;
  if ((from !== undefined && !fromDate) || (to !== undefined && !toDate)) {
    return res.status(400).json({ error: 'Parameter from/to harus berformat YYYY-MM-DD' });
  }
  const hasRange = fromDate || toDate;

  // Cache hanya untuk statistik umum (tanpa filter rentang tanggal)
  if (!hasRange && statsCache.data && Date.now() - statsCache.at < STATS_TTL_MS) {
    return res.json(statsCache.data);
  }

  let dateWhere = '';
  const dateParams = [];
  if (fromDate) {
    dateWhere += ' AND date(r.created_at) >= ?';
    dateParams.push(fromDate);
  }
  if (toDate) {
    dateWhere += ' AND date(r.created_at) <= ?';
    dateParams.push(toDate);
  }

  const total = Number((await db.execute(`SELECT COUNT(*) AS c FROM reports r WHERE r.deleted_at IS NULL${dateWhere}`, dateParams)).rows[0].c);
  const byStatus = (await db.execute(`SELECT r.status, COUNT(*) AS c FROM reports r WHERE r.deleted_at IS NULL${dateWhere} GROUP BY r.status`, dateParams)).rows;
  const byCategory = (await db.execute(`SELECT r.category, COUNT(*) AS c FROM reports r WHERE r.deleted_at IS NULL${dateWhere} GROUP BY r.category`, dateParams)).rows;
  const statusCounts = { baru: 0, diproses: 0, selesai: 0, ditolak: 0 };
  for (const row of byStatus) statusCounts[row.status] = Number(row.c);

  // Tren laporan per hari dalam rentang yang diminta, isi hari kosong dengan 0
  const trendKeys = dayRangeKeys(fromDate, toDate);
  const trendRows = (
    await db.execute(
      `SELECT date(r.created_at) AS d, COUNT(*) AS c FROM reports r
       WHERE r.deleted_at IS NULL AND date(r.created_at) >= ? AND date(r.created_at) <= ?
       GROUP BY date(r.created_at) ORDER BY d`,
      [trendKeys[0], trendKeys[trendKeys.length - 1]]
    )
  ).rows;
  const byDate = {};
  for (const r of trendRows) byDate[r.d] = Number(r.c);
  const trend = trendKeys.map((key) => ({ date: key, count: byDate[key] || 0 }));

  const totalUpvotes = Number((await db.execute(`SELECT COALESCE(SUM(upvotes), 0) AS v FROM reports r WHERE r.deleted_at IS NULL${dateWhere}`, dateParams)).rows[0].v);
  const avgRating = Number((await db.execute(`SELECT COALESCE(AVG(rating), 0) AS v FROM reports r WHERE r.rating IS NOT NULL AND r.deleted_at IS NULL${dateWhere}`, dateParams)).rows[0].v);
  const rated = Number((await db.execute(`SELECT COUNT(*) AS v FROM reports r WHERE r.rating IS NOT NULL AND r.deleted_at IS NULL${dateWhere}`, dateParams)).rows[0].v);

  // SLA: rata-rata waktu penyelesaian (dibuat → selesai) dalam jam
  const slaRows = (
    await db.execute(
      `SELECT r.id, r.created_at, MIN(h.created_at) AS done_at
      FROM reports r
      JOIN report_status_history h ON h.report_id = r.id AND h.status = 'selesai'
      WHERE r.status = 'selesai' AND r.deleted_at IS NULL${dateWhere}
      GROUP BY r.id`,
      dateParams
    )
  ).rows;
  let resolvedCount = slaRows.length;
  let avgResolutionHours = 0;
  if (resolvedCount > 0) {
    let totalMs = 0;
    for (const r of slaRows) {
      const start = new Date(r.created_at).getTime();
      const end = new Date(r.done_at).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) totalMs += end - start;
    }
    avgResolutionHours = Math.round(totalMs / 1000 / 60 / 60 / resolvedCount);
  }

  const data = {
    total,
    statusCounts,
    byCategory,
    trend,
    totalUpvotes,
    avgRating,
    ratedCount: rated,
    resolvedCount,
    avgResolutionHours
  };
  if (!hasRange) statsCache = { at: Date.now(), data };
  res.json(data);
});

// ===== Autentikasi =====
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { username, password, full_name } = parsed.data;
    const exists = (await db.execute('SELECT id FROM users WHERE username = ?', [username])).rows[0];
    if (exists) return res.status(409).json({ error: 'Username sudah digunakan' });

    const password_hash = await hashPassword(password);
    const info = await db.execute(
      'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
      [username, password_hash, 'warga', full_name || null]
    );
    const user = (await db.execute('SELECT id, username, role, full_name FROM users WHERE id = ?', [Number(info.lastInsertRowid)])).rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mendaftarkan pengguna' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { username, password } = parsed.data;
    const user = (await db.execute('SELECT * FROM users WHERE username = ?', [username])).rows[0];
    if (!user) return res.status(401).json({ error: 'Username atau kata sandi salah' });
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Username atau kata sandi salah' });

    const safe = { id: user.id, username: user.username, role: user.role, full_name: user.full_name };
    res.json({ token: signToken(safe), user: safe });
  } catch (err) {
    res.status(500).json({ error: 'Gagal masuk' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/reports', optionalAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { page, limit, category, status, q, sort, lat, lng, radius } = parsed.data;

  if (req.query.mine === 'true' && !req.user) {
    return res.status(401).json({ error: 'Autentikasi diperlukan' });
  }

  // Melihat laporan terhapus (tempat sampah) hanya untuk petugas
  const showDeleted = req.query.deleted === 'true';
  if (showDeleted && req.user?.role !== 'petugas') {
    return res.status(403).json({ error: 'Akses khusus petugas' });
  }

  // Antrean laporan yang perlu tindakan — hanya untuk petugas
  const needsAction = req.query.needs_action === 'true';
  if (needsAction && req.user?.role !== 'petugas') {
    return res.status(403).json({ error: 'Akses khusus petugas' });
  }

  const { from, whereClause, params, orderBy } = buildReportQuery({
    category,
    status,
    q,
    sort,
    mine: req.query.mine === 'true',
    userId: req.user?.id,
    deleted: showDeleted,
    needsAction
  });

  const hasGeo = lat !== undefined && lng !== undefined && radius !== undefined;

  if (hasGeo) {
    // Pre-filter geohash: saring dulu dengan sel geohash (index), lalu hitung Haversine presisi.
    const precision = geohashPrecisionForRadius(radius);
    let geoClause = '';
    let geoParams = [];
    if (precision > 0) {
      const cells = geohashCells(lat, lng, precision);
      const cond = cells.map(() => '(r.geohash >= ? AND r.geohash < ?)').join(' OR ');
      geoClause = ` AND (${cond})`;
      geoParams = cells.flatMap((c) => [c, `${c}{`]);
    }

    const all = (await db.execute(`SELECT r.* FROM ${from} ${whereClause}${geoClause} ${orderBy}`, [...params, ...geoParams])).rows;
    const withDist = all
      .map((r) => ({
        ...r,
        distance_km: r.latitude == null ? null : haversineKm(lat, lng, r.latitude, r.longitude)
      }))
      .filter((r) => r.distance_km != null && r.distance_km <= radius)
      .sort((a, b) => a.distance_km - b.distance_km);

    const geoTotal = withDist.length;
    const geoTotalPages = Math.max(1, Math.ceil(geoTotal / limit));
    const geoOffset = (page - 1) * limit;
    return res.json({
      data: await Promise.all(withDist.slice(geoOffset, geoOffset + limit).map(withExtras)),
      pagination: {
        page,
        limit,
        total: geoTotal,
        totalPages: geoTotalPages,
        hasNext: page < geoTotalPages,
        hasPrev: page > 1
      }
    });
  }

  const total = Number((await db.execute(`SELECT COUNT(*) AS c FROM ${from} ${whereClause}`, params)).rows[0].c);
  const offset = (page - 1) * limit;
  const rows = (await db.execute(`SELECT r.* FROM ${from} ${whereClause} ${orderBy} LIMIT ? OFFSET ?`, [...params, limit, offset])).rows;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  res.json({
    data: await Promise.all(rows.map(withExtras)),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

app.get('/api/reports/export', authenticate, requirePetugas, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { category, status, q, sort } = parsed.data;
  const { from, whereClause, params, orderBy } = buildReportQuery({
    category,
    status,
    q,
    sort,
    mine: false,
    userId: null
  });

  const rows = (await db.execute(`SELECT r.* FROM ${from} ${whereClause} ${orderBy}`, params)).rows;

  const headers = [
    'id', 'title', 'category', 'description', 'location',
    'reporter_name', 'reporter_contact', 'is_anonymous', 'status',
    'upvotes', 'rating', 'latitude', 'longitude', 'created_at'
  ];
  // Kolom teks bebas yang bisa diisi pengguna → rawan formula injection
  const FORMULA_RISK_COLUMNS = new Set(['title', 'description', 'location', 'reporter_name', 'reporter_contact']);
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h], FORMULA_RISK_COLUMNS.has(h))).join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="laporan-warga.csv"');
  res.send(`\uFEFF${lines.join('\n')}`);
});

app.get('/api/reports/duplicates', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radius) || 0.5;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Parameter lat dan lng diperlukan' });
  }
  const category = req.query.category || null;
  const duplicates = await findDuplicates({ category, lat, lng, radiusKm });
  res.json({ duplicates, count: duplicates.length, radius: radiusKm });
});

app.get('/api/reports/:id', optionalAuth, async (req, res) => {
  const row = (await db.execute('SELECT * FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  const voted = req.user
    ? !!(await db.execute('SELECT id FROM report_votes WHERE report_id = ? AND user_id = ?', [row.id, req.user.id])).rows[0]
    : false;
  res.json({ ...(await withExtras(row)), voted });
});

app.get('/api/reports/:id/comments', async (req, res) => {
  const row = (await db.execute('SELECT id FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  const comments = (await db.execute('SELECT * FROM report_comments WHERE report_id = ? ORDER BY id DESC', [req.params.id])).rows;
  res.json({ data: comments, total: comments.length });
});

app.get('/api/reports/:id/history', async (req, res) => {
  const row = (await db.execute('SELECT id FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  const history = (await db.execute('SELECT * FROM report_status_history WHERE report_id = ? ORDER BY id DESC', [req.params.id])).rows;
  res.json({ data: history });
});

app.post('/api/reports', optionalAuth, createReportLimiter, upload.array('photos', 4), async (req, res) => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const d = parsed.data;
  const anonymous = d.is_anonymous;
  const name = anonymous ? null : d.reporter_name || req.user?.full_name || req.user?.username || null;
  const contact = anonymous ? null : d.reporter_contact || null;
  const userId = req.user?.id || null;
  const geo = d.latitude != null && d.longitude != null ? geohash.encode(d.latitude, d.longitude, GEOHASH_PRECISION) : null;

  const info = await db.execute(
    `INSERT INTO reports (title, category, description, location, reporter_name, reporter_contact, is_anonymous, status, upvotes, user_id, latitude, longitude, geohash)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'baru', 0, ?, ?, ?, ?)`,
    [d.title, d.category, d.description, d.location || null, name, contact, anonymous ? 1 : 0, userId, d.latitude, d.longitude, geo]
  );

  const id = Number(info.lastInsertRowid);
  if (req.files && req.files.length) {
    for (const f of req.files) {
      const ref = await savePhoto(f);
      await db.execute('INSERT INTO report_photos (report_id, filename) VALUES (?, ?)', [id, ref]);
    }
  }

  const created = (await db.execute('SELECT * FROM reports WHERE id = ?', [id])).rows[0];
  const duplicates =
    d.latitude != null && d.longitude != null
      ? (await findDuplicates({ category: d.category, lat: d.latitude, lng: d.longitude, radiusKm: 0.5 })).filter((x) => x.id !== id)
      : [];
  bustStatsCache();
  res.status(201).json({ ...(await withExtras(created)), duplicates });
});

app.post('/api/reports/:id/photos', authenticate, upload.array('photos', 4), async (req, res) => {
  const row = (await db.execute('SELECT id, user_id FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  const isOwner = row.user_id != null && row.user_id === req.user.id;
  const isOfficer = req.user.role === 'petugas' || req.user.role === 'admin';
  if (!isOwner && !isOfficer) {
    return res.status(403).json({ error: 'Anda tidak berhak menambah foto pada laporan ini' });
  }
  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: 'Tidak ada foto yang diunggah' });
  }
  for (const f of req.files) {
    const ref = await savePhoto(f);
    await db.execute('INSERT INTO report_photos (report_id, filename) VALUES (?, ?)', [req.params.id, ref]);
  }
  const updated = (await db.execute('SELECT * FROM reports WHERE id = ?', [req.params.id])).rows[0];
  res.status(201).json(await withExtras(updated));
});

app.post('/api/reports/:id/upvote', authenticate, upvoteLimiter, async (req, res) => {
  const row = (await db.execute('SELECT id, upvotes FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });

  const existing = (await db.execute('SELECT id FROM report_votes WHERE report_id = ? AND user_id = ?', [row.id, req.user.id])).rows[0];

  let voted;
  if (existing) {
    await db.execute('DELETE FROM report_votes WHERE id = ?', [existing.id]);
    await db.execute('UPDATE reports SET upvotes = upvotes - 1 WHERE id = ?', [row.id]);
    voted = false;
  } else {
    await db.execute('INSERT INTO report_votes (report_id, user_id) VALUES (?, ?)', [row.id, req.user.id]);
    await db.execute('UPDATE reports SET upvotes = upvotes + 1 WHERE id = ?', [row.id]);
    voted = true;
  }

  const updated = (await db.execute('SELECT * FROM reports WHERE id = ?', [row.id])).rows[0];
  bustStatsCache();
  res.json({ ...(await withExtras(updated)), voted });
});

// Hapus (soft delete) laporan — khusus petugas
app.delete('/api/reports/:id', authenticate, requirePetugas, async (req, res) => {
  const row = (await db.execute('SELECT id FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  await db.execute("UPDATE reports SET deleted_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime') WHERE id = ?", [row.id]);
  await logAudit(req.user, 'delete', row.id);
  bustStatsCache();
  res.json({ success: true, id: Number(row.id) });
});

// Pulihkan laporan yang dihapus — khusus petugas
app.patch('/api/reports/:id/restore', authenticate, requirePetugas, async (req, res) => {
  const row = (await db.execute('SELECT id FROM reports WHERE id = ?', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  await db.execute('UPDATE reports SET deleted_at = NULL WHERE id = ?', [row.id]);
  await logAudit(req.user, 'restore', row.id);
  bustStatsCache();
  const updated = (await db.execute('SELECT * FROM reports WHERE id = ?', [req.params.id])).rows[0];
  res.json(await withExtras(updated));
});

app.post('/api/reports/:id/comments', commentLimiter, async (req, res) => {
  const row = (await db.execute('SELECT id FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const info = await db.execute('INSERT INTO report_comments (report_id, author_name, body) VALUES (?, ?, ?)', [req.params.id, parsed.data.author_name, parsed.data.body]);
  const comment = (await db.execute('SELECT * FROM report_comments WHERE id = ?', [Number(info.lastInsertRowid)])).rows[0];
  res.status(201).json(comment);
});

app.patch('/api/reports/:id/status', authenticate, requirePetugas, async (req, res) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { status, note } = parsed.data;
  const changed_by = req.user.username;

  const row = (await db.execute('SELECT id FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });

  await db.execute('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id]);
  await db.execute('INSERT INTO report_status_history (report_id, status, note, changed_by) VALUES (?, ?, ?, ?)', [req.params.id, status, note, changed_by]);

  await logAudit(req.user, 'status', req.params.id, status);
  bustStatsCache();
  const updated = (await db.execute('SELECT * FROM reports WHERE id = ?', [req.params.id])).rows[0];
  res.json(await withExtras(updated));
});

// Daftar petugas (untuk penugasan & kelola admin)
app.get('/api/users/petugas', authenticate, requirePetugas, async (req, res) => {
  const rows = (await db.execute(`
      SELECT u.id, u.username, u.full_name,
        (SELECT COUNT(*) FROM reports r WHERE r.assigned_to = u.id AND r.deleted_at IS NULL) AS report_count
      FROM users u
      WHERE u.role = 'petugas'
      ORDER BY u.username
    `)).rows;
  res.json({ data: rows });
});

// Tambah akun petugas baru — khusus admin
app.post('/api/users/petugas', authenticate, requireAdmin, async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { username, password, full_name } = parsed.data;
    const exists = (await db.execute('SELECT id FROM users WHERE username = ?', [username])).rows[0];
    if (exists) return res.status(409).json({ error: 'Username sudah digunakan' });

    const password_hash = await hashPassword(password);
    const info = await db.execute(
      'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
      [username, password_hash, 'petugas', full_name || null]
    );
    const user = (await db.execute('SELECT id, username, role, full_name FROM users WHERE id = ?', [Number(info.lastInsertRowid)])).rows[0];
    await logAudit(req.user, 'create_petugas', null, username);
    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat petugas' });
  }
});

// Hapus akun petugas (laporan yang ditugaskan/dibuat olehnya dilepas terlebih dahulu) — khusus admin
app.delete('/api/users/petugas/:id', authenticate, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID petugas tidak valid' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri' });
  }
  const target = (await db.execute("SELECT id, username FROM users WHERE id = ? AND role = 'petugas'", [id])).rows[0];
  if (!target) return res.status(404).json({ error: 'Petugas tidak ditemukan' });

  try {
    await db.batch(
      [
        { sql: 'UPDATE reports SET assigned_to = NULL WHERE assigned_to = ?', args: [id] },
        { sql: 'UPDATE reports SET user_id = NULL WHERE user_id = ?', args: [id] },
        { sql: 'DELETE FROM users WHERE id = ?', args: [id] }
      ],
      'write'
    );
    await logAudit(req.user, 'delete_petugas', null, target.username);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus petugas' });
  }
});

// Ubah data petugas (username & nama lengkap) — khusus admin
app.patch('/api/users/petugas/:id', authenticate, requireAdmin, async (req, res) => {
  const parsed = updatePetugasSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const id = Number(req.params.id);
  const target = (await db.execute("SELECT id, username FROM users WHERE id = ? AND role = 'petugas'", [id])).rows[0];
  if (!target) return res.status(404).json({ error: 'Petugas tidak ditemukan' });

  const { username, full_name } = parsed.data;
  if (username) {
    const dup = (await db.execute('SELECT id FROM users WHERE username = ? AND id != ?', [username, id])).rows[0];
    if (dup) return res.status(409).json({ error: 'Username sudah digunakan' });
    await db.execute('UPDATE users SET username = ? WHERE id = ?', [username, id]);
  }
  if (full_name !== undefined) {
    await db.execute('UPDATE users SET full_name = ? WHERE id = ?', [full_name, id]);
  }
  await logAudit(req.user, 'update_petugas', null, username || target.username);
  res.json({ success: true, id });
});

// Reset kata sandi petugas — khusus admin
app.patch('/api/users/petugas/:id/password', authenticate, requireAdmin, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const id = Number(req.params.id);
  const target = (await db.execute("SELECT id, username FROM users WHERE id = ? AND role = 'petugas'", [id])).rows[0];
  if (!target) return res.status(404).json({ error: 'Petugas tidak ditemukan' });

  const password_hash = await hashPassword(parsed.data.password);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
  await logAudit(req.user, 'reset_password', null, target.username);
  res.json({ success: true, id });
});

// Tanggapan resmi petugas
app.patch('/api/reports/:id/response', authenticate, requirePetugas, async (req, res) => {
  const parsed = responseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const row = (await db.execute('SELECT id FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });

  await db.execute("UPDATE reports SET official_response = ?, official_responded_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime') WHERE id = ?", [parsed.data.response, req.params.id]);
  await logAudit(req.user, 'response', req.params.id);
  const updated = (await db.execute('SELECT * FROM reports WHERE id = ?', [req.params.id])).rows[0];
  res.json(await withExtras(updated));
});

// Rating kepuasan warga (hanya pelapor & laporan selesai)
app.post('/api/reports/:id/rating', authenticate, async (req, res) => {
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const report = (await db.execute('SELECT * FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!report) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  if (report.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Hanya pelapor yang dapat memberi rating' });
  }
  if (report.status !== 'selesai') {
    return res.status(400).json({ error: 'Laporan harus berstatus selesai untuk diberi rating' });
  }

  await db.execute("UPDATE reports SET rating = ?, rating_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime') WHERE id = ?", [parsed.data.rating, req.params.id]);
  bustStatsCache();
  const updated = (await db.execute('SELECT * FROM reports WHERE id = ?', [req.params.id])).rows[0];
  res.json(await withExtras(updated));
});

// Penugasan laporan ke petugas
app.patch('/api/reports/:id/assign', authenticate, requirePetugas, async (req, res) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const row = (await db.execute('SELECT id FROM reports WHERE id = ? AND deleted_at IS NULL', [req.params.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  const target = (await db.execute("SELECT id FROM users WHERE id = ? AND role = 'petugas'", [parsed.data.user_id])).rows[0];
  if (!target) return res.status(400).json({ error: 'Petugas tidak valid' });

  await db.execute("UPDATE reports SET assigned_to = ?, assigned_at = strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime') WHERE id = ?", [parsed.data.user_id, req.params.id]);
  await logAudit(req.user, 'assign', req.params.id, `petugas ${parsed.data.user_id}`);
  const updated = (await db.execute('SELECT * FROM reports WHERE id = ?', [req.params.id])).rows[0];
  res.json(await withExtras(updated));
});

// Riwayat audit aksi petugas
app.get('/api/audit-logs', authenticate, requirePetugas, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const logs = (await db.execute('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?', [limit])).rows;
  res.json({ data: logs, total: logs.length });
});

// Kinerja petugas: jumlah penugasan, selesai, dalam proses, dan rata-rata waktu penyelesaian — khusus admin
app.get('/api/officers/stats', authenticate, requireAdmin, async (req, res) => {
  const officers = (await db.execute("SELECT id, username, full_name FROM users WHERE role = 'petugas' ORDER BY username")).rows;

  const data = await Promise.all(
    officers.map(async (o) => {
      const assigned = Number((await db.execute('SELECT COUNT(*) AS c FROM reports WHERE assigned_to = ? AND deleted_at IS NULL', [o.id])).rows[0].c);
      const resolved = Number((await db.execute("SELECT COUNT(*) AS c FROM reports WHERE assigned_to = ? AND status = 'selesai' AND deleted_at IS NULL", [o.id])).rows[0].c);
      const inProgress = Number((await db.execute("SELECT COUNT(*) AS c FROM reports WHERE assigned_to = ? AND status IN ('baru', 'diproses') AND deleted_at IS NULL", [o.id])).rows[0].c);

      const slaRows = (
        await db.execute(
          `SELECT r.id, r.created_at, MIN(h.created_at) AS done_at
          FROM reports r
          JOIN report_status_history h ON h.report_id = r.id AND h.status = 'selesai'
          WHERE r.assigned_to = ? AND r.status = 'selesai' AND r.deleted_at IS NULL
          GROUP BY r.id`,
          [o.id]
        )
      ).rows;

      let avgResolutionHours = null;
      if (slaRows.length > 0) {
        let totalMs = 0;
        let n = 0;
        for (const r of slaRows) {
          const start = new Date(r.created_at).getTime();
          const end = new Date(r.done_at).getTime();
          if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
            totalMs += end - start;
            n += 1;
          }
        }
        if (n > 0) avgResolutionHours = Math.round(totalMs / 1000 / 60 / 60 / n);
      }

      return {
        id: o.id,
        username: o.username,
        full_name: o.full_name || o.username,
        assigned_count: assigned,
        resolved_count: resolved,
        in_progress_count: inProgress,
        avg_resolution_hours: avgResolutionHours
      };
    })
  );

  res.json({ data });
});

// Info dasar saat backend dibuka langsung lewat browser
app.get('/', (req, res) => {
  res.json({
    name: 'Portal Lapor Warga API',
    status: 'ok',
    message: 'Backend berjalan normal. Semua endpoint berada di bawah /api (contoh: /api/stats).'
  });
});

// Health check sederhana
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));

// Penanganan error (termasuk error dari multer)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran foto maksimal 5 MB'
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Maksimal 4 foto per laporan'
          : 'Kesalahan saat mengunggah file';
    return res.status(400).json({ error: message });
  }
  if (err) {
    console.error('Kesalahan server:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
  next();
});

export { app };
export default app;

// Jalankan sebagai server hanya ketika file ini dieksekusi langsung (dev lokal).
// Saat diimpor oleh serverless function Vercel (api/index.js), skip app.listen.
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Portal Lapor Warga API berjalan di http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Gagal menginisialisasi database Turso:', err);
      process.exit(1);
    });
}
