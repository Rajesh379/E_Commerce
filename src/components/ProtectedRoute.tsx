import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4 px-6">
          <div className="h-6 w-40 rounded bg-slate-200 animate-pulse" />
          <div className="h-28 w-full rounded-xl bg-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback =
      user.role === 'admin'
        ? '/dashboard/admin'
        : user.role === 'worker'
          ? '/dashboard/worker'
          : '/dashboard/customer';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
