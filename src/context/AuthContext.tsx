import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';
import { isRtl, TRANSLATIONS } from '../i18n/translations';
import type { Lang, User, WorkerProfile } from '../types';

export interface RealtimeEvent {
  type: string;
  [key: string]: any;
}

interface AuthContextValue {
  user: User | null;
  workerProfile: WorkerProfile | null;
  unreadNotifications: number;
  loading: boolean;
  lang: Lang;
  rtl: boolean;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
  refreshSession: () => Promise<void>;
  setSessionData: (user: User | null, workerProfile?: WorkerProfile | null) => void;
  logout: () => Promise<void>;
  subscribeRealtime: (listener: (evt: RealtimeEvent) => void) => () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('eworkers_lang');
    return saved === 'ur' || saved === 'sd' ? saved : 'en';
  });

  const listenersRef = useRef<Set<(evt: RealtimeEvent) => void>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  const rtl = isRtl(lang);

  useEffect(() => {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('eworkers_lang', lang);
  }, [lang, rtl]);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiRequest<{
        user: User;
        workerProfile: WorkerProfile | null;
        unreadNotifications: number;
      }>('/api/auth/me');
      setUser(data.user);
      setWorkerProfile(data.workerProfile || null);
      setUnreadNotifications(data.unreadNotifications || 0);
      if (data.user.preferred_lang && ['en', 'ur', 'sd'].includes(data.user.preferred_lang)) {
        setLangState(data.user.preferred_lang);
      }
    } catch {
      setUser(null);
      setWorkerProfile(null);
      setUnreadNotifications(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Real-time WebSocket connection tied to authenticated user
  useEffect(() => {
    if (!user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as RealtimeEvent;
          if (parsed.type === 'notification:new') {
            setUnreadNotifications((n) => n + 1);
          }
          if (parsed.type === 'worker:verified' && parsed.workerProfile) {
            setWorkerProfile(parsed.workerProfile);
          }
          for (const listener of listenersRef.current) {
            listener(parsed);
          }
        } catch {
          // Ignore invalid socket frame
        }
      };

      ws.onclose = () => {
        if (!closed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user]);

  const setLang = useCallback(
    (nextLang: Lang) => {
      setLangState(nextLang);
      if (user) {
        apiRequest('/api/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify({ preferred_lang: nextLang }),
        }).catch(() => {});
      }
    },
    [user]
  );

  const setSessionData = useCallback((nextUser: User | null, nextWorker?: WorkerProfile | null) => {
    setUser(nextUser);
    if (nextWorker !== undefined) {
      setWorkerProfile(nextWorker);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setWorkerProfile(null);
    setUnreadNotifications(0);
  }, []);

  const subscribeRealtime = useCallback((listener: (evt: RealtimeEvent) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const t = useCallback(
    (key: string) => {
      return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
    },
    [lang]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        workerProfile,
        unreadNotifications,
        loading,
        lang,
        rtl,
        t,
        setLang,
        refreshSession,
        setSessionData,
        logout,
        subscribeRealtime,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
