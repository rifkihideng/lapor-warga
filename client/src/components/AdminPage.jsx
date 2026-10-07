import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, LogIn, Pencil, Plus, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { api } from '../api.js';

export default function AdminPage({ user, onNavigate }) {
  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">Akses khusus admin</h2>
        <p className="mt-1 text-sm text-slate-500">
          {user
            ? `Anda sedang masuk sebagai @${user.username} (petugas).`
            : 'Halaman ini hanya untuk administrator.'}
        </p>
        <button
          onClick={() => onNavigate('auth')}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <LogIn className="h-4 w-4" /> Masuk sebagai admin
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
          <ShieldCheck className="h-7 w-7 text-emerald-600" /> Panel Admin
        </h1>
        <p className="mt-1 text-sm text-slate-500">Kelola akun petugas dan pantau kinerjanya.</p>
      </div>

      <ManageOfficers />
      <OfficerPerformance />
    </div>
  );
}

function OfficerPerformance() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getOfficerStats()
      .then((res) => setOfficers(res.data || []))
      .catch(() => setOfficers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 p-4">
        <Users className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-slate-900">Kinerja Petugas</h2>
      </div>
      {loading ? (
        <p className="p-6 text-sm text-slate-500">Memuat kinerja petugas...</p>
      ) : officers.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">Belum ada akun petugas terdaftar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Petugas</th>
                <th className="px-4 py-3">Ditugaskan</th>
                <th className="px-4 py-3">Dalam Proses</th>
                <th className="px-4 py-3">Selesai</th>
                <th className="px-4 py-3">Rata-rata Penyelesaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {officers.map((o) => (
                <tr key={o.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{o.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{o.assigned_count}</td>
                  <td className="px-4 py-3 text-slate-600">{o.in_progress_count}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-bold text-green-700">
                      <CheckCircle2 className="h-4 w-4" /> {o.resolved_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {o.avg_resolution_hours != null ? `${o.avg_resolution_hours} jam` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ManageOfficers() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .getPetugas()
      .then((res) => setOfficers(res.data || []))
      .catch(() => setOfficers([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.createPetugas({ username, password, full_name: fullName });
      setUsername('');
      setFullName('');
      setPassword('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (o) => {
    if (!window.confirm(`Hapus akun petugas "${o.username}"? Laporan yang ditugaskan kepadanya akan dilepas (tidak dihapus).`)) return;
    try {
      await api.deletePetugas(o.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const [editingId, setEditingId] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (o) => {
    setEditingId(o.id);
    setEditUsername(o.username);
    setEditFullName(o.full_name || '');
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const saveEdit = async () => {
    setEditError('');
    setSavingEdit(true);
    try {
      await api.updatePetugas(editingId, { username: editUsername, full_name: editFullName });
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const [resettingId, setResettingId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [savingReset, setSavingReset] = useState(false);

  const startReset = (o) => {
    setEditingId(null);
    setResettingId(o.id);
    setNewPassword('');
    setResetError('');
  };

  const cancelReset = () => {
    setResettingId(null);
    setResetError('');
  };

  const saveReset = async () => {
    setResetError('');
    if (newPassword.length < 6) {
      setResetError('Kata sandi minimal 6 karakter.');
      return;
    }
    setSavingReset(true);
    try {
      await api.resetPetugasPassword(resettingId, newPassword);
      setResettingId(null);
      load();
    } catch (err) {
      setResetError(err.message);
    } finally {
      setSavingReset(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <UserPlus className="h-5 w-5 text-emerald-600" /> Tambah Petugas
        </h2>
        <p className="mt-1 text-sm text-slate-500">Buat akun petugas agar bisa ditugaskan dan punya identitas sendiri di audit log.</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              placeholder="mis. budi-petugas"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600">Nama Lengkap</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              placeholder="mis. Budi Santoso"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600">Kata Sandi</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              placeholder="minimal 6 karakter"
            />
          </div>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Tambah Petugas'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Users className="h-5 w-5 text-emerald-600" /> Daftar Petugas
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Memuat petugas...</p>
        ) : officers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Belum ada akun petugas.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Jumlah Laporan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officers.map((o) => {
                  if (editingId === o.id) {
                    return (
                    <tr key={o.id} className="bg-emerald-50/40">
                      <td className="px-4 py-3">
                        <input
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{o.report_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={savingEdit}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {savingEdit ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                          >
                            Batal
                          </button>
                        </div>
                        {editError && <p className="mt-1 text-xs font-semibold text-red-600">{editError}</p>}
                      </td>
                    </tr>
                    );
                  }
                  if (resettingId === o.id) {
                    return (
                    <tr key={o.id} className="bg-amber-50/40">
                      <td className="px-4 py-3 font-bold text-slate-800">@{o.username}</td>
                      <td className="px-4 py-3 text-slate-600">{o.full_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{o.report_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1.5">
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Kata sandi baru (min. 6)"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={saveReset}
                              disabled={savingReset}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {savingReset ? 'Menyimpan...' : 'Simpan'}
                            </button>
                            <button
                              onClick={cancelReset}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                              Batal
                            </button>
                          </div>
                          {resetError && <p className="text-xs font-semibold text-red-600">{resetError}</p>}
                        </div>
                      </td>
                    </tr>
                    );
                  }
                  return (
                    <tr key={o.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800">@{o.username}</td>
                      <td className="px-4 py-3 text-slate-600">{o.full_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{o.report_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(o)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                            title="Edit petugas"
                            aria-label="Edit petugas"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => startReset(o)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                            title="Reset kata sandi"
                            aria-label="Reset kata sandi"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(o)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Hapus petugas"
                            aria-label="Hapus petugas"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
