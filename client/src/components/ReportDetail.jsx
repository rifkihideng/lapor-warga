import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  CircleHelp,
  ClipboardCheck,
  Clock,
  History,
  Lock,
  MapPin,
  MessageSquare,
  Navigation,
  Send,
  Star,
  ThumbsUp,
  Trash2,
  User,
  UserCheck
} from 'lucide-react';
import { api } from '../api.js';
import { STATUS_LABEL, STATUSES } from '../constants.js';
import { CATEGORY_ICONS } from '../icons.jsx';
import { timeAgo } from '../utils.js';

const STATUS_CLASS = {
  baru: 'bg-blue-50 text-blue-700',
  diproses: 'bg-amber-50 text-amber-700',
  selesai: 'bg-green-50 text-green-700',
  ditolak: 'bg-red-50 text-red-700'
};

const STATUS_DOT = {
  baru: 'bg-blue-600',
  diproses: 'bg-amber-500',
  selesai: 'bg-green-600',
  ditolak: 'bg-red-600'
};

export default function ReportDetail({ id, onNavigate, onChanged, user }) {
  const [report, setReport] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [upvoted, setUpvoted] = useState(false);

  const [adminMode, setAdminMode] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [adminError, setAdminError] = useState('');

  const [commentName, setCommentName] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [petugasList, setPetugasList] = useState([]);
  const [responseText, setResponseText] = useState('');
  const [responseError, setResponseError] = useState('');
  const [savingResponse, setSavingResponse] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [assignError, setAssignError] = useState('');
  const [ratingError, setRatingError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setReport(null);
    setComments([]);
    setHistory([]);

    Promise.all([api.getReport(id), api.getComments(id), api.getHistory(id)])
      .then(([rep, com, his]) => {
        if (!cancelled) {
          setReport(rep);
          setUpvoted(!!rep.voted);
          setComments(com.data || []);
          setHistory(his.data || []);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (user?.role !== 'petugas') return;
    api.getPetugas()
      .then((res) => setPetugasList(res.data || []))
      .catch(() => setPetugasList([]));
  }, [user]);

  const handleUpvote = async () => {
    if (!user) {
      onNavigate('auth');
      return;
    }
    try {
      const updated = await api.upvote(id);
      setReport(updated);
      setUpvoted(updated.voted);
    } catch (err) {
      if (err.message.includes('Autentikasi')) onNavigate('auth');
    }
  };

  const changeStatus = async (status) => {
    setAdminError('');
    try {
      const updated = await api.updateStatus(id, status, adminNote);
      setReport(updated);
      setAdminNote('');
      const his = await api.getHistory(id);
      setHistory(his.data || []);
      onChanged();
    } catch (err) {
      setAdminError(err.message);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    setCommentError('');
    setSubmittingComment(true);
    try {
      await api.addComment(id, { author_name: commentName, body: commentBody });
      setCommentBody('');
      const com = await api.getComments(id);
      setComments(com.data || []);
      onChanged();
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const saveResponse = async () => {
    setResponseError('');
    setSavingResponse(true);
    try {
      const updated = await api.setResponse(id, responseText);
      setReport(updated);
      setResponseText('');
    } catch (err) {
      setResponseError(err.message);
    } finally {
      setSavingResponse(false);
    }
  };

  const handleAssign = async () => {
    setAssignError('');
    if (!assignTo) return;
    try {
      const updated = await api.assignReport(id, Number(assignTo));
      setReport(updated);
      setAssignTo('');
    } catch (err) {
      setAssignError(err.message);
    }
  };

  const handleRate = async (value) => {
    setRatingError('');
    try {
      const updated = await api.rateReport(id, value);
      setReport(updated);
    } catch (err) {
      setRatingError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Hapus laporan ini? Laporan akan diarsipkan dan tidak tampil lagi di daftar.')) return;
    try {
      await api.deleteReport(id);
      onChanged();
      onNavigate('home');
    } catch (err) {
      setAdminError(err.message);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat laporan...</p>;
  }

  if (notFound || !report) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Laporan tidak ditemukan</h2>
        <button
          className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
          onClick={() => onNavigate('home')}
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const Icon = CATEGORY_ICONS[report.category] || CircleHelp;
  const reporter = report.is_anonymous ? 'Anonim' : report.reporter_name || 'Anonim';

  return (
    <div className="mx-auto max-w-3xl">
      <button
        className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 transition-all hover:gap-2"
        onClick={() => onNavigate('home')}
      >
        <ChevronLeft className="h-4 w-4" /> Kembali
      </button>

      {/* Detail */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
            <Icon className="h-6 w-6" />
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {report.category}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[report.status]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {STATUS_LABEL[report.status]}
            </span>
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">{report.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {report.location || 'Lokasi tidak dicantumkan'}
          </span>
          {report.latitude != null && report.longitude != null && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:underline"
            >
              <Navigation className="h-4 w-4" /> Arah ke Lokasi
            </a>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {timeAgo(report.created_at)}
          </span>
        </div>

        <p className="mt-5 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
          {report.description}
        </p>

        {report.photos?.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {report.photos.map((src) => (
              <img
                key={src}
                src={src}
                alt={`Foto laporan ${report.title}`}
                loading="lazy"
                className="h-28 w-full rounded-xl border border-slate-200 object-cover"
              />
            ))}
          </div>
        )}

        <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-500">
          <User className="h-4 w-4" /> Dilaporkan oleh{' '}
          <strong className="font-bold text-slate-700">{reporter}</strong>
          {report.reporter_contact ? ` · ${report.reporter_contact}` : ''}
        </p>

        {report.assigned_to_name && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500">
            <UserCheck className="h-4 w-4" /> Ditugaskan ke{' '}
            <strong className="font-bold text-slate-700">{report.assigned_to_name}</strong>
          </p>
        )}

        {report.official_response && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <ClipboardCheck className="h-4 w-4" /> Tanggapan Resmi
            </p>
            <p className="mt-2 text-sm text-emerald-900">{report.official_response}</p>
            {report.official_responded_at && (
              <p className="mt-1 text-xs text-emerald-700/70">{timeAgo(report.official_responded_at)}</p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${
              upvoted ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            onClick={handleUpvote}
          >
            <ThumbsUp className="h-4 w-4" /> {upvoted ? 'Batal Dukung' : 'Dukung'} ({report.upvotes})
          </button>
          {upvoted && <span className="text-sm text-slate-500">Anda mendukung laporan ini.</span>}
        </div>

        {user && report.user_id === user.id && report.status === 'selesai' && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-700">Beri penilaian penanganan</p>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => handleRate(v)}
                  aria-label={`Rating ${v}`}
                  className={`rounded-lg p-1 transition hover:scale-110 ${
                    report.rating && report.rating >= v ? 'text-amber-500' : 'text-slate-300'
                  }`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
              {report.rating ? (
                <span className="ml-2 text-sm font-bold text-slate-700">{report.rating}/5</span>
              ) : null}
            </div>
            {ratingError && <p className="mt-2 text-sm font-semibold text-red-600">{ratingError}</p>}
          </div>
        )}
      </div>

      {/* Riwayat status */}
      {history.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <History className="h-4 w-4 text-slate-400" /> Riwayat Status
          </h3>
          <ol className="mt-4 space-y-4">
            {history.map((h, i) => (
              <li key={h.id} className="relative flex gap-3">
                {i < history.length - 1 && (
                  <span className="absolute left-[5px] top-5 h-full w-0.5 bg-slate-200" aria-hidden="true" />
                )}
                <span className={`relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[h.status]}`} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_CLASS[h.status]}`}>
                      {STATUS_LABEL[h.status]}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{timeAgo(h.created_at)}</span>
                  </div>
                  {h.note && <p className="mt-1 text-sm text-slate-600">{h.note}</p>}
                  {h.changed_by && <p className="mt-0.5 text-xs text-slate-400">oleh {h.changed_by}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Komentar */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <MessageSquare className="h-4 w-4 text-slate-400" /> Komentar ({comments.length})
        </h3>

        <form onSubmit={submitComment} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            value={commentName}
            onChange={(e) => setCommentName(e.target.value)}
            placeholder="Nama Anda (opsional)"
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows="2"
            placeholder="Tulis komentar atau informasi tambahan..."
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          {commentError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
              {commentError}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingComment || !commentBody.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> {submittingComment ? 'Mengirim...' : 'Kirim Komentar'}
            </button>
          </div>
        </form>

        {comments.length > 0 && (
          <ul className="mt-5 space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-800">{c.author_name}</span>
                  <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Panel petugas */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="inline-flex items-center gap-2 text-base font-bold text-slate-900">
          <Lock className="h-4 w-4 text-slate-400" /> Panel Petugas
        </h3>
        {user?.role === 'petugas' ? (
          !adminMode ? (
            <button
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
              onClick={() => setAdminMode(true)}
            >
              Ubah Status Laporan
            </button>
          ) : (
            <>
              <div className="mt-4">
                <label htmlFor="admin-note" className="text-sm font-bold text-slate-700">Catatan (opsional)</label>
                <input
                  id="admin-note"
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="cth: Diteruskan ke Dinas PU"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              {adminError && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {adminError}
                </p>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <label htmlFor="official-response" className="text-sm font-bold text-slate-700">
                  Tanggapan Resmi
                </label>
                <textarea
                  id="official-response"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows="2"
                  placeholder="Tulis tanggapan resmi untuk pelapor..."
                  className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
                <button
                  onClick={saveResponse}
                  disabled={savingResponse || !responseText.trim()}
                  className="mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingResponse ? 'Menyimpan...' : 'Simpan Tanggapan'}
                </button>
                {responseError && <p className="mt-2 text-sm font-semibold text-red-600">{responseError}</p>}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <label htmlFor="assign-to" className="text-sm font-bold text-slate-700">
                  Tugaskan ke Petugas
                </label>
                <div className="mt-1.5 flex gap-2">
                  <select
                    id="assign-to"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  >
                    <option value="">Pilih petugas...</option>
                    {petugasList.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!assignTo}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Tugaskan
                  </button>
                </div>
                {report.assigned_to_name && (
                  <p className="mt-2 text-xs text-slate-500">Saat ini: {report.assigned_to_name}</p>
                )}
                {assignError && <p className="mt-2 text-sm font-semibold text-red-600">{assignError}</p>}
              </div>
            </>
          )
        ) : (
          <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <Lock className="h-4 w-4" /> Hanya petugas yang dapat mengubah status.
            {!user && (
              <button className="font-bold text-emerald-700 hover:underline" onClick={() => onNavigate('auth')}>
                Masuk sebagai petugas
              </button>
            )}
          </p>
        )}

        {user?.role === 'petugas' && (
          <div className="mt-5 border-t border-red-100 pt-4">
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" /> Hapus Laporan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
