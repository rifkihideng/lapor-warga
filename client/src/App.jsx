import { lazy, Suspense, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import Navbar from './components/Navbar.jsx';
import Home from './components/Home.jsx';
import ReportForm from './components/ReportForm.jsx';
import ReportDetail from './components/ReportDetail.jsx';
import AuthPage from './components/AuthPage.jsx';
import About from './components/About.jsx';
import CinematicLoader from './components/CinematicLoader.jsx';

// Dashboard dimuat terpisah (lazy) karena menarik library grafik recharts yang besar.
const Dashboard = lazy(() => import('./components/Dashboard.jsx'));
const PetugasPanel = lazy(() => import('./components/PetugasPanel.jsx'));
const AdminPage = lazy(() => import('./components/AdminPage.jsx'));

// Pemetaan path URL → view (routing ringan tanpa library)
function viewFromPath() {
  const path = window.location.pathname;
  if (path === '/admin') return { name: 'admin', id: null };
  if (path === '/kelola') return { name: 'kelola', id: null };
  return { name: 'home', id: null };
}

export default function App() {
  const [view, setView] = useState(viewFromPath);
  const [stats, setStats] = useState({ total: 0, statusCounts: {}, byCategory: [] });
  const [user, setUser] = useState(null);
  const [showLoader, setShowLoader] = useState(true); // intro saat membuka website

  const navigate = (name, id = null) => {
    setView({ name, id });
    // Sinkronkan URL: /admin & /kelola punya path sendiri, halaman lain memakai /
    const path = name === 'admin' ? '/admin' : name === 'kelola' ? '/kelola' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshStats = () => {
    api.getStats().then(setStats).catch(() => {});
  };

  useEffect(refreshStats, []);

  // Sinkronkan view dengan tombol back/forward browser
  useEffect(() => {
    const onPop = () => setView(viewFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Pulihkan sesi dari token yang tersimpan
  useEffect(() => {
    if (!getToken()) return;
    api.me()
      .then((res) => setUser(res.user))
      .catch(() => setToken(null));
  }, []);

  const handleLogin = (token, userInfo) => {
    setToken(token);
    setUser(userInfo);
    navigate('home');
  };

  const finishLoader = () => {
    setShowLoader(false);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    navigate('home');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f8f6]">
      <Navbar onNavigate={navigate} user={user} onLogout={handleLogout} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-7">
        <div key={`${view.name}-${view.id || ''}`} className="animate-page-in">
          {view.name === 'home' && <Home stats={stats} onNavigate={navigate} user={user} onChanged={refreshStats} />}
          {view.name === 'form' && <ReportForm onNavigate={navigate} onSubmitted={refreshStats} user={user} />}
          {view.name === 'detail' && <ReportDetail id={view.id} onNavigate={navigate} onChanged={refreshStats} user={user} />}
          {view.name === 'auth' && <AuthPage onLogin={handleLogin} onNavigate={navigate} user={user} onLogout={handleLogout} />}
          {view.name === 'about' && <About onNavigate={navigate} stats={stats} />}
          {view.name === 'dashboard' && (
            <Suspense fallback={<p className="text-sm text-slate-500">Memuat statistik...</p>}>
              <Dashboard user={user} />
            </Suspense>
          )}
          {view.name === 'admin' && (
            <Suspense fallback={<p className="text-sm text-slate-500">Memuat panel admin...</p>}>
              <AdminPage user={user} onNavigate={navigate} />
            </Suspense>
          )}
          {view.name === 'kelola' && (
            <Suspense fallback={<p className="text-sm text-slate-500">Memuat panel petugas...</p>}>
              <PetugasPanel user={user} onNavigate={navigate} onChanged={refreshStats} />
            </Suspense>
          )}
        </div>
      </main>
      <footer className="bg-gradient-to-r from-emerald-900 to-emerald-600 py-6 text-center text-sm font-medium text-white/90">
        Portal Lapor Warga — Bersama membangun lingkungan yang lebih baik.
      </footer>

      {showLoader && <CinematicLoader onDone={finishLoader} name={user ? user.full_name || user.username : ''} />}
    </div>
  );
}
