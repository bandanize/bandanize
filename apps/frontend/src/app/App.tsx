import React from 'react';
import { JoinProject } from '@/pages/JoinProject';
import { pendingInvitePath } from '@/lib/pending-invite';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { ProjectHub } from '@/pages/ProjectHub';
import { UserProfile } from '@/pages/UserProfile';
import { InvitationsPage } from '@/pages/InvitationsPage';
import { VerifyEmail } from '@/pages/VerifyEmail';

import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';
import { Toaster } from '@/app/components/ui/sonner';
import { ThemeProvider } from '@/app/components/theme-provider'; // Wrapper we will create
import { ConsentProvider } from '@/contexts/CookieConsentContext';
import { LegalFooter } from '@/app/components/LegalFooter';
import { LegalPage } from '@/pages/LegalPage';
import { CookieConsent } from '@/app/components/CookieConsent';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={pendingInvitePath() || "/dashboard"} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <UserProfile />
          </PrivateRoute>
        }
      />
      <Route
        path="/project/:projectId"
        element={
          <PrivateRoute>
            <ProjectHub />
          </PrivateRoute>
        }
      />
      <Route
        path="/invitations"
        element={
          <PrivateRoute>
            <InvitationsPage />
          </PrivateRoute>
        }
      />
      <Route path="/cookies" element={<LegalPage kind="cookies" />} />
      <Route path="/privacy" element={<LegalPage kind="privacy" />} />
      <Route path="/terms&conditions" element={<LegalPage kind="terms" />} />
      <Route path="/join/:token" element={<JoinProject />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <ConsentProvider>
        <ThemeProvider storageKey="vite-ui-theme">
          <AuthProvider>
            <ProjectProvider>
              <div className="min-h-dvh flex flex-col">
                <div className="flex-1"><AppRoutes /></div>
                <LegalFooter />
              </div>
              <Toaster />
              <CookieConsent />
            </ProjectProvider>
          </AuthProvider>
        </ThemeProvider>
      </ConsentProvider>
    </Router>
  );
}