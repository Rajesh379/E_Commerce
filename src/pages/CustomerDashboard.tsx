import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarCheck,
  MessageSquare,
  Search,
  Star,
  UserCheck,
} from 'lucide-react';
import { DashboardLayout, NavTab } from '../components/DashboardLayout';
import { ChatDrawer } from '../components/ChatDrawer';
import { OtpVerificationCard } from '../components/OtpVerificationCard';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import type { Booking, Complaint } from '../types';

const STATUS_STYLE: Record<string, string> = {
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  accepted: 'text-sky-700 bg-sky-50 border-sky-200',
  in_progress: 'text-teal-700 bg-teal-50 border-teal-200',
  completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  rejected: 'text-red-700 bg-red-50 border-red-200',
  cancelled: 'text-slate-600 bg-slate-100 border-slate-200',
};

export function CustomerDashboard() {
  const { t, subscribeRealtime, refreshSession, user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [chatBooking, setChatBooking] = useState<Booking | null>(null);

  // Review Modal state
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  // Complaint Modal state
  const [complaintBooking, setComplaintBooking] = useState<Booking | null>(null);
  const [compSubject, setCompSubject] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compBusy, setCompBusy] = useState(false);

  // Avatar upload
  const [avatarBusy, setAvatarBusy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bkRes, cmpRes] = await Promise.all([
        apiRequest<{ bookings: Booking[] }>('/api/bookings'),
        apiRequest<{ complaints: Complaint[] }>('/api/complaints'),
      ]);
      setBookings(bkRes.bookings);
      setComplaints(cmpRes.complaints);
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
      if (evt.type === 'booking:updated') {
        loadData();
      }
    });
  }, [subscribeRealtime, loadData]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await apiRequest(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setReviewBusy(true);
    try {
      await apiRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ booking_id: reviewBooking.id, rating, comment }),
      });
      setReviewBooking(null);
      setComment('');
      setRating(5);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReviewBusy(false);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompBusy(true);
    try {
      await apiRequest('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({
          booking_id: complaintBooking?.id || null,
          subject: compSubject,
          description: compDesc,
        }),
      });
      setComplaintBooking(null);
      setCompSubject('');
      setCompDesc('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCompBusy(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await apiRequest('/api/uploads/avatar', { method: 'POST', body: fd });
      await refreshSession();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const filteredBookings = bookings.filter((b) =>
    statusFilter === 'all' ? true : b.status === statusFilter
  );

  const tabs: NavTab[] = [
    { id: 'bookings', label: t('myBookings'), icon: <CalendarCheck className="h-4 w-4" />, badge: bookings.filter((b) => ['pending', 'accepted', 'in_progress'].includes(b.status)).length },
    { id: 'complaints', label: t('complaints'), icon: <AlertTriangle className="h-4 w-4" />, badge: complaints.filter((c) => c.status === 'open').length },
    { id: 'profile', label: t('profileSettings'), icon: <UserCheck className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout
      title={t('customerDashboard')}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 p-1 rounded-lg">
              {['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#0B1F3A] text-white'
                      : 'text-slate-600 hover:text-[#0B1F3A]'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <Link
              to="/workers"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F766E]"
            >
              <Search className="h-4 w-4" />
              <span>{t('bookNew')}</span>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse" />
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <p className="font-display text-base font-semibold text-[#0B1F3A]">
                No bookings found in this view.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Browse CNIC-verified electricians, plumbers, and AC technicians in Hyderabad and Jamshoro.
              </p>
              <Link
                to="/workers"
                className="mt-4 inline-block rounded-lg bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132d52]"
              >
                {t('findWorkers')}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((bk) => (
                <div
                  key={bk.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs text-slate-400">#{bk.id}</span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${
                          STATUS_STYLE[bk.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {bk.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {bk.scheduled_date} · {bk.scheduled_time}
                      </span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                      {bk.service_title}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Technician: <strong className="text-[#0B1F3A]">{bk.worker_name}</strong> ({bk.worker_category}) · {bk.city}
                    </p>
                    <p className="text-xs text-slate-500">
                      Address: {bk.address}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <div className="text-end me-2">
                      <p className="font-mono text-base font-bold text-[#0B1F3A] tabular-nums">
                        PKR {bk.price_pkr.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-500 capitalize">
                        Payment: {bk.payment_status}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setChatBooking(bk)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-[#0D9488]" />
                      <span>{t('chatWithWorker')}</span>
                    </button>

                    {bk.status === 'completed' && !bk.review_id && (
                      <button
                        type="button"
                        onClick={() => setReviewBooking(bk)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0F766E] cursor-pointer"
                      >
                        <Star className="h-3.5 w-3.5" />
                        <span>{t('leaveReview')}</span>
                      </button>
                    )}

                    {bk.review_id && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 px-2">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        Rated {bk.review_rating}/5
                      </span>
                    )}

                    {['pending', 'accepted'].includes(bk.status) && (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(bk.id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        {t('cancelBooking')}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setComplaintBooking(bk);
                        setCompSubject(`Issue with booking #${bk.id}`);
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      {t('fileComplaint')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Track disputes or file a new support complaint with the E Workers admin team.
            </p>
            <button
              type="button"
              onClick={() => {
                setComplaintBooking(null);
                setCompSubject('');
                setCompDesc('');
                setComplaintBooking({ id: '' } as Booking);
              }}
              className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#132d52] cursor-pointer"
            >
              New Complaint
            </button>
          </div>

          {complaints.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No complaints submitted.
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-display text-sm font-bold text-[#0B1F3A]">{c.subject}</h3>
                    <span className="text-xs font-semibold capitalize text-amber-700">{c.status}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{c.description}</p>
                  {c.admin_resolution && (
                    <p className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
                      <strong>Admin Resolution:</strong> {c.admin_resolution}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
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
              {avatarBusy ? 'Uploading...' : 'Upload Profile Photo'}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <OtpVerificationCard />
        </div>
      )}

      <ChatDrawer booking={chatBooking} onClose={() => setChatBooking(null)} />

      {/* Review Modal */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handleSubmitReview} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Rate {reviewBooking.worker_name}
            </h3>
            <p className="text-xs text-slate-500">{reviewBooking.service_title}</p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold cursor-pointer ${
                      rating >= star
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    {star} ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Review Comment</label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share punctuality, workmanship, and pricing feedback..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reviewBusy}
                className="rounded-lg bg-[#0D9488] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0F766E] cursor-pointer"
              >
                {reviewBusy ? 'Submitting...' : t('leaveReview')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complaint Modal */}
      {complaintBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handleSubmitComplaint} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              File Support Complaint
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={compSubject}
                onChange={(e) => setCompSubject(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Details</label>
              <textarea
                rows={4}
                required
                value={compDesc}
                onChange={(e) => setCompDesc(e.target.value)}
                placeholder="Explain what happened so an admin can investigate..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setComplaintBooking(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={compBusy}
                className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#132d52] cursor-pointer"
              >
                {compBusy ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
