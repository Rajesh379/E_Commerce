import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, t } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardPath =
    user?.role === 'admin'
      ? '/dashboard/admin'
      : user?.role === 'worker'
        ? '/dashboard/worker'
        : '/dashboard/customer';

  const handlePrimaryAction = () => {
    setMobileOpen(false);
    if (user) {
      navigate(dashboardPath);
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single clean brand wordmark */}
        <Link
          to="/"
          className="font-display text-xl font-bold tracking-tight text-[#0B1F3A] whitespace-nowrap shrink-0"
        >
          {t('brand')}
        </Link>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <Link
            to="/workers"
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#0B1F3A] ${
              location.pathname.startsWith('/workers') ? 'text-[#0B1F3A] underline underline-offset-8 decoration-2 decoration-[#0D9488]' : ''
            }`}
          >
            {t('navBrowse')}
          </Link>
          <a
            href="/#categories"
            className="transition-colors whitespace-nowrap shrink-0 hover:text-[#0B1F3A]"
          >
            {t('navCategories')}
          </a>
          <a
            href="/#how-it-works"
            className="transition-colors whitespace-nowrap shrink-0 hover:text-[#0B1F3A]"
          >
            {t('navHow')}
          </a>
          {user ? (
            <Link
              to={dashboardPath}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#0B1F3A] ${
                location.pathname.startsWith('/dashboard') ? 'text-[#0B1F3A] underline underline-offset-8 decoration-2 decoration-[#0D9488]' : ''
              }`}
            >
              {t('navDashboard')}
            </Link>
          ) : (
            <Link
              to="/register"
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#0B1F3A] ${
                location.pathname === '/register' ? 'text-[#0B1F3A] underline underline-offset-8 decoration-2 decoration-[#0D9488]' : ''
              }`}
            >
              {t('joinAsWorker')}
            </Link>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="hidden md:inline-flex items-center justify-center rounded-lg bg-[#0B1F3A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#132d52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {user ? t('navDashboard') : t('signIn')}
          </button>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex md:hidden items-center justify-center rounded-lg border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50 min-h-[44px] min-w-[44px]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link
              to="/workers"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-sm font-medium text-slate-700 hover:text-[#0B1F3A]"
            >
              {t('navBrowse')}
            </Link>
            <a
              href="/#categories"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-sm font-medium text-slate-700 hover:text-[#0B1F3A]"
            >
              {t('navCategories')}
            </a>
            <a
              href="/#how-it-works"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-sm font-medium text-slate-700 hover:text-[#0B1F3A]"
            >
              {t('navHow')}
            </a>
            {!user && (
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm font-medium text-slate-700 hover:text-[#0B1F3A]"
              >
                {t('joinAsWorker')}
              </Link>
            )}
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="mt-2 w-full rounded-lg bg-[#0B1F3A] px-4 py-3 text-sm font-semibold text-white"
            >
              {user ? t('navDashboard') : t('signIn')}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
