/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { WorkersDirectoryPage } from './pages/WorkersDirectoryPage';
import { WorkerProfilePage } from './pages/WorkerProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/ForgotResetPasswordPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { WorkerDashboard } from './pages/WorkerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

const isGitHubPages =
  typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');

export default function App() {
  const Router = isGitHubPages ? HashRouter : BrowserRouter;

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workers" element={<WorkersDirectoryPage />} />
          <Route path="/workers/:id" element={<WorkerProfilePage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/dashboard/customer"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/worker"
            element={
              <ProtectedRoute allowedRoles={['worker']}>
                <WorkerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
