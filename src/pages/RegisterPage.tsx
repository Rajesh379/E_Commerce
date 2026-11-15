import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { LanguageBar } from '../components/LanguageBar';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { AREAS_BY_CITY, CITIES, SERVICE_CATEGORIES } from '../i18n/translations';
import type { City, User, WorkerProfile } from '../types';

export function RegisterPage() {
  const { setSessionData, refreshSession, lang, t } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<'customer' | 'worker'>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+92');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState<City>('Hyderabad');
  const [area, setArea] = useState(AREAS_BY_CITY.Hyderabad[0]);
  const [category, setCategory] = useState('Electrician');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Step 2: Phone OTP verification right after sign up
  const [otpStep, setOtpStep] = useState(false);
  const [otpPreview, setOtpPreview] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await apiRequest<{
        user: User;
        workerProfile: WorkerProfile | null;
        otpPreview: string;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          password,
          role,
          city,
          area,
          category,
          preferred_lang: lang,
        }),
      });
      setSessionData(res.user, res.workerProfile);
      setOtpPreview(res.otpPreview);
      setOtpStep(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setOtpError('');
    try {
      await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ code: otpCode }),
      });
      await refreshSession();
      navigate(role === 'worker' ? '/dashboard/worker' : '/dashboard/customer');
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex justify-end">
            <LanguageBar />
          </div>

          {!otpStep ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-2.5 text-[#0B1F3A]">
                <UserPlus className="h-5 w-5 text-[#0D9488]" />
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  {t('registerTitle')}
                </h1>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">
                Choose your role to start booking or offering services in Hyderabad & Jamshoro.
              </p>

              {/* Role selector */}
              <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                    role === 'customer'
                      ? 'bg-white text-[#0B1F3A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('customerRole')}
                </button>
                <button
                  type="button"
                  onClick={() => setRole('worker')}
                  className={`rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                    role === 'worker'
                      ? 'bg-white text-[#0B1F3A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('workerRole')}
                </button>
              </div>

              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('fullName')}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. Zubair Memon"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('email')}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@example.com"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('phone')}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="+923001234567"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm tabular-nums focus:border-[#0D9488] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('city')}
                    </label>
                    <select
                      value={city}
                      onChange={(e) => {
                        const c = e.target.value as City;
                        setCity(c);
                        setArea(AREAS_BY_CITY[c][0]);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('area')}
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                    >
                      {AREAS_BY_CITY[city].map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {role === 'worker' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('category')}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                    >
                      {SERVICE_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('password')} (min 6 characters)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-[#0D9488] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F766E] disabled:opacity-50 cursor-pointer"
                >
                  {busy ? 'Creating Account...' : 'Create Account & Send OTP'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-[#0B1F3A] hover:text-[#0D9488]">
                  {t('signIn')}
                </Link>
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-5">
              <div className="flex items-center gap-2.5 text-[#0F766E]">
                <CheckCircle2 className="h-6 w-6" />
                <h1 className="font-display text-xl font-bold text-[#0B1F3A]">
                  {t('otpTitle')}
                </h1>
              </div>
              <p className="text-sm text-slate-600">
                Account created for <strong className="text-[#0B1F3A]">{phone}</strong>. Enter the 6-digit verification code below to verify your mobile number.
              </p>

              {otpPreview && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-900">
                  SMS Verification Code: <strong className="font-mono text-base tracking-widest">{otpPreview}</strong>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  required
                  placeholder="Enter 6-digit OTP"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center font-mono text-lg tracking-[0.4em] focus:border-[#0D9488] focus:outline-none"
                />
                {otpError && (
                  <p className="text-xs text-red-600">{otpError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-lg bg-[#0D9488] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0F766E] disabled:opacity-50 cursor-pointer"
                  >
                    {t('verifyOtp')}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(role === 'worker' ? '/dashboard/worker' : '/dashboard/customer')}
                    className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Verify Later
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
