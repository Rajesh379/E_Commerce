import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { LanguageBar } from '../components/LanguageBar';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import type { User, WorkerProfile } from '../types';

export function LoginPage() {
  const { setSessionData, t } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showSandbox, setShowSandbox] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await apiRequest<{ user: User; workerProfile: WorkerProfile | null }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        }
      );
      setSessionData(res.user, res.workerProfile);
      if (res.user.role === 'admin') navigate('/dashboard/admin');
      else if (res.user.role === 'worker') navigate('/dashboard/worker');
      else navigate('/dashboard/customer');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fillAccount = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-end">
            <LanguageBar />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="flex items-center gap-2.5 text-[#0B1F3A]">
              <Lock className="h-5 w-5 text-[#0D9488]" />
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {t('loginTitle')}
              </h1>
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              Access your Customer, Worker, or Admin dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="you@example.com or +92300..."
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    {t('password')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[#0D9488] hover:text-[#0F766E]"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                className="w-full rounded-lg bg-[#0B1F3A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#132d52] disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Signing in...' : t('signIn')}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              New to E Workers?{' '}
              <Link to="/register" className="font-semibold text-[#0D9488] hover:text-[#0F766E]">
                Create an account
              </Link>
            </p>
          </div>

          {/* Discreet Role Access Helper */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setShowSandbox((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-slate-600 hover:text-[#0B1F3A] cursor-pointer"
            >
              <span>Quick Role Credentials (Customer / Worker / Admin)</span>
              {showSandbox ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showSandbox && (
              <div className="border-t border-slate-100 px-4 py-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Customer: ayesha.memon@eworkers.pk</span>
                  <button
                    type="button"
                    onClick={() => fillAccount('ayesha.memon@eworkers.pk', 'Customer@123')}
                    className="rounded border border-slate-300 px-2.5 py-1 font-medium text-[#0B1F3A] hover:bg-slate-50 cursor-pointer"
                  >
                    Fill
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Worker: tariq.soomro@eworkers.pk</span>
                  <button
                    type="button"
                    onClick={() => fillAccount('tariq.soomro@eworkers.pk', 'Worker@123')}
                    className="rounded border border-slate-300 px-2.5 py-1 font-medium text-[#0B1F3A] hover:bg-slate-50 cursor-pointer"
                  >
                    Fill
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Admin: admin@eworkers.pk</span>
                  <button
                    type="button"
                    onClick={() => fillAccount('admin@eworkers.pk', 'Admin@123')}
                    className="rounded border border-slate-300 px-2.5 py-1 font-medium text-[#0B1F3A] hover:bg-slate-50 cursor-pointer"
                  >
                    Fill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
