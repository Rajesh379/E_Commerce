import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Search, ShieldCheck, Star } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { LanguageBar } from '../components/LanguageBar';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { CITIES, SERVICE_CATEGORIES } from '../i18n/translations';
import type { WorkerProfile } from '../types';

export function WorkersDirectoryPage() {
  const { t } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('rating');

  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (city) params.set('city', city);
      if (category && category !== 'All') params.set('category', category);
      if (verifiedOnly) params.set('verifiedOnly', 'true');
      if (availableOnly) params.set('availableOnly', 'true');
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (sort) params.set('sort', sort);

      const res = await apiRequest<{ workers: WorkerProfile[] }>(`/api/workers?${params.toString()}`);
      setWorkers(res.workers);
    } catch (err: any) {
      setError(err.message || 'Failed to load workers');
    } finally {
      setLoading(false);
    }
  }, [q, city, category, verifiedOnly, availableOnly, maxPrice, sort]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleReset = () => {
    setQ('');
    setCity('');
    setCategory('All');
    setVerifiedOnly(false);
    setAvailableOnly(false);
    setMaxPrice('');
    setSort('rating');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A]">
                {t('navBrowse')}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Verified technicians across Hyderabad and Jamshoro with upfront service rates.
              </p>
            </div>
            <LanguageBar />
          </div>

          {/* Filter Bar */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full text-sm focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
              <MapPin className="h-4 w-4 text-[#0D9488] shrink-0" />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-sm bg-transparent focus:outline-none"
              >
                <option value="">{t('allCities')}</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Any Budget (PKR)</option>
              <option value="1500">Up to PKR 1,500</option>
              <option value="2500">Up to PKR 2,500</option>
              <option value="5000">Up to PKR 5,000</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none"
            >
              <option value="rating">Sort: Top Rated</option>
              <option value="price_asc">Sort: Lowest Price</option>
              <option value="experience">Sort: Most Experienced</option>
            </select>

            <div className="flex items-center gap-4 px-1">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488]"
                />
                <span>Verified</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488]"
                />
                <span>Available</span>
              </label>
            </div>
          </div>

          {/* Category segmented tabs */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === cat
                    ? 'bg-[#0B1F3A] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-xl border border-slate-200 bg-white p-6 animate-pulse" />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="font-display text-lg font-semibold text-[#0B1F3A]">
              {t('noResults')}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 rounded-lg bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F766E] cursor-pointer"
            >
              {t('clearFilters')}
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-[#0D9488]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
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
                        <h2 className="font-display text-base font-bold text-[#0B1F3A] truncate">
                          {worker.full_name}
                        </h2>
                        <p className="text-xs text-slate-500 truncate">
                          {worker.category} · {worker.city}
                        </p>
                      </div>
                    </div>
                    {worker.verification_status === 'verified' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-700 shrink-0">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A]">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {worker.avg_rating > 0 ? worker.avg_rating.toFixed(1) : 'New'} ({worker.total_reviews})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{worker.experience_years} {t('yearsExp')}</span>
                    <span aria-hidden="true">·</span>
                    <span className={worker.is_available ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                      {worker.is_available ? t('availableNow') : t('unavailable')}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {worker.bio || `Available in ${worker.areas_covered}`}
                  </p>

                  <p className="mt-2 text-xs text-slate-500 truncate">
                    Areas: {worker.areas_covered || worker.area || worker.city}
                  </p>

                  {worker.services && worker.services.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3 space-y-1.5">
                      {worker.services.slice(0, 2).map((srv) => (
                        <div key={srv.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-700 truncate">{srv.title}</span>
                          <span className="font-mono font-semibold text-[#0B1F3A] tabular-nums shrink-0">
                            PKR {srv.price_pkr.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-[11px] text-slate-500">{t('startingFrom')}</p>
                    <p className="font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                      {worker.starting_price_pkr
                        ? `PKR ${worker.starting_price_pkr.toLocaleString()}`
                        : 'Custom Quote'}
                    </p>
                  </div>
                  <Link
                    to={`/workers/${worker.id}`}
                    className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#132d52] whitespace-nowrap"
                  >
                    {t('viewProfile')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
