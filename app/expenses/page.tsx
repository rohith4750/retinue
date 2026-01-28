'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import toast from 'react-hot-toast'
import {
  FaMoneyBillWave,
  FaHotel,
  FaBuilding,
  FaChartLine,
  FaPlus,
  FaEdit,
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaCalendarAlt,
  FaFilter,
  FaUserTie,
} from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FormInput, FormSelect, FormTextarea } from '@/components/FormComponents'
import { ConfirmationModal } from '@/components/ConfirmationModal'

const EXPENSE_CATEGORIES = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'UTILITIES', label: 'Utilities (Electricity, Water, etc.)' },
  { value: 'SALARY', label: 'Salary & Wages' },
  { value: 'SUPPLIES', label: 'Supplies' },
  { value: 'REPAIRS', label: 'Repairs' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'MISCELLANEOUS', label: 'Miscellaneous' },
]

const BUSINESS_UNITS = [
  { value: 'HOTEL', label: 'The Retinue (Hotel)' },
  { value: 'CONVENTION', label: 'Buchirajuu Convention' },
  { value: 'BOTH', label: 'Shared (Both)' },
]

const MONTHS = [
  { value: '', label: 'All Months' },
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

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<any>(null)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; expenseId: string | null }>({
    show: false,
    expenseId: null,
  })
  
  // Inline form state
  const [formData, setFormData] = useState({
    businessUnit: 'HOTEL',
    category: 'MAINTENANCE',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    invoiceNumber: '',
    notes: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Filters
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString())
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      // All roles can access - RECEPTIONIST can add expenses
    }
  }, [])

  // Fetch summary data
  const { data: summary, isLoading: summaryLoading, error: summaryError, isFetching: summaryFetching, status: summaryStatus } = useQuery({
    queryKey: ['expenses-summary', selectedYear, selectedMonth],
    queryFn: async () => {
      const result = await api.get(`/expenses/summary?year=${selectedYear}${selectedMonth ? `&month=${selectedMonth}` : ''}`)
      return result
    },
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  // Fetch expenses list
  const { data: expenses, isLoading: expensesLoading, error: expensesError, status: expensesStatus } = useQuery({
    queryKey: ['expenses', selectedYear, selectedMonth, selectedBusinessUnit],
    queryFn: async () => {
      let url = `/expenses?year=${selectedYear}`
      if (selectedMonth) url += `&month=${selectedMonth}`
      if (selectedBusinessUnit) url += `&businessUnit=${selectedBusinessUnit}`
      const result = await api.get(url)
      return result
    },
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    refetchOnMount: true,
  })

  // Log errors for debugging
  if (summaryError) {
    console.error('Summary fetch error:', summaryError)
  }
  if (expensesError) {
    console.error('Expenses fetch error:', expensesError)
  }

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      businessUnit: 'HOTEL',
      category: 'MAINTENANCE',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      invoiceNumber: '',
      notes: '',
    })
    setFormErrors({})
    setEditingExpense(null)
  }

  // Mutations
  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => api.post('/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] })
      toast.success('Expense added successfully')
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add expense')
    },
  })

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] })
      toast.success('Expense updated successfully')
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update expense')
    },
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] })
      toast.success('Expense deleted successfully')
      setDeleteModal({ show: false, expenseId: null })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete expense')
    },
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Only SUPER_ADMIN and ADMIN can view financial data
  const canViewFinancials = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'

  // Handle both direct data and wrapped data structures
  // The API returns { success: true, data: ... } and apiRequest returns data.data
  // But handle cases where data might be wrapped differently
  const getSummaryData = () => {
    if (!summary) return null
    if (summary.revenue) return summary // Direct object with revenue property
    if (summary.data?.revenue) return summary.data // Wrapped in data property
    return summary // Return as-is
  }
  
  const getExpensesList = () => {
    if (!expenses) return []
    if (Array.isArray(expenses)) return expenses // Direct array
    if (Array.isArray(expenses.data)) return expenses.data // Wrapped in data property
    return [] // Fallback
  }
  
  const summaryData = getSummaryData()
  const expensesList = getExpensesList()

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.businessUnit) newErrors.businessUnit = 'Business unit is required'
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required'
    if (!formData.date) newErrors.date = 'Date is required'
    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      if (editingExpense) {
        updateExpenseMutation.mutate({ id: editingExpense.id, data: formData })
      } else {
        createExpenseMutation.mutate(formData)
      }
    }
  }

  // Handle edit button click
  const handleEditClick = (expense: any) => {
    setEditingExpense(expense)
    setFormData({
      businessUnit: expense.businessUnit || 'HOTEL',
      category: expense.category || 'MAINTENANCE',
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      vendor: expense.vendor || '',
      invoiceNumber: expense.invoiceNumber || '',
      notes: expense.notes || '',
    })
    setFormErrors({})
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      MAINTENANCE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      UTILITIES: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      SALARY: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      SUPPLIES: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      REPAIRS: 'bg-red-500/20 text-red-400 border-red-500/30',
      MARKETING: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      MISCELLANEOUS: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }
    return colors[category] || colors.MISCELLANEOUS
  }

  const getBusinessUnitBadge = (unit: string) => {
    const colors: Record<string, string> = {
      HOTEL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      CONVENTION: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      BOTH: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    }
    return colors[unit] || colors.BOTH
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100">
            {canViewFinancials ? 'Revenue & Expenses' : 'Record Expenses'}
          </h1>
          <p className="text-sm text-slate-400">
            {canViewFinancials 
              ? 'Track income and expenses for both businesses' 
              : 'Add expense records for the business'}
          </p>
        </div>

        {/* Inline Add/Edit Expense Form */}
        <div className="card mb-6">
          <div className="card-header mb-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FaPlus className="text-sky-400" />
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {editingExpense ? 'Update the expense details below' : 'Fill in the details to record an expense'}
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormSelect
                label="Business Unit *"
                value={formData.businessUnit}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, businessUnit: e.target.value })
                }
                options={BUSINESS_UNITS}
                error={formErrors.businessUnit}
                required
              />

              <FormSelect
                label="Category *"
                value={formData.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                options={EXPENSE_CATEGORIES}
                error={formErrors.category}
                required
              />

              <FormInput
                label="Amount (₹) *"
                type="number"
                value={formData.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                error={formErrors.amount}
                placeholder="0.00"
                required
              />

              <FormInput
                label="Date *"
                type="date"
                value={formData.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                error={formErrors.date}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Description *"
                type="text"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                error={formErrors.description}
                placeholder="e.g., Plumbing repair for Room 101"
                required
              />

              <FormInput
                label="Vendor/Supplier"
                type="text"
                value={formData.vendor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, vendor: e.target.value })
                }
                placeholder="Vendor name (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Invoice Number"
                type="text"
                value={formData.invoiceNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, invoiceNumber: e.target.value })
                }
                placeholder="INV-001 (optional)"
              />

              <FormTextarea
                label="Notes"
                value={formData.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes (optional)"
                rows={1}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              {editingExpense && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="btn-primary text-sm px-6 py-2 flex items-center gap-2"
                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
              >
                {(createExpenseMutation.isPending || updateExpenseMutation.isPending) ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaPlus className="w-4 h-4" />
                    <span>{editingExpense ? 'Update Expense' : 'Add Expense'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
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
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-lg border border-white/5">
            <FaBuilding className="w-4 h-4 text-slate-400" />
            <select
              value={selectedBusinessUnit}
              onChange={(e) => setSelectedBusinessUnit(e.target.value)}
              className="bg-transparent text-slate-200 text-sm focus:outline-none"
            >
              <option value="" className="bg-slate-800">All Units</option>
              {BUSINESS_UNITS.map((u) => (
                <option key={u.value} value={u.value} className="bg-slate-800">
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards - Only visible to ADMIN/SUPER_ADMIN */}
        {canViewFinancials && (summaryLoading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="lg" />
          </div>
        ) : summaryData && (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Revenue */}
              <div className="card bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Total Revenue</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                      {formatCurrency(summaryData.revenue?.total || 0)}
                    </p>
                  </div>
                  <FaArrowUp className="w-8 h-8 text-emerald-400/50" />
                </div>
              </div>

              {/* Total Expenses */}
              <div className="card bg-red-500/10 border-red-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-400 font-semibold uppercase tracking-wider">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">
                      {formatCurrency(summaryData.expenses?.total || 0)}
                    </p>
                  </div>
                  <FaArrowDown className="w-8 h-8 text-red-400/50" />
                </div>
              </div>

              {/* Net Profit */}
              <div className={`card ${(summaryData.profit?.total || 0) >= 0 ? 'bg-sky-500/10 border-sky-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${(summaryData.profit?.total || 0) >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
                      Net Profit
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${(summaryData.profit?.total || 0) >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
                      {formatCurrency(summaryData.profit?.total || 0)}
                    </p>
                  </div>
                  <FaChartLine className={`w-8 h-8 ${(summaryData.profit?.total || 0) >= 0 ? 'text-sky-400/50' : 'text-orange-400/50'}`} />
                </div>
              </div>

              {/* Expense Count */}
              <div className="card bg-purple-500/10 border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Expense Records</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">{expensesList.length}</p>
                  </div>
                  <FaMoneyBillWave className="w-8 h-8 text-purple-400/50" />
                </div>
              </div>
            </div>

            {/* Business Unit Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Hotel - The Retinue */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <FaHotel className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-400">The Retinue</h3>
                    <p className="text-xs text-slate-400">Hotel Revenue & Expenses</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-800/40 rounded-lg">
                    <p className="text-xs text-slate-400">Revenue</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(summaryData.revenue?.hotel || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800/40 rounded-lg">
                    <p className="text-xs text-slate-400">Expenses</p>
                    <p className="text-lg font-bold text-red-400">{formatCurrency(summaryData.expenses?.hotel || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800/40 rounded-lg">
                    <p className="text-xs text-slate-400">Profit</p>
                    <p className={`text-lg font-bold ${(summaryData.profit?.hotel || 0) >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
                      {formatCurrency(summaryData.profit?.hotel || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Convention - Buchirajuu */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center">
                    <FaBuilding className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-sky-400">Buchirajuu Convention</h3>
                    <p className="text-xs text-slate-400">Convention Revenue & Expenses</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-800/40 rounded-lg">
                    <p className="text-xs text-slate-400">Revenue</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(summaryData.revenue?.convention || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800/40 rounded-lg">
                    <p className="text-xs text-slate-400">Expenses</p>
                    <p className="text-lg font-bold text-red-400">{formatCurrency(summaryData.expenses?.convention || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800/40 rounded-lg">
                    <p className="text-xs text-slate-400">Profit</p>
                    <p className={`text-lg font-bold ${(summaryData.profit?.convention || 0) >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
                      {formatCurrency(summaryData.profit?.convention || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ))}

        {/* Expenses List */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-base font-bold text-slate-100">Expense Records</h2>
            <p className="text-xs text-slate-400 mt-1">
              {selectedMonth ? MONTHS.find(m => m.value === selectedMonth)?.label : 'All'} {selectedYear}
            </p>
          </div>

          {expensesLoading ? (
            <div className="flex items-center justify-center h-48">
              <LoadingSpinner size="md" />
            </div>
          ) : expensesError ? (
            <div className="text-center py-12">
              <FaMoneyBillWave className="text-4xl text-red-500 mx-auto mb-3" />
              <p className="text-red-400 font-medium">Failed to load expenses</p>
              <p className="text-xs text-slate-500 mt-1">Please refresh the page or try again later</p>
            </div>
          ) : expensesList.length === 0 ? (
            <div className="text-center py-12">
              <FaMoneyBillWave className="text-4xl text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">No expenses recorded</p>
              <p className="text-xs text-slate-500 mt-1">Click "Add Expense" to record an expense</p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Business Unit</th>
                    {canViewFinancials && <th>Amount</th>}
                    {canViewFinancials && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {expensesList.map((expense: any) => (
                    <tr key={expense.id} className={expense.isSalaryPayment ? 'bg-emerald-500/5' : ''}>
                      <td className="text-slate-300">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td>
                        <div>
                          <p className="text-slate-100 font-medium flex items-center gap-2">
                            {expense.isSalaryPayment && <FaUserTie className="w-3 h-3 text-emerald-400" />}
                            {expense.description}
                          </p>
                          {expense.vendor && !expense.isSalaryPayment && (
                            <p className="text-xs text-slate-500">{expense.vendor}</p>
                          )}
                          {expense.isSalaryPayment && (
                            <p className="text-xs text-emerald-400/70">
                              {expense.staffType === 'DAILY' ? 'Daily Wage' : 'Monthly Salary'}
                              {expense.bonus > 0 && ` • Bonus: ₹${expense.bonus.toLocaleString()}`}
                              {expense.deductions > 0 && ` • Deduction: ₹${expense.deductions.toLocaleString()}`}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          expense.isSalaryPayment 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                            : getCategoryBadge(expense.category)
                        }`}>
                          {expense.isSalaryPayment ? 'STAFF SALARY' : expense.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getBusinessUnitBadge(expense.businessUnit)}`}>
                          {expense.businessUnit === 'HOTEL' ? 'Hotel' : expense.businessUnit === 'CONVENTION' ? 'Convention' : 'Shared'}
                        </span>
                      </td>
                      {canViewFinancials && (
                        <td className="text-red-400 font-semibold">
                          {formatCurrency(expense.amount)}
                        </td>
                      )}
                      {canViewFinancials && (
                        <td>
                          {expense.isSalaryPayment ? (
                            <span className="text-xs text-slate-500 italic">From Salary</span>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEditClick(expense)}
                                className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded transition-colors"
                                title="Edit expense"
                              >
                                <FaEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteModal({ show: true, expenseId: expense.id })}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete expense"
                              >
                                <FaTrash className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          show={deleteModal.show}
          title="Delete Expense"
          message="Are you sure you want to delete this expense record? This action cannot be undone."
          action="Delete"
          type="delete"
          onConfirm={() => {
            if (deleteModal.expenseId) {
              deleteExpenseMutation.mutate(deleteModal.expenseId)
            }
          }}
          onCancel={() => setDeleteModal({ show: false, expenseId: null })}
          isLoading={deleteExpenseMutation.isPending}
          confirmText="Delete Expense"
        />
      </div>
    </>
  )
}

