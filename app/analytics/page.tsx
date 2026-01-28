'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import { 
  FaChartLine, FaArrowUp, FaArrowDown, FaMinus, FaLightbulb, 
  FaExclamationTriangle, FaRocket, FaCalendarAlt, FaHotel, FaBuilding,
  FaPercentage, FaDollarSign, FaChartBar, FaChartArea, FaTachometerAlt,
  FaInfoCircle, FaBrain, FaClipboardCheck
} from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['predictions'],
    queryFn: () => api.get('/analytics/predictions'),
    enabled: user?.role === 'SUPER_ADMIN',
    staleTime: 0,
    refetchOnMount: 'always',
  })

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
          <FaBrain className="text-4xl text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white">Access Denied</h2>
          <p className="text-sm text-slate-400 mt-2">Only Super Admins can access predictive analytics.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-slate-400 mt-4">Analyzing data and generating predictions...</p>
          </div>
        </div>
      </div>
    )
  }

  const data = analytics

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <FaArrowUp className="text-emerald-400" />
      case 'down': return <FaArrowDown className="text-red-400" />
      default: return <FaMinus className="text-slate-400" />
    }
  }

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-emerald-400'
      case 'down': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-emerald-500/20 text-emerald-400'
      case 'medium': return 'bg-sky-500/20 text-sky-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  // Find max revenue for chart scaling
  const allRevenue = [...(data?.historicalData || []), ...(data?.predictions || [])].map(d => d.totalRevenue)
  const maxRevenue = Math.max(...allRevenue, 1)

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10 space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaBrain className="text-purple-400" />
            Predictive Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            AI-powered business forecasting and insights
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <FaDollarSign className="text-emerald-400 text-xl" />
              <span className={`text-xs flex items-center gap-1 ${data?.summary?.yoyGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data?.summary?.yoyGrowth >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                {Math.abs(data?.summary?.yoyGrowth || 0)}% YoY
              </span>
            </div>
            <p className="text-2xl font-bold text-white">₹{(data?.summary?.avgMonthlyRevenue || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Avg Monthly Revenue</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <FaChartLine className="text-purple-400 text-xl" />
              <span className={`text-xs flex items-center gap-1 ${(data?.summary?.avgMonthlyProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(data?.summary?.avgMonthlyProfit || 0) >= 0 ? 'Profit' : 'Loss'}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">₹{Math.abs(data?.summary?.avgMonthlyProfit || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Avg Monthly Profit</p>
          </div>

          <div className="bg-gradient-to-br from-sky-600/20 to-sky-800/10 backdrop-blur-xl border border-sky-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <FaRocket className="text-sky-400 text-xl" />
              <span className="text-xs text-slate-400">Next Quarter</span>
            </div>
            <p className="text-2xl font-bold text-white">₹{(data?.summary?.projectedQuarterRevenue || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Projected Revenue</p>
          </div>

          <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/10 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <FaPercentage className="text-amber-400 text-xl" />
              <span className="text-xs text-slate-400">Est.</span>
            </div>
            <p className="text-2xl font-bold text-white">{data?.summary?.avgOccupancyRate || 0}%</p>
            <p className="text-xs text-slate-400 mt-1">Avg Occupancy Rate</p>
          </div>
        </div>

        {/* Revenue Forecast Chart */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaChartArea className="text-sky-400" />
                Revenue Forecast
              </h3>
              <p className="text-xs text-slate-400 mt-1">Historical data + 6-month predictions</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-sky-500"></span>
                Historical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-purple-500 opacity-60"></span>
                Predicted
              </span>
            </div>
          </div>
          
          <div className="h-64 flex items-end gap-1">
            {/* Historical Data */}
            {data?.historicalData?.map((month: any, index: number) => {
              const height = maxRevenue > 0 ? (month.totalRevenue / maxRevenue) * 100 : 0
              const isLast = index === (data?.historicalData?.length || 0) - 1
              
              return (
                <div key={`hist-${index}`} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full relative" style={{ height: '200px' }}>
                    <div 
                      className={`absolute bottom-0 w-full rounded-t transition-all duration-300 ${
                        isLast ? 'bg-gradient-to-t from-sky-600 to-sky-400' : 'bg-gradient-to-t from-sky-700/60 to-sky-600/60'
                      }`}
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      <div className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs whitespace-nowrap">
                        <p className="text-white font-medium">{month.month}</p>
                        <p className="text-slate-400">Revenue: ₹{month.totalRevenue.toLocaleString()}</p>
                        <p className="text-slate-400">Profit: ₹{month.profit.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] ${isLast ? 'text-sky-400 font-semibold' : 'text-slate-500'}`}>
                    {month.month.split(' ')[0]}
                  </span>
                </div>
              )
            })}
            
            {/* Predictions */}
            {data?.predictions?.map((month: any, index: number) => {
              const height = maxRevenue > 0 ? (month.totalRevenue / maxRevenue) * 100 : 0
              
              return (
                <div key={`pred-${index}`} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full relative" style={{ height: '200px' }}>
                    <div 
                      className="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-purple-600/60 to-purple-400/60 border-2 border-dashed border-purple-400/30"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      <div className="bg-slate-800 border border-purple-500/20 rounded-lg px-3 py-2 text-xs whitespace-nowrap">
                        <p className="text-purple-400 font-medium">{month.month} (Predicted)</p>
                        <p className="text-slate-400">Revenue: ₹{month.totalRevenue.toLocaleString()}</p>
                        <p className="text-slate-400">Profit: ₹{month.profit.toLocaleString()}</p>
                        <p className="text-purple-400/70">Confidence: {month.confidence}%</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] text-purple-400/70">{month.month.split(' ')[0]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Trends & Business Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Analysis */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <FaTachometerAlt className="text-emerald-400" />
              Trend Analysis
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FaHotel className="text-amber-400" />
                  <span className="text-sm text-slate-300">Hotel Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(data?.trends?.hotelRevenue?.direction)}
                  <span className={`text-sm font-medium ${getTrendColor(data?.trends?.hotelRevenue?.direction)}`}>
                    ₹{Math.abs(data?.trends?.hotelRevenue?.monthlyChange || 0).toLocaleString()}/mo
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FaBuilding className="text-purple-400" />
                  <span className="text-sm text-slate-300">Convention Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(data?.trends?.hallRevenue?.direction)}
                  <span className={`text-sm font-medium ${getTrendColor(data?.trends?.hallRevenue?.direction)}`}>
                    ₹{Math.abs(data?.trends?.hallRevenue?.monthlyChange || 0).toLocaleString()}/mo
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FaCalendarAlt className="text-sky-400" />
                  <span className="text-sm text-slate-300">Bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(data?.trends?.bookings?.direction)}
                  <span className={`text-sm font-medium ${getTrendColor(data?.trends?.bookings?.direction)}`}>
                    {data?.trends?.bookings?.monthlyChange > 0 ? '+' : ''}{data?.trends?.bookings?.monthlyChange || 0}/mo
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FaDollarSign className="text-red-400" />
                  <span className="text-sm text-slate-300">Expenses</span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(data?.trends?.expenses?.direction)}
                  <span className={`text-sm font-medium ${data?.trends?.expenses?.direction === 'up' ? 'text-red-400' : data?.trends?.expenses?.direction === 'down' ? 'text-emerald-400' : 'text-slate-400'}`}>
                    ₹{Math.abs(data?.trends?.expenses?.monthlyChange || 0).toLocaleString()}/mo
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Distribution */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <FaChartBar className="text-purple-400" />
              Revenue Distribution
            </h3>
            
            <div className="space-y-4">
              {/* Hotel */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    <FaHotel className="text-amber-400" />
                    The Retinue (Hotel)
                  </span>
                  <span className="text-sm font-semibold text-white">{data?.summary?.hotelRevenueShare || 0}%</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${data?.summary?.hotelRevenueShare || 0}%` }}
                  />
                </div>
              </div>

              {/* Convention */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    <FaBuilding className="text-purple-400" />
                    Buchirajuu Convention
                  </span>
                  <span className="text-sm font-semibold text-white">{data?.summary?.hallRevenueShare || 0}%</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
                    style={{ width: `${data?.summary?.hallRevenueShare || 0}%` }}
                  />
                </div>
              </div>

              {/* Seasonality */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <p className="text-xs text-slate-400 mb-3 uppercase tracking-wider">Seasonal Insights</p>
                <div className="flex flex-wrap gap-2">
                  {data?.peakMonths?.map((month: string) => (
                    <span key={month} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                      📈 {month}
                    </span>
                  ))}
                  {data?.lowMonths?.map((month: string) => (
                    <span key={month} className="px-3 py-1 bg-slate-500/20 text-slate-400 text-xs rounded-full border border-slate-500/30">
                      📉 {month}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-purple-900/30 to-slate-900/60 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <FaLightbulb className="text-yellow-400" />
            AI-Powered Insights
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data?.insights?.map((insight: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <FaInfoCircle className="text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-300">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Risk & Opportunities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Factors */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <FaExclamationTriangle className="text-red-400" />
              Risk Assessment
            </h3>
            
            {data?.riskFactors?.length > 0 ? (
              <div className="space-y-3">
                {data?.riskFactors?.map((risk: any, index: number) => (
                  <div key={index} className={`p-3 rounded-lg border ${getRiskColor(risk.level)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{risk.factor}</span>
                      <span className="text-xs uppercase">{risk.level}</span>
                    </div>
                    <p className="text-xs opacity-80">{risk.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FaClipboardCheck className="text-3xl text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-emerald-400">No significant risks identified</p>
                <p className="text-xs text-slate-500 mt-1">Business metrics are within healthy ranges</p>
              </div>
            )}
          </div>

          {/* Opportunities */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <FaRocket className="text-emerald-400" />
              Growth Opportunities
            </h3>
            
            {data?.opportunities?.length > 0 ? (
              <div className="space-y-3">
                {data?.opportunities?.map((opp: any, index: number) => (
                  <div key={index} className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{opp.opportunity}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getImpactColor(opp.impact)}`}>
                        {opp.impact} impact
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{opp.suggestion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FaChartLine className="text-3xl text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Business is performing optimally</p>
                <p className="text-xs text-slate-500 mt-1">Continue current strategies</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Predictions Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FaCalendarAlt className="text-sky-400" />
              6-Month Revenue Forecast
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Hotel Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Hall Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Expenses</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Profit</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data?.predictions?.map((pred: any, index: number) => (
                  <tr key={index} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-sm font-medium text-white">{pred.month}</td>
                    <td className="px-6 py-4 text-sm text-right text-amber-400">₹{pred.hotelRevenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right text-purple-400">₹{pred.hallRevenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right text-white font-semibold">₹{pred.totalRevenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right text-red-400">₹{pred.expenses.toLocaleString()}</td>
                    <td className={`px-6 py-4 text-sm text-right font-semibold ${pred.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ₹{pred.profit.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${pred.confidence >= 80 ? 'bg-emerald-500' : pred.confidence >= 70 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                            style={{ width: `${pred.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{pred.confidence}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-slate-500 text-center">
            <FaInfoCircle className="inline mr-1" />
            Predictions are based on historical data analysis using linear regression and moving averages. 
            Actual results may vary due to market conditions, seasonality, and external factors.
          </p>
        </div>
      </div>
    </>
  )
}
