'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getToken, getStoredUser } from '@/lib/auth-storage'
import { 
  FaFileExcel, FaDownload, FaHotel, FaBuilding, FaChartBar, 
  FaCalendarAlt, FaSpinner, FaClipboardList, FaMoneyBillWave,
  FaUsers, FaBox, FaCog
} from 'react-icons/fa'

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    setUser(getStoredUser())

    // Set default date range - last 2 months
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 2)
    
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    })
  }, [])

  const downloadReport = async (type: 'hotel' | 'convention' | 'all') => {
    setLoading(type)
    try {
      const token = getToken()
      const params = new URLSearchParams({
        type,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })

      const response = await fetch(`/api/reports?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'report.xlsx'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) {
          filename = match[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Report downloaded successfully!')
    } catch (error) {
      console.error('Error downloading report:', error)
      toast.error('Failed to download report')
    } finally {
      setLoading(null)
    }
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
          <FaCog className="text-4xl text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white">Access Denied</h2>
          <p className="text-sm text-slate-400 mt-2">Only Super Admins can access reports.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10 space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaChartBar className="text-emerald-400" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate comprehensive Excel reports for data maintenance and analysis
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <FaCalendarAlt className="text-sky-400" />
            Select Date Range
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Reports will include all data within the selected date range
          </p>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Hotel Report */}
          <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/10 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4">
                <FaHotel className="text-2xl text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Hotel Report</h3>
              <p className="text-sm text-slate-400 mb-4">The Retinue - Hotel Operations</p>
              
              <div className="space-y-2 mb-5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <FaClipboardList className="text-amber-400" />
                  <span>Room Bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaUsers className="text-amber-400" />
                  <span>Guest Information</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaMoneyBillWave className="text-amber-400" />
                  <span>Revenue Summary</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaBox className="text-amber-400" />
                  <span>Room Details</span>
                </div>
              </div>

              <button
                onClick={() => downloadReport('hotel')}
                disabled={loading !== null}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {loading === 'hotel' ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaFileExcel />
                    Download Hotel Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Convention Report */}
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/5 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <FaBuilding className="text-2xl text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Convention Report</h3>
              <p className="text-sm text-slate-400 mb-4">Buchirajuu Convention Center</p>
              
              <div className="space-y-2 mb-5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <FaClipboardList className="text-purple-400" />
                  <span>Hall Bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaBuilding className="text-purple-400" />
                  <span>Function Halls</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaMoneyBillWave className="text-purple-400" />
                  <span>Revenue Summary</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCog className="text-purple-400" />
                  <span>Utility Charges</span>
                </div>
              </div>

              <button
                onClick={() => downloadReport('convention')}
                disabled={loading !== null}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {loading === 'convention' ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaFileExcel />
                    Download Convention Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Complete Report */}
          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <FaChartBar className="text-2xl text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Complete Report</h3>
              <p className="text-sm text-slate-400 mb-4">All Business Analytics</p>
              
              <div className="space-y-2 mb-5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <FaHotel className="text-emerald-400" />
                  <span>Hotel + Convention Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaUsers className="text-emerald-400" />
                  <span>Staff & Salaries</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaBox className="text-emerald-400" />
                  <span>Inventory & Assets</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaMoneyBillWave className="text-emerald-400" />
                  <span>Expenses & P/L</span>
                </div>
              </div>

              <button
                onClick={() => downloadReport('all')}
                disabled={loading !== null}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {loading === 'all' ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaFileExcel />
                    Download Complete Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Report Contents Info */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white mb-4">Report Contents</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Hotel Report Contents */}
            <div>
              <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                <FaHotel />
                Hotel Report Sheets
              </h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Room Bookings (all booking details)</li>
                <li>• Rooms (room inventory)</li>
                <li>• Guests (guest information)</li>
                <li>• Hotel Summary (revenue stats)</li>
              </ul>
            </div>

            {/* Convention Report Contents */}
            <div>
              <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                <FaBuilding />
                Convention Report Sheets
              </h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Hall Bookings (event details)</li>
                <li>• Function Halls (hall inventory)</li>
                <li>• Convention Summary (revenue stats)</li>
                <li>• Utility charges breakdown</li>
              </ul>
            </div>

            {/* Complete Report Contents */}
            <div>
              <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                <FaChartBar />
                Complete Report Sheets
              </h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• All Hotel & Convention data</li>
                <li>• Staff directory & salaries</li>
                <li>• Inventory & Asset locations</li>
                <li>• Expenses & Overall P/L</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-sky-400 mb-2">Tips for Data Maintenance</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Download reports every 2 months for backup and analysis</li>
            <li>• The Complete Report includes all data across both businesses</li>
            <li>• Excel files can be opened in Microsoft Excel, Google Sheets, or LibreOffice</li>
            <li>• Use the Overall Summary sheet for quick profit/loss analysis</li>
          </ul>
        </div>
      </div>
    </>
  )
}
