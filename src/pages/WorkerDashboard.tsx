import React, { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  MessageSquare,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { DashboardLayout, NavTab } from '../components/DashboardLayout';
import { ChatDrawer } from '../components/ChatDrawer';
import { OtpVerificationCard } from '../components/OtpVerificationCard';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { CITIES, SERVICE_CATEGORIES } from '../i18n/translations';
import type { Booking, City, WorkerProfile, WorkerService } from '../types';

export function WorkerDashboard() {
  const { user, t, subscribeRealtime, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState('jobs');

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [services, setServices] = useState<WorkerService[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    completed_earnings: 0,
    pipeline_earnings: 0,
    pending_requests: 0,
    completed_jobs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [chatBooking, setChatBooking] = useState<Booking | null>(null);

  // Add service form
  const [srvTitle, setSrvTitle] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvPrice, setSrvPrice] = useState('1500');
  const [srvUnit, setSrvUnit] = useState<'per visit' | 'per hour' | 'fixed'>('per visit');
  const [srvBusy, setSrvBusy] = useState(false);

  // Worker profile editor
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState('Electrician');
  const [expYears, setExpYears] = useState(1);
  const [city, setCity] = useState<City>('Hyderabad');
  const [areasCovered, setAreasCovered] = useState('');
  const [schedule, setSchedule] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);

  // CNIC upload
  const [cnicNumber, setCnicNumber] = useState('');
  const [cnicFront, setCnicFront] = useState<File | null>(null);
  const [cnicBack, setCnicBack] = useState<File | null>(null);
  const [cnicBusy, setCnicBusy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dash, bkRes] = await Promise.all([
        apiRequest<{ profile: WorkerProfile; services: WorkerService[]; stats: any }>('/api/worker/dashboard'),
        apiRequest<{ bookings: Booking[] }>('/api/bookings'),
      ]);
      setProfile(dash.profile);
      setServices(dash.services);
      setStats(dash.stats);
      setBookings(bkRes.bookings);

      setBio(dash.profile.bio || '');
      setCategory(dash.profile.category || 'Electrician');
      setExpYears(dash.profile.experience_years || 1);
      setCity(dash.profile.city || 'Hyderabad');
      setAreasCovered(dash.profile.areas_covered || '');
      setSchedule(dash.profile.availability_schedule || '');
      setCnicNumber(dash.profile.cnic_number || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return subscribeRealtime((evt) => {
      if (evt.type === 'booking:updated' || evt.type === 'worker:verified') {
        loadData();
      }
    });
  }, [subscribeRealtime, loadData]);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      const res = await apiRequest<{ profile: WorkerProfile }>('/api/worker/profile', {
        method: 'PUT',
        body: JSON.stringify({ is_available: !profile.is_available }),
      });
      setProfile(res.profile);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleJobStatus = async (bookingId: string, status: string) => {
    setError('');
    try {
      await apiRequest(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSrvBusy(true);
    setError('');
    try {
      await apiRequest('/api/worker/services', {
        method: 'POST',
        body: JSON.stringify({
          title: srvTitle,
          description: srvDesc,
          category: profile?.category || category,
          price_pkr: Number(srvPrice),
          unit: srvUnit,
        }),
      });
      setSrvTitle('');
      setSrvDesc('');
      setSrvPrice('1500');
      setNotice('Service added to your public profile.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSrvBusy(false);
    }
  };

  const handleToggleService = async (srv: WorkerService) => {
    try {
      await apiRequest(`/api/worker/services/${srv.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !srv.is_active }),
      });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await apiRequest(`/api/worker/services/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveWorkerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileBusy(true);
    setError('');
    setNotice('');
    try {
      await apiRequest('/api/worker/profile', {
        method: 'PUT',
        body: JSON.stringify({
          bio,
          category,
          experience_years: Number(expYears),
          city,
          areas_covered: areasCovered,
          availability_schedule: schedule,
        }),
      });
      setNotice('Worker profile updated.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProfileBusy(false);
    }
  };

  const handleUploadCnic = async (e: React.FormEvent) => {
    e.preventDefault();
    setCnicBusy(true);
    setError('');
    setNotice('');
    try {
      const fd = new FormData();
      fd.append('cnic_number', cnicNumber);
      if (cnicFront) fd.append('cnicFront', cnicFront);
      if (cnicBack) fd.append('cnicBack', cnicBack);
      await apiRequest('/api/uploads/cnic', { method: 'POST', body: fd });
      setNotice('CNIC documents uploaded and submitted for admin verification.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCnicBusy(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await apiRequest('/api/uploads/avatar', { method: 'POST', body: fd });
      await refreshSession();
      setNotice('Profile photo updated.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const tabs: NavTab[] = [
    { id: 'jobs', label: 'Jobs & Earnings', icon: <Briefcase className="h-4 w-4" />, badge: stats.pending_requests },
    { id: 'services', label: t('manageServices'), icon: <Wrench className="h-4 w-4" />, badge: services.length },
    { id: 'verification', label: t('cnicVerification'), icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'profile', label: t('profileSettings'), icon: <UserCheck className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout
      title={t('workerDashboard')}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {/* Top Worker Status Bar */}
      {profile && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-slate-500">Verification Status</p>
              <p className="mt-0.5 font-display text-sm font-bold text-[#0B1F3A] capitalize">
                {profile.verification_status === 'verified' ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    CNIC Verified
                  </span>
                ) : (
                  <span className="text-amber-700">{profile.verification_status}</span>
                )}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <p className="text-xs text-slate-500">Trade & City</p>
              <p className="mt-0.5 text-sm font-semibold text-[#0B1F3A]">
                {profile.category} · {profile.city}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleAvailability}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              profile.is_available
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {profile.is_available ? 'Status: Available for Jobs' : 'Status: Busy / Unavailable'}
          </button>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">{t('earnings')}</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#0B1F3A] tabular-nums">
                PKR {stats.completed_earnings.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">{t('pipeline')}</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#0D9488] tabular-nums">
                PKR {stats.pipeline_earnings.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">{t('pendingJobs')}</p>
              <p className="mt-1 font-mono text-xl font-bold text-amber-700 tabular-nums">
                {stats.pending_requests}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Rating & Jobs</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#0B1F3A] tabular-nums">
                {profile?.avg_rating ? profile.avg_rating.toFixed(1) : '0.0'} ★ · {stats.completed_jobs}
              </p>
            </div>
          </div>

          {/* Bookings List */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Assigned Service Requests ({bookings.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No booking requests yet. Make sure your services and CNIC verification are complete.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {bookings.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <span className="font-mono text-slate-400">#{bk.id}</span>
                        <span className="font-semibold capitalize text-[#0B1F3A]">
                          {bk.status.replace('_', ' ')}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 tabular-nums">
                          {bk.scheduled_date} at {bk.scheduled_time}
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                        {bk.service_title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        Customer: <strong>{bk.customer_name}</strong> ({bk.customer_phone}) · {bk.city}
                      </p>
                      <p className="text-xs text-slate-500">
                        Address: {bk.address} {bk.notes ? `— "${bk.notes}"` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className="font-mono text-sm font-bold text-[#0B1F3A] tabular-nums me-2">
                        PKR {bk.price_pkr.toLocaleString()}
                      </span>

                      <button
                        type="button"
                        onClick={() => setChatBooking(bk)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#0D9488]" />
                        <span>{t('chatWithCustomer')}</span>
                      </button>

                      {bk.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleJobStatus(bk.id, 'accepted')}
                            className="rounded-lg bg-[#0D9488] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0F766E] cursor-pointer"
                          >
                            {t('acceptJob')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleJobStatus(bk.id, 'rejected')}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            {t('rejectJob')}
                          </button>
                        </>
                      )}

                      {bk.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => handleJobStatus(bk.id, 'in_progress')}
                          className="rounded-lg bg-[#0B1F3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#132d52] cursor-pointer"
                        >
                          {t('startJob')}
                        </button>
                      )}

                      {(bk.status === 'accepted' || bk.status === 'in_progress') && (
                        <button
                          type="button"
                          onClick={() => handleJobStatus(bk.id, 'completed')}
                          className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                        >
                          {t('completeJob')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAddService}
            className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4 h-fit"
          >
            <h2 className="font-display text-base font-bold text-[#0B1F3A]">
              Add Service Package
            </h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Service Title</label>
              <input
                type="text"
                required
                value={srvTitle}
                onChange={(e) => setSrvTitle(e.target.value)}
                placeholder="e.g. Split AC Gas Refill"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea
                rows={2}
                value={srvDesc}
                onChange={(e) => setSrvDesc(e.target.value)}
                placeholder="What is included in this rate..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Price (PKR)</label>
                <input
                  type="number"
                  min={100}
                  required
                  value={srvPrice}
                  onChange={(e) => setSrvPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:border-[#0D9488] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Billing Unit</label>
                <select
                  value={srvUnit}
                  onChange={(e) => setSrvUnit(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
                >
                  <option value="per visit">per visit</option>
                  <option value="per hour">per hour</option>
                  <option value="fixed">fixed</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={srvBusy}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0D9488] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0F766E] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{srvBusy ? 'Adding...' : 'Add Service'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 h-fit">
            <div className="px-6 py-4">
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Your Listed Services ({services.length})
              </h2>
            </div>
            {services.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                Add your first service on the left so customers can book you.
              </p>
            ) : (
              services.map((srv) => (
                <div key={srv.id} className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-[#0B1F3A]">{srv.title}</h3>
                    <p className="text-xs text-slate-500">{srv.description || srv.category}</p>
                    <p className="mt-1 font-mono text-xs font-semibold text-[#0F766E] tabular-nums">
                      PKR {srv.price_pkr.toLocaleString()} · {srv.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleService(srv)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                        srv.is_active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-600'
                      }`}
                    >
                      {srv.is_active ? 'Active' : 'Paused'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(srv.id)}
                      aria-label="Delete service"
                      className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleSaveWorkerProfile} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0B1F3A]">
              Professional Profile & Coverage
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Trade Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
                >
                  {SERVICE_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Years Experience</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={expYears}
                  onChange={(e) => setExpYears(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-[#0D9488] focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Primary City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as City)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Areas Covered</label>
              <input
                type="text"
                value={areasCovered}
                onChange={(e) => setAreasCovered(e.target.value)}
                placeholder="e.g. Qasimabad, Latifabad, Jamshoro"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Working Hours</label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Bio & Tools</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your specialties, certifications, and tools..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={profileBusy}
              className="rounded-lg bg-[#0B1F3A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#132d52] cursor-pointer"
            >
              {profileBusy ? 'Saving...' : 'Save Professional Details'}
            </button>
          </form>

          <form onSubmit={handleUploadCnic} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                  CNIC Identity Verification
                </h2>
                <p className="text-xs text-slate-500">
                  Required for Verified Badge. Protected by private storage rules.
                </p>
              </div>
              <span className="text-xs font-semibold capitalize text-[#0F766E]">
                {profile?.verification_status}
              </span>
            </div>

            {profile?.verification_notes && (
              <p className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
                <strong>Admin Note:</strong> {profile.verification_notes}
              </p>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                13-Digit CNIC Number
              </label>
              <input
                type="text"
                required
                value={cnicNumber}
                onChange={(e) => setCnicNumber(e.target.value)}
                placeholder="41304-1234567-1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-[#0D9488] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CNIC Front Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCnicFront(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:me-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CNIC Back Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCnicBack(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:me-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
                />
              </div>
            </div>

            {(profile?.cnic_front_url || profile?.cnic_back_url) && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {profile.cnic_front_url && (
                  <img
                    src={profile.cnic_front_url}
                    alt="Uploaded CNIC front"
                    referrerPolicy="no-referrer"
                    className="h-28 w-full rounded-lg border border-slate-200 object-cover"
                  />
                )}
                {profile.cnic_back_url && (
                  <img
                    src={profile.cnic_back_url}
                    alt="Uploaded CNIC back"
                    referrerPolicy="no-referrer"
                    className="h-28 w-full rounded-lg border border-slate-200 object-cover"
                  />
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={cnicBusy}
              className="w-full rounded-lg bg-[#0D9488] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0F766E] cursor-pointer"
            >
              {cnicBusy ? 'Uploading CNIC...' : 'Submit CNIC for Verification'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl overflow-hidden bg-[#0B1F3A] text-white flex items-center justify-center font-display font-bold">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                ) : (
                  user?.full_name?.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#0B1F3A]">{user?.full_name}</h3>
                <p className="text-xs text-slate-500">{user?.email} · {user?.phone}</p>
              </div>
            </div>
            <label className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 cursor-pointer">
              Upload Profile Photo
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <OtpVerificationCard />
        </div>
      )}

      <ChatDrawer booking={chatBooking} onClose={() => setChatBooking(null)} />
    </DashboardLayout>
  );
}
