import { useEffect, useState } from 'react';
import { AlertTriangle, Camera, ImagePlus, LocateFixed, X } from 'lucide-react';
import { api } from '../api.js';
import { CATEGORIES } from '../constants.js';
import MapPicker from './MapPicker.jsx';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

const labelClass = 'mt-4 text-sm font-bold text-slate-700';

export default function ReportForm({ onNavigate, onSubmitted, user }) {
  const [form, setForm] = useState({
    title: '',
    category: 'Infrastruktur',
    description: '',
    location: '',
    reporter_name: '',
    reporter_contact: '',
    is_anonymous: false,
    latitude: null,
    longitude: null
  });
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [duplicates, setDuplicates] = useState(null);

  // Isi nama pelapor otomatis saat pengguna sudah masuk
  useEffect(() => {
    if (user) {
      setForm((f) => (f.reporter_name ? f : { ...f, reporter_name: user.full_name || user.username }));
    }
  }, [user]);

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSelectPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 4) {
      setError('Maksimal 4 foto');
      return;
    }
    setError('');
    setPhotos(files);
  };

  const removePhoto = (index) => {
    setPhotos((p) => p.filter((_, i) => i !== index));
    if (document.getElementById('photos')) document.getElementById('photos').value = '';
  };

  const setCoord = (lat, lng) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Browser tidak mendukung geolokasi');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoord(pos.coords.latitude, pos.coords.longitude),
      () => setError('Gagal mengambil lokasi. Pastikan izin lokasi diaktifkan.')
    );
  };

  const doCreate = async () => {
    setSubmitting(true);
    try {
      const created = await api.createReport(form, photos);
      onSubmitted();
      onNavigate('detail', created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (checking || submitting) return;

    // Deteksi duplikat: cek laporan kategori sama di sekitar titik lokasi
    if (form.latitude != null && form.longitude != null && !duplicates) {
      setChecking(true);
      try {
        const res = await api.getDuplicates({
          category: form.category,
          lat: form.latitude,
          lng: form.longitude,
          radius: 0.5
        });
        if (res.duplicates && res.duplicates.length > 0) {
          setDuplicates(res.duplicates);
          return;
        }
      } catch {
        // bila gagal cek, tetap lanjutkan pengiriman
      } finally {
        setChecking(false);
      }
    }

    await doCreate();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat Laporan</h1>
      <p className="mt-1 text-sm text-slate-500">Laporkan masalah di lingkungan Anda agar segera ditindaklanjuti.</p>

      <form
        onSubmit={submit}
        className="mt-6 flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
      >
        <label htmlFor="title" className={labelClass}>Judul Laporan *</label>
        <input
          id="title"
          name="title"
          value={form.title}
          onChange={update}
          placeholder="cth: Jalan berlubang di depan pasar"
          required
          className={inputClass}
        />

        <label htmlFor="category" className={labelClass}>Kategori *</label>
        <select id="category" name="category" value={form.category} onChange={update} className={inputClass}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label htmlFor="description" className={labelClass}>Deskripsi Masalah *</label>
        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={update}
          rows="4"
          placeholder="Jelaskan detail masalah, dampaknya, dan sudah berapa lama terjadi"
          required
          className={`${inputClass} resize-y`}
        />

        <label htmlFor="location" className={labelClass}>Lokasi</label>
        <input
          id="location"
          name="location"
          value={form.location}
          onChange={update}
          placeholder="cth: Jalan Merdeka No. 12, RT 03/RW 02"
          className={inputClass}
        />

        <span className={labelClass}>Titik Lokasi di Peta</span>
        <div className="mt-2">
          <MapPicker latitude={form.latitude} longitude={form.longitude} onChange={setCoord} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <LocateFixed className="h-4 w-4" /> Gunakan Lokasi Saya
          </button>
          {form.latitude != null && form.longitude != null && (
            <span className="text-xs font-semibold text-slate-500">
              📍 {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
            </span>
          )}
        </div>

        <span className={labelClass}>Foto Bukti (opsional, maks. 4)</span>
        <label
          htmlFor="photos"
          className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-emerald-400 hover:bg-emerald-50"
        >
          <Camera className="h-7 w-7 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">Klik untuk memilih foto</span>
          <span className="text-xs text-slate-400">JPG, PNG, WebP, atau GIF (maks. 5 MB per foto)</span>
          <input
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={onSelectPhotos}
            className="hidden"
          />
        </label>

        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((file, i) => (
              <div key={`${file.name}-${i}`} className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-20 w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-slate-900/80 text-white transition hover:bg-red-600"
                  aria-label="Hapus foto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reporter_name" className={labelClass}>Nama Pelapor</label>
            <input
              id="reporter_name"
              name="reporter_name"
              value={form.reporter_name}
              onChange={update}
              disabled={form.is_anonymous}
              placeholder="Nama Anda"
              className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
            />
          </div>
          <div>
            <label htmlFor="reporter_contact" className={labelClass}>Kontak (WA/Email)</label>
            <input
              id="reporter_contact"
              name="reporter_contact"
              value={form.reporter_contact}
              onChange={update}
              disabled={form.is_anonymous}
              placeholder="Untuk konfirmasi"
              className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
            />
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            name="is_anonymous"
            checked={form.is_anonymous}
            onChange={update}
            className="h-4 w-4 rounded accent-emerald-600"
          />
          Laporkan secara anonim
        </label>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}

        {duplicates && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle className="h-5 w-5" /> Laporan serupa mungkin sudah ada
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-700">
              Ditemukan {duplicates.length} laporan kategori "{form.category}" di sekitar titik lokasi ini
              (radius 500 m). Periksa dulu agar tidak duplikat:
            </p>
            <ul className="mt-3 space-y-2">
              {duplicates.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('detail', d.id)}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-left transition hover:border-amber-400 hover:shadow-sm"
                  >
                    <span>
                      <span className="block text-sm font-bold text-slate-800">{d.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {d.location || 'Tanpa lokasi'} · {d.status}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                      {d.distance_km < 1 ? `${Math.round(d.distance_km * 1000)} m` : `${d.distance_km.toFixed(1)} km`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={doCreate}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
              >
                <ImagePlus className="h-4 w-4" /> {submitting ? 'Mengirim...' : 'Tetap Kirim Laporan'}
              </button>
              <button
                type="button"
                onClick={() => setDuplicates(null)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Batalkan
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || checking}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4" /> {checking ? 'Memeriksa...' : submitting ? 'Mengirim...' : 'Kirim Laporan'}
          </button>
        </div>
      </form>
    </div>
  );
}
