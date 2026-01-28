'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  FaUniversity, FaPlus, FaWallet, FaArrowUp, FaArrowDown, 
  FaExchangeAlt, FaEdit, FaTrash, FaEye, FaChevronLeft, 
  FaChevronRight, FaTimes, FaMoneyBillWave, FaPiggyBank, FaSave
} from 'react-icons/fa'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function BankAccountsPage() {
  const [user, setUser] = useState<any>(null)
  const [showAddAccountForm, setShowAddAccountForm] = useState(false)
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [viewingAccount, setViewingAccount] = useState<any>(null)
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; accountId: string | null }>({
    show: false,
    accountId: null
  })
  const [transactionPage, setTransactionPage] = useState(1)

  // Account form
  const [accountForm, setAccountForm] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    accountType: 'SAVINGS',
    currentBalance: '',
    notes: ''
  })

  // Transaction form
  const [transactionForm, setTransactionForm] = useState({
    type: 'DEPOSIT',
    amount: '',
    description: '',
    reference: '',
    category: '',
    transactionDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  // Fetch accounts
  const { data: accountsData, isLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/bank-accounts'),
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  })

  const accounts = accountsData?.accounts || []
  const totalBalance = accountsData?.totalBalance || 0

  // Fetch single account with transactions
  const { data: accountDetailData, isLoading: loadingDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['bank-account-detail', viewingAccount?.id, transactionPage],
    queryFn: () => api.get(`/bank-accounts/${viewingAccount.id}?page=${transactionPage}&limit=10`),
    enabled: !!viewingAccount?.id,
    staleTime: 0,
    refetchOnMount: true
  })

  // Create account mutation
  const createAccountMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => api.post('/bank-accounts', data),
    endpoint: '/bank-accounts',
    onSuccess: async () => {
      toast.success('Bank account created successfully')
      setShowAddAccountForm(false)
      resetAccountForm()
      await refetchAccounts()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create account')
    }
  })

  // Update account mutation
  const updateAccountMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => api.put(`/bank-accounts/${selectedAccount.id}`, data),
    endpoint: '/bank-accounts',
    onSuccess: async () => {
      toast.success('Bank account updated successfully')
      setSelectedAccount(null)
      setShowAddAccountForm(false)
      resetAccountForm()
      await refetchAccounts()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update account')
    }
  })

  // Delete account mutation
  const deleteAccountMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/bank-accounts/${id}`),
    endpoint: '/bank-accounts',
    onSuccess: async () => {
      toast.success('Bank account deactivated')
      setDeleteModal({ show: false, accountId: null })
      await refetchAccounts()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete account')
    }
  })

  // Create transaction mutation
  const createTransactionMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => api.post(`/bank-accounts/${viewingAccount.id}/transactions`, data),
    endpoint: '/bank-accounts',
    additionalInvalidations: [['bank-account-detail', viewingAccount?.id, transactionPage]],
    onSuccess: async () => {
      toast.success('Transaction recorded successfully')
      setShowAddTransactionForm(false)
      resetTransactionForm()
      await refetchDetail()
      await refetchAccounts()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to record transaction')
    }
  })

  const resetAccountForm = () => {
    setAccountForm({
      accountName: '',
      bankName: '',
      accountNumber: '',
      accountType: 'SAVINGS',
      currentBalance: '',
      notes: ''
    })
  }

  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'DEPOSIT',
      amount: '',
      description: '',
      reference: '',
      category: '',
      transactionDate: new Date().toISOString().split('T')[0]
    })
  }

  const openEditAccount = (account: any) => {
    setSelectedAccount(account)
    setAccountForm({
      accountName: account.accountName,
      bankName: account.bankName || '',
      accountNumber: account.accountNumber || '',
      accountType: account.accountType,
      currentBalance: '',
      notes: account.notes || ''
    })
    setShowAddAccountForm(true)
  }

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedAccount) {
      updateAccountMutation.mutate(accountForm)
    } else {
      createAccountMutation.mutate(accountForm)
    }
  }

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createTransactionMutation.mutate(transactionForm)
  }

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'SAVINGS': return <FaPiggyBank className="w-5 h-5" />
      case 'CURRENT': return <FaUniversity className="w-5 h-5" />
      case 'CASH': return <FaMoneyBillWave className="w-5 h-5" />
      default: return <FaWallet className="w-5 h-5" />
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
      case 'TRANSFER_IN':
        return <FaArrowDown className="w-4 h-4 text-emerald-400" />
      case 'WITHDRAWAL':
      case 'TRANSFER_OUT':
        return <FaArrowUp className="w-4 h-4 text-red-400" />
      default:
        return <FaExchangeAlt className="w-4 h-4 text-slate-400" />
    }
  }

  const transactionCategories = [
    'Booking Payment',
    'Hall Booking Payment',
    'Salary',
    'Rent',
    'Utilities',
    'Maintenance',
    'Supplies',
    'Refund',
    'Advance',
    'Other'
  ]

  if (isLoading) {
    return <LoadingSpinner />
  }

  // Account Detail View
  if (viewingAccount) {
    const detail = accountDetailData?.account || viewingAccount
    const transactions = accountDetailData?.transactions || []
    const pagination = accountDetailData?.pagination || { page: 1, totalPages: 1, total: 0 }

    return (
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setViewingAccount(null)
                setTransactionPage(1)
                setShowAddTransactionForm(false)
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <FaChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                {getAccountTypeIcon(detail.accountType)}
                {detail.accountName}
              </h1>
              <p className="text-sm text-slate-400">
                {detail.bankName && `${detail.bankName} • `}
                {detail.accountNumber && `****${detail.accountNumber.slice(-4)}`}
              </p>
            </div>
          </div>
          {!showAddTransactionForm && (
            <button
              onClick={() => setShowAddTransactionForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
            >
              <FaPlus className="w-3 h-3" />
              New Transaction
            </button>
          )}
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-800/20 rounded-xl p-6 border border-emerald-500/20 mb-6">
          <p className="text-sm text-emerald-300 mb-1">Current Balance</p>
          <p className="text-3xl font-bold text-white">₹{detail.currentBalance?.toLocaleString()}</p>
        </div>

        {/* Inline Add Transaction Form */}
        {showAddTransactionForm && (
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-sky-500/30 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FaPlus className="text-sky-400" />
                New Transaction
              </h2>
              <button
                onClick={() => {
                  setShowAddTransactionForm(false)
                  resetTransactionForm()
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Transaction Type */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Transaction Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['DEPOSIT', 'WITHDRAWAL'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTransactionForm(f => ({ ...f, type }))}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          transactionForm.type === type
                            ? type === 'DEPOSIT'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {type === 'DEPOSIT' ? <FaArrowDown className="w-4 h-4" /> : <FaArrowUp className="w-4 h-4" />}
                        {type === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      value={transactionForm.amount}
                      onChange={e => setTransactionForm(f => ({ ...f, amount: e.target.value }))}
                      required
                      min="1"
                      className="form-input pl-8"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description *</label>
                  <input
                    type="text"
                    value={transactionForm.description}
                    onChange={e => setTransactionForm(f => ({ ...f, description: e.target.value }))}
                    required
                    className="form-input"
                    placeholder="What is this transaction for?"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={transactionForm.category}
                    onChange={e => setTransactionForm(f => ({ ...f, category: e.target.value }))}
                    className="form-input"
                  >
                    <option value="">Select category</option>
                    {transactionCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Reference</label>
                  <input
                    type="text"
                    value={transactionForm.reference}
                    onChange={e => setTransactionForm(f => ({ ...f, reference: e.target.value }))}
                    className="form-input"
                    placeholder="Cheque no., UPI ref, etc."
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Transaction Date</label>
                  <input
                    type="date"
                    value={transactionForm.transactionDate}
                    onChange={e => setTransactionForm(f => ({ ...f, transactionDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTransactionForm(false)
                    resetTransactionForm()
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTransactionMutation.isPending}
                  className={`px-6 py-2 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                    transactionForm.type === 'DEPOSIT'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  <FaSave className="w-4 h-4" />
                  {createTransactionMutation.isPending ? 'Processing...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-white/5">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">Transaction History</h2>
            <p className="text-xs text-slate-400">{pagination.total} transactions</p>
          </div>

          {loadingDetail ? (
            <div className="p-8 text-center">
              <LoadingSpinner />
            </div>
          ) : transactions.length > 0 ? (
            <div className="divide-y divide-white/5">
              {transactions.map((txn: any) => (
                <div key={txn.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      txn.type === 'DEPOSIT' || txn.type === 'TRANSFER_IN'
                        ? 'bg-emerald-500/20'
                        : 'bg-red-500/20'
                    }`}>
                      {getTransactionIcon(txn.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{txn.description}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(txn.transactionDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {txn.category && ` • ${txn.category}`}
                        {txn.reference && ` • Ref: ${txn.reference}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      txn.type === 'DEPOSIT' || txn.type === 'TRANSFER_IN'
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}>
                      {txn.type === 'DEPOSIT' || txn.type === 'TRANSFER_IN' ? '+' : '-'}
                      ₹{txn.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">Bal: ₹{txn.balanceAfter.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              No transactions yet
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                  disabled={transactionPage === 1}
                  className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setTransactionPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={transactionPage === pagination.totalPages}
                  className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main Accounts List View
  return (
    <>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Bank Accounts</h1>
            <p className="text-sm text-slate-400">Manage your accounts and transactions</p>
          </div>
          {isAdmin && !showAddAccountForm && (
            <button
              onClick={() => {
                setSelectedAccount(null)
                resetAccountForm()
                setShowAddAccountForm(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
            >
              <FaPlus className="w-3 h-3" />
              Add Account
            </button>
          )}
        </div>

        {/* Inline Add/Edit Account Form */}
        {showAddAccountForm && (
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-sky-500/30 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {selectedAccount ? <FaEdit className="text-sky-400" /> : <FaPlus className="text-sky-400" />}
                {selectedAccount ? 'Edit Account' : 'Add New Bank Account'}
              </h2>
              <button
                onClick={() => {
                  setShowAddAccountForm(false)
                  setSelectedAccount(null)
                  resetAccountForm()
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Account Name *</label>
                  <input
                    type="text"
                    value={accountForm.accountName}
                    onChange={e => setAccountForm(f => ({ ...f, accountName: e.target.value }))}
                    required
                    className="form-input"
                    placeholder="e.g., Main Business Account"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Account Type</label>
                  <select
                    value={accountForm.accountType}
                    onChange={e => setAccountForm(f => ({ ...f, accountType: e.target.value }))}
                    className="form-input"
                  >
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CURRENT">Current Account</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={accountForm.bankName}
                    onChange={e => setAccountForm(f => ({ ...f, bankName: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., SBI, HDFC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Account Number (Last 4 digits)</label>
                  <input
                    type="text"
                    value={accountForm.accountNumber}
                    onChange={e => setAccountForm(f => ({ ...f, accountNumber: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., 1234"
                    maxLength={4}
                  />
                </div>

                {!selectedAccount && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Opening Balance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                      <input
                        type="number"
                        value={accountForm.currentBalance}
                        onChange={e => setAccountForm(f => ({ ...f, currentBalance: e.target.value }))}
                        className="form-input pl-8"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                )}

                <div className={selectedAccount ? '' : 'lg:col-span-1'}>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                  <input
                    type="text"
                    value={accountForm.notes}
                    onChange={e => setAccountForm(f => ({ ...f, notes: e.target.value }))}
                    className="form-input"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAccountForm(false)
                    setSelectedAccount(null)
                    resetAccountForm()
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAccountMutation.isPending || updateAccountMutation.isPending}
                  className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-500 disabled:opacity-50 flex items-center gap-2"
                >
                  <FaSave className="w-4 h-4" />
                  {(createAccountMutation.isPending || updateAccountMutation.isPending) 
                    ? 'Saving...' 
                    : selectedAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Total Balance Card */}
        <div className="bg-gradient-to-br from-sky-600/30 to-sky-800/20 rounded-xl p-6 border border-sky-500/20 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FaWallet className="w-6 h-6 text-sky-400" />
            <p className="text-sm text-sky-300">Total Balance (All Accounts)</p>
          </div>
          <p className="text-3xl font-bold text-white">₹{totalBalance.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{accounts.filter((a: any) => a.isActive).length} active accounts</p>
        </div>

        {/* Accounts Grid */}
        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account: any) => (
              <div
                key={account.id}
                className={`bg-slate-900/60 backdrop-blur-xl rounded-xl p-5 border transition-all ${
                  account.isActive 
                    ? 'border-white/5 hover:border-sky-500/30' 
                    : 'border-red-500/20 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      account.accountType === 'SAVINGS' ? 'bg-emerald-500/20 text-emerald-400' :
                      account.accountType === 'CURRENT' ? 'bg-sky-500/20 text-sky-400' :
                      account.accountType === 'CASH' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {getAccountTypeIcon(account.accountType)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{account.accountName}</h3>
                      <p className="text-xs text-slate-400">
                        {account.bankName || account.accountType}
                        {account.accountNumber && ` • ****${account.accountNumber.slice(-4)}`}
                      </p>
                    </div>
                  </div>
                  {!account.isActive && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">Inactive</span>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-white">₹{account.currentBalance.toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewingAccount(account)}
                    className="flex-1 py-2 px-3 bg-slate-800 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaEye className="w-3 h-3" />
                    View
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEditAccount(account)}
                        className="p-2 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => setDeleteModal({ show: true, accountId: account.id })}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-12 border border-white/5 text-center">
            <FaUniversity className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Bank Accounts</h3>
            <p className="text-sm text-slate-400 mb-4">Add your first bank account to start tracking finances</p>
            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedAccount(null)
                  resetAccountForm()
                  setShowAddAccountForm(true)
                }}
                className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500"
              >
                Add Bank Account
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal - Only 2 options: Confirm/Cancel */}
      <ConfirmationModal
        show={deleteModal.show}
        title="Deactivate Account"
        message="Are you sure you want to deactivate this account? The account and its transactions will be preserved but hidden from the active list."
        action="Deactivate"
        type="delete"
        onConfirm={() => {
          if (deleteModal.accountId) {
            deleteAccountMutation.mutate(deleteModal.accountId)
          }
        }}
        onCancel={() => setDeleteModal({ show: false, accountId: null })}
        isLoading={deleteAccountMutation.isPending}
        confirmText="Deactivate Account"
      />
    </>
  )
}
