'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  FaUsers,
  FaMoneyBillWave,
  FaHotel,
  FaBuilding,
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaHistory,
  FaTimes,
  FaRupeeSign,
  FaCheckCircle,
  FaEdit,
  FaTrash
} from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FormInput, FormSelect, FormTextarea } from '@/components/FormComponents'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CHEQUE', label: 'Cheque' },
]

export default function WorkforcePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<any>(null)

  // Selected staff for payment
  const [payingStaff, setPayingStaff] = useState<any>(null)

  // Editing payment
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ show: boolean, paymentId: string | null }>({
    show: false,
    paymentId: null
  })

  // Filters
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString())

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    bonus: '0',
    deductions: '0',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    notes: '',
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      // Allow ADMIN and SUPER_ADMIN
      if (parsed.role !== 'SUPER_ADMIN' && parsed.role !== 'ADMIN') {
        toast.error('Access denied. Only Admin can access this page.')
        router.push('/dashboard')
      }
    }
  }, [router])

  const isAllowed = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  // Fetch staff
  const { data: staffResponse, isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff'),
    enabled: !!user && isAllowed,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Fetch salary payments for selected month
  const { data: paymentsResponse, isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ['salary-payments', selectedYear, selectedMonth],
    queryFn: () => api.get(`/salary-payments?year=${selectedYear}&month=${selectedMonth}`),
    enabled: !!user && isAllowed,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Parse data - handle both array and wrapped responses
  const staffList = useMemo(() => {
    if (!staffResponse) return []
    if (Array.isArray(staffResponse)) return staffResponse
    if (Array.isArray(staffResponse.data)) return staffResponse.data
    return []
  }, [staffResponse])

  const paymentsList = useMemo(() => {
    if (!paymentsResponse) return []
    if (Array.isArray(paymentsResponse)) return paymentsResponse
    if (Array.isArray(paymentsResponse.data)) return paymentsResponse.data
    return []
  }, [paymentsResponse])

  const paymentSummary = paymentsResponse?.summary || { total: 0, hotel: 0, convention: 0, count: 0 }

  // Create a map of paid staff for quick lookup
  const paidStaffMap = useMemo(() => {
    const map = new Map()
    paymentsList.forEach((p: any) => {
      map.set(p.staffId, p)
    })
    return map
  }, [paymentsList])

  // Check if staff has been paid
  const isPaid = (staffId: string) => paidStaffMap.has(staffId)
  const getPayment = (staffId: string) => paidStaffMap.get(staffId)

  // Group staff by business unit and filter active only
  const activeStaff = staffList.filter((s: any) => s.status === 'ACTIVE')
  const hotelStaff = activeStaff.filter((s: any) => s.businessUnit === 'HOTEL' || !s.businessUnit)
  const conventionStaff = activeStaff.filter((s: any) => s.businessUnit === 'CONVENTION')

  // Calculate pending
  const pendingStaff = activeStaff.filter((s: any) => !isPaid(s.id))
  const paidStaff = activeStaff.filter((s: any) => isPaid(s.id))
  const totalPendingSalary = pendingStaff.reduce((sum: number, s: any) => sum + (s.salary || s.dailyWage || 0), 0)

  // Pay salary mutation (CREATE)
  const paySalaryMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => api.post('/salary-payments', data),
    endpoint: '/salary-payments',
    additionalInvalidations: [['expenses'], ['expenses-summary']],
    onSuccess: () => {
      toast.success(`Salary paid successfully for ${payingStaff?.name}`)
      setPayingStaff(null)
      resetPaymentForm()
      refetchPayments()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to process salary')
    },
  })

  // Update salary mutation (UPDATE)
  const updatePaymentMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => api.put(`/salary-payments/${editingPaymentId}`, data),
    endpoint: '/salary-payments',
    additionalInvalidations: [['expenses'], ['expenses-summary']],
    onSuccess: () => {
      toast.success(`Salary payment updated successfully`)
      setPayingStaff(null)
      setEditingPaymentId(null)
      resetPaymentForm()
      refetchPayments()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update salary')
    },
  })

  // Delete salary mutation (DELETE)
  const deletePaymentMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/salary-payments/${id}`),
    endpoint: '/salary-payments',
    additionalInvalidations: [['expenses'], ['expenses-summary']],
    onSuccess: () => {
      toast.success(`Salary payment deleted successfully`)
      setDeleteModal({ show: false, paymentId: null })
      refetchPayments()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete salary')
    },
  })

  const resetPaymentForm = () => {
    setEditingPaymentId(null)
    setPaymentForm({
      amount: '',
      bonus: '0',
      deductions: '0',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      notes: '',
    })
  }

  const openPayment = (staff: any) => {
    setPayingStaff(staff)
    setEditingPaymentId(null)
    setPaymentForm({
      amount: (staff.staffType === 'DAILY' ? staff.dailyWage : staff.salary)?.toString() || '',
      bonus: '0',
      deductions: '0',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      notes: '',
    })
  }

  const openEditPayment = (payment: any) => {
    setPayingStaff(payment.staff) // Set staff so the form appears
    setEditingPaymentId(payment.id)
    setPaymentForm({
      amount: payment.amount.toString(),
      bonus: payment.bonus.toString(),
      deductions: payment.deductions.toString(),
      paymentDate: new Date(payment.paymentDate).toISOString().split('T')[0],
      paymentMethod: payment.paymentMethod || 'CASH',
      notes: payment.notes || '',
    })

    // Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeletePayment = (id: string) => {
    setDeleteModal({ show: true, paymentId: id })
  }

  const handlePaySalary = (e: React.FormEvent) => {
    e.preventDefault()
    if (!payingStaff) return

    const amount = parseFloat(paymentForm.amount) || 0
    if (amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const payload = {
      staffId: payingStaff.id,
      month: parseInt(selectedMonth),
      year: parseInt(selectedYear),
      amount: amount,
      bonus: parseFloat(paymentForm.bonus) || 0,
      deductions: parseFloat(paymentForm.deductions) || 0,
      paymentDate: paymentForm.paymentDate,
      paymentMethod: paymentForm.paymentMethod,
      notes: paymentForm.notes || null,
    }

    if (editingPaymentId) {
      updatePaymentMutation.mutate(payload)
    } else {
      paySalaryMutation.mutate(payload)
    }
  }

  const netAmount = (parseFloat(paymentForm.amount) || 0) + (parseFloat(paymentForm.bonus) || 0) - (parseFloat(paymentForm.deductions) || 0)

  const formatCurrency = (amount: number) => `₹${(amount || 0).toLocaleString()}`
  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || ''

  if (!user || !isAllowed) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const isLoading = staffLoading || paymentsLoading
  const isSubmitting = paySalaryMutation.isPending || updatePaymentMutation.isPending

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100">Workforce & Salary</h1>
          <p className="text-sm text-slate-400">Manage staff salaries and track payments</p>
        </div>

        {/* Month/Year Selector */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/60 rounded-lg border border-white/10">
            <FaCalendarAlt className="w-4 h-4 text-sky-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-slate-200 text-sm font-medium focus:outline-none cursor-pointer"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y} className="bg-slate-800">
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/60 rounded-lg border border-white/10">
            <FaCalendarAlt className="w-4 h-4 text-emerald-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-200 text-sm font-medium focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value} className="bg-slate-800">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-slate-400">
            Showing payments for <span className="text-sky-400 font-medium">{monthLabel} {selectedYear}</span>
          </span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card bg-emerald-500/10 border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Paid</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {formatCurrency(paymentSummary.total)}
                </p>
                <p className="text-xs text-emerald-400/60 mt-1">{paidStaff.length} of {activeStaff.length} staff</p>
              </div>
              <FaCheckCircle className="w-8 h-8 text-emerald-400/40" />
            </div>
          </div>

          <div className="card bg-orange-500/10 border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">
                  {formatCurrency(totalPendingSalary)}
                </p>
                <p className="text-xs text-orange-400/60 mt-1">{pendingStaff.length} staff pending</p>
              </div>
              <FaClock className="w-8 h-8 text-orange-400/40" />
            </div>
          </div>

          <div className="card bg-amber-500/10 border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Hotel</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {formatCurrency(paymentSummary.hotel)}
                </p>
                <p className="text-xs text-amber-400/60 mt-1">{hotelStaff.length} staff</p>
              </div>
              <FaHotel className="w-8 h-8 text-amber-400/40" />
            </div>
          </div>

          <div className="card bg-sky-500/10 border-sky-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider">Convention</p>
                <p className="text-2xl font-bold text-sky-400 mt-1">
                  {formatCurrency(paymentSummary.convention)}
                </p>
                <p className="text-xs text-sky-400/60 mt-1">{conventionStaff.length} staff</p>
              </div>
              <FaBuilding className="w-8 h-8 text-sky-400/40" />
            </div>
          </div>
        </div>

        {/* Payment Form (inline, shown when staff is selected) */}
        {payingStaff && (
          <div className="card mb-6 border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <FaRupeeSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{editingPaymentId ? 'Edit Payment' : 'Pay Salary'} - {payingStaff.name}</h2>
                  <p className="text-xs text-slate-400">
                    {payingStaff.role} • {payingStaff.staffType === 'DAILY' ? 'Daily Wage' : 'Monthly'} • {monthLabel} {selectedYear}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPayingStaff(null)
                  resetPaymentForm()
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySalary}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <FormInput
                  label="Base Amount (₹) *"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  placeholder="0"
                  required
                />
                <FormInput
                  label="Bonus (₹)"
                  type="number"
                  value={paymentForm.bonus}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPaymentForm({ ...paymentForm, bonus: e.target.value })
                  }
                  placeholder="0"
                />
                <FormInput
                  label="Deductions (₹)"
                  type="number"
                  value={paymentForm.deductions}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPaymentForm({ ...paymentForm, deductions: e.target.value })
                  }
                  placeholder="0"
                />
                <FormInput
                  label="Payment Date *"
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPaymentForm({ ...paymentForm, paymentDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormSelect
                  label="Payment Method"
                  value={paymentForm.paymentMethod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })
                  }
                  options={PAYMENT_METHODS}
                />
                <FormInput
                  label="Notes"
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="bg-emerald-500/20 rounded-lg px-4 py-2">
                  <span className="text-sm text-emerald-400 mr-2">Net Amount:</span>
                  <span className="text-xl font-bold text-emerald-400">{formatCurrency(netAmount)}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPayingStaff(null)
                      resetPaymentForm()
                    }}
                    className="btn-secondary px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || netAmount <= 0}
                    className="btn-success px-6 py-2 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaCheck className="w-4 h-4" />
                        {editingPaymentId ? 'Update Payment' : `Pay ${formatCurrency(netAmount)}`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Staff List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hotel Staff */}
            <StaffCard
              title="The Retinue Staff"
              subtitle={`${monthLabel} ${selectedYear}`}
              icon={<FaHotel className="w-5 h-5 text-amber-400" />}
              iconBg="bg-amber-500/20"
              staffList={hotelStaff}
              isPaid={isPaid}
              getPayment={getPayment}
              onPay={openPayment}
              payingStaffId={payingStaff?.id}
              formatCurrency={formatCurrency}
            />

            {/* Convention Staff */}
            <StaffCard
              title="Buchirajuu Convention Staff"
              subtitle={`${monthLabel} ${selectedYear}`}
              icon={<FaBuilding className="w-5 h-5 text-sky-400" />}
              iconBg="bg-sky-500/20"
              staffList={conventionStaff}
              isPaid={isPaid}
              getPayment={getPayment}
              onPay={openPayment}
              payingStaffId={payingStaff?.id}
              formatCurrency={formatCurrency}
            />
          </div>
        )}

        {/* Payment History */}
        {paymentsList.length > 0 && (
          <div className="card mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <FaHistory className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-purple-400">Payment History</h3>
                <p className="text-xs text-slate-400">{monthLabel} {selectedYear} - {paymentsList.length} payments</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Staff</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Date</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Base</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Bonus</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Deduct</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Net</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Method</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsList.map((payment: any) => (
                    <tr key={payment.id} className="border-b border-white/5 hover:bg-slate-800/30">
                      <td className="py-2 px-3">
                        <div>
                          <p className="text-slate-200 font-medium">{payment.staff?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{payment.staff?.role}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">{formatCurrency(payment.amount)}</td>
                      <td className="py-2 px-3 text-right text-emerald-400">
                        {payment.bonus > 0 ? `+${formatCurrency(payment.bonus)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-red-400">
                        {payment.deductions > 0 ? `-${formatCurrency(payment.deductions)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-400">
                        {formatCurrency(payment.netAmount)}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded">
                          {payment.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditPayment(payment)}
                            className="text-sky-400 hover:text-sky-300 p-1"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        show={deleteModal.show}
        title="Delete Salary Payment"
        message="Are you sure you want to delete this payment record? This will revert the staff status to pending."
        onConfirm={() => {
          if (deleteModal.paymentId) {
            deletePaymentMutation.mutate(deleteModal.paymentId)
          }
        }}
        onCancel={() => setDeleteModal({ show: false, paymentId: null })}
        isLoading={deletePaymentMutation.isPending}
        action="Delete"
        type="delete"
      />
    </>
  )
}

// Staff Card Component
function StaffCard({
  title,
  subtitle,
  icon,
  iconBg,
  staffList,
  isPaid,
  getPayment,
  onPay,
  payingStaffId,
  formatCurrency,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  iconBg: string
  staffList: any[]
  isPaid: (id: string) => boolean
  getPayment: (id: string) => any
  onPay: (staff: any) => void
  payingStaffId?: string
  formatCurrency: (amount: number) => string
}) {
  const paidCount = staffList.filter(s => isPaid(s.id)).length
  const allPaid = staffList.length > 0 && paidCount === staffList.length

  return (
    <div className={`card ${allPaid ? 'border-emerald-500/30' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        {allPaid && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
            <FaCheckCircle className="w-3 h-3" />
            All Paid
          </span>
        )}
        {!allPaid && staffList.length > 0 && (
          <span className="text-xs text-slate-400">
            {paidCount}/{staffList.length} paid
          </span>
        )}
      </div>

      {staffList.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <FaUsers className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No staff found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {staffList.map((staff: any) => {
            const paid = isPaid(staff.id)
            const payment = getPayment(staff.id)
            const isSelected = payingStaffId === staff.id
            const salary = staff.staffType === 'DAILY' ? staff.dailyWage : staff.salary

            // Check if payment is scheduled for future
            const isScheduled = payment && new Date(payment.paymentDate).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0)

            return (
              <div
                key={staff.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${paid
                  ? isScheduled
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                  : isSelected
                    ? 'bg-sky-500/10 border-sky-500/30'
                    : 'bg-slate-800/40 border-white/5 hover:border-white/10'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${paid
                    ? isScheduled
                      ? 'bg-amber-500/30 text-amber-400'
                      : 'bg-emerald-500/30 text-emerald-400'
                    : 'bg-slate-700 text-slate-300'
                    }`}>
                    {paid ? (isScheduled ? <FaClock className="w-4 h-4" /> : <FaCheck className="w-4 h-4" />) : staff.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{staff.name}</p>
                    <p className="text-xs text-slate-500">
                      {staff.role} • {staff.staffType === 'DAILY' ? 'Daily' : 'Monthly'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${paid ? (isScheduled ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-300'}`}>
                      {formatCurrency(payment?.netAmount || salary || 0)}
                    </p>
                    {paid && (
                      <p className={`text-xs ${isScheduled ? 'text-amber-400/70' : 'text-emerald-400/70'}`}>
                        {isScheduled ? 'Scheduled ' : 'Paid '} {new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                    )}
                  </div>

                  {!paid && (
                    <button
                      onClick={() => onPay(staff)}
                      disabled={isSelected}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isSelected
                        ? 'bg-sky-600 text-white'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                    >
                      {isSelected ? 'Paying...' : 'Pay'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
