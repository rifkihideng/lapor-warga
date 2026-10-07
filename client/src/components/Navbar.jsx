import { useState } from 'react';
import { BarChart3, ClipboardList, LogIn, LogOut, Menu, ShieldCheck, User, X } from 'lucide-react';
import Logo from './Logo.jsx';

export default function Navbar({ onNavigate, user, onLogout }) {
  const [open, setOpen] = useState(false);

  const go = (name) => {
    setOpen(false);
    onNavigate(name);
  };

  const navBtn =
    'rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15';

  const mobileBtn =
    'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white/95 transition hover:bg-white/15';

  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-emerald-900 via-emerald-700 to-teal-600 pt-safe text-white shadow-lg shadow-emerald-900/20">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
        <button
          className="flex items-center gap-2.5"
          onClick={() => go('home')}
          aria-label="LaporWarga — beranda"
        >
          <Logo size={38} tone="light" textClassName="hidden sm:inline" />
        </button>

        {/* Navigasi desktop */}
        <nav className="hidden items-center gap-2 md:flex">
          <button className={navBtn} onClick={() => go('home')}>
            Beranda
          </button>
          <button className={navBtn} onClick={() => go('about')}>
            Tentang
          </button>
          <button className={`${navBtn} inline-flex items-center gap-1.5`} onClick={() => go('dashboard')}>
            <BarChart3 className="h-4 w-4" /> Statistik
          </button>
          {user?.role === 'petugas' && (
            <button className={`${navBtn} inline-flex items-center gap-1.5`} onClick={() => go('kelola')}>
              <ClipboardList className="h-4 w-4" /> Kelola
            </button>
          )}
          {user?.role === 'admin' && (
            <button className={`${navBtn} inline-flex items-center gap-1.5`} onClick={() => go('admin')}>
              <ShieldCheck className="h-4 w-4" /> Admin
            </button>
          )}
          <button
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            onClick={() => go('form')}
          >
            + Buat Laporan
          </button>

          {user ? (
            <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-sm font-semibold lg:inline-flex">
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
              onClick={() => go('auth')}
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

        {/* Tombol aksi + menu hamburger di mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            className="rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            onClick={() => go('form')}
          >
            + Lapor
          </button>
          <button
            className="rounded-lg p-2 text-white/90 transition hover:bg-white/15"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Menu dropdown mobile */}
      {open && (
        <nav className="border-t border-white/15 px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            <button className={mobileBtn} onClick={() => go('home')}>
              Beranda
            </button>
            <button className={mobileBtn} onClick={() => go('about')}>
              Tentang
            </button>
            <button className={mobileBtn} onClick={() => go('dashboard')}>
              <BarChart3 className="h-4 w-4" /> Statistik
            </button>
            {user?.role === 'petugas' && (
              <button className={mobileBtn} onClick={() => go('kelola')}>
                <ClipboardList className="h-4 w-4" /> Kelola
              </button>
            )}
            {user?.role === 'admin' && (
              <button className={mobileBtn} onClick={() => go('admin')}>
                <ShieldCheck className="h-4 w-4" /> Admin
              </button>
            )}
            <button className={mobileBtn} onClick={() => go('form')}>
              + Buat Laporan
            </button>

            <div className="my-2 h-px bg-white/15" />

            {user ? (
              <>
                <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white/90">
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
                <button className={mobileBtn} onClick={onLogout}>
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              </>
            ) : (
              <button className={mobileBtn} onClick={() => go('auth')}>
                <LogIn className="h-4 w-4" /> Masuk
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
