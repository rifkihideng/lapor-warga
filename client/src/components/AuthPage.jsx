import { useState } from 'react';
import { KeyRound, LogIn, LogOut, User, UserPlus } from 'lucide-react';
import { api } from '../api.js';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

export default function AuthPage({ onLogin, onNavigate, user, onLogout }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bila masih ada sesi aktif, jangan izinkan ganti akun langsung — harus keluar dulu.
  if (user) {
    const roleLabel = user.role === 'admin' ? 'Admin' : user.role === 'petugas' ? 'Petugas' : 'Warga';
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <User className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900">Anda sudah masuk</h1>
          <p className="mt-1 text-sm text-slate-500">
            Saat ini masuk sebagai <strong>@{user.username}</strong> ({roleLabel}). Keluar terlebih dahulu untuk masuk dengan akun lain.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Lanjut sebagai @{user.username}
            </button>
            <button
              onClick={() => {
                onLogout();
                onNavigate('auth');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" /> Keluar & ganti akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res =
        mode === 'login'
          ? await api.login({ username, password })
          : await api.register({ username, password, full_name: fullName });
      onLogin(res.token, res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition ${
              mode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LogIn className="h-4 w-4" /> Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition ${
              mode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserPlus className="h-4 w-4" /> Daftar
          </button>
        </div>

        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
          {mode === 'login' ? 'Masuk ke akun' : 'Daftar akun baru'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'login'
            ? 'Masuk untuk melaporkan dan memantau laporan Anda.'
            : 'Daftar sebagai warga untuk mulai melaporkan.'}
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-1">
          {mode === 'register' && (
            <>
              <label htmlFor="full_name" className="mt-3 text-sm font-bold text-slate-700">Nama Lengkap</label>
              <input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="cth: Budi Santoso"
                className={inputClass}
              />
            </>
          )}

          <label htmlFor="username" className="mt-3 text-sm font-bold text-slate-700">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username Anda"
            autoComplete="username"
            required
            className={inputClass}
          />

          <label htmlFor="password" className="mt-3 text-sm font-bold text-slate-700">Kata Sandi</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Minimal 6 karakter' : 'Kata sandi Anda'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            className={inputClass}
          />

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {submitting ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="mt-3 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Batal
          </button>
        </form>
      </div>
    </div>
  );
}
