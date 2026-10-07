import { useEffect, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flag,
  List,
  LocateFixed,
  Map,
  Megaphone,
  RotateCcw,
  Search,
  Trash2,
  Wrench
} from 'lucide-react';
import { api } from '../api.js';
import { CATEGORIES, STATUS_LABEL, STATUSES } from '../constants.js';
import ReportCard from './ReportCard.jsx';
import ReportMap from './ReportMap.jsx';
import Reveal from './Reveal.jsx';
import useParallax from '../hooks/useParallax.js';

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

const STAT_CARDS = [
  { key: 'total', label: 'Total Laporan', icon: ClipboardList, iconClass: 'bg-indigo-50 text-indigo-600', value: (s) => s.total },
  { key: 'baru', label: 'Laporan Baru', icon: BellRing, iconClass: 'bg-blue-50 text-blue-600', value: (s) => s.statusCounts?.baru || 0 },
  { key: 'diproses', label: 'Sedang Diproses', icon: Wrench, iconClass: 'bg-amber-50 text-amber-600', value: (s) => s.statusCounts?.diproses || 0 },
  { key: 'selesai', label: 'Selesai', icon: CheckCircle2, iconClass: 'bg-green-50 text-green-600', value: (s) => s.statusCounts?.selesai || 0 }
];

export default function Home({ stats, onNavigate, user, onChanged }) {
  const [reports, setReports] = useState([]);
  const [mapReports, setMapReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [mine, setMine] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [filters, setFilters] = useState({ category: 'Semua', status: 'Semua', q: '', sort: 'newest' });
  const [searchInput, setSearchInput] = useState('');
  const [nearby, setNearby] = useState(null); // { center, radius, reports }
  const [locating, setLocating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Parallax untuk elemen dekoratif hero
  const parallaxTop = useParallax(0.22);
  const parallaxBottom = useParallax(0.4);

  // Debounce pencarian: fetch hanya setelah pengguna berhenti mengetik 350 ms
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === searchInput ? f : { ...f, q: searchInput }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    api.getReports({ limit: 50 })
      .then((res) => setMapReports(res.data))
      .catch(() => setMapReports([]));
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { ...filters, page, limit: 12 };
    if (mine && user) params.mine = 'true';
    if (deleted) params.deleted = 'true';
    api.getReports(params)
      .then((res) => {
        if (!cancelled) {
          setReports(res.data);
          setPagination(res.pagination);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReports([]);
          setPagination({ page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, mine, user, refreshKey, deleted]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const handleDeleteReport = async (report) => {
    if (!window.confirm(`Hapus laporan "${report.title}"?`)) return;
    try {
      await api.deleteReport(report.id);
      onChanged?.();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestoreReport = async (report) => {
    try {
      await api.restoreReport(report.id);
      onChanged?.();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  const locateNearby = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung geolokasi.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await api.getReports({ lat: latitude, lng: longitude, radius: 5, limit: 50 });
          setNearby({ center: [latitude, longitude], radius: 5, reports: res.data });
        } catch {
          setNearby({ center: [latitude, longitude], radius: 5, reports: [] });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        alert('Gagal mendapatkan lokasi. Izinkan akses lokasi pada browser.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <Reveal>
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 p-8 text-white shadow-xl shadow-emerald-900/20 md:p-12">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl"
            style={{ transform: `translateY(${parallaxTop}px)` }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-emerald-300/20 blur-2xl"
            style={{ transform: `translateY(${-parallaxBottom}px)` }}
          />
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              <Flag className="h-3.5 w-3.5" /> Untuk Masyarakat
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Suara Anda, <span className="text-emerald-200">Aksi Nyata</span>
            </h1>
            <p className="mt-3 max-w-lg text-white/90">
              Laporkan masalah di lingkungan sekitar — jalan rusak, banjir, sampah, dan lainnya.
              Bersama kita pantau laporan sampai selesai ditangani.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-white px-6 py-3 font-bold text-emerald-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
                onClick={() => onNavigate('form')}
              >
                + Buat Laporan Sekarang
              </button>
              <button
                className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20"
                onClick={() => document.getElementById('daftar-laporan')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Lihat Laporan
              </button>
            </div>
          </div>
          <div className="hidden text-white/25 md:block" aria-hidden="true" style={{ transform: `translateY(${-parallaxBottom * 0.5}px)` }}>
            <Megaphone className="h-40 w-40 animate-float motion-reduce:animate-none" strokeWidth={1.25} />
          </div>
        </div>
        </section>
      </Reveal>

      {/* Stats */}
      <Reveal delay={60}>
        <section className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map(({ key, label, icon: Icon, iconClass, value }) => (
            <div
              key={key}
              className="group flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/10"
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${iconClass}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-extrabold leading-none text-slate-900 transition-colors group-hover:text-emerald-700">{value(stats)}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
              </div>
            </div>
          ))}
        </section>
      </Reveal>

      {/* List / Map */}
      <section id="daftar-laporan" className="scroll-mt-24">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Daftar Laporan</h2>
            <div className="ml-2 flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="h-3.5 w-3.5" /> Daftar
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === 'map' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Map className="h-3.5 w-3.5" /> Peta
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && viewMode === 'list' && (
              <button
                onClick={() => {
                  setMine((m) => !m);
                  setPage(1);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  mine
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Laporan Saya
              </button>
            )}
            {user?.role === 'petugas' && viewMode === 'list' && (
              <button
                onClick={() => {
                  setDeleted((d) => !d);
                  setMine(false);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  deleted
                    ? 'bg-slate-700 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" /> Laporan Terhapus
              </button>
            )}
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {viewMode === 'map'
                ? `${mapReports.filter((r) => r.latitude != null).length} di peta`
                : loading
                  ? '...'
                  : `${pagination.total} laporan`}
            </span>
          </div>
        </div>

        {viewMode === 'map' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={locateNearby}
                disabled={locating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
              >
                <LocateFixed className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} />
                {locating ? 'Mencari lokasi...' : 'Di Sekitar Saya'}
              </button>
              {nearby && (
                <>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    {nearby.reports.length} laporan dalam {nearby.radius} km
                  </span>
                  <button
                    onClick={() => setNearby(null)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" /> Tampilkan Semua
                  </button>
                </>
              )}
            </div>
            <ReportMap
              reports={nearby ? nearby.reports : mapReports}
              center={nearby?.center}
              circleRadiusKm={nearby?.radius}
              onOpen={(id) => onNavigate('detail', id)}
            />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Cari laporan..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
              <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)} className={selectClass}>
                <option value="Semua">Semua Kategori</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={selectClass}>
                <option value="Semua">Semua Status</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
              <select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} className={selectClass}>
                <option value="newest">Terbaru</option>
                <option value="upvotes">Terbanyak Didukung</option>
                <option value="oldest">Terlama</option>
              </select>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Memuat laporan...</p>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Search className="h-6 w-6" />
                </span>
                <p className="text-sm text-slate-500">
                  {deleted
                    ? 'Tidak ada laporan terhapus.'
                    : 'Belum ada laporan yang cocok. Jadilah yang pertama melaporkan!'}
                </p>
                {!deleted && (
                  <button
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                    onClick={() => onNavigate('form')}
                  >
                    + Buat Laporan
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {reports.map((r) => (
                    <ReportCard
                      key={r.id}
                      report={r}
                      onClick={deleted ? undefined : () => onNavigate('detail', r.id)}
                      onDelete={!deleted && user?.role === 'petugas' ? handleDeleteReport : undefined}
                      onRestore={deleted ? handleRestoreReport : undefined}
                    />
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-between gap-3">
                    <button
                      disabled={!pagination.hasPrev}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" /> Sebelumnya
                    </button>
                    <span className="text-sm font-semibold text-slate-500">
                      Halaman {pagination.page} dari {pagination.totalPages}
                    </span>
                    <button
                      disabled={!pagination.hasNext}
                      onClick={() => setPage((p) => p + 1)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Berikutnya <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
