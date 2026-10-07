import { useEffect, useRef, useState } from 'react';
import Logo from './Logo.jsx';

const WORDS = ['Bersama', 'kita', 'bangun', 'lingkungan', 'yang', 'lebih', 'baik'];

export default function CinematicLoader({ onDone, name = '' }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const duration = 2200;
    const start = performance.now();
    let timer;

    const interval = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      // easing easeInOutCubic agar terasa sinematik
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setProgress(Math.round(eased * 100));
      if (t >= 1) {
        clearInterval(interval);
        setProgress(100);
        setLeaving(true);
        timer = setTimeout(() => onDoneRef.current(), 600);
      }
    }, 30);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const R = 84;
  const C = 2 * Math.PI * R;

  return (
    <div
      className={`cinematic-bg fixed inset-0 z-50 flex items-center justify-center overflow-hidden text-white transition-all duration-700 ease-in-out ${
        leaving ? 'scale-[1.04] opacity-0' : 'scale-100 opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      {/* blob gradasi yang melayang */}
      <div className="blob pointer-events-none absolute -left-32 top-[10%] h-96 w-96 rounded-full bg-emerald-500/12 blur-3xl" />
      <div className="blob pointer-events-none absolute -right-24 top-[35%] h-[28rem] w-[28rem] rounded-full bg-teal-400/10 blur-3xl" style={{ animationDelay: '1.4s' }} />
      <div className="blob pointer-events-none absolute bottom-[-6rem] left-[16%] h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" style={{ animationDelay: '2.3s' }} />

      {/* partikel kecil naik ke atas */}
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: `${(i * 7.7 + 5) % 100}%`,
            animationDelay: `${(i * 0.4) % 3}s`,
            animationDuration: `${4.5 + (i % 5)}s`
          }}
        />
      ))}

      {/* cincin aurora berputar di belakang */}
      <div
        className="conic pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] rounded-full opacity-20 blur-3xl"
        style={{ marginLeft: '-18rem', marginTop: '-18rem' }}
      />

      <div className="relative flex flex-col items-center px-8 py-12">
        {/* emblem: ring progress + ikon megafon */}
        <div className="relative mb-10 grid h-40 w-40 place-items-center md:h-44 md:w-44">
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
            <defs>
              <linearGradient id="loader-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="url(#loader-ring)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (C * progress) / 100}
              style={{ transition: 'stroke-dashoffset 80ms linear', filter: 'drop-shadow(0 0 5px rgba(16,185,129,0.4))' }}
            />
          </svg>

          <div className="icon-pulse grid h-24 w-24 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur">
            <Logo size={58} withText={false} />
          </div>
        </div>

        <p className="title-gradient mb-4 text-sm font-extrabold uppercase tracking-[0.45em]">
          Portal Lapor Warga
        </p>

        <div className="mb-8 flex items-end font-black leading-none tracking-tighter tabular-nums">
          <span className="text-gradient text-6xl md:text-7xl">{progress}</span>
          <span className="mb-1 ml-1 text-2xl font-bold text-emerald-400 md:text-3xl">%</span>
        </div>

        {/* progress bar dengan kilau berjalan */}
        <div className="h-2 w-72 overflow-hidden rounded-full bg-white/10 md:w-96">
          <div className="bar-fill h-full rounded-full" style={{ width: `${progress}%` }}>
            <span className="bar-shine block h-full w-full" />
          </div>
        </div>

        <p className="mt-10 flex max-w-2xl flex-wrap justify-center gap-x-2 gap-y-1 px-6 text-center text-lg font-semibold tracking-tight text-white/90 md:text-2xl">
          {WORDS.map((w, i) => (
            <span key={i} className="word-in" style={{ animationDelay: `${250 + i * 110}ms` }}>
              {w}
            </span>
          ))}
        </p>

        <p className="mt-8 min-h-[1.25rem] text-sm font-semibold text-white/65">
          {name ? `Selamat datang, ${name}` : 'Menyiapkan dasbor Anda…'}
        </p>
      </div>
    </div>
  );
}
