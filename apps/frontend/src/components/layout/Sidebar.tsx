import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const icon = (d: string): ReactNode => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)

const items = [
  {
    to: '/organizer/dashboard',
    label: 'Dashboard',
    icon: icon('M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z'),
  },
  {
    to: '/organizer/events',
    label: 'Events',
    icon: icon('M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z'),
  },
  {
    to: '/organizer/transactions',
    label: 'Transaksi',
    icon: icon('M3 10h18M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z'),
  },
]

/** Mobile (<md): hanya ikon. Desktop (md+): ikon + label. */
export default function Sidebar() {
  return (
    <aside className="fixed bottom-0 left-0 top-16 z-30 w-16 border-r border-gray-200 bg-white md:w-56">
      <nav className="flex flex-col gap-1 p-2 md:p-3" aria-label="Menu organizer">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:justify-start ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            {item.icon}
            <span className="hidden md:inline">{item.label}</span>
            <span className="sr-only md:hidden">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
