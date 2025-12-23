// client/src/App.jsx
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner"; 

import Navbar from './components/Navbar'; 
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import RoleRoute from './components/RoleRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Loading from './components/Loading'; 

// LAZY LOAD PAGES
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const StudentManagementPage = React.lazy(() => import('./pages/StudentManagementPage'));
const EventManagementPage = React.lazy(() => import('./pages/EventManagementPage'));
const PublicEventPage = React.lazy(() => import('./pages/PublicEventPage'));
const VerificationPage = React.lazy(() => import('./pages/VerificationPage'));
const ClaimInvitePage = React.lazy(() => import('./pages/ClaimInvitePage'));
const AdminInvitePage = React.lazy(() => import('./pages/AdminInvitePage'));
const AdminRosterPage = React.lazy(() => import('./pages/AdminRosterPage'));
const StudentActivationPage = React.lazy(() => import('./pages/StudentActivationPage'));
const BrowseEventsPage = React.lazy(() => import('./pages/BrowseEventsPage'));
const FacultyQuizManager = React.lazy(() => import('./pages/FacultyQuizManager'));
const StudentQuizList = React.lazy(() => import('./pages/StudentQuizList'));
const TakeQuizPage = React.lazy(() => import('./pages/TakeQuizPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const AdminAnalyticsPage = React.lazy(() => import('./pages/AdminAnalyticsPage'));
const StudentSetPasswordPage = React.lazy(() => import('./pages/StudentSetPasswordPage'));
const FacultyManagementPage = React.lazy(() => import('./pages/FacultyManagementPage'));
const VerifierPortalPage = React.lazy(() => import('./pages/VerifierPortalPage'));
const POAPCheckIn = React.lazy(() => import('./pages/POAPCheckIn'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

function App() {
  return (
    <Router>
      <Navbar />
      
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* --- 1. Public Routes --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/activate" element={<StudentActivationPage />} />
          <Route path="/activate-account/:token" element={<StudentSetPasswordPage />} />
          <Route path="/claim-invite/:token" element={<ClaimInvitePage />} />
          <Route path="/event/:id" element={<PublicEventPage />} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/verify/:certId" element={<VerificationPage />} />
          <Route path="/verifier" element={<VerifierPortalPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/" element={<LoginPage />} />

          {/* --- 2. POAP Routes (Special Handling) --- 
            We make these public so the POAPCheckIn component can capture the 
            URL parameters before asking the user to login.
          */}
          <Route path="/poap/checkin" element={<POAPCheckIn />} />
          <Route path="/poap-checkin" element={<POAPCheckIn />} />

          {/* --- 3. Protected Routes (Generic) --- */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <DashboardPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />
          
          {/* --- 4. Student Routes --- */}
          <Route 
            path="/browse-events"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['Student']}>
                  <BrowseEventsPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/student/quizzes" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['Student']}>
                  <StudentQuizList />
                </RoleRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/take-quiz/:quizId" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['Student']}>
                  <ErrorBoundary>
                    <TakeQuizPage />
                  </ErrorBoundary>
                </RoleRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['Student']}>
                  <ProfilePage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          
          {/* --- 5. Faculty & SuperAdmin Routes --- */}
          <Route 
            path="/events" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['SuperAdmin', 'Faculty']}>
                  <EventManagementPage />
                </RoleRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/quiz" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['SuperAdmin', 'Faculty']}>
                  <FacultyQuizManager />
                </RoleRoute>
              </ProtectedRoute>
            } 
          />

          {/* --- 6. SuperAdmin Only Routes --- */}
          <Route 
            path="/admin/invite" 
            element={
              <ProtectedRoute>
                <SuperAdminRoute>
                  <AdminInvitePage />
                </SuperAdminRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/roster" 
            element={
              <ProtectedRoute>
                <SuperAdminRoute>
                  <AdminRosterPage />
                </SuperAdminRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/students" 
            element={
              <ProtectedRoute>
                <SuperAdminRoute>
                  <StudentManagementPage />
                </SuperAdminRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/analytics" 
            element={
              <ProtectedRoute>
                <SuperAdminRoute>
                  <AdminAnalyticsPage />
                </SuperAdminRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/faculty" 
            element={
              <ProtectedRoute>
                <SuperAdminRoute>
                  <FacultyManagementPage />
                </SuperAdminRoute>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Suspense>

      <Toaster position="top-center" richColors />
    </Router>
  );
}

export default App;