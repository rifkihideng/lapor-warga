import { useEffect, useState } from 'react';

/**
 * Mengembalikan offset scroll untuk efek parallax.
 * factor = seberapa cepat elemen bergeser relatif terhadap scroll (biasanya 0.1–0.5).
 */
export default function useParallax(factor = 0.3) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setOffset(window.scrollY * factor));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [factor]);

  return offset;
}
