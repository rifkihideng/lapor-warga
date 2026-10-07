import { useId } from 'react';

export default function Logo({
  size = 38,
  withText = true,
  tone = 'dark',
  textClassName = '',
  className = ''
}) {
  const gradientId = useId();
  const textTone =
    tone === 'light'
      ? { base: 'text-white', accent: 'text-emerald-200' }
      : { base: 'text-slate-900', accent: 'text-emerald-600' };

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="relative grid shrink-0 place-items-center rounded-xl shadow-lg shadow-emerald-900/25"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#10b981" />
              <stop offset="0.55" stopColor="#0d9488" />
              <stop offset="1" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${gradientId})`} />
          <rect
            x="2.5"
            y="2.5"
            width="35"
            height="35"
            rx="9.5"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
          />
          <g
            transform="translate(8 8)"
            fill="none"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 11 18-5v12L3 14v-3z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
          </g>
        </svg>
      </span>

      {withText && (
        <span className={`text-lg font-extrabold leading-none tracking-tight ${textTone.base} ${textClassName}`}>
          Lapor<span className={textTone.accent}>Warga</span>
        </span>
      )}
    </span>
  );
}
