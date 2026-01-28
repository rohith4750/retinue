'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import toast from 'react-hot-toast'
import { FaDownload, FaPrint, FaHistory, FaCheckCircle, FaArrowLeft } from 'react-icons/fa'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { pdf } from '@react-pdf/renderer'
import { BillPDF } from '@/components/BillPDF'

export default function BillPage({ params }: { params: { id: string } }) {
  // Auth is handled by root layout

  const billId = params.id
  const { data: bill, isLoading } = useQuery({
    queryKey: ['bill', billId],
    queryFn: () => api.get(`/bills/${billId}`),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-300 text-lg">Bill not found</div>
      </div>
    )
  }

  const booking = bill.booking
  const guest = booking.guest
  const room = booking.room

  const handleDownloadPDF = async () => {
    try {
      const blob = await pdf(<BillPDF bill={bill} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Bill-${bill.billNumber}-TheRetinue.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    }
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full max-w-4xl px-4 lg:px-6 py-4 relative z-10">
        <div className="card">
          {/* Hotel Header */}
          <div className="border-b border-white/10 pb-6 mb-6 relative z-10">
            <div className="text-center mb-4">
              <h1 className="text-3xl font-bold text-blue-400 mb-1">THE RETINUE</h1>
              <p className="text-sm text-slate-400">Luxury Hotel & Hospitality</p>
            </div>
            <div className="text-center text-xs text-slate-500">
              <p>123 Hotel Street, City, State - 123456</p>
              <p>Phone: +91 1234567890 | Email: info@theretinue.com</p>
            </div>
          </div>

          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Invoice</h2>
              <p className="text-xs text-slate-400 mt-1">Bill Number: {bill.billNumber}</p>
              <p className="text-xs text-slate-400">
                Date: {new Date(bill.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                className="btn-primary flex items-center gap-2"
              >
                <FaDownload className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={() => window.print()}
                className="btn-secondary flex items-center gap-2"
              >
                <FaPrint className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative z-10">
            <div className="bg-slate-800/40 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-100 mb-3 text-lg border-b border-white/10 pb-2">
                Guest Details
              </h3>
              <div className="space-y-2">
                <p className="text-slate-300">
                  <span className="text-slate-400">Name:</span> {guest.name}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Phone:</span> {guest.phone}
                </p>
                {guest.email && (
                  <p className="text-slate-300">
                    <span className="text-slate-400">Email:</span> {guest.email}
                  </p>
                )}
                {guest.address && (
                  <p className="text-slate-300">
                    <span className="text-slate-400">Address:</span> {guest.address}
                  </p>
                )}
                {guest.idProof && (
                  <p className="text-slate-300">
                    <span className="text-slate-400">ID Proof:</span> {guest.idProof}
                  </p>
                )}
              </div>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-100 mb-3 text-lg border-b border-white/10 pb-2">
                Booking Details
              </h3>
              <div className="space-y-2">
                <p className="text-slate-300">
                  <span className="text-slate-400">Booking ID:</span> {booking.id}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Room:</span> {room.roomNumber} ({room.roomType})
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Floor:</span> {room.floor}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Check-in:</span>{' '}
                  {new Date(booking.checkIn).toLocaleString('en-IN')}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Check-out:</span>{' '}
                  {new Date(booking.checkOut).toLocaleString('en-IN')}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Slot Type:</span> {booking.slot.slotType}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Status:</span>{' '}
                  <span className="badge badge-info">{booking.status}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 relative z-10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 text-slate-300">Description</th>
                  <th className="text-right py-2 text-slate-300">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-3 text-slate-300">Room Charges</td>
                  <td className="py-3 text-right text-slate-100">
                    ₹{bill.subtotal.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 text-slate-300">GST (18%)</td>
                  <td className="py-3 text-right text-slate-100">
                    ₹{bill.tax.toLocaleString()}
                  </td>
                </tr>
                {bill.discount > 0 && (
                  <tr className="border-b border-white/5">
                    <td className="py-3 text-slate-300">Discount</td>
                    <td className="py-3 text-right text-emerald-400">
                      -₹{bill.discount.toLocaleString()}
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-800/40">
                  <td className="py-3 font-semibold text-slate-100">Total Amount</td>
                  <td className="py-3 text-right font-semibold text-slate-100">
                    ₹{bill.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 border-t border-white/5 pt-6 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Paid Amount</p>
                <p className="text-lg font-semibold text-emerald-400">
                  ₹{bill.paidAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Balance Amount</p>
                <p className="text-lg font-semibold text-red-400">
                  ₹{bill.balanceAmount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-400">Payment Status</p>
              <span className={`badge ${
                bill.paymentStatus === 'PAID'
                  ? 'badge-success'
                  : bill.paymentStatus === 'PARTIAL'
                  ? 'badge-warning'
                  : 'badge-danger'
              }`}>
                {bill.paymentStatus}
              </span>
            </div>
          </div>

          {/* Payment History Section */}
          <div className="mt-8 border-t border-white/5 pt-6 relative z-10">
            <h3 className="font-semibold text-slate-100 mb-4 text-lg flex items-center gap-2">
              <FaHistory className="w-4 h-4 text-sky-400" />
              Payment History
            </h3>
            
            <div className="space-y-3">
              {/* Booking Created */}
              <div className="flex items-center gap-4 p-3 bg-slate-800/40 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-slate-300">Booking Created</p>
                  <p className="text-xs text-slate-500">{new Date(bill.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <span className="text-sm text-slate-400">₹{bill.totalAmount.toLocaleString()}</span>
              </div>

              {/* Advance Payment */}
              {bill.advanceAmount > 0 && (
                <div className="flex items-center gap-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-emerald-400">Advance Payment</p>
                    <p className="text-xs text-slate-500">At booking time</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">+₹{bill.advanceAmount.toLocaleString()}</span>
                </div>
              )}

              {/* Payment History from database */}
              {bill.history?.filter((h: any) => h.action === 'PAYMENT_RECEIVED' || h.changes?.paidAmount).map((h: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-emerald-400">Payment Received</p>
                    <p className="text-xs text-slate-500">{new Date(h.timestamp).toLocaleString('en-IN')}</p>
                    {h.notes && <p className="text-xs text-slate-400 mt-1">{h.notes}</p>}
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">
                    +₹{(h.changes?.paymentReceived || h.changes?.paidAmount?.to - h.changes?.paidAmount?.from || 0).toLocaleString()}
                  </span>
                </div>
              ))}

              {/* Show message if no payment history */}
              {!bill.advanceAmount && (!bill.history || bill.history.filter((h: any) => h.action === 'PAYMENT_RECEIVED').length === 0) && bill.paidAmount === 0 && (
                <div className="text-center py-6 bg-slate-800/30 rounded-lg">
                  <p className="text-slate-500 text-sm">No payments recorded yet</p>
                </div>
              )}

              {/* Total Summary */}
              <div className="flex items-center gap-4 p-4 bg-slate-800/60 rounded-lg border border-white/10 mt-4">
                <FaCheckCircle className={`w-5 h-5 ${bill.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">Total Received</p>
                </div>
                <span className="text-lg font-bold text-emerald-400">₹{bill.paidAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Back to Bookings */}
          <div className="mt-6 relative z-10">
            <Link
              href="/bookings"
              className="btn-secondary flex items-center gap-2 w-fit"
            >
              <FaArrowLeft className="w-4 h-4" />
              Back to Bookings
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
