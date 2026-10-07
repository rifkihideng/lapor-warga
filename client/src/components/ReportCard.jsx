import { ChevronRight, CircleHelp, Clock, MapPin, MessageSquare, RotateCcw, ThumbsUp, Trash2 } from 'lucide-react';
import { STATUS_LABEL } from '../constants.js';
import { CATEGORY_ICONS } from '../icons.jsx';
import { timeAgo } from '../utils.js';

const STATUS_CLASS = {
  baru: 'bg-blue-50 text-blue-700',
  diproses: 'bg-amber-50 text-amber-700',
  selesai: 'bg-green-50 text-green-700',
  ditolak: 'bg-red-50 text-red-700'
};

export default function ReportCard({ report, onClick, onDelete, onRestore }) {
  const Icon = CATEGORY_ICONS[report.category] || CircleHelp;
  const cover = report.photos?.[0];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex animate-fade-up cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.01] hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/10"
    >
      {cover && (
        <img
          src={cover}
          alt={report.title}
          loading="lazy"
          className="-mx-5 -mt-5 mb-1 h-40 w-[calc(100%+2.5rem)] max-w-none object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            {report.category}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[report.status]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {STATUS_LABEL[report.status]}
          </span>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(report);
              }}
              className="grid h-11 w-11 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              title="Hapus laporan"
              aria-label="Hapus laporan"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {onRestore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore(report);
              }}
              className="grid h-11 w-11 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
              title="Pulihkan laporan"
              aria-label="Pulihkan laporan"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <h3 className="text-base font-bold leading-snug text-slate-900 transition-colors duration-300 group-hover:text-emerald-700">{report.title}</h3>
      <p className="line-clamp-3 text-sm text-slate-500">{report.description}</p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {report.location || 'Tanpa lokasi'}
        </span>
        <span className="inline-flex items-center gap-1">
          <ThumbsUp className="h-3.5 w-3.5" /> {report.upvotes}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" /> {report.comment_count ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {timeAgo(report.created_at)}
        </span>
      </div>

      <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 transition-all group-hover:gap-2">
        Lihat detail <ChevronRight className="h-4 w-4" />
      </span>
    </div>
  );
}
