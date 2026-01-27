'use client'

import { useState, useEffect } from 'react'
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
  FaFilter,
  FaCheck,
  FaClock,
  FaPlus,
} from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FormInput, FormSelect, FormTextarea } from '@/components/FormComponents'

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
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)

  // Filters
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString())

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      if (parsed.role !== 'SUPER_ADMIN') {
        toast.error('Access denied. Only Super Admin can access this page.')
        router.push('/dashboard')
      }
    }
  }, [router])

  // Fetch staff with salary info
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff'),
    enabled: !!user && user.role === 'SUPER_ADMIN',
  })

  // Fetch salary payments for selected month
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['salary-payments', selectedYear, selectedMonth],
    queryFn: () => api.get(`/salary-payments?year=${selectedYear}&month=${selectedMonth}`),
    enabled: !!user && user.role === 'SUPER_ADMIN',
  })

  // Pay salary mutation
  const paySalaryMutation = useMutation({
    mutationFn: (data: any) => api.post('/salary-payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] })
      toast.success('Salary paid successfully')
      setShowPayModal(false)
      setSelectedStaff(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to process salary')
    },
  })

  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const staffList = staffData || []
  const paymentsList = payments?.data || []
  const paymentSummary = payments?.summary || { total: 0, hotel: 0, convention: 0 }

  // Check if staff has been paid for selected month
  const isPaid = (staffId: string) => {
    return paymentsList.some((p: any) => p.staffId === staffId)
  }

  // Get payment for staff
  const getPayment = (staffId: string) => {
    return paymentsList.find((p: any) => p.staffId === staffId)
  }

  const formatCurrency = (amount: number) => `₹${amount?.toLocaleString() || 0}`

  // Group staff by business unit
  const hotelStaff = staffList.filter((s: any) => s.businessUnit === 'HOTEL' || !s.businessUnit)
  const conventionStaff = staffList.filter((s: any) => s.businessUnit === 'CONVENTION')

  // Calculate pending salaries
  const pendingHotel = hotelStaff.filter((s: any) => !isPaid(s.id) && s.status === 'ACTIVE')
  const pendingConvention = conventionStaff.filter((s: any) => !isPaid(s.id) && s.status === 'ACTIVE')
  const totalPendingSalary = [...pendingHotel, ...pendingConvention].reduce((sum, s: any) => sum + (s.salary || 0), 0)

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Workforce & Salary</h1>
            <p className="text-sm text-slate-400">Manage staff salaries and track payments</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-lg border border-white/5">
            <FaCalendarAlt className="w-4 h-4 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-slate-200 text-sm focus:outline-none"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y} className="bg-slate-800">
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-lg border border-white/5">
            <FaFilter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-200 text-sm focus:outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value} className="bg-slate-800">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Paid */}
          <div className="card bg-emerald-500/10 border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {formatCurrency(paymentSummary.total)}
                </p>
                <p className="text-xs text-emerald-400/60 mt-1">{paymentsList.length} payments</p>
              </div>
              <FaCheck className="w-8 h-8 text-emerald-400/50" />
            </div>
          </div>

          {/* Pending */}
          <div className="card bg-orange-500/10 border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">
                  {formatCurrency(totalPendingSalary)}
                </p>
                <p className="text-xs text-orange-400/60 mt-1">{pendingHotel.length + pendingConvention.length} staff</p>
              </div>
              <FaClock className="w-8 h-8 text-orange-400/50" />
            </div>
          </div>

          {/* Hotel Salaries */}
          <div className="card bg-amber-500/10 border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Hotel Staff</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {formatCurrency(paymentSummary.hotel)}
                </p>
                <p className="text-xs text-amber-400/60 mt-1">{hotelStaff.length} staff</p>
              </div>
              <FaHotel className="w-8 h-8 text-amber-400/50" />
            </div>
          </div>

          {/* Convention Salaries */}
          <div className="card bg-sky-500/10 border-sky-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider">Convention Staff</p>
                <p className="text-2xl font-bold text-sky-400 mt-1">
                  {formatCurrency(paymentSummary.convention)}
                </p>
                <p className="text-xs text-sky-400/60 mt-1">{conventionStaff.length} staff</p>
              </div>
              <FaBuilding className="w-8 h-8 text-sky-400/50" />
            </div>
          </div>
        </div>

        {/* Staff List with Payment Status */}
        {staffLoading || paymentsLoading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hotel Staff */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <FaHotel className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-400">The Retinue Staff</h3>
                  <p className="text-xs text-slate-400">
                    {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </p>
                </div>
              </div>

              {hotelStaff.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FaUsers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hotel staff found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {hotelStaff.map((staff: any) => {
                    const paid = isPaid(staff.id)
                    const payment = getPayment(staff.id)
                    return (
                      <div
                        key={staff.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          paid
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-slate-800/40 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">{staff.name}</p>
                            <p className="text-xs text-slate-500">{staff.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${paid ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {formatCurrency(payment?.netAmount || staff.salary || 0)}
                            </p>
                            {paid && (
                              <p className="text-xs text-emerald-400/60">Paid</p>
                            )}
                          </div>
                          {!paid && staff.status === 'ACTIVE' && (
                            <button
                              onClick={() => {
                                setSelectedStaff(staff)
                                setShowPayModal(true)
                              }}
                              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 transition-colors"
                            >
                              Pay
                            </button>
                          )}
                          {staff.status !== 'ACTIVE' && (
                            <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Convention Staff */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center">
                  <FaBuilding className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-sky-400">Buchirajuu Convention Staff</h3>
                  <p className="text-xs text-slate-400">
                    {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </p>
                </div>
              </div>

              {conventionStaff.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FaUsers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No convention staff found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conventionStaff.map((staff: any) => {
                    const paid = isPaid(staff.id)
                    const payment = getPayment(staff.id)
                    return (
                      <div
                        key={staff.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          paid
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-slate-800/40 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">{staff.name}</p>
                            <p className="text-xs text-slate-500">{staff.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${paid ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {formatCurrency(payment?.netAmount || staff.salary || 0)}
                            </p>
                            {paid && (
                              <p className="text-xs text-emerald-400/60">Paid</p>
                            )}
                          </div>
                          {!paid && staff.status === 'ACTIVE' && (
                            <button
                              onClick={() => {
                                setSelectedStaff(staff)
                                setShowPayModal(true)
                              }}
                              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 transition-colors"
                            >
                              Pay
                            </button>
                          )}
                          {staff.status !== 'ACTIVE' && (
                            <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pay Salary Modal */}
        {showPayModal && selectedStaff && (
          <PaySalaryModal
            staff={selectedStaff}
            month={selectedMonth}
            year={selectedYear}
            onClose={() => {
              setShowPayModal(false)
              setSelectedStaff(null)
            }}
            onPay={(data) => paySalaryMutation.mutate(data)}
            isLoading={paySalaryMutation.isPending}
          />
        )}
      </div>
    </>
  )
}

// Pay Salary Modal Component
function PaySalaryModal({
  staff,
  month,
  year,
  onClose,
  onPay,
  isLoading,
}: {
  staff: any
  month: string
  year: string
  onClose: () => void
  onPay: (data: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    amount: staff.salary?.toString() || '',
    bonus: '0',
    deductions: '0',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    notes: '',
  })

  const netAmount = (parseFloat(formData.amount) || 0) + (parseFloat(formData.bonus) || 0) - (parseFloat(formData.deductions) || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onPay({
      staffId: staff.id,
      month: parseInt(month),
      year: parseInt(year),
      amount: parseFloat(formData.amount),
      bonus: parseFloat(formData.bonus) || 0,
      deductions: parseFloat(formData.deductions) || 0,
      paymentDate: formData.paymentDate,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes || null,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 relative z-10">
          <div className="card-header">
            <h2 className="text-lg font-bold text-slate-100 flex items-center">
              <FaMoneyBillWave className="mr-2 w-5 h-5 text-emerald-400" />
              Pay Salary
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {staff.name} - {MONTHS.find(m => m.value === month)?.label} {year}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Staff Info */}
            <div className="p-3 bg-slate-800/40 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">
                  {staff.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{staff.name}</p>
                  <p className="text-xs text-slate-500">{staff.role} • {staff.businessUnit === 'CONVENTION' ? 'Convention' : 'Hotel'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Base Salary (₹) *"
                type="number"
                value={formData.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="0.00"
                required
              />

              <FormInput
                label="Bonus (₹)"
                type="number"
                value={formData.bonus}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, bonus: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Deductions (₹)"
                type="number"
                value={formData.deductions}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, deductions: e.target.value })
                }
                placeholder="0.00"
              />

              <FormInput
                label="Payment Date *"
                type="date"
                value={formData.paymentDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, paymentDate: e.target.value })
                }
                required
              />
            </div>

            <FormSelect
              label="Payment Method"
              value={formData.paymentMethod}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({ ...formData, paymentMethod: e.target.value })
              }
              options={PAYMENT_METHODS}
            />

            <FormTextarea
              label="Notes"
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes..."
              rows={2}
            />

            {/* Net Amount */}
            <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-400">Net Amount to Pay</span>
                <span className="text-2xl font-bold text-emerald-400">₹{netAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-sm px-4 py-2"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-success text-sm px-4 py-2 flex items-center space-x-2"
                disabled={isLoading || netAmount <= 0}
              >
                {isLoading ? 'Processing...' : 'Pay Salary'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
