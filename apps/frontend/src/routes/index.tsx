import { createBrowserRouter } from 'react-router-dom'
import { Placeholder } from './Placeholder'
import LandingPage from '../pages/public/LandingPage'
import EventListPage from '../pages/public/EventListPage'
import EventDetailPage from '../pages/public/EventDetailPage'
import CustomerTransactionListPage from '../pages/customer/CustomerTransactionListPage'
import CustomerTransactionDetailPage from '../pages/customer/CustomerTransactionDetailPage'
import CustomerProfilePage from '../pages/customer/CustomerProfilePage'
import OrganizerDashboardPage from '../pages/organizer/OrganizerDashboardPage'
import OrganizerEventListPage from '../pages/organizer/OrganizerEventListPage'
import OrganizerEventCreatePage from '../pages/organizer/OrganizerEventCreatePage'
import OrganizerEventEditPage from '../pages/organizer/OrganizerEventEditPage'
import OrganizerAttendeeListPage from '../pages/organizer/OrganizerAttendeeListPage'
import OrganizerTransactionListPage from '../pages/organizer/OrganizerTransactionListPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage'
import { ProtectedRoute } from './ProtectedRoute'
import { GuestRoute } from './GuestRoute'

// TODO: halaman di bawah masih placeholder. Ganti `element` dengan komponen asli saat fase 7–10.

export const router = createBrowserRouter([
  // PUBLIC
  { path: '/', element: <LandingPage /> },
  { path: '/events', element: <EventListPage /> },
  { path: '/events/:id', element: <EventDetailPage /> },
  { path: '/login', element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ) },
  { path: '/register', element: (
      <GuestRoute>
        <RegisterPage />
      </GuestRoute>
    ) },
  { path: '/forgot-password', element: (
      <GuestRoute>
        <ForgotPasswordPage />
      </GuestRoute>
    ) },
  { path: '/reset-password', element: (
      <GuestRoute>
        <ResetPasswordPage />
      </GuestRoute>
    ) },

  // CUSTOMER ONLY
  {
    path: '/customer/transactions',
    element: (
      <ProtectedRoute role="CUSTOMER">
        <CustomerTransactionListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/customer/transactions/:id',
    element: (
      <ProtectedRoute role="CUSTOMER">
        <CustomerTransactionDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/customer/profile',
    element: (
      <ProtectedRoute role="CUSTOMER">
        <CustomerProfilePage />
      </ProtectedRoute>
    ),
  },

  // ORGANIZER ONLY
  {
    path: '/organizer/dashboard',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <OrganizerDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organizer/events',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <OrganizerEventListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organizer/events/create',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <OrganizerEventCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organizer/events/:id/edit',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <OrganizerEventEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organizer/events/:id/attendees',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <OrganizerAttendeeListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organizer/transactions',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <OrganizerTransactionListPage />
      </ProtectedRoute>
    ),
  },

  { path: '*', element: <Placeholder name="404 — Halaman tidak ditemukan" /> },
])
