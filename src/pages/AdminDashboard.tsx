import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Check,
  ShieldCheck,
  Star,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { DashboardLayout, NavTab } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import type { Booking, Complaint, Review, User, WorkerProfile } from '../types';

export function AdminDashboard() {
  const { t, subscribeRealtime } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  const [overview, setOverview] = useState<any>(null);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [verifyNotes, setVerifyNotes] = useState<Record<string, string>>({});
  const [resolutionText, setResolutionText] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [ov, wk, us, bk, sr, cm, rv] = await Promise.all([
        apiRequest('/api/admin/overview'),
        apiRequest<{ workers: WorkerProfile[] }>('/api/admin/workers'),
        apiRequest<{ users: User[] }>('/api/admin/users'),
        apiRequest<{ bookings: Booking[] }>('/api/bookings'),
        apiRequest<{ services: any[] }>('/api/admin/services'),
        apiRequest<{ complaints: Complaint[] }>('/api/complaints'),
        apiRequest<{ reviews: Review[] }>('/api/admin/reviews'),
      ]);
      setOverview(ov);
      setWorkers(wk.workers);
      setUsers(us.users);
      setBookings(bk.bookings);
      setServices(sr.services);
      setComplaints(cm.complaints);
      setReviews(rv.reviews);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    return subscribeRealtime((evt) => {
      if (['booking:updated', 'complaint:new'].includes(evt.type)) {
        loadAll();
      }
    });
  }, [subscribeRealtime, loadAll]);

  const handleVerifyWorker = async (workerId: string, status: 'verified' | 'rejected') => {
    setError('');
    try {
      await apiRequest(`/api/admin/workers/${workerId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({
          verification_status: status,
          verification_notes: verifyNotes[workerId] || (status === 'verified' ? 'CNIC verified by Admin.' : 'Document unclear, please re-upload.'),
        }),
      });
      setNotice(`Worker verification marked as ${status}.`);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleUserActive = async (u: User) => {
    try {
      await apiRequest(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleService = async (srv: any) => {
    try {
      await apiRequest(`/api/admin/services/${srv.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !srv.is_active }),
      });
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBookingStatus = async (bookingId: string, status: string) => {
    try {
      await apiRequest(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateComplaint = async (c: Complaint, status: string) => {
    try {
      await apiRequest(`/api/admin/complaints/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          admin_resolution: resolutionText[c.id] ?? c.admin_resolution,
        }),
      });
      setNotice('Complaint updated.');
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleReviewHidden = async (rev: Review) => {
    try {
      await apiRequest(`/api/admin/reviews/${rev.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_hidden: !rev.is_hidden }),
      });
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const pendingWorkersCount = workers.filter((w) => w.verification_status === 'pending').length;
  const openComplaintsCount = complaints.filter((c) => ['open', 'investigating'].includes(c.status)).length;

  const tabs: NavTab[] = [
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'verifications', label: 'Worker Verification', icon: <ShieldCheck className="h-4 w-4" />, badge: pendingWorkersCount },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" />, badge: users.length },
    { id: 'bookings', label: 'Bookings', icon: <Briefcase className="h-4 w-4" />, badge: bookings.length },
    { id: 'services', label: 'Services', icon: <Wrench className="h-4 w-4" /> },
    { id: 'complaints', label: 'Complaints', icon: <AlertTriangle className="h-4 w-4" />, badge: openComplaintsCount },
    { id: 'reviews', label: 'Reviews', icon: <Star className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout
      title={t('adminDashboard')}
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

      {activeTab === 'analytics' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Completed GMV</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#0B1F3A] tabular-nums">
                PKR {Number(overview.totals.completed_gmv_pkr || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Total Bookings</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#0D9488] tabular-nums">
                {overview.totals.total_bookings} ({overview.totals.completed_bookings} completed)
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Verified / Total Workers</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#0B1F3A] tabular-nums">
                {overview.totals.verified_workers} / {overview.totals.total_workers}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Pending CNIC / Complaints</p>
              <p className="mt-1 font-mono text-xl font-bold text-amber-700 tabular-nums">
                {overview.totals.pending_verifications} / {overview.totals.open_complaints}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] mb-4">
                City Performance (Hyderabad & Jamshoro)
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 text-start font-medium">City</th>
                    <th className="py-2 text-end font-medium">Bookings</th>
                    <th className="py-2 text-end font-medium">Volume (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.byCity.map((row: any) => (
                    <tr key={row.city}>
                      <td className="py-2.5 font-medium text-[#0B1F3A]">{row.city}</td>
                      <td className="py-2.5 text-end font-mono tabular-nums">{row.bookings_count}</td>
                      <td className="py-2.5 text-end font-mono tabular-nums">
                        PKR {Number(row.volume_pkr || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] mb-4">
                Supply & Demand by Category
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 text-start font-medium">Category</th>
                    <th className="py-2 text-end font-medium">Workers</th>
                    <th className="py-2 text-end font-medium">Bookings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.byCategory.map((row: any) => (
                    <tr key={row.category}>
                      <td className="py-2.5 font-medium text-[#0B1F3A]">{row.category}</td>
                      <td className="py-2.5 text-end font-mono tabular-nums">{row.workers_count}</td>
                      <td className="py-2.5 text-end font-mono tabular-nums">{row.bookings_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'verifications' && (
        <div className="space-y-4">
          {workers.map((w) => (
            <div key={w.id} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                    {w.full_name} · {w.category} ({w.city})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {w.email} · {w.phone} · CNIC: <span className="font-mono font-semibold text-[#0B1F3A]">{w.cnic_number || 'Not submitted'}</span>
                  </p>
                </div>
                <span className="text-xs font-semibold capitalize text-[#0F766E]">
                  Status: {w.verification_status}
                </span>
              </div>

              {(w.cnic_front_url || w.cnic_back_url) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {w.cnic_front_url && (
                    <a href={w.cnic_front_url} target="_blank" rel="noreferrer" className="block">
                      <img src={w.cnic_front_url} alt="CNIC Front" referrerPolicy="no-referrer" className="h-24 w-full rounded-lg border border-slate-200 object-cover" />
                    </a>
                  )}
                  {w.cnic_back_url && (
                    <a href={w.cnic_back_url} target="_blank" rel="noreferrer" className="block">
                      <img src={w.cnic_back_url} alt="CNIC Back" referrerPolicy="no-referrer" className="h-24 w-full rounded-lg border border-slate-200 object-cover" />
                    </a>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={verifyNotes[w.id] ?? w.verification_notes ?? ''}
                  onChange={(e) => setVerifyNotes((p) => ({ ...p, [w.id]: e.target.value }))}
                  placeholder="Admin verification note..."
                  className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0D9488] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyWorker(w.id, 'verified')}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#0D9488] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0F766E] cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyWorker(w.id, 'rejected')}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <th className="px-4 py-3 text-start font-semibold">Name</th>
                <th className="px-4 py-3 text-start font-semibold">Email / Phone</th>
                <th className="px-4 py-3 text-start font-semibold">Role</th>
                <th className="px-4 py-3 text-start font-semibold">City</th>
                <th className="px-4 py-3 text-start font-semibold">Status</th>
                <th className="px-4 py-3 text-end font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-[#0B1F3A]">{u.full_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {u.email}<br />{u.phone}
                  </td>
                  <td className="px-4 py-3 capitalize text-xs font-semibold">{u.role}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{u.city}</td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {u.is_active ? (
                      <span className="text-emerald-700">Active</span>
                    ) : (
                      <span className="text-red-700">Suspended</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleToggleUserActive(u)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 cursor-pointer"
                      >
                        {u.is_active ? 'Suspend' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <th className="px-4 py-3 text-start font-semibold">Booking</th>
                <th className="px-4 py-3 text-start font-semibold">Customer</th>
                <th className="px-4 py-3 text-start font-semibold">Worker</th>
                <th className="px-4 py-3 text-end font-semibold">Amount</th>
                <th className="px-4 py-3 text-start font-semibold">Status</th>
                <th className="px-4 py-3 text-end font-semibold">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((bk) => (
                <tr key={bk.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#0B1F3A]">{bk.service_title}</p>
                    <p className="font-mono text-xs text-slate-400">#{bk.id} · {bk.city}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">{bk.customer_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{bk.worker_name}</td>
                  <td className="px-4 py-3 text-end font-mono text-xs font-semibold tabular-nums">
                    PKR {bk.price_pkr.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold capitalize">
                    {bk.status.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <select
                      value={bk.status}
                      onChange={(e) => handleBookingStatus(bk.id, e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    >
                      {['pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <th className="px-4 py-3 text-start font-semibold">Service</th>
                <th className="px-4 py-3 text-start font-semibold">Worker</th>
                <th className="px-4 py-3 text-start font-semibold">Category</th>
                <th className="px-4 py-3 text-end font-semibold">Price</th>
                <th className="px-4 py-3 text-end font-semibold">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-[#0B1F3A]">{s.title}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{s.worker_name} · {s.city}</td>
                  <td className="px-4 py-3 text-xs">{s.category}</td>
                  <td className="px-4 py-3 text-end font-mono text-xs tabular-nums">
                    PKR {s.price_pkr.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      type="button"
                      onClick={() => handleToggleService(s)}
                      className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold cursor-pointer"
                    >
                      {s.is_active ? 'Active (Pause)' : 'Hidden (Activate)'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {complaints.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No complaints on file.
            </div>
          ) : (
            complaints.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-[#0B1F3A]">{c.subject}</h3>
                  <span className="text-xs font-semibold capitalize text-amber-700">{c.status}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Filed by: {c.filed_by_name} ({c.filed_by_email}) {c.against_name ? `· Against: ${c.against_name}` : ''}
                </p>
                <p className="text-sm text-slate-700">{c.description}</p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={resolutionText[c.id] ?? c.admin_resolution ?? ''}
                    onChange={(e) => setResolutionText((p) => ({ ...p, [c.id]: e.target.value }))}
                    placeholder="Admin resolution notes..."
                    className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0D9488] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateComplaint(c, 'resolved')}
                    className="rounded-lg bg-[#0D9488] px-3 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateComplaint(c, 'dismissed')}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {reviews.map((r) => (
            <div key={r.id} className="p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">
                  <strong className="text-[#0B1F3A]">{r.customer_name}</strong> → {r.worker_name} · {r.rating}/5 ★
                </p>
                <p className="mt-1 text-sm text-slate-700">{r.comment}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleReviewHidden(r)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] shrink-0 cursor-pointer"
              >
                {r.is_hidden ? 'Unhide Review' : 'Hide Review'}
              </button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
