import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Wrench,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { LanguageBar } from '../components/LanguageBar';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { CITIES, SERVICE_CATEGORIES } from '../i18n/translations';
import type { WorkerProfile } from '../types';

const HERO_IMAGE = '/src/assets/images/hero_eworkers_craftsmen_1794725969639.jpg';
const TOOLS_IMAGE = '/src/assets/images/service_tools_showcase_1794725969745.jpg';

export function HomePage() {
  const { t, user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('');
  const [featuredWorkers, setFeaturedWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ workers: WorkerProfile[] }>('/api/workers?verifiedOnly=true')
      .then((res) => setFeaturedWorkers(res.workers.slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (city) params.set('city', city);
    navigate(`/workers?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-slate-200 bg-slate-50/70">
          <div className="mx-auto max-w-7xl px-6 pt-6 pb-16 lg:pt-8 lg:pb-20">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs font-semibold tracking-wide text-[#0F766E]">
                {t('heroKicker')}
              </p>
              <LanguageBar />
            </div>

            <div className="grid gap-10 lg:grid-cols-12 lg:items-stretch">
              <div className="flex flex-col justify-center lg:col-span-7">
                <h1
                  className="font-display font-bold tracking-tight text-[#0B1F3A] text-balance"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', lineHeight: 1.1 }}
                >
                  {t('heroTitle')}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                  {t('heroSubtitle')}
                </p>

                <form
                  onSubmit={handleSearch}
                  className="mt-8 flex flex-col sm:flex-row gap-2.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm max-w-2xl"
                >
                  <div className="flex flex-1 items-center gap-2.5 px-3">
                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchPlaceholder')}
                      className="w-full py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-s border-slate-200 px-3 pt-2 sm:pt-0">
                    <MapPin className="h-4 w-4 text-[#0D9488] shrink-0" />
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      aria-label="Select city"
                      className="bg-transparent py-2 text-sm font-medium text-slate-700 focus:outline-none"
                    >
                      <option value="">{t('allCities')}</option>
                      {CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#0D9488] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F766E] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t('findWorkers')}
                  </button>
                </form>

                <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-600">
                  <Link
                    to={user ? '/workers' : '/register'}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#0B1F3A] hover:text-[#0D9488] transition-colors"
                  >
                    <span>{user ? t('navBrowse') : t('joinAsWorker')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-slate-300" aria-hidden="true">|</span>
                  <span>Qasimabad · Latifabad · Saddar · Jamshoro · Kotri</span>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="relative h-72 lg:h-full min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-[#0B1F3A]">
                  <img
                    src={HERO_IMAGE}
                    alt="Verified E Workers technician inspecting residential electrical distribution panel"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061325]/90 via-[#061325]/45 to-transparent p-6 text-white">
                    <p className="text-xs font-medium text-teal-300">
                      Hyderabad & Jamshoro Operations
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold">
                      CNIC-screened technicians with transparent PKR pricing
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-width 4-column metric strip */}
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">Launch Service Cities</p>
                <p className="mt-1 font-display text-lg font-bold text-[#0B1F3A]">
                  Hyderabad & Jamshoro
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">Identity Screening</p>
                <p className="mt-1 font-display text-lg font-bold text-[#0B1F3A]">
                  100% CNIC Verified
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">Pricing Model</p>
                <p className="mt-1 font-display text-lg font-bold text-[#0B1F3A] tabular-nums">
                  From PKR 900 / visit
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">Languages Supported</p>
                <p className="mt-1 font-display text-lg font-bold text-[#0B1F3A]">
                  English · اردو · سنڌي
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B1F3A]">
                Trade Categories
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Select a service category to filter available technicians in your neighborhood.
              </p>
            </div>
            <Link
              to="/workers"
              className="text-sm font-semibold text-[#0D9488] hover:text-[#0F766E] whitespace-nowrap"
            >
              View all specialists →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SERVICE_CATEGORIES.filter((c) => c !== 'All').map((cat, idx) => (
              <Link
                key={cat}
                to={`/workers?category=${encodeURIComponent(cat)}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-[#0D9488] hover:bg-teal-50/30"
              >
                <p className="font-mono text-xs text-slate-400 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </p>
                <p className="mt-2 font-display text-base font-semibold text-[#0B1F3A] group-hover:text-[#0F766E]">
                  {cat}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Hyderabad & Jamshoro
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Verified Workers */}
        <section className="border-y border-slate-200 bg-slate-50/70 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B1F3A]">
                  {t('featuredTitle')}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {t('featuredSubtitle')}
                </p>
              </div>
              <Link
                to="/workers"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0B1F3A] hover:bg-slate-50 whitespace-nowrap"
              >
                {t('navBrowse')}
              </Link>
            </div>

            {loading ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-72 rounded-xl border border-slate-200 bg-white p-5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {featuredWorkers.map((worker) => (
                  <Link
                    key={worker.id}
                    to={`/workers/${worker.id}`}
                    className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-[#0D9488]"
                  >
                    <div>
                      <div className="flex items-center gap-3.5">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-[#0B1F3A] flex items-center justify-center text-white font-display font-bold">
                          {worker.avatar_url ? (
                            <img
                              src={worker.avatar_url}
                              alt={worker.full_name}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{worker.full_name?.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-semibold text-[#0B1F3A] truncate group-hover:text-[#0D9488]">
                            {worker.full_name}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">
                            {worker.category} · {worker.city}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A]">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {worker.avg_rating > 0 ? worker.avg_rating.toFixed(1) : 'New'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{worker.experience_years} {t('yearsExp')}</span>
                        <span aria-hidden="true">·</span>
                        <span>{worker.total_jobs} {t('jobsDone')}</span>
                      </div>

                      <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {worker.bio || `Serving ${worker.areas_covered}`}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-[11px] text-slate-500">{t('startingFrom')}</p>
                        <p className="font-mono text-sm font-semibold text-[#0B1F3A] tabular-nums">
                          {worker.starting_price_pkr
                            ? `PKR ${worker.starting_price_pkr.toLocaleString()}`
                            : 'Quote on chat'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
                        <ShieldCheck className="h-4 w-4" />
                        {t('verified')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-4/3">
                <img
                  src={TOOLS_IMAGE}
                  alt="Precision home electrical and plumbing service tools"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B1F3A]">
                  {t('howTitle')}
                </h2>
                <p className="mt-2 text-sm text-slate-600 max-w-xl">
                  Built for households and businesses across Hyderabad and Jamshoro with real-time scheduling and verified identity checks.
                </p>
              </div>

              <div className="divide-y divide-slate-200 border-y border-slate-200">
                <div className="py-4">
                  <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
                    {t('step1Title')}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{t('step1Desc')}</p>
                </div>
                <div className="py-4">
                  <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
                    {t('step2Title')}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{t('step2Desc')}</p>
                </div>
                <div className="py-4">
                  <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
                    {t('step3Title')}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{t('step3Desc')}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  to="/workers"
                  className="rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#132d52]"
                >
                  {t('findWorkers')}
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1F3A] hover:bg-slate-50"
                >
                  {t('joinAsWorker')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-[#0B1F3A] text-slate-300">
        <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="font-display text-lg font-bold text-white">{t('brand')}</p>
            <p className="mt-1 text-xs text-slate-400">
              Hyderabad (Qasimabad, Latifabad, Saddar, Autobhan) · Jamshoro (Sindh University, MUET, LUMHS, Kotri)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link to="/workers" className="hover:text-white">{t('navBrowse')}</Link>
            <Link to="/login" className="hover:text-white">{t('signIn')}</Link>
            <Link to="/register" className="hover:text-white">{t('getStarted')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
