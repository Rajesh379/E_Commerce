import React, { useState } from 'react';
import { CheckCircle2, Phone, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { AREAS_BY_CITY, CITIES } from '../i18n/translations';
import type { City } from '../types';

export function OtpVerificationCard() {
  const { user, refreshSession, t } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [otpCode, setOtpCode] = useState('');
  const [otpPreview, setOtpPreview] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [city, setCity] = useState<City>(user?.city || 'Hyderabad');
  const [area, setArea] = useState(user?.area || '');

  if (!user) return null;

  const handleSendOtp = async () => {
    setBusy(true);
    setError('');
    setStatusMsg('');
    try {
      const res = await apiRequest<{ otpPreview: string; message: string }>('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setOtpPreview(res.otpPreview);
      setStatusMsg(res.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setStatusMsg('');
    try {
      await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ code: otpCode }),
      });
      setOtpCode('');
      setOtpPreview('');
      setStatusMsg('Mobile number verified successfully.');
      await refreshSession();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setStatusMsg('');
    try {
      await apiRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: fullName, city, area }),
      });
      setStatusMsg('Account profile saved.');
      await refreshSession();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Phone className="h-5 w-5 text-[#0D9488]" />
            <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
              {t('otpTitle')}
            </h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
              user.phone_verified ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {user.phone_verified ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            {user.phone_verified ? t('phoneVerified') : t('phoneUnverified')}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {t('phone')}
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+923001234567"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-[#0D9488] focus:outline-none"
              />
              <button
                type="button"
                disabled={busy}
                onClick={handleSendOtp}
                className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132d52] disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {t('sendOtp')}
              </button>
            </div>
          </div>

          {otpPreview && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-900">
              SMS Dispatch Code: <strong className="font-mono text-sm tracking-wider">{otpPreview}</strong> (expires in 15 min)
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="flex gap-2">
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tracking-widest focus:border-[#0D9488] focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || otpCode.length < 4}
              className="rounded-lg bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F766E] disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {t('verifyOtp')}
            </button>
          </form>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
            Personal Location Details
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active across Hyderabad & Jamshoro service zones.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('fullName')}</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('city')}</label>
            <select
              value={city}
              onChange={(e) => {
                const c = e.target.value as City;
                setCity(c);
                setArea(AREAS_BY_CITY[c][0]);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#0D9488] focus:outline-none"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('area')}</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#0D9488] focus:outline-none"
            >
              {AREAS_BY_CITY[city].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132d52] disabled:opacity-50 cursor-pointer"
        >
          Save Profile
        </button>

        {statusMsg && <p className="text-xs font-medium text-emerald-700">{statusMsg}</p>}
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </form>
    </div>
  );
}
