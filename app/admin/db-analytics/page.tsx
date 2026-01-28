'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  FaDatabase, 
  FaTable, 
  FaLock, 
  FaUnlock, 
  FaSync, 
  FaChartBar,
  FaExclamationTriangle,
  FaCheckCircle,
  FaHdd,
  FaClock,
  FaServer,
  FaShieldAlt,
  FaEye,
  FaEyeSlash,
  FaDownload,
  FaTrash,
  FaFileExcel,
  FaArchive,
  FaBroom,
  FaSkullCrossbones,
  FaBomb,
  FaRobot,
  FaCalendarAlt,
  FaPlay
} from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ConfirmationModal } from '@/components/ConfirmationModal'

export default function DbAnalyticsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [cleanupModal, setCleanupModal] = useState<{ show: boolean; table: string; name: string; count: number }>({
    show: false,
    table: '',
    name: '',
    count: 0,
  })
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [factoryResetModal, setFactoryResetModal] = useState(false)
  const [factoryResetPassword, setFactoryResetPassword] = useState('')
  const [factoryResetConfirmText, setFactoryResetConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [isRunningAutoCleanup, setIsRunningAutoCleanup] = useState(false)
  const [lastCleanupResult, setLastCleanupResult] = useState<any>(null)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      const parsedUser = JSON.parse(user)
      setCurrentUser(parsedUser)
      // Redirect if not SUPER_ADMIN
      if (parsedUser.role !== 'SUPER_ADMIN') {
        toast.error('Access denied. Only Super Admin can view this page.')
        router.push('/dashboard')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  // Fetch analytics data only if verified
  const { data: analyticsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['db-analytics'],
    queryFn: () => api.get('/admin/db-analytics'),
    enabled: isVerified,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const analytics = analyticsData?.data || analyticsData

  // Cleanup mutation
  const cleanupMutation = useMutation({
    mutationFn: (table: string) => api.post('/admin/db-analytics', { action: 'cleanup', table }),
    onSuccess: (data: any) => {
      const deleted = data?.data?.deleted || data?.deleted || 0
      toast.success(`Cleaned up ${deleted} records successfully!`)
      queryClient.invalidateQueries({ queryKey: ['db-analytics'] })
      setCleanupModal({ show: false, table: '', name: '', count: 0 })
    },
    onError: () => {
      toast.error('Failed to cleanup records')
    },
  })

  // Export function
  const handleExport = async (table: string, filter: string = 'all') => {
    setIsExporting(table)
    try {
      const response = await api.post('/admin/db-analytics', { action: 'export', table, filter })
      const exportData = response?.data || response
      
      if (exportData?.data && exportData.data.length > 0) {
        // Convert to CSV format
        const jsonData = exportData.data
        const headers = Object.keys(jsonData[0])
        const csvContent = [
          headers.join(','),
          ...jsonData.map((row: any) => 
            headers.map(h => {
              const val = row[h]
              if (typeof val === 'object') return JSON.stringify(val).replace(/,/g, ';')
              if (typeof val === 'string' && val.includes(',')) return `"${val}"`
              return val ?? ''
            }).join(',')
          )
        ].join('\n')

        // Download as CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = exportData.filename?.replace('.json', '.csv') || `export_${table}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success(`Exported ${exportData.count} records to CSV!`)
      } else {
        toast.error('No data to export')
      }
    } catch (error) {
      toast.error('Failed to export data')
    } finally {
      setIsExporting(null)
    }
  }

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setVerifyError('')

    try {
      const response = await api.post('/admin/db-analytics', { password })
      if (response?.data?.verified || response?.verified) {
        setIsVerified(true)
        toast.success('Access granted!')
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Invalid password'
      setVerifyError(message)
      toast.error(message)
    } finally {
      setIsVerifying(false)
    }
  }

  // Auto Cleanup handler (manual trigger)
  const handleAutoCleanup = async () => {
    setIsRunningAutoCleanup(true)
    try {
      // Use GET with secret query param for manual trigger
      const response = await api.get('/admin/auto-cleanup?secret=auto-cleanup-secret-2026')
      const result = response?.data || response
      setLastCleanupResult(result)
      
      if (result?.success) {
        toast.success(result.message || 'Auto-cleanup completed!')
        queryClient.invalidateQueries({ queryKey: ['db-analytics'] })
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Auto-cleanup failed')
    } finally {
      setIsRunningAutoCleanup(false)
    }
  }

  // Factory Reset handler
  const handleFactoryReset = async () => {
    if (factoryResetConfirmText !== 'DELETE ALL DATA') {
      toast.error('Please type "DELETE ALL DATA" to confirm')
      return
    }

    setIsResetting(true)
    try {
      const response = await api.post('/admin/db-analytics', {
        action: 'factoryReset',
        confirmPassword: factoryResetPassword,
      })
      const result = response?.data || response
      
      if (result?.success) {
        toast.success(`Factory reset complete! ${result.totalDeleted} records deleted.`)
        setFactoryResetModal(false)
        setFactoryResetPassword('')
        setFactoryResetConfirmText('')
        queryClient.invalidateQueries({ queryKey: ['db-analytics'] })
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Factory reset failed'
      toast.error(message)
    } finally {
      setIsResetting(false)
    }
  }

  const formatSize = (size: string) => {
    if (!size || size === '-') return '-'
    return size
  }

  const getStatusColor = (count: number) => {
    if (count === 0) return 'text-slate-400'
    if (count < 10) return 'text-blue-400'
    if (count < 100) return 'text-emerald-400'
    if (count < 1000) return 'text-yellow-400'
    return 'text-orange-400'
  }

  // Not authorized
  if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaShieldAlt className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Access Denied</h1>
          <p className="text-slate-400">Only Super Admin can access this page.</p>
        </div>
      </div>
    )
  }

  // Password verification screen
  if (!isVerified) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <FaLock className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Database Analytics</h1>
              <p className="text-slate-400 text-sm">
                Enter the secure password to access database analytics
              </p>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Security Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setVerifyError('')
                    }}
                    placeholder="Enter password..."
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                  </button>
                </div>
                {verifyError && (
                  <p className="mt-2 text-sm text-red-400 flex items-center">
                    <FaExclamationTriangle className="w-4 h-4 mr-1" />
                    {verifyError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!password || isVerifying}
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-sky-500 text-white font-semibold rounded-xl hover:from-sky-500 hover:to-sky-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <FaUnlock className="w-4 h-4" />
                    <span>Access Analytics</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-400 flex items-start">
                <FaExclamationTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                This page contains sensitive database information. Access is logged and monitored.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-slate-400 mt-4">Loading database analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>

      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FaDatabase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Database Analytics</h1>
              <p className="text-sm text-slate-400">
                Last updated: {analytics?.timestamp ? new Date(analytics.timestamp).toLocaleString('en-IN') : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isRefetching && (
              <span className="text-xs text-sky-400 flex items-center gap-1">
                <FaSync className="w-3 h-3 animate-spin" /> Refreshing...
              </span>
            )}
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="px-4 py-2 bg-slate-700 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FaSync className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setIsVerified(false)
                setPassword('')
              }}
              className="px-4 py-2 bg-red-500/20 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2 border border-red-500/30"
            >
              <FaLock className="w-4 h-4" />
              Lock
            </button>
          </div>
        </div>

        {/* Storage Meter - Neon Free Tier */}
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FaHdd className="w-6 h-6 text-violet-400" />
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Neon Free Tier Storage</h2>
                <p className="text-xs text-slate-400">512 MB limit per project</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              analytics?.storage?.status === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              analytics?.storage?.status === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {analytics?.storage?.status || 'HEALTHY'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Used: <strong className="text-white">{analytics?.storage?.usedMB?.toFixed(2) || 0} MB</strong></span>
              <span className="text-slate-300">Free: <strong className="text-emerald-400">{analytics?.storage?.remainingMB?.toFixed(2) || 512} MB</strong></span>
            </div>
            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  (analytics?.storage?.usagePercent || 0) > 90 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                  (analytics?.storage?.usagePercent || 0) > 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                  'bg-gradient-to-r from-emerald-500 to-green-400'
                }`}
                style={{ width: `${Math.min(analytics?.storage?.usagePercent || 0, 100)}%` }}
              />
            </div>
            <p className="text-center text-sm text-slate-400 mt-2">
              {analytics?.storage?.usagePercent?.toFixed(1) || 0}% of 512 MB used
            </p>
          </div>

          {/* Storage breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-violet-400">{analytics?.database?.totalSize || 'N/A'}</p>
              <p className="text-xs text-slate-400">Total Used</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-sky-400">{analytics?.database?.totalTables || 0}</p>
              <p className="text-xs text-slate-400">Tables</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{analytics?.database?.totalRecords?.toLocaleString() || 0}</p>
              <p className="text-xs text-slate-400">Records</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-400">{analytics?.archivable?.totalArchivable || 0}</p>
              <p className="text-xs text-slate-400">Archivable</p>
            </div>
          </div>
        </div>

        {/* Data Cleanup & Export Section */}
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaBroom className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-slate-100">Data Cleanup & Export</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Export old data to CSV before cleanup. Cleanup removes data older than the specified period to free up storage.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Password Resets */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-200">Password Resets</h3>
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                  {analytics?.archivable?.expiredPasswordResets || 0} expired
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">Expired or used password reset tokens</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('passwordResets', 'old')}
                  disabled={isExporting === 'passwordResets'}
                  className="flex-1 px-3 py-2 bg-sky-600/20 text-sky-400 text-xs font-medium rounded-lg hover:bg-sky-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isExporting === 'passwordResets' ? <LoadingSpinner size="sm" /> : <FaDownload className="w-3 h-3" />}
                  Export
                </button>
                <button
                  onClick={() => setCleanupModal({ show: true, table: 'passwordResets', name: 'Password Resets', count: analytics?.archivable?.expiredPasswordResets || 0 })}
                  disabled={!analytics?.archivable?.expiredPasswordResets}
                  className="flex-1 px-3 py-2 bg-red-600/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <FaTrash className="w-3 h-3" />
                  Cleanup
                </button>
              </div>
            </div>

            {/* Booking History */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-200">Booking History</h3>
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                  {analytics?.archivable?.oldBookingHistory || 0} old
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">Audit logs older than 6 months</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('bookingHistory', 'old')}
                  disabled={isExporting === 'bookingHistory'}
                  className="flex-1 px-3 py-2 bg-sky-600/20 text-sky-400 text-xs font-medium rounded-lg hover:bg-sky-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isExporting === 'bookingHistory' ? <LoadingSpinner size="sm" /> : <FaDownload className="w-3 h-3" />}
                  Export
                </button>
                <button
                  onClick={() => setCleanupModal({ show: true, table: 'bookingHistory', name: 'Booking History', count: analytics?.archivable?.oldBookingHistory || 0 })}
                  disabled={!analytics?.archivable?.oldBookingHistory}
                  className="flex-1 px-3 py-2 bg-red-600/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <FaTrash className="w-3 h-3" />
                  Cleanup
                </button>
              </div>
            </div>

            {/* Inventory Transactions */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-200">Inventory Transactions</h3>
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                  {analytics?.archivable?.oldInventoryTransactions || 0} old
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">Stock movements older than 1 year</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('inventoryTransactions', 'old')}
                  disabled={isExporting === 'inventoryTransactions'}
                  className="flex-1 px-3 py-2 bg-sky-600/20 text-sky-400 text-xs font-medium rounded-lg hover:bg-sky-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isExporting === 'inventoryTransactions' ? <LoadingSpinner size="sm" /> : <FaDownload className="w-3 h-3" />}
                  Export
                </button>
                <button
                  onClick={() => setCleanupModal({ show: true, table: 'inventoryTransactions', name: 'Inventory Transactions', count: analytics?.archivable?.oldInventoryTransactions || 0 })}
                  disabled={!analytics?.archivable?.oldInventoryTransactions}
                  className="flex-1 px-3 py-2 bg-red-600/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <FaTrash className="w-3 h-3" />
                  Cleanup
                </button>
              </div>
            </div>

            {/* Attendance Records */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-200">Attendance Records</h3>
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                  {analytics?.archivable?.oldAttendance || 0} old
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">Staff attendance older than 1 year</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('attendance', 'old')}
                  disabled={isExporting === 'attendance'}
                  className="flex-1 px-3 py-2 bg-sky-600/20 text-sky-400 text-xs font-medium rounded-lg hover:bg-sky-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isExporting === 'attendance' ? <LoadingSpinner size="sm" /> : <FaDownload className="w-3 h-3" />}
                  Export
                </button>
                <button
                  onClick={() => setCleanupModal({ show: true, table: 'attendance', name: 'Attendance Records', count: analytics?.archivable?.oldAttendance || 0 })}
                  disabled={!analytics?.archivable?.oldAttendance}
                  className="flex-1 px-3 py-2 bg-red-600/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <FaTrash className="w-3 h-3" />
                  Cleanup
                </button>
              </div>
            </div>

            {/* Old Bookings Export Only */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-200">Completed Bookings</h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                  {analytics?.archivable?.completedBookingsOld || 0} old
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">Checked-out bookings older than 1 year (export only)</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('bookings', 'old')}
                  disabled={isExporting === 'bookings'}
                  className="flex-1 px-3 py-2 bg-sky-600/20 text-sky-400 text-xs font-medium rounded-lg hover:bg-sky-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isExporting === 'bookings' ? <LoadingSpinner size="sm" /> : <FaDownload className="w-3 h-3" />}
                  Export to CSV
                </button>
              </div>
            </div>

            {/* Full Data Export */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-200">Full Data Export</h3>
                <FaFileExcel className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-400 mb-3">Export all booking history for records</p>
              <button
                onClick={() => handleExport('bookingHistory', 'all')}
                disabled={isExporting === 'bookingHistoryAll'}
                className="w-full px-3 py-2 bg-emerald-600/20 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isExporting === 'bookingHistoryAll' ? <LoadingSpinner size="sm" /> : <FaArchive className="w-3 h-3" />}
                Export All History
              </button>
            </div>
          </div>
        </div>

        {/* Automatic Cleanup Schedule */}
        <div className="bg-gradient-to-br from-violet-950/40 to-purple-950/40 backdrop-blur-xl rounded-xl border border-violet-500/30 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FaRobot className="w-6 h-6 text-violet-400" />
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Automatic Cleanup</h2>
                <p className="text-xs text-slate-400">Scheduled data cleanup runs every 2 months</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center gap-1">
              <FaCalendarAlt className="w-3 h-3" />
              Every 2 Months
            </span>
          </div>

          {/* Retention Periods */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-violet-400">7 days</p>
              <p className="text-xs text-slate-400">Password Resets</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-sky-400">60 days</p>
              <p className="text-xs text-slate-400">Booking History</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-400">90 days</p>
              <p className="text-xs text-slate-400">Attendance</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-amber-400">180 days</p>
              <p className="text-xs text-slate-400">Inventory Logs</p>
            </div>
          </div>

          {/* Schedule Info & Manual Trigger */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-slate-200 flex items-center gap-2">
                  <FaClock className="w-4 h-4 text-violet-400" />
                  Next Scheduled Run
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Runs on 1st of every alternate month at 2:00 AM UTC
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  (Jan, Mar, May, Jul, Sep, Nov)
                </p>
              </div>
              <button
                onClick={handleAutoCleanup}
                disabled={isRunningAutoCleanup}
                className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {isRunningAutoCleanup ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <FaPlay className="w-3 h-3" />
                    Run Now
                  </>
                )}
              </button>
            </div>

            {/* Last Cleanup Result */}
            {lastCleanupResult && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Last Cleanup Result:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/50 rounded p-2">
                    <span className="text-slate-400">Records Deleted:</span>
                    <span className="ml-2 font-semibold text-emerald-400">{lastCleanupResult.totals?.deleted || 0}</span>
                  </div>
                  <div className="bg-slate-800/50 rounded p-2">
                    <span className="text-slate-400">Errors:</span>
                    <span className="ml-2 font-semibold text-red-400">{lastCleanupResult.errors?.length || 0}</span>
                  </div>
                </div>
                {lastCleanupResult.cleanups?.length > 0 && (
                  <div className="mt-2 text-xs text-slate-400">
                    <p className="font-medium mb-1">Cleaned tables:</p>
                    <ul className="space-y-0.5">
                      {lastCleanupResult.cleanups.map((c: any, i: number) => (
                        <li key={i} className="flex justify-between">
                          <span>{c.table}</span>
                          <span className="text-emerald-400">-{c.deleted} records</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Backup Info */}
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-xs text-emerald-300/80 flex items-start gap-2">
              <FaCheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Backup Enabled:</strong> Before data is deleted, CSV backup files are automatically 
                sent to your admin email ({process.env.ADMIN_BACKUP_EMAIL || 'configured email'}). 
                This ensures you never lose important historical data.
              </span>
            </p>
          </div>

          {/* Info about hosting */}
          <div className="mt-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <p className="text-xs text-violet-300/80 flex items-start gap-2">
              <FaExclamationTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Setup:</strong> For automatic cleanup, use Vercel Cron Jobs (Pro plan) or 
                external cron service (cron-job.org - free). Add <code className="bg-slate-800 px-1 rounded">ADMIN_BACKUP_EMAIL</code> to 
                your environment variables to receive backup files.
              </span>
            </p>
          </div>
        </div>

        {/* Danger Zone - Factory Reset */}
        <div className="bg-red-950/30 backdrop-blur-xl rounded-xl border border-red-500/30 p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaSkullCrossbones className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
          </div>
          <p className="text-sm text-red-300/70 mb-4">
            Factory reset will <strong>permanently delete ALL data</strong> except user accounts. 
            This includes rooms, bookings, guests, inventory, staff, expenses, and all other records.
            <br /><span className="text-red-400 font-bold">This action cannot be undone!</span>
          </p>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-red-500/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-slate-200 flex items-center gap-2">
                  <FaBomb className="w-4 h-4 text-red-500" />
                  Factory Reset (Keep Users Only)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Deletes: Rooms, Bookings, Guests, Inventory, Staff, Expenses, Function Halls, Bank Data, and more
                </p>
              </div>
              <button
                onClick={() => setFactoryResetModal(true)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-500 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <FaTrash className="w-4 h-4" />
                Reset All Data
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/60 rounded-xl border border-white/5 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-500/20 rounded-lg flex items-center justify-center">
              <FaServer className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{analytics?.quickStats?.activeBookings || 0}</p>
              <p className="text-sm text-slate-400">Active Bookings</p>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl border border-white/5 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <FaClock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{analytics?.quickStats?.pendingBills || 0}</p>
              <p className="text-sm text-slate-400">Pending Bills</p>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl border border-white/5 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <FaCheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{analytics?.quickStats?.recentTransactions || 0}</p>
              <p className="text-sm text-slate-400">Transactions (24h)</p>
            </div>
          </div>
        </div>

        {/* Tables List */}
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <FaTable className="w-5 h-5 text-sky-400" />
              Database Tables ({analytics?.tables?.length || 0})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">#</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Table Name</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Description</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Records</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Total Size</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Data Size</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Index Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {analytics?.tables?.map((table: any, index: number) => (
                  <tr key={table.name} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FaTable className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-200">{table.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{table.description}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${getStatusColor(table.count)}`}>
                        {table.count.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-300">{formatSize(table.totalSize)}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-400">{formatSize(table.dataSize)}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-400">{formatSize(table.indexSize)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900/50 border-t border-white/10">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-300">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-400">
                    {analytics?.database?.totalRecords?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-violet-400">
                    {analytics?.database?.totalSize || 'N/A'}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-slate-800/40 rounded-lg border border-white/5">
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <FaShieldAlt className="w-4 h-4" />
            This page is accessible only to Super Admin users with the correct password. All access is logged.
          </p>
        </div>
      </div>

      {/* Cleanup Confirmation Modal */}
      <ConfirmationModal
        show={cleanupModal.show}
        title={`Cleanup ${cleanupModal.name}`}
        message={`Are you sure you want to delete ${cleanupModal.count} old ${cleanupModal.name.toLowerCase()} records? This action cannot be undone. Make sure you have exported the data first if needed.`}
        action="Delete"
        type="delete"
        onConfirm={() => cleanupMutation.mutate(cleanupModal.table)}
        onCancel={() => setCleanupModal({ show: false, table: '', name: '', count: 0 })}
        isLoading={cleanupMutation.isPending}
        confirmText={`Delete ${cleanupModal.count} Records`}
      />

      {/* Factory Reset Modal */}
      {factoryResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl border border-red-500/30 shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-red-950/50 p-6 border-b border-red-500/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <FaSkullCrossbones className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-red-400">Factory Reset</h2>
                  <p className="text-sm text-red-300/70">This will delete ALL data!</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <h3 className="font-semibold text-red-400 mb-2">Data that will be DELETED:</h3>
                <ul className="text-sm text-red-300/80 space-y-1 list-disc list-inside">
                  <li>All Rooms & Room Slots</li>
                  <li>All Bookings & Booking History</li>
                  <li>All Guests</li>
                  <li>All Inventory & Transactions</li>
                  <li>All Staff, Attendance & Salary Payments</li>
                  <li>All Expenses & Utility Bills</li>
                  <li>All Function Halls & Bookings</li>
                  <li>All Bank Accounts & Transactions</li>
                  <li>All Password Reset Tokens</li>
                </ul>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <FaCheckCircle className="w-4 h-4" />
                  <span><strong>User accounts will be preserved</strong> (login credentials)</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={factoryResetPassword}
                  onChange={(e) => setFactoryResetPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Type <span className="text-red-400 font-bold">DELETE ALL DATA</span> to confirm
                </label>
                <input
                  type="text"
                  value={factoryResetConfirmText}
                  onChange={(e) => setFactoryResetConfirmText(e.target.value)}
                  placeholder="DELETE ALL DATA"
                  className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => {
                  setFactoryResetModal(false)
                  setFactoryResetPassword('')
                  setFactoryResetConfirmText('')
                }}
                disabled={isResetting}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-200 font-medium rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFactoryReset}
                disabled={isResetting || factoryResetConfirmText !== 'DELETE ALL DATA' || !factoryResetPassword}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <FaBomb className="w-4 h-4" />
                    <span>Reset Everything</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
