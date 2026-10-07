import { BarChart3, ClipboardList, LogIn, LogOut, Megaphone, ShieldCheck, User } from 'lucide-react';

export default function Navbar({ onNavigate, user, onLogout }) {
  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-emerald-900 via-emerald-700 to-teal-600 text-white shadow-lg shadow-emerald-900/20">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <button
          className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight"
          onClick={() => onNavigate('home')}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/25 bg-white/15 backdrop-blur">
            <Megaphone className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline">
            Lapor<span className="text-emerald-200">Warga</span>
          </span>
        </button>

        <nav className="flex items-center gap-2">
          <button
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
            onClick={() => onNavigate('home')}
          >
            Beranda
          </button>
          <button
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
            onClick={() => onNavigate('about')}
          >
            Tentang
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
            onClick={() => onNavigate('dashboard')}
          >
            <BarChart3 className="h-4 w-4" /> Statistik
          </button>
          {user?.role === 'petugas' && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
              onClick={() => onNavigate('kelola')}
            >
              <ClipboardList className="h-4 w-4" /> Kelola
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
              onClick={() => onNavigate('admin')}
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </button>
          )}
          <button
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            onClick={() => onNavigate('form')}
          >
            + Buat Laporan
          </button>

          {user ? (
            <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-sm font-semibold sm:inline-flex">
              <User className="h-4 w-4" />
              {user.username}
              {user.role === 'petugas' && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                  Petugas
                </span>
              )}
              {user.role === 'admin' && (
                <span className="rounded-full bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                  Admin
                </span>
              )}
            </span>
          ) : (
            <button
              className="ml-1 inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
              onClick={() => onNavigate('auth')}
            >
              <LogIn className="h-4 w-4" /> Masuk
            </button>
          )}

          {user && (
            <button
              className="rounded-lg p-2 text-white/90 transition hover:bg-white/15"
              onClick={onLogout}
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
