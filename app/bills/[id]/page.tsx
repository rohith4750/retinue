'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import toast from 'react-hot-toast'
import { FaDownload, FaPrint, FaHistory, FaCheckCircle, FaArrowLeft, FaMoneyBillWave, FaRupeeSign, FaEdit, FaExclamationTriangle } from 'react-icons/fa'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { pdf } from '@react-pdf/renderer'
import { BillPDF } from '@/components/BillPDF'

export default function BillPage() {
  const params = useParams()
  const billId = params.id as string
  const queryClient = useQueryClient()
  const [paymentInput, setPaymentInput] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [correctPaidInput, setCorrectPaidInput] = useState('')
  const [correctReason, setCorrectReason] = useState('')
  const [showCorrectSection, setShowCorrectSection] = useState(false)
  const [editPaymentTx, setEditPaymentTx] = useState<{ historyId: string; amount: number } | null>(null)
  const [editPaymentAmount, setEditPaymentAmount] = useState('')
  const [editPaymentReason, setEditPaymentReason] = useState('')

  const { data: bill, isLoading } = useQuery({
    queryKey: ['bill', billId],
    queryFn: () => api.get(`/bills/${billId}`),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const paymentMutation = useMutation({
    mutationFn: ({ amount, paymentMode: mode }: { amount: number; paymentMode: string }) =>
      api.put(`/bills/${billId}`, { paidAmount: amount, paymentMode: mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', billId] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Payment recorded successfully')
      setPaymentInput('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Failed to record payment'),
  })

  const correctPaymentMutation = useMutation({
    mutationFn: ({ correctPaidAmount, reason }: { correctPaidAmount: number; reason?: string }) =>
      api.put(`/bills/${billId}`, { action: 'CORRECT_PAID', correctPaidAmount, reason: reason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', billId] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Total paid corrected successfully')
      setCorrectPaidInput('')
      setCorrectReason('')
      setShowCorrectSection(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Failed to correct payment'),
  })

  const editPaymentMutation = useMutation({
    mutationFn: ({ historyId, newAmount, reason }: { historyId: string; newAmount: number; reason?: string }) =>
      api.put(`/bills/${billId}`, { action: 'EDIT_PAYMENT', historyId, newAmount, reason: reason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', billId] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Payment transaction updated successfully')
      setEditPaymentTx(null)
      setEditPaymentAmount('')
      setEditPaymentReason('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Failed to edit payment'),
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
        <Link href="/bookings" className="ml-4 text-sky-400 hover:underline">Back to Bookings</Link>
      </div>
    )
  }

  const booking = bill.booking
  const guest = booking.guest
  const room = booking.room
  const advanceAmount = bill.advanceAmount ?? 0
  const balanceDue = Math.max(0, (bill.totalAmount || 0) - (bill.paidAmount || 0))
  const isPending = balanceDue > 0

  // Build payment transactions from booking onwards (meaningful timeline)
  type TxRow = { type: string; label: string; amount: number; date: string; mode?: string; notes?: string; historyId?: string }
  const paymentTransactions: TxRow[] = []
  if (advanceAmount > 0) {
    paymentTransactions.push({
      type: 'ADVANCE',
      label: 'Advance at booking',
      amount: advanceAmount,
      date: new Date(bill.createdAt).toLocaleString('en-IN'),
      notes: 'Paid at time of booking',
    })
  }
  ;(bill.history || []).forEach((h: any) => {
    if (h.action === 'PAYMENT_RECEIVED' && h.changes) {
      let amount = Number(h.changes.paymentReceived)
      if (!amount && h.changes.paidAmount?.to != null) amount = Number(h.changes.paidAmount.to) - Number(h.changes.paidAmount.from ?? 0)
      amount = amount || 0
      if (amount > 0) {
        paymentTransactions.push({
          type: 'PAYMENT',
          label: 'Payment received',
          amount,
          date: new Date(h.timestamp).toLocaleString('en-IN'),
          mode: h.changes.paymentMode ? String(h.changes.paymentMode).replace('_', ' ') : undefined,
          notes: h.notes,
          historyId: h.id,
        })
      }
    }
    if (h.action === 'PAYMENT_CORRECTED' && h.changes?.paidAmount?.to != null) {
      const newTotal = Number(h.changes.paidAmount.to)
      paymentTransactions.push({
        type: 'CORRECTION',
        label: 'Payment corrected',
        amount: newTotal,
        date: new Date(h.timestamp).toLocaleString('en-IN'),
        notes: h.notes,
      })
    }
    if (h.action === 'PAYMENT_EDITED' && h.changes) {
      const prev = Number(h.changes.previousAmount) || 0
      const newAmt = Number(h.changes.newAmount) || 0
      paymentTransactions.push({
        type: 'EDIT',
        label: 'Payment edited',
        amount: newAmt,
        date: new Date(h.timestamp).toLocaleString('en-IN'),
        notes: h.notes || `Was ₹${prev.toLocaleString()}, now ₹${newAmt.toLocaleString()}`,
      })
    }
  })

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
      <div className="glow-sky top-20 right-20" />
      <div className="glow-emerald bottom-20 left-20" />
      <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 py-6 relative z-10">
        {/* Header: Back to Bills (direct approach) + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href="/bills"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span>Back to Bills</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <FaDownload className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 transition-colors flex items-center gap-2"
            >
              <FaPrint className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Summary: Advance, Total, Paid, Remaining */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-800/60 p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Amount summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Advance amount</p>
              <p className="text-lg font-bold text-sky-400">₹{advanceAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Total amount</p>
              <p className="text-lg font-bold text-slate-200">₹{(bill.totalAmount ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Total paid</p>
              <p className="text-lg font-bold text-emerald-400">₹{(bill.paidAmount ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Total remaining</p>
              <p className={`text-lg font-bold ${balanceDue > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                ₹{balanceDue.toLocaleString()}
                {balanceDue <= 0 && ' (Fully paid)'}
              </p>
            </div>
          </div>
        </div>

        {/* Amount pending banner + Record payment (all bill operations here) */}
        {isPending && booking.status !== 'CANCELLED' && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaMoneyBillWave className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-amber-200">Amount pending: ₹{balanceDue.toLocaleString()}</h2>
            </div>
            <p className="text-sm text-slate-300 mb-4">Record payment below. All bill operations are done on this page.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">How did the guest pay?</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full max-w-xs py-2.5 px-3 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="NET_BANKING">Net Banking</option>
                  <option value="WALLET">Wallet</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount</label>
                  <div className="relative">
                    <FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="number"
                      value={paymentInput}
                      onChange={(e) => setPaymentInput(e.target.value)}
                      placeholder="Enter amount"
                      className="w-40 pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => paymentMutation.mutate({ amount: parseFloat(paymentInput) || 0, paymentMode })}
                  disabled={paymentMutation.isPending || !paymentInput}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-semibold text-sm hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </button>
                <button
                  onClick={() => paymentMutation.mutate({ amount: balanceDue, paymentMode })}
                  disabled={paymentMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-colors flex items-center gap-2"
                >
                  <FaCheckCircle className="w-4 h-4" />
                  Pay Full Balance (₹{balanceDue.toLocaleString()})
                </button>
              </div>
            </div>
          </div>
        )}

        {!isPending && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
            <FaCheckCircle className="w-6 h-6 text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-200">Fully paid</p>
              <p className="text-sm text-slate-400">No pending amount. Download or print invoice below.</p>
            </div>
          </div>
        )}

        {/* Wrong entry? Correct total paid */}
        {booking.status !== 'CANCELLED' && (
          <div className="mb-6 rounded-2xl border border-slate-600/80 bg-slate-800/50 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setShowCorrectSection(!showCorrectSection)
                if (!showCorrectSection) setCorrectPaidInput(String(bill.paidAmount ?? 0))
              }}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <FaExclamationTriangle className="w-4 h-4 text-amber-400" />
                Wrong entry? Modify total paid
              </span>
              <span className="text-slate-500 text-xs">{showCorrectSection ? 'Hide' : 'Show'}</span>
            </button>
            {showCorrectSection && (
              <div className="px-4 pb-4 pt-0 space-y-3 border-t border-white/5">
                <p className="text-xs text-slate-500 mt-3">Set the correct total paid amount (e.g. if a payment was entered wrong). Current total paid: ₹{(bill.paidAmount ?? 0).toLocaleString()}. Max: ₹{(bill.totalAmount ?? 0).toLocaleString()}.</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Correct total paid (₹)</label>
                    <div className="relative">
                      <FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="number"
                        min="0"
                        max={bill.totalAmount ?? 0}
                        step="0.01"
                        value={correctPaidInput}
                        onChange={(e) => setCorrectPaidInput(e.target.value)}
                        placeholder={String(bill.paidAmount ?? 0)}
                        className="w-40 pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-slate-400 mb-1">Reason (optional)</label>
                    <input
                      type="text"
                      value={correctReason}
                      onChange={(e) => setCorrectReason(e.target.value)}
                      placeholder="e.g. Wrong amount entered"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const amount = parseFloat(correctPaidInput)
                      if (isNaN(amount) || amount < 0 || amount > (bill.totalAmount ?? 0)) {
                        toast.error('Enter an amount between 0 and total amount')
                        return
                      }
                      correctPaymentMutation.mutate({ correctPaidAmount: amount, reason: correctReason || undefined })
                    }}
                    disabled={correctPaymentMutation.isPending || correctPaidInput === ''}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <FaEdit className="w-3.5 h-3.5" />
                    {correctPaymentMutation.isPending ? 'Updating...' : 'Update total paid'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoice card */}
        <div className="card print:shadow-none">
          <div className="border-b border-white/10 pb-6 mb-6">
            <div className="text-center mb-4">
              <h1 className="text-3xl font-bold text-blue-400 mb-1">THE RETINUE</h1>
              <p className="text-sm text-slate-400">Luxury Hotel & Hospitality</p>
            </div>
            <div className="text-center text-xs text-slate-500">
              <p>123 Hotel Street, City, State - 123456</p>
              <p>Phone: +91 1234567890 | Email: info@theretinue.com</p>
            </div>
          </div>

          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Invoice</h2>
              <p className="text-xs text-slate-400 mt-1">Bill # {bill.billNumber}</p>
              <p className="text-xs text-slate-400">Date: {new Date(bill.createdAt).toLocaleString('en-IN')}</p>
            </div>
            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
              bill.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
              bill.paymentStatus === 'PARTIAL' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {bill.paymentStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800/40 p-4 rounded-xl">
              <h3 className="font-semibold text-slate-100 mb-3 border-b border-white/10 pb-2">Guest</h3>
              <p className="text-slate-200">{guest.name}</p>
              <p className="text-sm text-slate-400">{guest.phone}</p>
              {guest.address && <p className="text-sm text-slate-400 mt-1">{guest.address}</p>}
              {guest.idProof && <p className="text-xs text-slate-500 mt-1">ID: {guest.idProof}</p>}
            </div>
            <div className="bg-slate-800/40 p-4 rounded-xl">
              <h3 className="font-semibold text-slate-100 mb-3 border-b border-white/10 pb-2">Booking</h3>
              <p className="text-slate-200">Room {room.roomNumber} ({room.roomType}) • Floor {room.floor}</p>
              <p className="text-sm text-slate-400">Check-in: {new Date(booking.checkIn).toLocaleString('en-IN')}</p>
              <p className="text-sm text-slate-400">Check-out: {new Date(booking.checkOut).toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500 mt-1">Booking ID: {booking.id}</p>
            </div>
          </div>

          <table className="w-full mb-6">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-slate-400 font-medium">Description</th>
                <th className="text-right py-2 text-slate-400 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-3 text-slate-300">Room charges</td>
                <td className="py-3 text-right text-slate-100">₹{(bill.subtotal ?? 0).toLocaleString()}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 text-slate-300">GST (18%)</td>
                <td className="py-3 text-right text-slate-100">₹{(bill.tax ?? 0).toLocaleString()}</td>
              </tr>
              {(bill.discount ?? 0) > 0 && (
                <tr className="border-b border-white/5">
                  <td className="py-3 text-slate-300">Discount</td>
                  <td className="py-3 text-right text-emerald-400">-₹{(bill.discount ?? 0).toLocaleString()}</td>
                </tr>
              )}
              <tr className="bg-slate-800/40">
                <td className="py-3 font-semibold text-slate-100">Total</td>
                <td className="py-3 text-right font-semibold text-slate-100">₹{(bill.totalAmount ?? 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div>
              <p className="text-xs text-slate-400">Advance</p>
              <p className="text-lg font-semibold text-sky-400">₹{advanceAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Paid</p>
              <p className="text-lg font-semibold text-emerald-400">₹{(bill.paidAmount ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Balance due</p>
              <p className={`text-lg font-semibold ${balanceDue > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                ₹{balanceDue.toLocaleString()}
                {balanceDue <= 0 && ' (Fully paid)'}
              </p>
            </div>
          </div>

          {/* Payment transactions – from booking onwards (meaningful view) */}
          <div className="border-t border-white/5 pt-6">
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <FaHistory className="w-4 h-4 text-sky-400" />
              Payment transactions
            </h3>
            <p className="text-xs text-slate-500 mb-4">All payments for this customer from booking onwards.</p>
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/60 border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">#</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Date & time</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">How paid</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Amount</th>
                    {booking.status !== 'CANCELLED' && (
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase w-20">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paymentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={booking.status !== 'CANCELLED' ? 6 : 5} className="py-8 text-center text-slate-500">
                        No payments recorded yet
                      </td>
                    </tr>
                  ) : (
                    paymentTransactions.map((tx, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-400">{i + 1}</td>
                        <td className="py-3 px-4 text-slate-200 font-medium">{tx.label}</td>
                        <td className="py-3 px-4 text-slate-400">{tx.date}</td>
                        <td className="py-3 px-4 text-slate-400">{tx.mode ?? '–'}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                          {tx.type === 'CORRECTION' ? `Set to ₹${tx.amount.toLocaleString()}` : tx.type === 'EDIT' ? `₹${tx.amount.toLocaleString()}` : `+₹${tx.amount.toLocaleString()}`}
                        </td>
                        {booking.status !== 'CANCELLED' && (
                          <td className="py-3 px-4 text-right">
                            {tx.type === 'PAYMENT' && tx.historyId ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditPaymentTx({ historyId: tx.historyId!, amount: tx.amount })
                                  setEditPaymentAmount(String(tx.amount))
                                  setEditPaymentReason('')
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-600 text-slate-200 text-xs font-medium hover:bg-sky-600 hover:text-white transition-colors"
                              >
                                <FaEdit className="w-3 h-3" />
                                Edit
                              </button>
                            ) : (
                              <span className="text-slate-600">–</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800/60 border-t-2 border-white/10">
                    <td colSpan={booking.status !== 'CANCELLED' ? 5 : 4} className="py-3 px-4 font-semibold text-slate-200">Total received</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">₹{(bill.paidAmount ?? 0).toLocaleString()}</td>
                    {booking.status !== 'CANCELLED' && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <Link
              href="/bills"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              Back to Bills
            </Link>
          </div>
        </div>

        {/* Edit Payment Transaction modal */}
        {editPaymentTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !editPaymentMutation.isPending && setEditPaymentTx(null)}>
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <FaEdit className="w-5 h-5 text-sky-400" />
                  Edit payment transaction
                </h3>
                <p className="text-sm text-slate-400 mt-1">Change the amount for this recorded payment. Original: ₹{editPaymentTx.amount.toLocaleString()}.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">New amount (₹)</label>
                  <div className="relative">
                    <FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editPaymentAmount}
                      onChange={(e) => setEditPaymentAmount(e.target.value)}
                      placeholder={String(editPaymentTx.amount)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Reason (optional)</label>
                  <input
                    type="text"
                    value={editPaymentReason}
                    onChange={(e) => setEditPaymentReason(e.target.value)}
                    placeholder="e.g. Wrong amount entered"
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="p-6 pt-0 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditPaymentTx(null)}
                  disabled={editPaymentMutation.isPending}
                  className="px-4 py-2.5 rounded-xl bg-slate-600 text-slate-200 text-sm font-medium hover:bg-slate-500 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const amount = parseFloat(editPaymentAmount)
                    if (isNaN(amount) || amount < 0) {
                      toast.error('Enter a valid non-negative amount')
                      return
                    }
                    editPaymentMutation.mutate({
                      historyId: editPaymentTx.historyId,
                      newAmount: amount,
                      reason: editPaymentReason || undefined,
                    })
                  }}
                  disabled={editPaymentMutation.isPending || editPaymentAmount === ''}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {editPaymentMutation.isPending ? 'Updating...' : 'Update payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
