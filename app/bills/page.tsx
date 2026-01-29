'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import Link from 'next/link'
import { FaReceipt, FaArrowLeft, FaRupeeSign } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function BillsPage() {
  const { data: bookingsResponse, isLoading } = useQuery({
    queryKey: ['bookings', 'bills-list'],
    queryFn: () => api.get('/bookings?limit=50'),
    staleTime: 0,
  })

  const bookings = Array.isArray(bookingsResponse)
    ? bookingsResponse
    : (bookingsResponse?.data || [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <div className="glow-sky top-20 right-20" />
      <div className="glow-emerald bottom-20 left-20" />
      <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 py-6 relative z-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <FaArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <FaReceipt className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Bills</h1>
            <p className="text-sm text-slate-400">View and manage bills. Open a bill to record payment or print.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-slate-800/60">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Bill #</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Guest</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Room</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Total</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Advance</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Paid</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Remaining</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No bookings with bills yet.
                    </td>
                  </tr>
                ) : (
                  bookings
                    .filter((b: any) => b.billNumber)
                    .map((b: any) => {
                      const remaining = Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0))
                      return (
                        <tr
                          key={b.id}
                          className="border-b border-white/5 hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm font-medium text-slate-200">
                            {b.billNumber}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-300">{b.guest?.name}</td>
                          <td className="py-3 px-4 text-sm text-slate-300">
                            {b.room?.roomNumber} ({b.room?.roomType})
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-slate-200">
                            <FaRupeeSign className="inline w-3 h-3 mr-0.5 text-slate-500" />
                            {(b.totalAmount ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-sky-400">
                            <FaRupeeSign className="inline w-3 h-3 mr-0.5 text-slate-500" />
                            {(b.advanceAmount ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-emerald-400">
                            <FaRupeeSign className="inline w-3 h-3 mr-0.5 text-slate-500" />
                            {(b.paidAmount ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium">
                            <span className={remaining > 0 ? 'text-amber-400' : 'text-slate-400'}>
                              <FaRupeeSign className="inline w-3 h-3 mr-0.5 text-slate-500" />
                              {remaining.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${
                                b.paymentStatus === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : b.paymentStatus === 'PARTIAL'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {b.paymentStatus || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={`/bills/${b.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                            >
                              <FaReceipt className="w-3.5 h-3.5" />
                              View Bill
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {bookings.length > 0 && !bookings.some((b: any) => b.billNumber) && (
          <p className="mt-4 text-sm text-slate-500 text-center">
            No bookings have a bill number yet. Bills are created when you make a booking.
          </p>
        )}
      </div>
    </>
  )
}
