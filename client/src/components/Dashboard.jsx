import { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Download,
  ScrollText,
  Star,
  ThumbsUp,
  Timer,
  TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { api } from '../api.js';
import { STATUS_LABEL, STATUSES } from '../constants.js';

const CATEGORY_COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const STATUS_COLORS = { baru: '#3b82f6', diproses: '#f59e0b', selesai: '#10b981', ditolak: '#ef4444' };

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({
    total: 0,
    statusCounts: {},
    byCategory: [],
    trend: [],
    totalUpvotes: 0,
    avgRating: 0,
    ratedCount: 0,
    resolvedCount: 0,
    avgResolutionHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .getStats({ from, to })
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => {
    if (user?.role !== 'petugas') return;
    api
      .getAuditLogs(10)
      .then((res) => setAuditLogs(res.data || []))
      .catch(() => setAuditLogs([]));
  }, [user]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await api.exportReports();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'laporan-warga.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setExporting(false);
    }
  };

  const sc = stats.statusCounts || {};
  const trendData = (stats.trend || []).map((t) => ({
    ...t,
    label: t.date.slice(5).split('-').reverse().join('/')
  }));

  const categoryData = (stats.byCategory || []).map((c, i) => ({
    name: c.category,
    value: c.c,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }));

  const statusData = STATUSES.map((s) => ({
    name: STATUS_LABEL[s],
    count: sc[s] || 0,
    color: STATUS_COLORS[s]
  }));

  const kpis = [
    { icon: TrendingUp, label: 'Total Laporan', value: stats.total, accent: 'bg-indigo-50 text-indigo-600' },
    { icon: ThumbsUp, label: 'Total Dukungan', value: stats.totalUpvotes, accent: 'bg-blue-50 text-blue-600' },
    { icon: BellRing, label: 'Laporan Baru', value: sc.baru || 0, accent: 'bg-sky-50 text-sky-600' },
    { icon: CheckCircle2, label: 'Selesai', value: sc.selesai || 0, accent: 'bg-green-50 text-green-600' },
    { icon: Timer, label: 'Rata-rata Penyelesaian', value: stats.resolvedCount ? `${stats.avgResolutionHours} jam` : '—', accent: 'bg-teal-50 text-teal-600' },
    { icon: Star, label: 'Rating Rata-rata', value: stats.ratedCount ? stats.avgRating.toFixed(1) : '—', accent: 'bg-amber-50 text-amber-600' }
  ];

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat statistik...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Dashboard Statistik</h1>
        </div>
        {user?.role === 'petugas' && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" /> {exporting ? 'Mengunduh...' : 'Export CSV'}
          </button>
        )}
      </div>

      {/* Filter rentang tanggal */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600">
          <CalendarDays className="h-4 w-4 text-emerald-600" /> Rentang Tanggal
        </span>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          Dari
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-emerald-400"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          Sampai
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-emerald-400"
          />
        </label>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom('');
              setTo('');
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            Reset
          </button>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(({ icon: Icon, label, value, accent }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="mt-3 text-2xl font-extrabold leading-none text-slate-900">{value}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Tren */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">
            {from || to ? `Tren Laporan (${from || 'awal'} – ${to || 'sekarang'})` : 'Tren Laporan (30 Hari Terakhir)'}
          </h2>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                formatter={(value) => [`${value} laporan`, 'Jumlah']}
              />
              <Area type="monotone" dataKey="count" stroke="#059669" strokeWidth={2.5} fill="url(#trendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Kategori & Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Laporan per Kategori</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Laporan per Status</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(value) => [`${value} laporan`, 'Jumlah']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {stats.ratedCount > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Award className="h-4 w-4 text-amber-500" />
          Rata-rata kepuasan {stats.avgRating.toFixed(1)} dari {stats.ratedCount} penilaian.
        </p>
      )}

      {user?.role === 'petugas' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Audit Log Petugas</h2>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada aktivitas petugas tercatat.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm">
                    <span className="font-bold text-slate-800">{log.username}</span>{' '}
                    <span className="text-slate-500">
                      {log.action}
                      {log.report_id != null && ` laporan #${log.report_id}`}
                      {log.detail ? ` · ${log.detail}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{log.created_at?.replace('T', ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
