import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { apiRequest } from '../lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await apiRequest<{ message: string; resetTokenPreview?: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      setMessage(res.message);
      if (res.resetTokenPreview) setResetToken(res.resetTokenPreview);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-2.5 text-[#0B1F3A]">
            <KeyRound className="h-5 w-5 text-[#0D9488]" />
            <h1 className="font-display text-xl font-bold">Forgot Password</h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Enter your account email to generate a secure password reset token.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {message && (
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-3.5 text-xs text-teal-900 space-y-2">
                <p>{message}</p>
                {resetToken && (
                  <Link
                    to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                    className="inline-block font-semibold text-[#0B1F3A] underline"
                  >
                    Continue to Reset Password →
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#0B1F3A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#132d52] disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Generating...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            <Link to="/login" className="font-semibold text-[#0D9488]">
              Back to Sign In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      setDone(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="font-display text-xl font-bold text-[#0B1F3A]">Reset Password</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Enter your reset token and choose a new password.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reset Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-[#0D9488] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#0D9488] focus:outline-none"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {done && (
              <p className="text-xs font-medium text-emerald-700">
                Password updated! Redirecting to login...
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#0D9488] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0F766E] disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
