import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageBar } from './LanguageBar';
import { apiRequest } from '../lib/api';
import type { NotificationItem } from '../types';

export interface NavTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function DashboardLayout({
  title,
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  title: string;
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
}) {
  const { user, logout, t, unreadNotifications, refreshSession, subscribeRealtime } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    return subscribeRealtime((evt) => {
      if (evt.type === 'notification:new' && evt.notification) {
        setNotifications((prev) => [evt.notification, ...prev]);
      }
    });
  }, [subscribeRealtime]);

  const loadNotifications = async () => {
    setNotifOpen((prev) => !prev);
    try {
      const res = await apiRequest<{ notifications: NotificationItem[] }>('/api/notifications');
      setNotifications(res.notifications);
      if (unreadNotifications > 0) {
        await apiRequest('/api/notifications/read', { method: 'PATCH' });
        await refreshSession();
      }
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#0B1F3A] text-white p-5">
      <div>
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <Link to="/" className="font-display text-xl font-bold tracking-tight text-white">
            {t('brand')}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 mb-6">
          <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
          <p className="text-xs text-teal-300 capitalize">
            {user?.role} · {user?.city}
          </p>
        </div>

        <nav className="space-y-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onTabChange(tab.id);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0D9488] text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  {tab.icon}
                  <span className="truncate">{tab.label}</span>
                </span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="font-mono text-xs font-semibold tabular-nums bg-white/15 px-1.5 py-0.5 rounded">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="bg-white rounded-lg p-0.5 text-slate-900">
          <LanguageBar compact />
        </div>
        <Link
          to="/workers"
          className="block rounded-lg border border-white/20 px-3.5 py-2 text-center text-xs font-medium text-slate-200 hover:bg-white/10"
        >
          {t('navBrowse')}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/20 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('signOut')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-e border-slate-200">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-72 max-w-[85vw] h-full">{sidebarContent}</div>
          <div
            className="flex-1 bg-slate-900/40"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-700"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate">
                E Workers / {title}
              </p>
              <h1 className="font-display text-lg font-bold text-[#0B1F3A] truncate">
                {tabs.find((x) => x.id === activeTab)?.label || title}
              </h1>
            </div>
          </div>

          <div className="relative flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={loadNotifications}
              className="relative inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Bell className="h-4 w-4 text-[#0D9488]" />
              <span>Alerts</span>
              {unreadNotifications > 0 && (
                <span className="font-mono text-xs font-bold text-[#0D9488] tabular-nums">
                  ({unreadNotifications})
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute end-0 top-12 z-40 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <span className="font-display text-sm font-semibold text-[#0B1F3A]">
                    Notifications
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3.5 text-xs">
                        <p className="font-semibold text-[#0B1F3A]">{n.title}</p>
                        <p className="mt-0.5 text-slate-600">{n.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
