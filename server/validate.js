import { z } from 'zod';

export const CATEGORIES = ['Infrastruktur', 'Kebersihan', 'Penerangan', 'Banjir', 'Keamanan', 'Lainnya'];
export const STATUSES = ['baru', 'diproses', 'selesai', 'ditolak'];

const toText = (max) =>
  z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? null : String(v).trim()),
    z.string().max(max).nullable()
  );

const toBoolean = z.preprocess(
  (v) => v === true || v === 'true' || v === '1' || v === 1,
  z.boolean()
);

const optionalNumber = (min, max) =>
  z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? null : Number(v)),
    z.number().min(min).max(max).nullable()
  );

export const createReportSchema = z.object({
  title: z.preprocess(
    (v) => String(v ?? '').trim(),
    z.string().min(5, 'Judul minimal 5 karakter').max(120, 'Judul maksimal 120 karakter')
  ),
  category: z.string().refine((v) => CATEGORIES.includes(v), { message: 'Kategori tidak valid' }),
  description: z.preprocess(
    (v) => String(v ?? '').trim(),
    z.string().min(10, 'Deskripsi minimal 10 karakter').max(2000, 'Deskripsi maksimal 2000 karakter')
  ),
  location: toText(200),
  reporter_name: toText(100),
  reporter_contact: toText(100),
  is_anonymous: toBoolean,
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180)
});

export const commentSchema = z.object({
  author_name: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? 'Anonim' : String(v).trim()),
    z.string().max(100, 'Nama maksimal 100 karakter')
  ),
  body: z.preprocess(
    (v) => String(v ?? '').trim(),
    z.string().min(1, 'Komentar tidak boleh kosong').max(1000, 'Komentar maksimal 1000 karakter')
  )
});

export const statusUpdateSchema = z.object({
  status: z.string().refine((v) => STATUSES.includes(v), { message: 'Status tidak valid' }),
  note: toText(500)
});

export const registerSchema = z.object({
  username: z.preprocess(
    (v) => String(v ?? '').trim(),
    z
      .string()
      .min(3, 'Username minimal 3 karakter')
      .max(30, 'Username maksimal 30 karakter')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh huruf, angka, titik, strip, atau garis bawah')
  ),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter').max(100, 'Kata sandi maksimal 100 karakter'),
  full_name: toText(100)
});

export const loginSchema = z.object({
  username: z.preprocess((v) => String(v ?? '').trim(), z.string().min(1, 'Username wajib diisi')),
  password: z.string().min(1, 'Kata sandi wajib diisi')
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  category: z.string().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
  sort: z.string().refine((v) => ['newest', 'oldest', 'upvotes'].includes(v), { message: 'Urutan tidak valid' }).default('newest'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().max(10000).optional()
});

export const responseSchema = z.object({
  response: z.preprocess(
    (v) => String(v ?? '').trim(),
    z.string().min(5, 'Tanggapan minimal 5 karakter').max(2000, 'Tanggapan maksimal 2000 karakter')
  )
});

export const ratingSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating harus 1 sampai 5').max(5, 'Rating harus 1 sampai 5')
});

export const assignSchema = z.object({
  user_id: z.coerce.number().int().positive('Petugas tidak valid')
});

export const updatePetugasSchema = z.object({
  username: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? null : String(v).trim()),
    z
      .string()
      .min(3, 'Username minimal 3 karakter')
      .max(30, 'Username maksimal 30 karakter')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh huruf, angka, titik, strip, atau garis bawah')
      .nullable()
  ),
  full_name: toText(100)
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Kata sandi minimal 6 karakter').max(100, 'Kata sandi maksimal 100 karakter')
});
