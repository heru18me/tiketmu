import { useEffect, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../../lib/axios'
import { formatCompact, formatDateShort, formatIDR } from '../../lib/utils'
import type { ApiResponse, DashboardStats } from '../../types'
import OrganizerLayout from '../../components/layout/OrganizerLayout'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'

const FIRST_YEAR = 2022
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - FIRST_YEAR + 1 }, (_, i) => CURRENT_YEAR - i)

const COLOR_PRIMARY = '#2563eb'
const COLOR_SECONDARY = '#7c3aed'

interface Result {
  year: number
  stats: DashboardStats | null
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="truncate text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </Card>
  )
}

const svgIcon = (d: string) => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)

const icons = {
  event: svgIcon('M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z'),
  revenue: svgIcon('M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'),
  attendees: svgIcon('M17 20h5v-2a4 4 0 0 0-3-3.9M9 20H4v-2a4 4 0 0 1 3-3.9m5-1.1a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6 0a3 3 0 1 0 0-6m-12 6a3 3 0 1 1 0-6'),
  transaction: svgIcon('M3 10h18M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z'),
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="flex items-center gap-4 p-5">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="h-7 w-3/4 animate-pulse rounded bg-gray-200" />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i} className="p-5">
            <div className="mb-4 h-5 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-72 animate-pulse rounded bg-gray-100" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <div className="mb-4 h-5 w-1/4 animate-pulse rounded bg-gray-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </Card>
    </div>
  )
}

export default function OrganizerDashboardPage() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [result, setResult] = useState<Result | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .get<ApiResponse<DashboardStats>>('/dashboard/stats', { params: { year } })
      .then((res) => !cancelled && setResult({ year, stats: res.data.data }))
      .catch(() => !cancelled && setResult({ year, stats: null }))
    return () => {
      cancelled = true
    }
  }, [year, retryCount])

  const loading = result?.year !== year
  const stats = result?.stats

  return (
    <OrganizerLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Dashboard</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Tahun
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        {loading ? (
          <DashboardSkeleton />
        ) : !stats ? (
          <EmptyState
            title="Gagal memuat dashboard"
            subtitle="Terjadi kesalahan saat mengambil data statistik."
            actionLabel="Coba Lagi"
            onAction={() => {
              setResult(null)
              setRetryCount((c) => c + 1)
            }}
          />
        ) : (
          <div className="space-y-6">
            <div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total Event" value={stats.totalEvents.toLocaleString('id-ID')} icon={icons.event} />
                <StatCard label="Total Revenue" value={formatIDR(stats.totalRevenue)} icon={icons.revenue} />
                <StatCard label="Total Attendees" value={stats.totalAttendees.toLocaleString('id-ID')} icon={icons.attendees} />
                <StatCard label="Total Transaksi" value={stats.totalTransactions.toLocaleString('id-ID')} icon={icons.transaction} />
              </div>
              <p className="mt-2 text-xs text-gray-400">Kartu di atas dihitung dari seluruh waktu; grafik mengikuti tahun yang dipilih.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue {stats.year}</h2>
                <figure aria-label={`Grafik revenue per bulan tahun ${stats.year}`} className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.revenueByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={formatCompact} tick={{ fontSize: 12 }} width={48} />
                      <Tooltip formatter={(value) => [formatIDR(Number(value)), 'Revenue']} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={COLOR_PRIMARY}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </figure>
              </Card>

              <Card className="p-5">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Attendees {stats.year}</h2>
                <figure aria-label={`Grafik attendees per bulan tahun ${stats.year}`} className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.attendeesByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
                      <Tooltip formatter={(value) => [Number(value).toLocaleString('id-ID'), 'Attendees']} />
                      <Bar dataKey="attendees" fill={COLOR_SECONDARY} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </figure>
              </Card>
            </div>

            <Card className="p-5">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">5 Event Teratas</h2>
              {stats.topEvents.length === 0 ? (
                <EmptyState title="Belum ada penjualan" subtitle="Event dengan transaksi selesai akan muncul di sini." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="py-2 pr-4">Event</th>
                        <th className="py-2 pr-4 text-right">Revenue</th>
                        <th className="py-2 pr-4 text-right">Attendees</th>
                        <th className="py-2">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.topEvents.map((e, i) => (
                        <tr key={e.id}>
                          <td className="py-3 pr-4 font-medium text-gray-900">
                            <span className="mr-2 text-gray-400">{i + 1}.</span>
                            {e.name}
                          </td>
                          <td className="py-3 pr-4 text-right">{formatIDR(e.revenue)}</td>
                          <td className="py-3 pr-4 text-right">{e.attendees.toLocaleString('id-ID')}</td>
                          <td className="whitespace-nowrap py-3 text-gray-600">
                            {e.startDate ? formatDateShort(e.startDate) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </OrganizerLayout>
  )
}
