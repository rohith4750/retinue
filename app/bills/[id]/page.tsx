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
import { PaymentReceiptPDF } from '@/components/PaymentReceiptPDF'
import { HOTEL_INFO } from '@/lib/hotel-info'

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
  const [showEditBillModal, setShowEditBillModal] = useState(false)
  const [editBillData, setEditBillData] = useState({ billNumber: '', discount: 0 })

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

  const editBillMutation = useMutation({
    mutationFn: (data: { billNumber?: string; discount?: number }) =>
      api.patch(`/bills/${billId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', billId] })
      toast.success('Bill updated successfully')
      setShowEditBillModal(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Failed to update bill'),
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
  const subtotal = bill.subtotal ?? 0
  const tax = bill.tax ?? 0
  const discount = bill.discount ?? 0
  const paidAmount = bill.paidAmount ?? 0

  const netPayable = subtotal + tax - discount
  const balanceDue = Math.round((netPayable - paidAmount) * 100) / 100
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

  // Use a map to consolidate history entries with same timestamp/action for cleaner view
  const consolidatedHistoryMapping = new Map<string, any>()
    ; (bill.history || []).forEach((h: any) => {
      const ts = new Date(h.timestamp).getTime()
      const roundedTs = Math.floor(ts / 1000) * 1000
      const key = `${h.action}-${roundedTs}`
      if (!consolidatedHistoryMapping.has(key)) {
        consolidatedHistoryMapping.set(key, h)
      }
    })

  Array.from(consolidatedHistoryMapping.values())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .forEach((h: any) => {
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
      if (h.action === 'BILL_ADJUSTED' && h.changes?.discount?.to !== undefined) {
        const prev = Number(h.changes.discount.from) || 0
        const now = Number(h.changes.discount.to) || 0
        if (prev !== now) {
          paymentTransactions.push({
            type: 'ADJUSTMENT',
            label: now > prev ? 'Additional discount applied' : 'Discount reduced',
            amount: Math.abs(now - prev),
            date: new Date(h.timestamp).toLocaleString('en-IN'),
            notes: `Discount changed from \u20B9${prev.toLocaleString()} to \u20B9${now.toLocaleString()}`,
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
          notes: h.notes || `Was \u20B9${prev.toLocaleString()}, now \u20B9${newAmt.toLocaleString()}`,
        })
      }
    })

  const totalTransactionsSum = paymentTransactions.reduce((sum, tx) => {
    if (tx.type === 'CORRECTION') return tx.amount // Correction is an absolute set
    if (tx.type === 'PAYMENT' || tx.type === 'ADVANCE') return sum + tx.amount
    return sum
  }, 0)

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

  const handlePrint = async () => {
    try {
      const blob = await pdf(<BillPDF bill={bill} />).toBlob()
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      } else {
        toast.error('Please allow popups to print')
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (error) {
      console.error('Error printing PDF:', error)
      toast.error('Failed to prepare print document')
    }
  }

  const handleDownloadReceipt = async (tx: TxRow) => {
    try {
      const blob = await pdf(<PaymentReceiptPDF bill={bill} transaction={tx} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Receipt-${bill.billNumber}-${tx.label.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Receipt downloaded')
    } catch (error) {
      console.error('Error generating receipt:', error)
      toast.error('Failed to generate receipt')
    }
  }

  const handlePrintReceipt = async (tx: TxRow) => {
    try {
      const blob = await pdf(<PaymentReceiptPDF bill={bill} transaction={tx} />).toBlob()
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      } else {
        toast.error('Please allow popups to print')
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (error) {
      console.error('Error printing receipt:', error)
      toast.error('Failed to prepare receipt for printing')
    }
  }

  return (
    <>
      <div className="glow-sky top-20 right-20" />
      <div className="glow-emerald bottom-20 left-20" />
      <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 py-6 relative z-10">
        {/* Header: Back to Bills + Actions */}
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
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 transition-colors flex items-center gap-2"
            >
              <FaPrint className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Summary: Gross, Discount, Net, Paid, Balance */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-800/60 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Amount summary</h2>
            <button
              onClick={() => {
                setEditBillData({ billNumber: bill.billNumber || '', discount: bill.discount || 0 })
                setShowEditBillModal(true)
              }}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium transition-colors"
            >
              <FaEdit className="w-3 h-3" />
              Edit details
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-0.5 uppercase tracking-tight">Gross Bill</p>
              <p className="text-lg font-bold text-slate-200">₹{(subtotal + tax).toLocaleString()}</p>
            </div>
            <div className="opacity-80">
              <p className="text-xs text-slate-500 mb-0.5 uppercase tracking-tight">Total Discount</p>
              <p className="text-lg font-bold text-emerald-400">-₹{discount.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <p className="text-xs text-sky-400/80 mb-0.5 font-semibold uppercase tracking-tight">Net Payable</p>
              <p className="text-xl font-black text-white">₹{netPayable.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5 uppercase tracking-tight">Amount Paid</p>
              <p className="text-lg font-bold text-emerald-400">₹{paidAmount.toLocaleString()}</p>
            </div>
            <div className={`${balanceDue > 0 ? 'bg-amber-500/10 border-amber-500/20' : balanceDue < 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'} p-2 rounded-lg border`}>
              <p className="text-xs text-slate-500 mb-0.5 font-bold uppercase tracking-tight">
                {balanceDue < 0 ? 'Overpaid' : 'Balance Due'}
              </p>
              <p className={`text-xl font-black ${balanceDue > 0 ? 'text-amber-400' : balanceDue < 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                ₹{Math.abs(balanceDue).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Status banners */}
        {isPending && booking.status !== 'CANCELLED' && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaMoneyBillWave className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-amber-200">Amount pending: ₹{balanceDue.toLocaleString()}</h2>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">How did the guest pay?</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full max-w-xs py-2 px-3 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="WALLET">Wallet</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={paymentInput}
                    onChange={(e) => setPaymentInput(e.target.value)}
                    className="w-32 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                  />
                </div>
                <button
                  onClick={() => paymentMutation.mutate({ amount: parseFloat(paymentInput) || 0, paymentMode })}
                  disabled={paymentMutation.isPending || !paymentInput}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors"
                >
                  Record Payment
                </button>
                <button
                  onClick={() => paymentMutation.mutate({ amount: balanceDue, paymentMode })}
                  disabled={paymentMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-colors"
                >
                  Full Balance
                </button>
              </div>
            </div>
          </div>
        )}

        {!isPending && (
          <div className={`mb-6 rounded-2xl border ${balanceDue < 0 ? 'border-sky-500/30 bg-sky-500/10' : 'border-emerald-500/30 bg-emerald-500/10'} p-4 flex items-center gap-3`}>
            {balanceDue < 0 ? <FaHistory className="w-6 h-6 text-sky-400" /> : <FaCheckCircle className="w-6 h-6 text-emerald-400" />}
            <div>
              <p className={`font-semibold ${balanceDue < 0 ? 'text-sky-200' : 'text-emerald-200'}`}>{balanceDue < 0 ? 'Overpaid Bill' : 'Fully paid'}</p>
              <p className="text-sm text-slate-400">{balanceDue < 0 ? `The guest has paid ₹${Math.abs(balanceDue).toLocaleString()} extra.` : 'No pending amount. Download or print invoice below.'}</p>
            </div>
          </div>
        )}

        {/* Correction section */}
        {booking.status !== 'CANCELLED' && (
          <div className="mb-6 rounded-2xl border border-slate-600 bg-slate-800/50 overflow-hidden">
            <button
              onClick={() => setShowCorrectSection(!showCorrectSection)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-700/30"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <FaExclamationTriangle className="w-4 h-4 text-amber-400" />
                Wrong entry? Modify total paid
              </span>
              <span className="text-slate-500 text-xs">{showCorrectSection ? 'Hide' : 'Show'}</span>
            </button>
            {showCorrectSection && (
              <div className="px-4 pb-4 pt-0 space-y-3 border-t border-white/5">
                <p className="text-xs text-slate-500 mt-3">Set correct total paid amount. Current: ₹{paidAmount.toLocaleString()}</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Correct total paid (₹)</label>
                    <input
                      type="number"
                      value={correctPaidInput}
                      onChange={(e) => setCorrectPaidInput(e.target.value)}
                      className="w-40 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    value={correctReason}
                    onChange={(e) => setCorrectReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="flex-1 min-w-[200px] px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                  />
                  <button
                    onClick={() => {
                      const amount = parseFloat(correctPaidInput)
                      if (isNaN(amount) || amount < 0) { toast.error('Check amount'); return; }
                      correctPaymentMutation.mutate({ correctPaidAmount: amount, reason: correctReason || undefined })
                    }}
                    disabled={correctPaymentMutation.isPending}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-500 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoice Card */}
        <div className="bg-slate-800 border border-white/5 rounded-2xl p-6 mb-8">
           <div className="border-b border-white/10 pb-6 mb-6 text-center">
              <h1 className="text-3xl font-bold text-blue-400 mb-1">THE RETINUE</h1>
              <p className="text-sm text-slate-400">Luxury Hotel & Hospitality</p>
              <div className="text-xs text-slate-500 mt-2">
                <p>{HOTEL_INFO.address}</p>
                <p>Email: {HOTEL_INFO.email}</p>
              </div>
          </div>

          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Invoice</h2>
              <p className="text-xs text-slate-400 mt-1">Bill # {bill.billNumber}</p>
              <p className="text-xs text-slate-400">Date: {new Date(bill.billDate || booking.checkOut).toLocaleString('en-IN')}</p>
            </div>
            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${bill.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {bill.paymentStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900/40 p-4 rounded-xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Guest</h3>
              <p className="font-semibold text-slate-200">{guest.name}</p>
              <p className="text-sm text-slate-400">{guest.phone}</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Booking</h3>
              <p className="font-semibold text-slate-200">Room {room.roomNumber} ({room.roomType})</p>
              <p className="text-sm text-slate-400">Check-in: {new Date(booking.checkIn).toLocaleDateString('en-IN')}</p>
              <p className="text-sm text-slate-400">Check-out: {new Date(booking.checkOut).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-white/5 text-slate-500">
                <th className="text-left py-2 font-medium">Description</th>
                <th className="text-right py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              { (bill.booking.items || [bill.booking]).map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-white/5 text-slate-300">
                  <td className="py-3">Room charges - {item.roomType || room.roomType} {item.roomNumber || room.roomNumber}</td>
                  <td className="py-3 text-right">₹{(item.subtotal || bill.subtotal).toLocaleString()}</td>
                </tr>
              ))}
              {tax > 0 && (
                <tr className="border-b border-white/5 text-slate-300">
                  <td className="py-3">GST (18%)</td>
                  <td className="py-3 text-right">₹{tax.toLocaleString()}</td>
                </tr>
              )}
              {discount > 0 && (
                <tr className="border-b border-white/5 text-emerald-400">
                  <td className="py-3">Discount</td>
                  <td className="py-3 text-right">-₹{discount.toLocaleString()}</td>
                </tr>
              )}
              <tr className="text-lg font-bold text-white">
                <td className="py-4">Total</td>
                <td className="py-4 text-right">₹{netPayable.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-900/60 rounded-xl">
             <div>
                <p className="text-[10px] text-slate-500 uppercase">Paid</p>
                <p className="text-emerald-400 font-bold">₹{paidAmount.toLocaleString()}</p>
             </div>
             <div>
                <p className="text-[10px] text-slate-500 uppercase">{balanceDue < 0 ? 'Surplus' : 'Balance'}</p>
                <p className={balanceDue > 0 ? 'text-amber-400 font-bold' : 'text-sky-400 font-bold'}>₹{Math.abs(balanceDue).toLocaleString()}</p>
             </div>
             <div>
                <p className="text-[10px] text-slate-500 uppercase">Status</p>
                <p className="text-slate-300 font-bold">{bill.paymentStatus}</p>
             </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="border-t border-white/5 pt-8">
           <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
             <FaHistory className="text-sky-400" /> Transaction History
           </h3>
           <div className="rounded-xl border border-white/10 overflow-hidden text-sm">
              <table className="w-full">
                <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paymentTransactions.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-600">No transactions recorded</td></tr>
                  ) : (
                    paymentTransactions.map((tx, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-slate-500">{i+1}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{tx.label}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{tx.date}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400">
                          {tx.type === 'CORRECTION' ? `Set to ₹${tx.amount.toLocaleString()}` : `+₹${tx.amount.toLocaleString()}`}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex justify-end gap-2">
                              {tx.historyId && tx.type === 'PAYMENT' && (
                                <button onClick={() => { setEditPaymentTx({ historyId: tx.historyId!, amount: tx.amount }); setEditPaymentAmount(String(tx.amount)) }} className="text-sky-400 hover:text-sky-300"><FaEdit /></button>
                              )}
                              <button onClick={() => handlePrintReceipt(tx)} className="text-slate-500 hover:text-white"><FaPrint /></button>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-800/60 font-bold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-slate-400 text-[10px]">TOTAL RECORDED</td>
                    <td className="px-4 py-3 text-right text-[10px] text-slate-500">Rows: ₹{totalTransactionsSum.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">Total: ₹{paidAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
           </div>
        </div>

        {/* Modals */}
        {editPaymentTx && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
              <div className="bg-slate-800 border border-white/10 p-6 rounded-2xl w-full max-w-sm">
                 <h3 className="font-bold text-white mb-4">Edit Transaction</h3>
                 <div className="space-y-4 mb-6">
                    <input type="number" value={editPaymentAmount} onChange={(e) => setEditPaymentAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white" />
                    <input type="text" value={editPaymentReason} onChange={(e) => setEditPaymentReason(e.target.value)} placeholder="Reason" className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white" />
                 </div>
                 <div className="flex justify-end gap-3">
                    <button onClick={() => setEditPaymentTx(null)} className="text-slate-400">Cancel</button>
                    <button onClick={() => editPaymentMutation.mutate({ historyId: editPaymentTx.historyId, newAmount: parseFloat(editPaymentAmount) || 0, reason: editPaymentReason })} className="bg-sky-600 text-white px-4 py-2 rounded-lg font-bold">Save</button>
                 </div>
              </div>
           </div>
        )}

        {showEditBillModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
              <div className="bg-slate-800 border border-white/10 p-6 rounded-2xl w-full max-w-sm">
                 <h3 className="font-bold text-white mb-4">Edit Bill Details</h3>
                 <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Bill Number</label>
                        <input type="text" value={editBillData.billNumber} onChange={(e) => setEditBillData({...editBillData, billNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Discount (₹)</label>
                        <input type="number" value={editBillData.discount} onChange={(e) => setEditBillData({...editBillData, discount: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white" />
                    </div>
                 </div>
                 <div className="flex justify-end gap-3">
                    <button onClick={() => setShowEditBillModal(false)} className="text-slate-400">Cancel</button>
                    <button onClick={() => editBillMutation.mutate(editBillData)} className="bg-sky-600 text-white px-4 py-2 rounded-lg font-bold">Save</button>
                 </div>
              </div>
           </div>
        )}
      </div>
    </>
  )
}
