import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import geohash from 'ngeohash';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error('TURSO_DATABASE_URL belum diatur. Tambahkan URL database Turso ke server/.env');
}

const db = createClient({
  url,
  authToken: authToken || undefined
});

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    reporter_name TEXT,
    reporter_contact TEXT,
    is_anonymous INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'baru',
    upvotes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
  )`,

  `CREATE TABLE IF NOT EXISTS report_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS report_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    author_name TEXT NOT NULL DEFAULT 'Anonim',
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS report_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    changed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'warga',
    full_name TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
  )`,

  `CREATE TABLE IF NOT EXISTS report_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
    UNIQUE(report_id, user_id),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    report_id INTEGER,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
  )`
];

// Migrasi: tambah kolom baru pada reports bila belum ada
const reportMigrations = [
  ['user_id', 'ALTER TABLE reports ADD COLUMN user_id INTEGER REFERENCES users(id)'],
  ['latitude', 'ALTER TABLE reports ADD COLUMN latitude REAL'],
  ['longitude', 'ALTER TABLE reports ADD COLUMN longitude REAL'],
  ['official_response', 'ALTER TABLE reports ADD COLUMN official_response TEXT'],
  ['official_responded_at', 'ALTER TABLE reports ADD COLUMN official_responded_at TEXT'],
  ['rating', 'ALTER TABLE reports ADD COLUMN rating INTEGER'],
  ['rating_at', 'ALTER TABLE reports ADD COLUMN rating_at TEXT'],
  ['assigned_to', 'ALTER TABLE reports ADD COLUMN assigned_to INTEGER REFERENCES users(id)'],
  ['assigned_at', 'ALTER TABLE reports ADD COLUMN assigned_at TEXT'],
  ['geohash', 'ALTER TABLE reports ADD COLUMN geohash TEXT'],
  ['deleted_at', 'ALTER TABLE reports ADD COLUMN deleted_at TEXT']
];

// Indeks untuk mempercepat query (filter, pengurutan, join)
const indexStatements = [
  'CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)',
  'CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category)',
  'CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_reports_assigned_to ON reports(assigned_to)',
  'CREATE INDEX IF NOT EXISTS idx_reports_geohash ON reports(geohash)',
  'CREATE INDEX IF NOT EXISTS idx_photos_report_id ON report_photos(report_id)',
  'CREATE INDEX IF NOT EXISTS idx_comments_report_id ON report_comments(report_id)',
  'CREATE INDEX IF NOT EXISTS idx_history_report_id ON report_status_history(report_id)',
  'CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)'
];

// Full-text search (FTS5) untuk judul, deskripsi, dan lokasi laporan
const ftsStatements = [
  `CREATE VIRTUAL TABLE IF NOT EXISTS reports_fts USING fts5(
    title, description, location,
    content='reports', content_rowid='id'
  )`,

  `CREATE TRIGGER IF NOT EXISTS reports_fts_ai AFTER INSERT ON reports BEGIN
    INSERT INTO reports_fts(rowid, title, description, location)
    VALUES (new.id, new.title, new.description, new.location);
  END`,

  `CREATE TRIGGER IF NOT EXISTS reports_fts_ad AFTER DELETE ON reports BEGIN
    INSERT INTO reports_fts(reports_fts, rowid, title, description, location)
    VALUES ('delete', old.id, old.title, old.description, old.location);
  END`,

  `CREATE TRIGGER IF NOT EXISTS reports_fts_au AFTER UPDATE ON reports BEGIN
    INSERT INTO reports_fts(reports_fts, rowid, title, description, location)
    VALUES ('delete', old.id, old.title, old.description, old.location);
    INSERT INTO reports_fts(rowid, title, description, location)
    VALUES (new.id, new.title, new.description, new.location);
  END`
];

async function seedSamples() {
  const count = Number((await db.execute('SELECT COUNT(*) AS c FROM reports')).rows[0].c);
  if (count > 0) return;

  const samples = [
    ['Jalan berlubang di depan pasar', 'Infrastruktur', 'Lubang besar di Jalan Merdeka dekat pasar, membahayakan pengendara motor terutama malam hari.', 'Jalan Merdeka No. 12', 'Budi', '08123456789', 'diproses', 24, -6.1754, 106.8272, '-2 days'],
    ['Tumpukan sampah tidak diangkut', 'Kebersihan', 'Sampah menumpuk 5 hari di TPS RT 03, menimbulkan bau dan banyak lalat.', 'TPS RT 03/RW 02', 'Sari', '08571234567', 'baru', 15, -6.2088, 106.8456, '-1 day'],
    ['Lampu jalan mati total', 'Penerangan', 'Lampu jalan sepanjang 300 meter padam, rawan kecelakaan dan tindak kriminalitas.', 'Jl. Ahmad Yani', null, null, 'baru', 8, -6.2425, 106.8320, '-6 hours'],
    ['Banjir menggenangi perumahan', 'Banjir', 'Genangan setinggi 30 cm di perumahan setelah hujan deras, drainase tersumbat sampah.', 'Perumahan Griya Asri', 'Dewi', '0898123456', 'baru', 31, -6.2400, 106.8000, '-7 days']
  ];

  const stmts = samples.map(
    ([title, category, description, location, reporter_name, reporter_contact, status, upvotes, latitude, longitude, days]) => ({
      sql: `INSERT INTO reports (title, category, description, location, reporter_name, reporter_contact, status, upvotes, latitude, longitude, geohash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime', ?))`,
      args: [title, category, description, location, reporter_name, reporter_contact, status, upvotes, latitude, longitude, geohash.encode(latitude, longitude, 7), days]
    })
  );
  await db.batch(stmts, 'write');
}

// Seed komentar & riwayat status (hanya bila belum ada)
async function seedComments() {
  const count = Number((await db.execute('SELECT COUNT(*) AS c FROM report_comments')).rows[0].c);
  if (count > 0) return;

  const jalan = (await db.execute("SELECT id FROM reports WHERE title = 'Jalan berlubang di depan pasar'")).rows[0];
  const banjir = (await db.execute("SELECT id FROM reports WHERE title = 'Banjir menggenangi perumahan'")).rows[0];

  const stmts = [];
  if (jalan) {
    stmts.push(
      { sql: `INSERT INTO report_status_history (report_id, status, note, changed_by, created_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime', ?))`, args: [jalan.id, 'baru', 'Laporan diterima', 'Sistem', '-2 days'] },
      { sql: `INSERT INTO report_status_history (report_id, status, note, changed_by, created_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime', ?))`, args: [jalan.id, 'diproses', 'Diteruskan ke Dinas PU', 'Petugas', '-1 day'] },
      { sql: `INSERT INTO report_comments (report_id, author_name, body, created_at) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime', ?))`, args: [jalan.id, 'Warga', 'Semoga segera diperbaiki, sudah banyak pengendara yang jatuh di sini.', '-1 day'] }
    );
  }

  if (banjir) {
    stmts.push(
      { sql: `INSERT INTO report_status_history (report_id, status, note, changed_by, created_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime', ?))`, args: [banjir.id, 'baru', 'Laporan diterima', 'Sistem', '-7 days'] },
      { sql: `INSERT INTO report_status_history (report_id, status, note, changed_by, created_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime', ?))`, args: [banjir.id, 'diproses', 'Tim kebersihan diterjunkan', 'Petugas', '-5 days'] },
      { sql: `INSERT INTO report_status_history (report_id, status, note, changed_by, created_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime', ?))`, args: [banjir.id, 'selesai', 'Drainase dibersihkan, genangan surut', 'Petugas', '-3 days'] },
      { sql: `INSERT INTO report_comments (report_id, author_name, body, created_at) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime', ?))`, args: [banjir.id, 'Dewi', 'Terima kasih, drainase sudah lancar kembali.', '-3 days'] }
    );
  }

  if (stmts.length) await db.batch(stmts, 'write');
}

// Seed akun petugas & admin dari environment variable
async function seedUsers() {
  const userCount = Number((await db.execute('SELECT COUNT(*) AS c FROM users')).rows[0].c);
  if (userCount === 0) {
    const username = process.env.PETUGAS_USERNAME;
    const password = process.env.PETUGAS_PASSWORD;
    if (username && password) {
      const hash = bcrypt.hashSync(password, 12);
      await db.execute('INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)', [username, hash, 'petugas', 'Petugas Lapangan']);
      console.log(`Akun petugas dibuat dari environment variable: ${username}`);
    } else {
      console.log('Peringatan: PETUGAS_USERNAME/PETUGAS_PASSWORD tidak diatur, akun petugas tidak dibuat.');
    }
  }

  const adminCount = Number((await db.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")).rows[0].c);
  if (adminCount === 0) {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminUsername && adminPassword) {
      const hash = bcrypt.hashSync(adminPassword, 12);
      await db.execute('INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)', [adminUsername, hash, 'admin', 'Administrator']);
      console.log(`Akun admin dibuat dari environment variable: ${adminUsername}`);
    } else {
      console.log('Peringatan: ADMIN_USERNAME/ADMIN_PASSWORD tidak diatur, akun admin tidak dibuat.');
    }
  }
}

async function initialize() {
  try {
    await db.execute('PRAGMA foreign_keys = ON');
  } catch {
    // Beberapa mode koneksi Turso tidak mendukung pragma per koneksi; abaikan.
  }

  await db.batch(schemaStatements, 'write');

  // Migrasi kolom reports (hanya bila belum ada)
  const reportCols = (await db.execute('PRAGMA table_info(reports)')).rows;
  const colNames = reportCols.map((c) => c.name);
  const migrations = reportMigrations.filter(([name]) => !colNames.includes(name)).map(([, sql]) => sql);
  if (migrations.length) await db.batch(migrations, 'write');

  await db.batch(indexStatements, 'write');
  await db.batch(ftsStatements, 'write');

  // Sinkronkan ulang index FTS dengan data yang sudah ada
  try {
    await db.execute("INSERT INTO reports_fts(reports_fts) VALUES ('rebuild')");
  } catch {
    // abaikan bila tabel FTS belum ada isinya
  }

  // Backfill geohash untuk laporan yang sudah punya koordinat tapi belum ada geohash
  const geoRows = (await db.execute('SELECT id, latitude, longitude FROM reports WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geohash IS NULL')).rows;
  for (const r of geoRows) {
    await db.execute('UPDATE reports SET geohash = ? WHERE id = ?', [geohash.encode(r.latitude, r.longitude, 7), r.id]);
  }

  await seedSamples();
  await seedComments();
  await seedUsers();
}

let initPromise = null;

export function initDb() {
  if (!initPromise) initPromise = initialize();
  return initPromise;
}

export default db;
