// In client/src/App.jsx
import React, { Suspense } from 'react';
// --- CHANGE: Back to BrowserRouter ---
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner"; 

// --- Component Imports ---
import Navbar from './components/Navbar'; 
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import RoleRoute from './components/RoleRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Loading from './components/Loading'; 

// --- LAZY LOAD PAGES ---
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
const POAPCheckIn = React.lazy(() => import('./pages/POAPCheckIn')); // Ensure this is imported

function App() {
  return (
    <Router>
      <Navbar />
      
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* --- Public Routes --- */}
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

          {/* --- Protected Routes --- */}
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
          
          {/* --- Student Routes --- */}
          <Route 
            path="/browse-events"
            element={<RoleRoute allowedRoles={['Student']}><BrowseEventsPage /></RoleRoute>}
          />
          <Route 
            path="/student/quizzes" 
            element={<RoleRoute allowedRoles={['Student']}><StudentQuizList /></RoleRoute>} 
          />
          <Route 
            path="/take-quiz/:quizId" 
            element={
              <RoleRoute allowedRoles={['Student']}>
                <ErrorBoundary>
                  <TakeQuizPage />
                </ErrorBoundary>
              </RoleRoute>
            } 
          />
          
          {/* --- POAP Route (FIXED: Allow Admins too) --- */}
          {/* <Route 
  path="/poap/checkin" 
  element={
    <ProtectedRoute>
      <POAPCheckIn />
    </ProtectedRoute>
  } 
/> */}

<Route path="/poap/checkin" element={<POAPCheckIn />} />
          {/* --- Faculty & SuperAdmin Routes --- */}
          <Route 
            path="/events" 
            element={<RoleRoute allowedRoles={['SuperAdmin', 'Faculty']}><EventManagementPage /></RoleRoute>} 
          />
          <Route 
            path="/faculty/quiz" 
            element={<RoleRoute allowedRoles={['SuperAdmin', 'Faculty']}><FacultyQuizManager /></RoleRoute>} 
          />

          {/* --- SuperAdmin Only Routes --- */}
          <Route 
            path="/admin/invite" 
            element={<SuperAdminRoute><AdminInvitePage /></SuperAdminRoute>} 
          />
          <Route 
            path="/admin/roster" 
            element={<SuperAdminRoute><AdminRosterPage /></SuperAdminRoute>} 
          />
          <Route 
            path="/admin/students" 
            element={<SuperAdminRoute><StudentManagementPage /></SuperAdminRoute>} 
          />
          <Route 
            path="/admin/analytics" 
            element={<SuperAdminRoute><AdminAnalyticsPage /></SuperAdminRoute>} 
          />
           <Route 
            path="/admin/faculty" 
            element={<SuperAdminRoute><FacultyManagementPage /></SuperAdminRoute>} 
          />

        </Routes>
      </Suspense>

      <Toaster position="top-center" richColors />
      
    </Router>
  );
}

export default App;