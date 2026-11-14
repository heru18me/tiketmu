import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { GuestRoute } from './GuestRoute'
import {
  LandingPage,
  EventListPage,
  EventDetailPage,
  CustomerTransactionListPage,
  CustomerTransactionDetailPage,
  CustomerProfilePage,
  OrganizerDashboardPage,
  OrganizerEventListPage,
  OrganizerEventCreatePage,
  OrganizerEventEditPage,
  OrganizerAttendeeListPage,
  OrganizerTransactionListPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  NotFoundPage,
} from './lazyPages'


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

  { path: '*', element: <NotFoundPage /> },
])
