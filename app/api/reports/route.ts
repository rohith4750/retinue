import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'
import * as XLSX from 'xlsx'

// GET /api/reports - Generate comprehensive Excel report
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'all' // 'hotel', 'convention', 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Default date range - last 2 months
    const end = endDate ? new Date(endDate) : new Date()
    end.setHours(23, 59, 59, 999)
    const start = startDate ? new Date(startDate) : new Date(end)
    if (!startDate) {
      start.setMonth(start.getMonth() - 2)
    }
    start.setHours(0, 0, 0, 0)

    const workbook = XLSX.utils.book_new()

    // ===== HOTEL REPORTS =====
    if (reportType === 'hotel' || reportType === 'all') {
      // 1. Room Bookings Sheet
      const bookings = await prisma.booking.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          guest: true,
          room: true,
          bill: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const bookingsData = bookings.map((b: any) => ({
        'Booking ID': b.id,
        'Booking Date': new Date(b.bookingDate).toLocaleDateString(),
        'Guest Name': b.guest?.name || 'N/A',
        'Guest Phone': b.guest?.phone || 'N/A',
        'Guest Email': b.guest?.email || 'N/A',
        'Room Number': b.room?.roomNumber || 'N/A',
        'Room Type': b.room?.roomType || 'N/A',
        'Check-in': new Date(b.checkIn).toLocaleDateString(),
        'Check-out': new Date(b.checkOut).toLocaleDateString(),
        'Adults': b.adults || 0,
        'Children': b.children || 0,
        'Extra Beds': b.extraBeds || 0,
        'Status': b.status,
        'Total Amount': b.totalAmount,
        'Paid Amount': b.bill?.paidAmount || 0,
        'Balance': b.bill?.balanceAmount || 0,
        'Payment Status': b.bill?.paymentStatus || 'N/A',
        'Payment Method': b.bill?.paymentMethod || 'N/A',
        'Special Requests': b.specialRequests || 'None',
      }))

      if (bookingsData.length > 0) {
        const bookingsSheet = XLSX.utils.json_to_sheet(bookingsData)
        XLSX.utils.book_append_sheet(workbook, bookingsSheet, 'Room Bookings')
      }

      // 2. Rooms Summary Sheet
      const rooms = await prisma.room.findMany({
        orderBy: { roomNumber: 'asc' },
      })

      const roomsData = rooms.map((r) => ({
        'Room Number': r.roomNumber,
        'Room Type': r.roomType,
        'Floor': r.floor,
        'Capacity': r.capacity,
        'Base Price': r.basePrice,
        'Status': r.status,
        'Created At': new Date(r.createdAt).toLocaleDateString(),
      }))

      if (roomsData.length > 0) {
        const roomsSheet = XLSX.utils.json_to_sheet(roomsData)
        XLSX.utils.book_append_sheet(workbook, roomsSheet, 'Rooms')
      }

      // 3. Guests Sheet
      const guests = await prisma.guest.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const guestsData = guests.map((g: any) => ({
        'Guest ID': g.id,
        'Name': g.name,
        'Phone': g.phone,
        'Email': g.email || 'N/A',
        'ID Type': g.idType || 'N/A',
        'ID Number': g.idNumber || g.idProof || 'N/A',
        'Address': g.address || 'N/A',
        'Created At': new Date(g.createdAt).toLocaleDateString(),
      }))

      if (guestsData.length > 0) {
        const guestsSheet = XLSX.utils.json_to_sheet(guestsData)
        XLSX.utils.book_append_sheet(workbook, guestsSheet, 'Guests')
      }

      // 4. Hotel Revenue Summary
      const hotelRevenueSummary = await prisma.bill.aggregate({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
        _count: true,
      })

      const bookingStatusCount = await prisma.booking.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        _count: true,
      })

      const hotelSummaryData = [
        { 'Metric': 'Total Bookings', 'Value': bookings.length },
        { 'Metric': 'Total Revenue', 'Value': hotelRevenueSummary._sum.totalAmount || 0 },
        { 'Metric': 'Collected Amount', 'Value': hotelRevenueSummary._sum.paidAmount || 0 },
        { 'Metric': 'Pending Amount', 'Value': hotelRevenueSummary._sum.balanceAmount || 0 },
        ...bookingStatusCount.map((s) => ({
          'Metric': `${s.status} Bookings`,
          'Value': s._count,
        })),
      ]

      const hotelSummarySheet = XLSX.utils.json_to_sheet(hotelSummaryData)
      XLSX.utils.book_append_sheet(workbook, hotelSummarySheet, 'Hotel Summary')
    }

    // ===== CONVENTION REPORTS =====
    if (reportType === 'convention' || reportType === 'all') {
      // 5. Function Hall Bookings
      let hallBookings: any[] = []
      try {
        // @ts-ignore - Prisma types may not include FunctionHallBooking relations
        hallBookings = await (prisma.functionHallBooking as any).findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          include: {
            hall: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      } catch (e) {
        // Function hall tables might not exist
      }

      if (hallBookings.length > 0) {
        const hallBookingsData = hallBookings.map((b: any) => ({
          'Booking ID': b.id,
          'Hall Name': b.hall?.name || 'N/A',
          'Customer Name': b.customerName,
          'Customer Phone': b.customerPhone,
          'Customer Email': b.customerEmail || 'N/A',
          'Event Type': b.eventType,
          'Event Date': new Date(b.eventDate).toLocaleDateString(),
          'Start Time': b.startTime || 'N/A',
          'End Time': b.endTime || 'N/A',
          'Expected Guests': b.expectedGuests,
          'Status': b.status,
          'Total Amount': b.totalAmount,
          'Advance Paid': b.advanceAmount || 0,
          'Balance Amount': b.balanceAmount || 0,
          'Grand Total': b.grandTotal || b.totalAmount || 0,
          'Meter Before': b.meterReadingBefore || 'N/A',
          'Meter After': b.meterReadingAfter || 'N/A',
          'Units Consumed': b.unitsConsumed || 0,
          'Electricity Charge': b.electricityCharges || 0,
          'Maintenance Charge': b.maintenanceCharges || 0,
          'Other Charges': b.otherCharges || 0,
          'Notes': b.specialRequests || 'None',
          'Created At': new Date(b.createdAt).toLocaleDateString(),
        }))

        const hallBookingsSheet = XLSX.utils.json_to_sheet(hallBookingsData)
        XLSX.utils.book_append_sheet(workbook, hallBookingsSheet, 'Hall Bookings')
      }

      // 6. Function Halls Sheet
      let halls: any[] = []
      try {
        // @ts-ignore
        halls = await prisma.functionHall.findMany({
          orderBy: { name: 'asc' },
        })
      } catch (e) {
        // Function hall tables might not exist
      }

      if (halls.length > 0) {
        const hallsData = halls.map((h: any) => ({
          'Hall ID': h.id,
          'Hall Name': h.name,
          'Capacity': h.capacity,
          'Price Per Day': h.pricePerDay,
          'Price Per Hour': h.pricePerHour || 'N/A',
          'Amenities': h.amenities || 'N/A',
          'Status': h.status,
          'Created At': new Date(h.createdAt).toLocaleDateString(),
        }))

        const hallsSheet = XLSX.utils.json_to_sheet(hallsData)
        XLSX.utils.book_append_sheet(workbook, hallsSheet, 'Function Halls')
      }

      // 7. Convention Revenue Summary
      if (hallBookings.length > 0) {
        const totalHallRevenue = hallBookings.reduce((sum: number, b: any) => sum + (b.grandTotal || b.totalAmount || 0), 0)
        const totalHallPaid = hallBookings.reduce((sum: number, b: any) => sum + (b.advanceAmount || 0), 0)
        const totalHallBalance = hallBookings.reduce((sum: number, b: any) => sum + (b.balanceAmount || 0), 0)
        const totalElectricity = hallBookings.reduce((sum: number, b: any) => sum + (b.electricityCharges || 0), 0)
        const totalMaintenance = hallBookings.reduce((sum: number, b: any) => sum + (b.maintenanceCharges || 0), 0)

        const statusCounts: Record<string, number> = {}
        hallBookings.forEach((b: any) => {
          statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
        })

        const conventionSummaryData = [
          { 'Metric': 'Total Hall Bookings', 'Value': hallBookings.length },
          { 'Metric': 'Total Revenue', 'Value': totalHallRevenue },
          { 'Metric': 'Collected Amount', 'Value': totalHallPaid },
          { 'Metric': 'Pending Amount', 'Value': totalHallBalance },
          { 'Metric': 'Electricity Charges', 'Value': totalElectricity },
          { 'Metric': 'Maintenance Charges', 'Value': totalMaintenance },
          ...Object.entries(statusCounts).map(([status, count]) => ({
            'Metric': `${status} Bookings`,
            'Value': count,
          })),
        ]

        const conventionSummarySheet = XLSX.utils.json_to_sheet(conventionSummaryData)
        XLSX.utils.book_append_sheet(workbook, conventionSummarySheet, 'Convention Summary')
      }
    }

    // ===== COMMON REPORTS (for 'all' type) =====
    if (reportType === 'all') {
      // 8. Staff Sheet
      const staff = await prisma.staff.findMany({
        orderBy: { name: 'asc' },
      })

      const staffData = staff.map((s: any) => ({
        'Staff ID': s.id,
        'Name': s.name,
        'Role': s.role,
        'Phone': s.phone,
        'Salary': s.salary || 'N/A',
        'Business Unit': s.businessUnit || 'N/A',
        'Status': s.status,
        'Created At': new Date(s.createdAt).toLocaleDateString(),
      }))

      if (staffData.length > 0) {
        const staffSheet = XLSX.utils.json_to_sheet(staffData)
        XLSX.utils.book_append_sheet(workbook, staffSheet, 'Staff')
      }

      // 9. Inventory Sheet
      const inventory = await prisma.inventory.findMany({
        orderBy: { itemName: 'asc' },
      })

      const inventoryData = inventory.map((i: any) => ({
        'Item ID': i.id,
        'Item Name': i.itemName,
        'Category': i.category,
        'Quantity': i.quantity,
        'Unit': i.unit,
        'Min Stock': i.minStock,
        'Is Asset': i.isAsset ? 'Yes' : 'No',
        'Status': i.quantity <= i.minStock ? 'Low Stock' : 'In Stock',
        'Created At': new Date(i.createdAt).toLocaleDateString(),
      }))

      if (inventoryData.length > 0) {
        const inventorySheet = XLSX.utils.json_to_sheet(inventoryData)
        XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory')
      }

      // 10. Asset Locations Sheet
      let assetLocations: any[] = []
      try {
        // @ts-ignore - Prisma types may not include AssetLocation relations
        assetLocations = await (prisma.assetLocation as any).findMany({
          include: {
            inventory: true,
            room: true,
            functionHall: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      } catch (e) {
        // Asset location table might not exist
      }

      if (assetLocations.length > 0) {
        const assetData = assetLocations.map((a: any) => ({
          'Asset ID': a.id,
          'Item Name': a.inventory?.itemName || 'N/A',
          'Category': a.inventory?.category || 'N/A',
          'Quantity': a.quantity,
          'Condition': a.condition,
          'Location Type': a.roomId ? 'Room' : 'Function Hall',
          'Location': a.room?.roomNumber || a.functionHall?.name || 'N/A',
          'Notes': a.notes || 'None',
          'Assigned Date': new Date(a.assignedDate).toLocaleDateString(),
        }))

        const assetSheet = XLSX.utils.json_to_sheet(assetData)
        XLSX.utils.book_append_sheet(workbook, assetSheet, 'Asset Locations')
      }

      // 11. Expenses Sheet
      let expenses: any[] = []
      try {
        // @ts-ignore
        expenses = await prisma.expense.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          orderBy: { date: 'desc' },
        })
      } catch (e) {
        // Expense table might not exist
      }

      if (expenses.length > 0) {
        const expensesData = expenses.map((e: any) => ({
          'Expense ID': e.id,
          'Date': new Date(e.date).toLocaleDateString(),
          'Category': e.category,
          'Description': e.description,
          'Amount': e.amount,
          'Business Unit': e.businessUnit,
          'Payment Method': e.paymentMethod || 'N/A',
          'Notes': e.notes || 'None',
          'Created At': new Date(e.createdAt).toLocaleDateString(),
        }))

        const expensesSheet = XLSX.utils.json_to_sheet(expensesData)
        XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses')
      }

      // 12. Salary Payments Sheet
      let salaryPayments: any[] = []
      try {
        // @ts-ignore - Prisma types may not include SalaryPayment relations
        salaryPayments = await (prisma.salaryPayment as any).findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          include: {
            staff: true,
          },
          orderBy: { paymentDate: 'desc' },
        })
      } catch (e) {
        // Salary payment table might not exist
      }

      if (salaryPayments.length > 0) {
        const salaryData = salaryPayments.map((s: any) => ({
          'Payment ID': s.id,
          'Staff Name': s.staff?.name || 'N/A',
          'Month': s.month,
          'Year': s.year,
          'Base Amount': s.amount,
          'Bonus': s.bonus,
          'Deductions': s.deductions,
          'Net Amount': s.netAmount,
          'Payment Date': new Date(s.paymentDate).toLocaleDateString(),
          'Payment Method': s.paymentMethod || 'N/A',
          'Notes': s.notes || 'None',
        }))

        const salarySheet = XLSX.utils.json_to_sheet(salaryData)
        XLSX.utils.book_append_sheet(workbook, salarySheet, 'Salary Payments')
      }

      // 13. Combined Revenue Summary
      let hotelRevenue = 0
      let conventionRevenue = 0

      const hotelBills = await prisma.bill.aggregate({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          paidAmount: true,
        },
      })
      hotelRevenue = hotelBills._sum.paidAmount || 0

      try {
        // @ts-ignore
        const hallBills = await prisma.functionHallBooking.aggregate({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          _sum: {
            advanceAmount: true,
          },
        })
        conventionRevenue = hallBills._sum.advanceAmount || 0
      } catch (e) {
        // Function hall tables might not exist
      }

      let totalExpenses = 0
      try {
        // @ts-ignore
        const expenseSum = await prisma.expense.aggregate({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          _sum: {
            amount: true,
          },
        })
        totalExpenses = expenseSum._sum.amount || 0
      } catch (e) {
        // Expense table might not exist
      }

      let totalSalary = 0
      try {
        // @ts-ignore
        const salarySum = await prisma.salaryPayment.aggregate({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          _sum: {
            netAmount: true,
          },
        })
        totalSalary = salarySum._sum.netAmount || 0
      } catch (e) {
        // Salary payment table might not exist
      }

      const overallSummary = [
        { 'Category': 'Hotel Revenue (The Retinue)', 'Amount': hotelRevenue },
        { 'Category': 'Convention Revenue (Buchirajuu)', 'Amount': conventionRevenue },
        { 'Category': 'Total Revenue', 'Amount': hotelRevenue + conventionRevenue },
        { 'Category': '---', 'Amount': '---' },
        { 'Category': 'Total Expenses', 'Amount': totalExpenses },
        { 'Category': 'Total Salaries Paid', 'Amount': totalSalary },
        { 'Category': 'Total Outflow', 'Amount': totalExpenses + totalSalary },
        { 'Category': '---', 'Amount': '---' },
        { 'Category': 'Net Profit/Loss', 'Amount': (hotelRevenue + conventionRevenue) - (totalExpenses + totalSalary) },
      ]

      const overallSheet = XLSX.utils.json_to_sheet(overallSummary)
      XLSX.utils.book_append_sheet(workbook, overallSheet, 'Overall Summary')
    }

    // Generate the Excel file
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Set filename based on report type and date range
    const dateStr = `${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`
    let filename = ''
    switch (reportType) {
      case 'hotel':
        filename = `Hotel_Retinue_Report_${dateStr}.xlsx`
        break
      case 'convention':
        filename = `Buchirajuu_Convention_Report_${dateStr}.xlsx`
        break
      default:
        filename = `Complete_Business_Report_${dateStr}.xlsx`
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
