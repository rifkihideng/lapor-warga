import { useState } from 'react';
import {
  Award,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Flag,
  HeartHandshake,
  HelpCircle,
  Mail,
  Map,
  MapPin,
  Megaphone,
  MessageSquare,
  Phone,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  ThumbsUp,
  TrendingUp,
  Users,
  Wrench
} from 'lucide-react';
import { CATEGORIES } from '../constants.js';
import { CATEGORY_ICONS } from '../icons.jsx';
import Reveal from './Reveal.jsx';
import useParallax from '../hooks/useParallax.js';

const STEPS = [
  { icon: ClipboardList, title: 'Laporkan', desc: 'Isi formulir laporan — judul, kategori, deskripsi, foto, dan titik lokasi di peta.' },
  { icon: BellRing, title: 'Pantau', desc: 'Lihat status laporan berubah dari Baru → Diproses → Selesai lewat riwayat yang transparan.' },
  { icon: HeartHandshake, title: 'Tindak lanjut', desc: 'Petugas menanggapi, menugaskan, dan menyelesaikan laporan untuk masyarakat.' },
  { icon: CheckCircle2, title: 'Beri nilai', desc: 'Warga dapat mendukung (upvote), berkomentar, dan memberi rating kepuasan.' }
];

const VALUES = [
  { icon: Target, title: 'Misi', desc: 'Menjembatani suara warga dengan aksi nyata pemerintah/petugas melalui kanal pelaporan yang mudah dan terbuka.' },
  { icon: Sparkles, title: 'Visi', desc: 'Lingkungan yang lebih baik, aman, dan bersih — dibangun bersama oleh masyarakat yang aktif melapor.' },
  { icon: ShieldCheck, title: 'Nilai', desc: 'Transparansi status laporan, keamanan data, dan kemudahan akses untuk semua warga.' }
];

const FEATURES = [
  { icon: Map, title: 'Peta Interaktif', desc: 'Lihat sebaran laporan, marker cluster, dan pencarian "Di Sekitar Saya" dalam radius 5 km.' },
  { icon: Route, title: 'Rute ke Lokasi', desc: 'Arahkan rute langsung ke lokasi laporan lewat Google Maps tanpa perlu API key.' },
  { icon: MessageSquare, title: 'Diskusi & Tanggapan', desc: 'Komentar warga serta tanggapan resmi petugas pada setiap laporan.' },
  { icon: ThumbsUp, title: 'Dukungan & Rating', desc: 'Upvote laporan penting dan beri rating kepuasan setelah selesai ditangani.' }
];

const CONTACTS = [
  { icon: Mail, title: 'Email', value: 'lapor@warga.go.id', desc: 'Kirim pertanyaan atau masukan' },
  { icon: Phone, title: 'Telepon / WhatsApp', value: '021-5550-1234', desc: 'Senin–Jumat, 08.00–16.00 WIB' },
  { icon: Clock, title: 'Jam Layanan', value: '24 Jam Online', desc: 'Pelaporan daring selalu terbuka' },
  { icon: MapPin, title: 'Kantor', value: 'Jl. Merdeka No. 1', desc: 'Jakarta Pusat, DKI Jakarta' }
];

const FAQS = [
  {
    q: 'Apakah membuat laporan gratis?',
    a: 'Ya, sepenuhnya gratis. Anda tidak perlu membayar apa pun untuk melaporkan masalah di lingkungan sekitar.'
  },
  {
    q: 'Apakah saya harus mendaftar untuk melapor?',
    a: 'Tidak wajib. Anda bisa melapor sebagai tamu. Namun dengan mendaftar/masuk, laporan Anda tersimpan di "Laporan Saya" dan Anda bisa memberi rating setelah selesai.'
  },
  {
    q: 'Bagaimana laporan saya ditindaklanjuti?',
    a: 'Setiap laporan masuk dengan status Baru. Petugas akan meninjau, mengubah status menjadi Diproses, lalu Selesai setelah ditangani. Semua perubahan tercatat di riwayat status.'
  },
  {
    q: 'Apa saja yang bisa dilaporkan?',
    a: 'Infrastruktur (jalan rusak), kebersihan (sampah), penerangan (lampu padam), banjir/genangan, keamanan, dan masalah lain di lingkungan Anda.'
  },
  {
    q: 'Apakah lokasi saya wajib dicantumkan?',
    a: 'Lokasi membantu petugas menemukan titik masalah, terutama fitur "Di Sekitar Saya" dan rute. Namun jika khawatir privasi, Anda bisa melapor secara anonim tanpa menyebut identitas.'
  }
];

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="group flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/10">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${accent}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-2xl font-extrabold leading-none text-slate-900 transition-colors group-hover:text-emerald-700">{value}</div>
        <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function About({ onNavigate, stats = { total: 0, statusCounts: {} } }) {
  const [openFaq, setOpenFaq] = useState(0);
  const parallaxTop = useParallax(0.2);
  const parallaxBottom = useParallax(0.35);
  const sc = stats.statusCounts || {};
  const statItems = [
    { icon: Award, label: 'Laporan Terselesaikan', value: sc.selesai || 0, accent: 'bg-green-50 text-green-600' },
    { icon: TrendingUp, label: 'Total Laporan', value: stats.total || 0, accent: 'bg-indigo-50 text-indigo-600' },
    { icon: Wrench, label: 'Sedang Diproses', value: sc.diproses || 0, accent: 'bg-amber-50 text-amber-600' },
    { icon: BellRing, label: 'Laporan Baru', value: sc.baru || 0, accent: 'bg-blue-50 text-blue-600' }
  ];

  return (
    <div className="space-y-14">
      {/* Hero */}
      <Reveal>
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 p-8 text-white shadow-xl shadow-emerald-900/20 md:p-12">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl"
            style={{ transform: `translateY(${parallaxTop}px)` }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-emerald-300/20 blur-2xl"
            style={{ transform: `translateY(${-parallaxBottom}px)` }}
          />
          <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
            <Megaphone className="h-3.5 w-3.5" /> Tentang Kami
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Tentang <span className="text-emerald-200">LaporWarga</span>
          </h1>
          <p className="mt-4 text-white/90 md:text-lg">
            Portal Lapor Warga adalah platform pelaporan masalah lingkungan yang menghubungkan masyarakat
            dengan petugas secara terbuka dan transparan. Jalan rusak, banjir, sampah menumpuk, lampu padam —
            semua bisa dilaporkan dan dipantau sampai tuntas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('form')}
              className="rounded-xl bg-white px-6 py-3 font-bold text-emerald-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              + Buat Laporan Sekarang
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20"
            >
              Lihat Laporan
            </button>
          </div>
        </div>
        </section>
      </Reveal>

      {/* Statistik */}
      <Reveal delay={60}>
        <section className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
          {statItems.map(({ icon, label, value, accent }) => (
            <StatCard key={label} icon={icon} label={label} value={value} accent={accent} />
          ))}
        </section>
      </Reveal>

      {/* Misi / Visi / Nilai */}
      <Reveal delay={80}>
        <section className="grid gap-4 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/10">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900 transition-colors group-hover:text-emerald-700">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
            </div>
          ))}
        </section>
      </Reveal>

      {/* Cara kerja */}
      <Reveal delay={80}>
        <section>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Cara Kerja</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/10">
                <span className="absolute right-4 top-3 text-4xl font-extrabold text-emerald-100 transition-colors group-hover:text-emerald-200">{i + 1}</span>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900 transition-colors group-hover:text-emerald-700">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Kategori */}
      <Reveal delay={80}>
        <section>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Kategori Laporan</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <div key={cat} className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-105 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/10">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold text-slate-700 transition-colors group-hover:text-emerald-700">{cat}</span>
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* Fitur unggulan */}
      <Reveal delay={80}>
        <section>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Fitur Unggulan</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/10">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900 transition-colors group-hover:text-emerald-700">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Kontak */}
      <Reveal delay={80}>
        <section>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Hubungi Kami</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONTACTS.map(({ icon: Icon, title, value, desc }) => (
              <div key={title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/10">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-400 transition-colors group-hover:text-emerald-500">{title}</h3>
                <p className="mt-1 font-bold text-slate-900 transition-colors group-hover:text-emerald-700">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* FAQ */}
      <Reveal delay={80}>
        <section>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Pertanyaan Umum (FAQ)</h2>
          </div>
          <div className="mt-5 space-y-3">
            {FAQS.map(({ q, a }, i) => {
              const open = openFaq === i;
              return (
                <div key={q} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <button
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                    onClick={() => setOpenFaq(open ? -1 : i)}
                  >
                    <span className="font-bold text-slate-900">{q}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <p className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">{a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* CTA */}
      <Reveal delay={80}>
        <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center md:p-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-200/40 blur-2xl" />
          <div className="relative">
            <Users className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
              Siap menjadi bagian dari perubahan?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-600">
              Satu laporan kecil dari Anda bisa membawa perubahan besar bagi lingkungan sekitar.
              Mari laporkan dan pantau bersama.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => onNavigate('form')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                <Flag className="h-4 w-4" /> Laporkan Sekarang
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-6 py-3 font-bold text-emerald-700 transition hover:bg-emerald-50"
              >
                <MapPin className="h-4 w-4" /> Lihat Laporan
              </button>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
