'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { FaReceipt, FaRupeeSign, FaSearch, FaList, FaThLarge, FaFileInvoiceDollar } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SearchInput } from '@/components/SearchInput'

type PaymentFilter = 'all' | 'PENDING' | 'PARTIAL' | 'PAID'

export default function BillsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [page, setPage] = useState(1)
  const limit = 24 // Multiple of 2 and 3 for nice grid

  // Debounce search (optional, but good practice; here relying on standard input, effectively searches on type)
  // For better UX during typing, might want to use a debounced value or SearchInput's onSearch if available.
  // Assuming SearchInput updates state immediately.

  // Debounce search query to prevent excessive API calls
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset to page 1 on search
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: response, isLoading } = useQuery({
    queryKey: ['bookings', 'bills', page, limit, debouncedSearch, paymentFilter],
    queryFn: () => api.get(`/bookings?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&paymentStatus=${paymentFilter === 'all' ? '' : paymentFilter}`),
    staleTime: 5000,
  })

  const bookings = response?.data || []
  const pagination = response?.pagination || { page: 1, limit, total: 0, totalPages: 1 }
  const totalBills = pagination.total || 0

  // Filter bills (though API should assume all bookings are bills? Or check billNumber?)
  // Ideally API returns bookings, and all confirmed bookings have bills.
  // We can trust the API to filter by search/paymentStatus.

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-6 relative z-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <FaReceipt className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Bills</h1>
            <p className="text-sm text-slate-400">View bills, payment status and collect payments.</p>
          </div>
        </div>
      </div>

      {/* Toolbar: search + status filter + view toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by bill #, guest, room..."
            className="bg-slate-800/80 border-slate-600 text-white placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 mr-1">Status:</span>
          {(['all', 'PENDING', 'PARTIAL', 'PAID'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setPaymentFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${paymentFilter === f
                ? f === 'all'
                  ? 'bg-slate-600 text-white'
                  : f === 'PAID'
                    ? 'bg-emerald-500/30 text-emerald-300'
                    : f === 'PARTIAL'
                      ? 'bg-amber-500/30 text-amber-300'
                      : 'bg-red-500/30 text-red-300'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
            >
              {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
          <span className="w-px h-5 bg-slate-600 mx-1" />
          <div className="flex rounded-lg overflow-hidden border border-slate-600">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${viewMode === 'table' ? 'bg-sky-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
              title="Table view"
            >
              <FaList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 ${viewMode === 'cards' ? 'bg-sky-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
              title="Cards view"
            >
              <FaThLarge className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-4 mb-4 py-3 px-4 rounded-xl bg-slate-800/50 border border-white/5">
        <span className="text-sm text-slate-400">
          <span className="font-semibold text-white">{totalBills}</span> bill{totalBills !== 1 ? 's' : ''} found
        </span>
        {/* Note: Global totals (pending/paid) are harder with server-side pagination unless specific API endpoint provides aggregated stats. 
            For now, removing the total amounts to avoid misleading data based on just current page. 
            The Backend GET /api/bookings returns a 'summary' object with global stats! Let's use it.
        */}
        {response?.summary && (
          <span className="text-sm text-amber-400 ml-auto sm:ml-0">
            <FaRupeeSign className="inline w-3 h-3 mr-0.5" />
            <span className="font-semibold">{(response.summary.totalRevenue || 0).toLocaleString()}</span> total revenue
          </span>
        )}
      </div>

      {/* Content */}
      {totalBills === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col items-center justify-center py-16 px-4">
          <FaFileInvoiceDollar className="w-14 h-14 text-slate-600 mb-4" />
          <h2 className="text-lg font-semibold text-slate-300 mb-2">No bills found</h2>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            {searchQuery || paymentFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Create a booking to generate bills.'}
          </p>
          {!searchQuery && paymentFilter === 'all' && (
            <Link
              href="/bookings/new"
              className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              New Booking
            </Link>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bookings.map((b: any) => {
            const remaining = Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0))
            const status = b.paymentStatus || 'PENDING'
            return (
              <Link
                key={b.id}
                href={`/bills/${b.id}`}
                className="block rounded-xl border border-white/10 bg-slate-800/80 hover:bg-slate-800 hover:border-emerald-500/30 transition-all p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-mono text-slate-400 truncate" title={b.billNumber}>{b.billNumber || b.id.slice(-6).toUpperCase()}</span>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
                      status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white truncate">{b.guest?.name}</p>
                <p className="text-xs text-slate-400 mb-3">{b.room?.roomNumber} • {b.room?.roomType}</p>
                <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
                  <span className="text-slate-500">Total</span>
                  <span className="font-semibold text-white">₹{(b.totalAmount ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500">Paid</span>
                  <span className="text-emerald-400">₹{(b.paidAmount ?? 0).toLocaleString()}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-slate-500">Due</span>
                    <span className="font-medium text-amber-400">₹{remaining.toLocaleString()}</span>
                  </div>
                )}
                <p className="mt-3 text-center text-xs text-emerald-400 font-medium">View Bill →</p>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-white/10 bg-slate-800/60">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Bill #</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Guest</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Room</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Total</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Paid</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Due</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any) => {
                  const remaining = Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0))
                  const status = b.paymentStatus || 'PENDING'
                  return (
                    <tr key={b.id} className="border-b border-white/5 hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-sm font-mono text-slate-300 truncate max-w-[140px]" title={b.billNumber}>{b.billNumber || b.id.slice(-6).toUpperCase()}</td>
                      <td className="py-3 px-4 text-sm text-slate-200">{b.guest?.name}</td>
                      <td className="py-3 px-4 text-sm text-slate-400">{b.room?.roomNumber} ({b.room?.roomType})</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-200">₹{(b.totalAmount ?? 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right text-emerald-400">₹{(b.paidAmount ?? 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-amber-400">₹{remaining.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
                          status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/bills/${b.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30"
                        >
                          <FaReceipt className="w-3 h-3" />
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-slate-800/80 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page <span className="text-white font-medium">{page}</span> of <span className="text-white font-medium">{pagination.totalPages}</span>
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 rounded-lg bg-slate-800/80 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
