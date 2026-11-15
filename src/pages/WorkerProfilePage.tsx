import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { CITIES } from '../i18n/translations';
import type { City, Review, WorkerProfile, WorkerService } from '../types';

export function WorkerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, t } = useAuth();
  const navigate = useNavigate();

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [services, setServices] = useState<WorkerService[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [city, setCity] = useState<City>('Hyderabad');
  const [address, setAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [scheduledTime, setScheduledTime] = useState('11:00 AM');
  const [notes, setNotes] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiRequest<{ worker: WorkerProfile; services: WorkerService[]; reviews: Review[] }>(
      `/api/workers/${id}`
    )
      .then((res) => {
        setWorker(res.worker);
        setServices(res.services);
        setReviews(res.reviews);
        setCity(res.worker.city);
        if (res.services.length > 0) {
          setSelectedServiceId(res.services[0].id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const selectedService = services.find((s) => s.id === selectedServiceId) || null;

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'customer') {
      setBookingError('Please sign in with a Customer account to book services.');
      return;
    }
    if (!worker || !selectedServiceId) return;

    setBookingBusy(true);
    setBookingError('');
    setBookingSuccess('');
    try {
      await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          worker_id: worker.id,
          service_id: selectedServiceId,
          city,
          address,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          notes,
        }),
      });
      setBookingSuccess('Booking submitted! Redirecting to your dashboard...');
      setTimeout(() => navigate('/dashboard/customer'), 1000);
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setBookingBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Link
          to="/workers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0B1F3A]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to workers directory</span>
        </Link>

        {loading && (
          <div className="mt-6 h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && worker && (
          <div className="mt-6 grid gap-8 lg:grid-cols-12">
            {/* Left: Profile, Services & Reviews */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-[#0B1F3A] flex items-center justify-center text-white font-display text-xl font-bold">
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
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-2xl font-bold text-[#0B1F3A]">
                        {worker.full_name}
                      </h1>
                      {worker.verification_status === 'verified' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
                          <ShieldCheck className="h-4 w-4" />
                          {t('verified')}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {worker.category} · {worker.city} · {worker.experience_years} {t('yearsExp')}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600 tabular-nums">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A]">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {worker.avg_rating > 0 ? worker.avg_rating.toFixed(1) : 'New'} ({worker.total_reviews} {t('reviewsLabel')})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{worker.total_jobs} {t('jobsDone')}</span>
                      <span aria-hidden="true">·</span>
                      <span className={worker.is_available ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>
                        {worker.is_available ? t('availableNow') : t('unavailable')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5 space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>{worker.bio || 'Experienced local home service specialist.'}</p>
                  <div className="flex flex-wrap gap-6 text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#0D9488]" />
                      Covered areas: {worker.areas_covered || worker.city}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#0D9488]" />
                      {worker.availability_schedule}
                    </span>
                  </div>
                </div>
              </div>

              {/* Services Price Menu */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
                  Services & Upfront Rates
                </h2>
                {services.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    This technician has not listed active service packages yet.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100">
                    {services.map((srv) => {
                      const active = selectedServiceId === srv.id;
                      return (
                        <div
                          key={srv.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 ${
                            active ? 'bg-teal-50/40 -mx-3 px-3 rounded-lg' : ''
                          }`}
                        >
                          <div>
                            <h3 className="font-semibold text-sm text-[#0B1F3A]">
                              {srv.title}
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {srv.description || srv.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-end">
                              <p className="font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                                PKR {srv.price_pkr.toLocaleString()}
                              </p>
                              <p className="text-[11px] text-slate-500">{srv.unit}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedServiceId(srv.id)}
                              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#0D9488] text-white'
                                  : 'border border-slate-300 bg-white text-[#0B1F3A] hover:bg-slate-50'
                              }`}
                            >
                              {active ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Customer Reviews */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
                  Customer Reviews ({reviews.length})
                </h2>
                {reviews.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    No customer reviews yet.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="py-4">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-[#0B1F3A]">
                            {rev.customer_name} · {rev.customer_city}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A] tabular-nums">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {rev.rating}.0
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                          {rev.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Booking Panel */}
            <div className="lg:col-span-5">
              <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
                  {t('bookService')}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Real-time request sent directly to {worker.full_name}.
                </p>

                <form onSubmit={handleBook} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Selected Service
                    </label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                    >
                      {services.length === 0 && <option value="">No active services</option>}
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} — PKR {s.price_pkr.toLocaleString()} ({s.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t('city')}
                      </label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value as City)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                      >
                        {CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Preferred Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm tabular-nums focus:border-[#0D9488] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Preferred Time Slot
                    </label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                    >
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="01:30 PM">01:30 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="06:30 PM">06:30 PM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Complete Home / Office Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      placeholder="House / Flat #, Street, Sector (e.g., Qasimabad Phase 1)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Issue Description (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe the fault or any access instructions..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
                    />
                  </div>

                  {selectedService && (
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
                      <span className="text-slate-600">Estimated Rate</span>
                      <span className="font-mono font-bold text-[#0B1F3A] tabular-nums">
                        PKR {selectedService.price_pkr.toLocaleString()} ({selectedService.unit})
                      </span>
                    </div>
                  )}

                  {bookingError && (
                    <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                      {bookingError}
                    </p>
                  )}
                  {bookingSuccess && (
                    <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                      {bookingSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={bookingBusy || services.length === 0}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0D9488] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F766E] disabled:opacity-50 cursor-pointer"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>{user ? (bookingBusy ? 'Submitting...' : t('bookService')) : 'Sign in to Book'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
