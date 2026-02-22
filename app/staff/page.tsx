'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FaUsers, FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaMoneyBillWave, FaCalendarDay, FaRupeeSign } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'

export default function StaffPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; staffId: string | null }>({
    show: false,
    staffId: null
  })
  const [payingStaff, setPayingStaff] = useState<any>(null)
  const queryClient = useQueryClient()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    phone: '',
    staffType: 'SALARY',
    salary: '',
    dailyWage: '',
    businessUnit: 'HOTEL',
    status: 'ACTIVE',
  })

  // Salary payment form
  const currentDate = new Date()
  const [salaryForm, setSalaryForm] = useState({
    month: (currentDate.getMonth() + 1).toString(),
    year: currentDate.getFullYear().toString(),
    amount: '',
    bonus: '0',
    deductions: '0',
    paymentDate: currentDate.toISOString().split('T')[0],
    paymentMethod: 'CASH',
    notes: '',
  })

  // Check user role
  const [user, setUser] = useState<any>(null)
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  const { data: staff, isLoading, refetch } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff'),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  })

  // Fetch salary payments for current month to check payment status
  const { data: salaryPaymentsData, refetch: refetchSalaryPayments } = useQuery({
    queryKey: ['salary-payments', currentDate.getMonth() + 1, currentDate.getFullYear()],
    queryFn: () => api.get(`/salary-payments?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  })

  // Get list of staff IDs who have been paid this month
  const paidStaffIds = new Set(
    (salaryPaymentsData?.data || salaryPaymentsData || [])
      .map((p: any) => p.staffId)
  )

  // Check if staff member is paid for current month
  const isStaffPaidThisMonth = (staffId: string) => paidStaffIds.has(staffId)

  // Save mutation
  const saveMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => {
      if (editingStaff) {
        return api.put(`/staff/${editingStaff.id}`, data)
      }
      return api.post('/staff', data)
    },
    endpoint: '/staff',
    onSuccess: async () => {
      resetForm()
      setShowForm(false)
      setEditingStaff(null)
      toast.success(editingStaff ? 'Staff member updated successfully' : 'Staff member added successfully')
      await refetch()
    },
    onError: () => {
      toast.error(editingStaff ? 'Failed to update staff member' : 'Failed to add staff member')
    },
  })

  // Delete mutation
  const deleteMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    endpoint: '/staff',
    onSuccess: async () => {
      setDeleteModal({ show: false, staffId: null })
      toast.success('Staff member deleted successfully')
      await refetch()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete staff member')
    }
  })

  // Pay salary mutation
  const paySalaryMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => api.post('/salary-payments', data),
    endpoint: '/salary-payments',
    additionalInvalidations: [['expenses'], ['expenses-summary'], ['salary-payments']],
    onSuccess: async () => {
      setPayingStaff(null)
      resetSalaryForm()
      toast.success('Salary payment recorded successfully')
      await refetch()
      await refetchSalaryPayments()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to record salary payment')
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      phone: '',
      staffType: 'SALARY',
      salary: '',
      dailyWage: '',
      businessUnit: 'HOTEL',
      status: 'ACTIVE',
    })
  }

  const resetSalaryForm = () => {
    const now = new Date()
    setSalaryForm({
      month: (now.getMonth() + 1).toString(),
      year: now.getFullYear().toString(),
      amount: '',
      bonus: '0',
      deductions: '0',
      paymentDate: now.toISOString().split('T')[0],
      paymentMethod: 'CASH',
      notes: '',
    })
  }

  const openPaySalary = (member: any) => {
    setPayingStaff(member)
    const now = new Date()
    setSalaryForm({
      month: (now.getMonth() + 1).toString(),
      year: now.getFullYear().toString(),
      amount: member.staffType === 'DAILY' ? (member.dailyWage || '').toString() : (member.salary || '').toString(),
      bonus: '0',
      deductions: '0',
      paymentDate: now.toISOString().split('T')[0],
      paymentMethod: 'CASH',
      notes: '',
    })
  }

  const handlePaySalary = (e: React.FormEvent) => {
    e.preventDefault()
    if (!payingStaff) return

    paySalaryMutation.mutate({
      staffId: payingStaff.id,
      ...salaryForm,
    })
  }

  const calculateNetSalary = () => {
    const amount = parseFloat(salaryForm.amount) || 0
    const bonus = parseFloat(salaryForm.bonus) || 0
    const deductions = parseFloat(salaryForm.deductions) || 0
    return amount + bonus - deductions
  }

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

  const handleEdit = (member: any) => {
    setEditingStaff(member)
    setFormData({
      name: member.name || '',
      role: member.role || '',
      phone: member.phone || '',
      staffType: member.staffType || 'SALARY',
      salary: member.salary?.toString() || '',
      dailyWage: member.dailyWage?.toString() || '',
      businessUnit: member.businessUnit || 'HOTEL',
      status: member.status || 'ACTIVE',
    })
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    setDeleteModal({ show: true, staffId: id })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Staff Management</h1>
            <p className="text-sm text-slate-400">Manage staff members and their details</p>
          </div>
          {isAdmin && !showForm && (
            <button
              onClick={() => {
                setEditingStaff(null)
                resetForm()
                setShowForm(true)
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <FaPlus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          )}
        </div>

        {/* Inline Add/Edit Form */}
        {showForm && (
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-sky-500/30 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingStaff ? <FaEdit className="text-sky-400" /> : <FaPlus className="text-sky-400" />}
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingStaff(null)
                  resetForm()
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    placeholder="Full name"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Role/Designation *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g., Receptionist, Manager, Housekeeping"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="form-input"
                    placeholder="10-digit mobile number"
                  />
                </div>

                {/* Staff Type */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Staff Type *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, staffType: 'SALARY' })}
                      className={`py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${formData.staffType === 'SALARY'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                      <FaMoneyBillWave className="w-4 h-4" />
                      Salary Based (Monthly)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, staffType: 'DAILY' })}
                      className={`py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${formData.staffType === 'DAILY'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                      <FaCalendarDay className="w-4 h-4" />
                      Daily Wage
                    </button>
                  </div>
                </div>

                {/* Salary (for SALARY type) */}
                {formData.staffType === 'SALARY' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Monthly Salary</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                      <input
                        type="number"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        className="form-input pl-8"
                        placeholder="Monthly salary amount"
                      />
                    </div>
                  </div>
                )}

                {/* Daily Wage (for DAILY type) */}
                {formData.staffType === 'DAILY' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Daily Wage Rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                      <input
                        type="number"
                        value={formData.dailyWage}
                        onChange={(e) => setFormData({ ...formData, dailyWage: e.target.value })}
                        className="form-input pl-8"
                        placeholder="Daily wage rate"
                      />
                    </div>
                  </div>
                )}

                {/* Business Unit */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Business Unit *</label>
                  <select
                    value={formData.businessUnit}
                    onChange={(e) => setFormData({ ...formData, businessUnit: e.target.value })}
                    className="form-input"
                  >
                    <option value="HOTEL">The Retinue (Hotel)</option>
                    <option value="CONVENTION">Buchirajuu Convention</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="form-input"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingStaff(null)
                    resetForm()
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-500 disabled:opacity-50 flex items-center gap-2"
                >
                  <FaSave className="w-4 h-4" />
                  {saveMutation.isPending ? 'Saving...' : (editingStaff ? 'Update Staff' : 'Add Staff')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Inline Pay Salary Form */}
        {payingStaff && (
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-emerald-500/30 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FaRupeeSign className="text-emerald-400" />
                  Pay Salary - {payingStaff.name}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {payingStaff.role} • {payingStaff.staffType === 'DAILY' ? 'Daily Wage Worker' : 'Monthly Salary'}
                  {payingStaff.staffType === 'SALARY' && payingStaff.salary && ` • Base: ₹${payingStaff.salary.toLocaleString()}`}
                  {payingStaff.staffType === 'DAILY' && payingStaff.dailyWage && ` • Rate: ₹${payingStaff.dailyWage.toLocaleString()}/day`}
                </p>
              </div>
              <button
                onClick={() => {
                  setPayingStaff(null)
                  resetSalaryForm()
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaySalary}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Month & Year */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Month *</label>
                  <select
                    value={salaryForm.month}
                    onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                    className="form-input"
                  >
                    {MONTHS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Year *</label>
                  <select
                    value={salaryForm.year}
                    onChange={(e) => setSalaryForm({ ...salaryForm, year: e.target.value })}
                    className="form-input"
                  >
                    {[currentDate.getFullYear(), currentDate.getFullYear() - 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {payingStaff.staffType === 'DAILY' ? 'Total Amount' : 'Base Salary'} *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      required
                      value={salaryForm.amount}
                      onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                      className="form-input pl-8"
                      placeholder="Amount"
                    />
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={salaryForm.paymentDate}
                    onChange={(e) => setSalaryForm({ ...salaryForm, paymentDate: e.target.value })}
                    className="form-input"
                  />
                </div>

                {/* Bonus */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Bonus</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      value={salaryForm.bonus}
                      onChange={(e) => setSalaryForm({ ...salaryForm, bonus: e.target.value })}
                      className="form-input pl-8"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Deductions</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      value={salaryForm.deductions}
                      onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })}
                      className="form-input pl-8"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={salaryForm.paymentMethod}
                    onChange={(e) => setSalaryForm({ ...salaryForm, paymentMethod: e.target.value })}
                    className="form-input"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                  <input
                    type="text"
                    value={salaryForm.notes}
                    onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                    className="form-input"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              {/* Net Amount Display */}
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Net Amount to Pay:</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    ₹{calculateNetSalary().toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Base: ₹{(parseFloat(salaryForm.amount) || 0).toLocaleString()}
                  {parseFloat(salaryForm.bonus) > 0 && ` + Bonus: ₹${parseFloat(salaryForm.bonus).toLocaleString()}`}
                  {parseFloat(salaryForm.deductions) > 0 && ` - Deductions: ₹${parseFloat(salaryForm.deductions).toLocaleString()}`}
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setPayingStaff(null)
                    resetSalaryForm()
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySalaryMutation.isPending}
                  className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
                >
                  <FaRupeeSign className="w-4 h-4" />
                  {paySalaryMutation.isPending ? 'Processing...' : 'Pay Salary'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Staff Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Business</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Pay</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staff?.map((member: any) => (
                <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    {member.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {member.role}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${member.staffType === 'DAILY'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                      {member.staffType === 'DAILY' ? 'Daily Wage' : 'Salary'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${member.businessUnit === 'CONVENTION'
                        ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                        : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      }`}>
                      {member.businessUnit === 'CONVENTION' ? 'Convention' : 'Hotel'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {member.phone}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {member.staffType === 'DAILY' ? (
                      member.dailyWage ? `₹${member.dailyWage.toLocaleString()}/day` : 'N/A'
                    ) : (
                      member.salary ? `₹${member.salary.toLocaleString()}/mo` : 'N/A'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isStaffPaidThisMonth(member.id) ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                        <FaMoneyBillWave className="w-3 h-3" />
                        Paid
                      </span>
                    ) : member.status === 'ACTIVE' ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Pending
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${member.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                      }`}>
                      {member.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {member.status === 'ACTIVE' && !isStaffPaidThisMonth(member.id) && (
                          <button
                            onClick={() => openPaySalary(member)}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Pay Salary"
                          >
                            <FaRupeeSign className="w-4 h-4" />
                          </button>
                        )}
                        {member.status === 'ACTIVE' && isStaffPaidThisMonth(member.id) && (
                          <span className="p-2 text-emerald-500" title="Already paid this month">
                            <FaMoneyBillWave className="w-4 h-4" />
                          </span>
                        )}
                        <button
                          onClick={() => handleEdit(member)}
                          className="p-2 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {(!staff || staff.length === 0) && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center">
                      <FaUsers className="text-4xl mb-2 text-slate-500" />
                      <p className="text-lg font-medium text-slate-300">No staff members found</p>
                      <p className="text-sm text-slate-500 mb-4">Click "Add Staff" to add your first staff member</p>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingStaff(null)
                            resetForm()
                            setShowForm(true)
                          }}
                          className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500"
                        >
                          Add Staff Member
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={deleteModal.show}
        title="Delete Staff Member"
        message="Are you sure you want to delete this staff member? This action cannot be undone."
        action="Delete"
        type="delete"
        onConfirm={() => {
          if (deleteModal.staffId) {
            deleteMutation.mutate(deleteModal.staffId)
          }
        }}
        onCancel={() => setDeleteModal({ show: false, staffId: null })}
        isLoading={deleteMutation.isPending}
        confirmText="Delete Staff"
      />
    </>
  )
}
