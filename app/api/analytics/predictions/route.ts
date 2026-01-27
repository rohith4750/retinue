import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/analytics/predictions - Get predictive analytics
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get historical data for the past 12 months
    const monthsOfHistory = 12
    const historicalData: any[] = []

    for (let i = monthsOfHistory - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0)
      monthEnd.setHours(23, 59, 59, 999)

      // Hotel bookings and revenue
      const hotelBookings = await prisma.booking.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd }
        }
      })

      const hotelRevenue = await prisma.bill.aggregate({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd }
        },
        _sum: { paidAmount: true }
      })

      // Hall bookings and revenue
      let hallBookings = 0
      let hallRevenue = 0
      try {
        // @ts-ignore
        hallBookings = await prisma.functionHallBooking.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd }
          }
        })
        // @ts-ignore
        const hallRevenueData = await prisma.functionHallBooking.aggregate({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd }
          },
          _sum: { advanceAmount: true }
        })
        hallRevenue = hallRevenueData._sum.advanceAmount || 0
      } catch (e) {
        // Function hall tables might not exist
      }

      // Expenses
      let expenses = 0
      try {
        // @ts-ignore
        const expenseData = await prisma.expense.aggregate({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd }
          },
          _sum: { amount: true }
        })
        expenses = expenseData._sum.amount || 0
      } catch (e) {
        // Expense table might not exist
      }

      historicalData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthIndex: i,
        hotelBookings,
        hotelRevenue: hotelRevenue._sum.paidAmount || 0,
        hallBookings,
        hallRevenue,
        totalRevenue: (hotelRevenue._sum.paidAmount || 0) + hallRevenue,
        expenses,
        profit: (hotelRevenue._sum.paidAmount || 0) + hallRevenue - expenses
      })
    }

    // Calculate trends using linear regression
    const calculateTrend = (data: number[]) => {
      const n = data.length
      if (n < 2) return { slope: 0, intercept: data[0] || 0 }
      
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
      for (let i = 0; i < n; i++) {
        sumX += i
        sumY += data[i]
        sumXY += i * data[i]
        sumX2 += i * i
      }
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n
      
      return { slope: isNaN(slope) ? 0 : slope, intercept: isNaN(intercept) ? 0 : intercept }
    }

    // Calculate moving average
    const calculateMA = (data: number[], period: number = 3) => {
      if (data.length < period) return data[data.length - 1] || 0
      const recent = data.slice(-period)
      return recent.reduce((a, b) => a + b, 0) / period
    }

    // Extract data series
    const hotelRevenueSeries = historicalData.map(d => d.hotelRevenue)
    const hallRevenueSeries = historicalData.map(d => d.hallRevenue)
    const totalRevenueSeries = historicalData.map(d => d.totalRevenue)
    const hotelBookingSeries = historicalData.map(d => d.hotelBookings)
    const hallBookingSeries = historicalData.map(d => d.hallBookings)
    const expenseSeries = historicalData.map(d => d.expenses)
    const profitSeries = historicalData.map(d => d.profit)

    // Calculate trends
    const hotelRevenueTrend = calculateTrend(hotelRevenueSeries)
    const hallRevenueTrend = calculateTrend(hallRevenueSeries)
    const totalRevenueTrend = calculateTrend(totalRevenueSeries)
    const hotelBookingTrend = calculateTrend(hotelBookingSeries)
    const expenseTrend = calculateTrend(expenseSeries)

    // Generate predictions for next 6 months
    const predictions: any[] = []
    const n = historicalData.length

    for (let i = 1; i <= 6; i++) {
      const futureMonth = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const monthName = futureMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      // Use weighted combination of trend and moving average
      const trendWeight = 0.4
      const maWeight = 0.6
      
      const predictedHotelRevenue = Math.max(0, 
        trendWeight * (hotelRevenueTrend.slope * (n + i - 1) + hotelRevenueTrend.intercept) +
        maWeight * calculateMA(hotelRevenueSeries, 3) * (1 + (hotelRevenueTrend.slope > 0 ? 0.05 : -0.02) * i)
      )
      
      const predictedHallRevenue = Math.max(0,
        trendWeight * (hallRevenueTrend.slope * (n + i - 1) + hallRevenueTrend.intercept) +
        maWeight * calculateMA(hallRevenueSeries, 3) * (1 + (hallRevenueTrend.slope > 0 ? 0.05 : -0.02) * i)
      )
      
      const predictedHotelBookings = Math.max(0, Math.round(
        trendWeight * (hotelBookingTrend.slope * (n + i - 1) + hotelBookingTrend.intercept) +
        maWeight * calculateMA(hotelBookingSeries, 3)
      ))
      
      const predictedExpenses = Math.max(0,
        trendWeight * (expenseTrend.slope * (n + i - 1) + expenseTrend.intercept) +
        maWeight * calculateMA(expenseSeries, 3)
      )

      predictions.push({
        month: monthName,
        hotelRevenue: Math.round(predictedHotelRevenue),
        hallRevenue: Math.round(predictedHallRevenue),
        totalRevenue: Math.round(predictedHotelRevenue + predictedHallRevenue),
        hotelBookings: predictedHotelBookings,
        expenses: Math.round(predictedExpenses),
        profit: Math.round(predictedHotelRevenue + predictedHallRevenue - predictedExpenses),
        confidence: Math.max(60, 95 - (i * 5)) // Confidence decreases with distance
      })
    }

    // Calculate growth metrics
    const currentMonthData = historicalData[historicalData.length - 1] || { totalRevenue: 0, hotelBookings: 0, profit: 0 }
    const lastYearSameMonth = historicalData[0] || { totalRevenue: 0, hotelBookings: 0, profit: 0 }
    const lastMonth = historicalData[historicalData.length - 2] || { totalRevenue: 0, hotelBookings: 0, profit: 0 }

    const yoyGrowth = lastYearSameMonth.totalRevenue > 0 
      ? ((currentMonthData.totalRevenue - lastYearSameMonth.totalRevenue) / lastYearSameMonth.totalRevenue * 100)
      : 0
    
    const momGrowth = lastMonth.totalRevenue > 0
      ? ((currentMonthData.totalRevenue - lastMonth.totalRevenue) / lastMonth.totalRevenue * 100)
      : 0

    // Calculate seasonality (simple approach - compare months)
    const seasonalityInsights: any[] = []
    const monthlyAverages: Record<number, { revenue: number[], bookings: number[] }> = {}
    
    historicalData.forEach((data, index) => {
      const monthNum = (today.getMonth() - (monthsOfHistory - 1 - index) + 12) % 12
      if (!monthlyAverages[monthNum]) {
        monthlyAverages[monthNum] = { revenue: [], bookings: [] }
      }
      monthlyAverages[monthNum].revenue.push(data.totalRevenue)
      monthlyAverages[monthNum].bookings.push(data.hotelBookings)
    })

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    Object.entries(monthlyAverages).forEach(([month, data]) => {
      const avgRevenue = data.revenue.reduce((a, b) => a + b, 0) / data.revenue.length
      const avgBookings = data.bookings.reduce((a, b) => a + b, 0) / data.bookings.length
      seasonalityInsights.push({
        month: monthNames[parseInt(month)],
        monthNum: parseInt(month),
        avgRevenue: Math.round(avgRevenue),
        avgBookings: Math.round(avgBookings)
      })
    })

    // Sort by month number
    seasonalityInsights.sort((a, b) => a.monthNum - b.monthNum)

    // Identify peak and low seasons
    const sortedByRevenue = [...seasonalityInsights].sort((a, b) => b.avgRevenue - a.avgRevenue)
    const peakMonths = sortedByRevenue.slice(0, 3).map(m => m.month)
    const lowMonths = sortedByRevenue.slice(-3).map(m => m.month)

    // Calculate key metrics
    const totalHistoricalRevenue = historicalData.reduce((sum, d) => sum + d.totalRevenue, 0)
    const avgMonthlyRevenue = totalHistoricalRevenue / historicalData.length
    const totalHistoricalProfit = historicalData.reduce((sum, d) => sum + d.profit, 0)
    const avgMonthlyProfit = totalHistoricalProfit / historicalData.length
    
    // Revenue by business unit
    const hotelRevenueTotal = historicalData.reduce((sum, d) => sum + d.hotelRevenue, 0)
    const hallRevenueTotal = historicalData.reduce((sum, d) => sum + d.hallRevenue, 0)
    
    // Occupancy rate trend (simple estimation)
    const totalRooms = await prisma.room.count()
    const avgOccupancyRate = totalRooms > 0 
      ? Math.min(100, (avgMonthlyRevenue / (totalRooms * 30 * 2500)) * 100) // Assuming avg room rate of 2500
      : 0

    // Generate business insights
    const insights: string[] = []
    
    if (totalRevenueTrend.slope > 0) {
      insights.push(`📈 Revenue is trending upward by approximately ₹${Math.round(totalRevenueTrend.slope).toLocaleString()} per month`)
    } else if (totalRevenueTrend.slope < 0) {
      insights.push(`📉 Revenue is declining by approximately ₹${Math.abs(Math.round(totalRevenueTrend.slope)).toLocaleString()} per month`)
    }
    
    if (yoyGrowth > 10) {
      insights.push(`🚀 Strong year-over-year growth of ${yoyGrowth.toFixed(1)}%`)
    } else if (yoyGrowth < -10) {
      insights.push(`⚠️ Year-over-year decline of ${Math.abs(yoyGrowth).toFixed(1)}% - needs attention`)
    }
    
    if (hotelRevenueTotal > hallRevenueTotal * 2) {
      insights.push(`🏨 Hotel operations contribute ${((hotelRevenueTotal / (hotelRevenueTotal + hallRevenueTotal)) * 100).toFixed(0)}% of total revenue`)
    }
    
    if (peakMonths.length > 0) {
      insights.push(`📅 Peak business months: ${peakMonths.join(', ')}`)
    }
    
    if (avgMonthlyProfit > 0) {
      insights.push(`💰 Average monthly profit: ₹${Math.round(avgMonthlyProfit).toLocaleString()}`)
    } else {
      insights.push(`⚠️ Average monthly loss: ₹${Math.abs(Math.round(avgMonthlyProfit)).toLocaleString()} - review expenses`)
    }

    // Risk assessment
    const riskFactors: { factor: string; level: 'low' | 'medium' | 'high'; description: string }[] = []
    
    if (momGrowth < -20) {
      riskFactors.push({
        factor: 'Revenue Decline',
        level: 'high',
        description: 'Significant month-over-month revenue drop detected'
      })
    } else if (momGrowth < -5) {
      riskFactors.push({
        factor: 'Revenue Decline',
        level: 'medium',
        description: 'Moderate revenue decrease from last month'
      })
    }
    
    const expenseRatio = currentMonthData.expenses / (currentMonthData.totalRevenue || 1)
    if (expenseRatio > 0.8) {
      riskFactors.push({
        factor: 'High Expense Ratio',
        level: 'high',
        description: `Expenses are ${(expenseRatio * 100).toFixed(0)}% of revenue`
      })
    } else if (expenseRatio > 0.6) {
      riskFactors.push({
        factor: 'Expense Management',
        level: 'medium',
        description: `Monitor expenses - currently at ${(expenseRatio * 100).toFixed(0)}% of revenue`
      })
    }

    // Opportunities
    const opportunities: { opportunity: string; impact: 'low' | 'medium' | 'high'; suggestion: string }[] = []
    
    if (hallRevenueTotal < hotelRevenueTotal * 0.3) {
      opportunities.push({
        opportunity: 'Convention Center Growth',
        impact: 'high',
        suggestion: 'Function hall revenue has potential for growth through targeted marketing'
      })
    }
    
    if (avgOccupancyRate < 60) {
      opportunities.push({
        opportunity: 'Occupancy Improvement',
        impact: 'high',
        suggestion: 'Consider promotional pricing or partnerships to increase room occupancy'
      })
    }

    const nextQuarterPrediction = predictions.slice(0, 3)
    const projectedQuarterRevenue = nextQuarterPrediction.reduce((sum, p) => sum + p.totalRevenue, 0)
    const projectedQuarterProfit = nextQuarterPrediction.reduce((sum, p) => sum + p.profit, 0)

    return Response.json(successResponse({
      summary: {
        currentMonthRevenue: currentMonthData.totalRevenue,
        avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
        avgMonthlyProfit: Math.round(avgMonthlyProfit),
        yoyGrowth: Math.round(yoyGrowth * 10) / 10,
        momGrowth: Math.round(momGrowth * 10) / 10,
        totalRooms,
        avgOccupancyRate: Math.round(avgOccupancyRate),
        hotelRevenueShare: Math.round((hotelRevenueTotal / (hotelRevenueTotal + hallRevenueTotal || 1)) * 100),
        hallRevenueShare: Math.round((hallRevenueTotal / (hotelRevenueTotal + hallRevenueTotal || 1)) * 100),
        projectedQuarterRevenue: Math.round(projectedQuarterRevenue),
        projectedQuarterProfit: Math.round(projectedQuarterProfit)
      },
      historicalData,
      predictions,
      seasonality: seasonalityInsights,
      peakMonths,
      lowMonths,
      insights,
      riskFactors,
      opportunities,
      trends: {
        hotelRevenue: {
          direction: hotelRevenueTrend.slope > 0 ? 'up' : hotelRevenueTrend.slope < 0 ? 'down' : 'stable',
          monthlyChange: Math.round(hotelRevenueTrend.slope)
        },
        hallRevenue: {
          direction: hallRevenueTrend.slope > 0 ? 'up' : hallRevenueTrend.slope < 0 ? 'down' : 'stable',
          monthlyChange: Math.round(hallRevenueTrend.slope)
        },
        bookings: {
          direction: hotelBookingTrend.slope > 0 ? 'up' : hotelBookingTrend.slope < 0 ? 'down' : 'stable',
          monthlyChange: Math.round(hotelBookingTrend.slope * 10) / 10
        },
        expenses: {
          direction: expenseTrend.slope > 0 ? 'up' : expenseTrend.slope < 0 ? 'down' : 'stable',
          monthlyChange: Math.round(expenseTrend.slope)
        }
      }
    }))
  } catch (error) {
    console.error('Error generating predictions:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to generate predictions'),
      { status: 500 }
    )
  }
}
