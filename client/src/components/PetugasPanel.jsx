import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Inbox,
  Lock,
  LogIn,
  Map as MapIcon,
  Search,
  Trash2
} from 'lucide-react';
import { api } from '../api.js';
import { CATEGORIES, STATUSES, STATUS_LABEL } from '../constants.js';
import { timeAgo } from '../utils.js';
import ReportMap from './ReportMap.jsx';

const STATUS_CLASS = {
  baru: 'bg-blue-50 text-blue-700',
  diproses: 'bg-amber-50 text-amber-700',
  selesai: 'bg-green-50 text-green-700',
  ditolak: 'bg-red-50 text-red-700'
};

const TABS = [
  { key: 'list', label: 'Daftar Laporan', icon: ClipboardList },
  { key: 'queue', label: 'Perlu Tindakan', icon: Inbox },
  { key: 'map', label: 'Peta Sebaran', icon: MapIcon }
];

export default function PetugasPanel({ user, onNavigate, onChanged }) {
  const [tab, setTab] = useState('list');

  if (user?.role !== 'petugas') {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Lock className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">Akses khusus petugas</h2>
        <p className="mt-1 text-sm text-slate-500">
          {user
            ? `Anda sedang masuk sebagai @${user.username} (admin).`
            : 'Halaman ini hanya untuk petugas.'}
        </p>
        <button
          onClick={() => onNavigate('auth')}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <LogIn className="h-4 w-4" /> Masuk sebagai petugas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
          <ClipboardList className="h-7 w-7 text-emerald-600" /> Panel Petugas
        </h1>
        <p className="mt-1 text-sm text-slate-500">Kelola laporan, antrean tindakan, dan peta sebaran.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              tab === key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 shadow-sm hover:bg-emerald-50'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'list' && <ReportTable onNavigate={onNavigate} onChanged={onChanged} />}
      {tab === 'queue' && <ActionQueue onNavigate={onNavigate} onChanged={onChanged} />}
      {tab === 'map' && <ReportMapTab onNavigate={onNavigate} />}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function StatusSelect({ report, onChanged }) {
  const [busy, setBusy] = useState(false);

  const change = async (e) => {
    const status = e.target.value;
    setBusy(true);
    try {
      await api.updateStatus(report.id, status);
      onChanged();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <select
      value={report.status}
      onChange={change}
      disabled={busy}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-50"
      title="Ubah status"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

function ReportTable({ onNavigate, onChanged }) {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ category: 'Semua', status: 'Semua', q: '' });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === searchInput ? f : { ...f, q: searchInput }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = () => {
    setLoading(true);
    api
      .getReports({ ...filters, page, limit: 10 })
      .then((res) => {
        setReports(res.data);
        setPagination(res.pagination);
      })
      .catch(() => {
        setReports([]);
        setPagination({ page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false });
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [filters, page]);

  const handled = () => {
    onChanged();
    load();
  };

  const remove = async (report) => {
    if (!window.confirm(`Hapus laporan #${report.id} "${report.title}"?`)) return;
    try {
      await api.deleteReport(report.id);
      handled();
    } catch (err) {
      alert(err.message);
    }
  };

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul, deskripsi, atau lokasi..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => setFilter('category', e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400"
        >
          <option value="Semua">Semua Kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400"
        >
          <option value="Semua">Semua Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="p-6 text-sm text-slate-500">Memuat laporan...</p>
      ) : reports.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">Tidak ada laporan.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Laporan</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Dibuat</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id} className="transition hover:bg-slate-50">
                  <td className="max-w-[280px] px-4 py-3">
                    <button className="text-left font-bold text-slate-800 hover:text-emerald-700" onClick={() => onNavigate('detail', r.id)}>
                      {r.title}
                    </button>
                    <p className="text-xs text-slate-400">👍 {r.upvotes} · 💬 {r.comment_count ?? 0}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.category}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-slate-600">{r.location || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{timeAgo(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <StatusSelect report={r} onChanged={handled} />
                      <button
                        onClick={() => remove(r)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Hapus laporan"
                        aria-label="Hapus laporan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>
            {pagination.total} laporan · Halaman {pagination.page} dari {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Sebelumnya
            </button>
            <button
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Berikutnya <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ActionQueue({ onNavigate, onChanged }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .getReports({ needs_action: true, limit: 50 })
      .then((res) => setReports(res.data))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handled = () => {
    onChanged();
    load();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900">Perlu Tindakan</h2>
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
          {reports.length} laporan
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Memuat antrean...</p>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p className="text-sm font-semibold text-slate-500">Semua laporan sudah ditangani. 🎉</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {reports.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <button className="text-left text-sm font-bold text-slate-800 hover:text-emerald-700" onClick={() => onNavigate('detail', r.id)}>
                  {r.title}
                </button>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{r.category}</span>
                  <StatusBadge status={r.status} />
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {timeAgo(r.created_at)}
                  </span>
                  {r.assigned_to == null && <span className="text-amber-600">Belum ditugaskan</span>}
                  {!r.official_response && <span className="text-amber-600">Belum ditanggapi</span>}
                </p>
              </div>
              <StatusSelect report={r} onChanged={handled} />
              <button
                onClick={() => onNavigate('detail', r.id)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Detail
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReportMapTab({ onNavigate }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getReports({ limit: 50 })
      .then((res) => setReports(res.data))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MapIcon className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-slate-900">Peta Sebaran Laporan</h2>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Memuat peta...</p>
      ) : (
        <ReportMap reports={reports} onOpen={(id) => onNavigate('detail', id)} />
      )}
    </section>
  );
}
