import { useEffect, useRef, useState } from 'react';

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

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 text-white transition-transform duration-500 ease-in-out ${
        leaving ? '-translate-y-full' : 'translate-y-0'
      }`}
      role="status"
      aria-live="polite"
    >
      {/* aksen garis tipis di pojok */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-16 w-16 border-l border-t border-white/15" />
        <div className="absolute bottom-0 right-0 h-16 w-16 border-b border-r border-white/15" />
      </div>

      <p className="mb-6 text-xs font-bold uppercase tracking-[0.35em] text-emerald-400">
        Portal Lapor Warga
      </p>

      <div className="font-black leading-none tracking-tighter tabular-nums text-white">
        <span className="text-7xl md:text-9xl">{progress}</span>
        <span className="text-3xl text-emerald-400 md:text-5xl">%</span>
      </div>

      <div className="mt-8 h-px w-64 overflow-hidden bg-white/15 md:w-80">
        <div
          className="h-full bg-emerald-400 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-10 flex max-w-2xl flex-wrap justify-center gap-x-2 gap-y-1 px-6 text-center text-lg font-semibold tracking-tight text-white/85 md:text-2xl">
        {WORDS.map((w, i) => (
          <span key={i} className="word-in" style={{ animationDelay: `${250 + i * 110}ms` }}>
            {w}
          </span>
        ))}
      </p>

      <p className="mt-8 min-h-[1.25rem] text-sm font-semibold text-white/60">
        {name ? `Selamat datang, ${name}` : 'Menyiapkan dasbor Anda…'}
      </p>
    </div>
  );
}
