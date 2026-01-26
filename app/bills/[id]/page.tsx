'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaFileInvoice, FaMoneyBillWave } from 'react-icons/fa'
import { ConfirmationModal } from '@/components/ConfirmationModal'

export default function BillPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [confirmPaymentModal, setConfirmPaymentModal] = useState<{
    show: boolean
    amount: number | null
  }>({
    show: false,
    amount: null,
  })

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
    }
  }, [router])

  const billId = params.id
  const { data: bill, isLoading } = useQuery({
    queryKey: ['bill', billId],
    queryFn: () => api.get(`/bills/${billId}`),
  })

  const queryClient = useQueryClient()

  const updatePaymentMutation = useMutation({
    mutationFn: (paidAmount: number) =>
      api.put(`/bills/${billId}`, { paidAmount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', params.id] })
      setShowPaymentModal(false)
      setConfirmPaymentModal({ show: false, amount: null })
      toast.success('Payment updated successfully')
    },
    onError: () => {
      toast.error('Failed to update payment')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen relative flex">
        <Navbar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center h-96">
          <div className="text-slate-300 text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="min-h-screen relative flex">
        <Navbar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center h-96">
          <div className="text-slate-300 text-lg">Bill not found</div>
        </div>
      </div>
    )
  }

  const booking = bill.booking
  const guest = booking.guest
  const room = booking.room

  return (
    <div className="min-h-screen relative flex">
      <Navbar />
      <div className="flex-1 lg:ml-64">
        <div className="glow-sky top-20 right-20"></div>
        <div className="glow-emerald bottom-20 left-20"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="card">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <h1 className="text-xl font-bold text-slate-100">Invoice</h1>
              <p className="text-xs text-slate-400">Bill Number: {bill.billNumber}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="btn-primary"
            >
              Print / Download
            </button>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
            <div>
              <h3 className="font-semibold text-slate-100 mb-2">Guest Details</h3>
              <p className="text-slate-300">{guest.name}</p>
              <p className="text-slate-300">{guest.phone}</p>
              {guest.address && <p className="text-slate-300">{guest.address}</p>}
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 mb-2">Booking Details</h3>
              <p className="text-slate-300">Room: {room.roomNumber}</p>
              <p className="text-slate-300">Type: {room.roomType}</p>
              <p className="text-slate-300">
                Check-in: {new Date(booking.checkIn).toLocaleDateString()}
              </p>
              <p className="text-slate-300">
                Check-out: {new Date(booking.checkOut).toLocaleDateString()}
              </p>
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

          {bill.paymentStatus !== 'PAID' && (
            <div className="mt-6 relative z-10">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="btn-primary"
              >
                <span>Record Payment</span>
              </button>
            </div>
          )}
        </div>

        {showPaymentModal && (
          <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <PaymentModal
                bill={bill}
                onClose={() => setShowPaymentModal(false)}
                onPay={(amount: number) => {
                  setShowPaymentModal(false)
                  setConfirmPaymentModal({ show: true, amount })
                }}
              />
            </div>
          </div>
        )}

        <ConfirmationModal
          show={confirmPaymentModal.show}
          title="Confirm Payment"
          message={`Are you sure you want to record a payment of ₹${confirmPaymentModal.amount?.toLocaleString()}?`}
          action="Record Payment"
          type="update"
          onConfirm={() => {
            if (confirmPaymentModal.amount) {
              updatePaymentMutation.mutate(confirmPaymentModal.amount)
            }
          }}
          onCancel={() => setConfirmPaymentModal({ show: false, amount: null })}
          isLoading={updatePaymentMutation.isPending}
          confirmText="Record Payment"
        />
        </div>
      </div>
    </div>
  )
}

function PaymentModal({
  bill,
  onClose,
  onPay,
}: {
  bill: any
  onClose: () => void
  onPay: (amount: number) => void
}) {
  const [amount, setAmount] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const paymentAmount = parseFloat(amount)
    if (paymentAmount > 0 && paymentAmount <= bill.balanceAmount) {
      onPay(paymentAmount)
    } else {
      toast.error('Invalid payment amount')
    }
  }

  return (
    <div className="modal-content">
      <div className="p-6 relative z-10">
        <div className="card-header">
          <h2 className="text-lg font-bold text-slate-100 flex items-center">
            <FaMoneyBillWave className="mr-2 w-4 h-4" />
            Record Payment
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label">Payment Amount</label>
            <input
              type="number"
              required
              step="0.01"
              max={bill.balanceAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="form-input"
            />
            <p className="mt-2 text-sm text-slate-400">
              Balance: <span className="font-semibold text-slate-200">₹{bill.balanceAmount.toLocaleString()}</span>
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              <span>Record Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
