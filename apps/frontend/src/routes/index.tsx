import { createBrowserRouter } from 'react-router-dom'
import { Placeholder } from './Placeholder'
import LandingPage from '../pages/public/LandingPage'
import EventListPage from '../pages/public/EventListPage'
import { ProtectedRoute } from './ProtectedRoute'

// TODO: halaman di bawah masih placeholder. Ganti `element` dengan komponen asli saat fase 7–10.

export const router = createBrowserRouter([
  // PUBLIC
  { path: '/', element: <LandingPage /> },
  { path: '/events', element: <EventListPage /> },
  { path: '/events/:id', element: <Placeholder name="EventDetailPage" /> },
  { path: '/login', element: <Placeholder name="LoginPage" /> },
  { path: '/register', element: <Placeholder name="RegisterPage" /> },
  { path: '/forgot-password', element: <Placeholder name="ForgotPasswordPage" /> },
  { path: '/reset-password', element: <Placeholder name="ResetPasswordPage" /> },

  // CUSTOMER ONLY
  {
    path: '/customer/transactions',
    element: (
      <ProtectedRoute role="CUSTOMER">
        <Placeholder name="CustomerTransactionListPage" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/customer/transactions/:id',
    element: (
      <ProtectedRoute role="CUSTOMER">
        <Placeholder name="CustomerTransactionDetailPage" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/customer/profile',
    element: (
      <ProtectedRoute role="CUSTOMER">
        <Placeholder name="CustomerProfilePage" />
      </ProtectedRoute>
    ),
  },

  // ORGANIZER ONLY
  {
    path: '/organizer/dashboard',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <Placeholder name="OrganizerDashboardPage" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organizer/events',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <Placeholder name="OrganizerEventListPage" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organizer/events/create',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <Placeholder name="OrganizerEventCreatePage" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organizer/events/:id/edit',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <Placeholder name="OrganizerEventEditPage" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organizer/events/:id/attendees',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <Placeholder name="OrganizerAttendeeListPage" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organizer/transactions',
    element: (
      <ProtectedRoute role="ORGANIZER">
        <Placeholder name="OrganizerTransactionListPage" />
      </ProtectedRoute>
    ),
  },

  { path: '*', element: <Placeholder name="404 — Halaman tidak ditemukan" /> },
])
