import { Document as PDFDocument, Page, Text as PDFText, View, StyleSheet, Image as PDFImage, Font } from '@react-pdf/renderer'
import { HOTEL_INFO } from '@/lib/hotel-info'
import { amountInWords } from '@/lib/amount-in-words'
import { registerFonts } from '@/lib/pdf-fonts'

registerFonts()

// Tax Invoice design: dark red bar, dark grey header, red table headers, two-tone footer
const DARK_RED = '#8B2500'
const DARK_GREY = '#1f2937'

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: 'Poppins',
    backgroundColor: '#ffffff',
  },
  // Top contact bar - full width, white with bottom border
  contactBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactBarText: {
    color: '#374151',
    fontSize: 9,
  },
  // Main header block - white, left side
  headerBlock: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  headerLeft: {
    width: '60%',
    backgroundColor: '#ffffff',
    paddingVertical: 0,
    paddingLeft: 24,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoArea: {
    width: 80,
    height: 80,
    marginRight: 16,
    marginBottom: 0,
  },
  logoImage: {
    width: 80,
    height: 80,
    objectFit: 'contain',
  },
  hotelNameHeader: {
    color: '#111827',
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 0,
    lineHeight: 1,
  },
  stateText: {
    display: 'none',
  },
  // Invoice title and details - right of header
  headerRight: {
    flex: 1,
    paddingTop: 0,
    paddingRight: 24,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  taxInvoiceTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
    textTransform: 'uppercase', // Premium look
    letterSpacing: 2,
  },
  invoiceMeta: {
    fontSize: 10,
    color: '#374151',
  },
  // Bill To
  billToSection: {
    marginBottom: 16,
    paddingLeft: 24,
  },
  billToTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 6,
  },
  billToText: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 2,
  },
  // Item table - red header
  itemTable: {
    marginHorizontal: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  itemTableHeaderText: {
    color: '#111827',
    fontSize: 9,
    fontWeight: 'bold',
  },
  itemTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  itemTableTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  itemTableTotalText: {
    color: '#111827',
    fontSize: 10,
    fontWeight: 'bold',
  },
  col1: { width: '5%' },
  col2: { width: '25%' },
  col3: { width: '15%' },
  col4: { width: '15%' },
  col5: { width: '10%' },
  col6: { width: '15%', textAlign: 'right' },
  col7: { width: '15%', textAlign: 'right' },
  // Two columns: description left, payment summary right
  twoCol: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  leftCol: {
    width: '58%',
    paddingRight: 16,
  },
  rightCol: {
    width: '42%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  descText: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 4,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentSummaryLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  paymentSummaryValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#111827',
  },
  // Amount in words
  amountWordsSection: {
    marginHorizontal: 24,
    marginBottom: 12,
  },
  amountWordsText: {
    fontSize: 10,
    color: '#374151',
  },
  // Terms
  termsSection: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 3,
    lineHeight: 1.4,
  },
  // Authorized signatory - Aligned to right to save space and prevent 2nd page
  signatorySection: {
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  signatoryFor: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 12, // Reduced margin
  },
  signatoryLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 4,
  },
  signatureImage: {
    width: 100, // Slightly smaller
    height: 35,
    marginBottom: 4,
  },
  // Footer strip - two tone (at bottom of content)
  footerStrip: {
    flexDirection: 'row',
    height: 12,
    marginTop: 'auto',
  },
  footerStripRed: {
    width: '35%',
    backgroundColor: DARK_RED,
  },
  footerStripGrey: {
    flex: 1,
    backgroundColor: DARK_GREY,
    borderTopLeftRadius: 8,
  },
})

interface BillPDFProps {
  bill: {
    id: string
    billNumber: string
    subtotal: number
    tax: number
    discount: number
    totalAmount: number
    paidAmount: number
    balanceAmount: number
    paymentStatus: string
    createdAt: string
    booking: {
      id: string
      bookingDate: string
      checkIn: string
      checkOut: string
      status: string
      room: {
        roomNumber: string
        roomType: string
        floor: number
        basePrice: number
      }
      slot: {
        slotType: string
        price: number
        date: string
      }
      guest: {
        name: string
        phone: string
        email?: string
        address?: string
        idProof?: string
      }
      items?: Array<{
        roomNumber: string
        roomType: string
        checkIn: string
        checkOut: string
        days: number
        subtotal: number
        tax: number
        totalAmount: number
      }>
    }
  }
}

function getNumberOfDays(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime()
  const end = new Date(checkOut).getTime()
  return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)))
}

function formatShortDate(dateString: string): string {
  const d = new Date(dateString)
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = String(d.getFullYear()).slice(2)
  let hours = d.getHours()
  const mins = d.getMinutes()
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12
  return `${day}/${month}/${year} ${hours}:${mins < 10 ? '0' : ''}${mins}${ampm}`
}

export function BillPDF({ bill }: BillPDFProps) {
  const { booking } = bill
  const { guest, room } = booking
  const days = getNumberOfDays(booking.checkIn, booking.checkOut)

  // Calculate display values based on official room base prices
  // However, we rely on DB values for final totals to match the UI Dashboard
  const items = bill.booking.items || [bill.booking]
  
  const processedItems = items.map((item: any) => {
    const isFallback = !item.roomNumber
    const itemRoom = isFallback ? booking.room : { roomNumber: item.roomNumber, roomType: item.roomType, basePrice: item.basePrice || (item.room?.basePrice) }
    const itemDays = isFallback ? days : (item.days || getNumberOfDays(item.checkIn, item.checkOut))
    const itemBasePrice = item.basePrice || itemRoom.basePrice || 0
    
    // We use the ACTUAL subtotal from the DB for the amount
    // If it's missing (legacy), we fall back to calculation
    const itemSubtotal = item.subtotal ?? (itemBasePrice * itemDays)
    
    return {
      ...item,
      roomNumber: itemRoom.roomNumber,
      roomType: itemRoom.roomType,
      basePrice: itemBasePrice,
      days: itemDays,
      rowAmount: itemSubtotal
    }
  })

  // The summary section must match the Dashboard UI exactly.
  // Gross Bill in UI = DB Subtotal
  const displaySubtotal = bill.subtotal || 0
  const displayDiscount = bill.discount || 0
  const displayTax = bill.tax || 0

  const grandTotal = bill.totalAmount || (displaySubtotal + displayTax - displayDiscount)
  const balance = grandTotal - (bill.paidAmount || 0)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <PDFDocument>
      <Page size="A4" style={styles.page}>
        {/* Top contact bar */}
        <View style={styles.contactBar}>
          <PDFText style={styles.contactBarText} hyphenationCallback={() => []}>📞 {HOTEL_INFO.phone}</PDFText>
          <PDFText style={styles.contactBarText} hyphenationCallback={() => []}>{HOTEL_INFO.email}</PDFText>
          <PDFText style={styles.contactBarText}>📍 {HOTEL_INFO.shortAddress}</PDFText>
        </View>

        {/* Header row: white block + Tax Invoice title */}
        <View style={styles.headerBlock}>
          <View style={styles.headerLeft}>
            <View style={styles.logoArea}>
              <PDFImage
                src="/images/hotel-logo.png"
                style={styles.logoImage}
              />
            </View>
            <PDFText style={styles.hotelNameHeader}>Hotel The Retinue</PDFText>
          </View>
          <View style={styles.headerRight}>
            <PDFText style={styles.taxInvoiceTitle}>Tax Invoice</PDFText>
            <PDFText style={styles.invoiceMeta} hyphenationCallback={() => []}>Invoice No.: {bill.billNumber}</PDFText>
            <PDFText style={styles.invoiceMeta} hyphenationCallback={() => []}>Date: {formatDate(booking.checkOut)}</PDFText>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <PDFText style={styles.billToTitle}>Bill To</PDFText>
          <PDFText style={styles.billToText}>{guest.name}</PDFText>
        </View>

        {/* Item details table */}
        <View style={styles.itemTable}>
          <View style={[styles.itemTableHeader, { paddingVertical: 10 }]}>
            <PDFText style={[styles.itemTableHeaderText, styles.col1]}>S.No</PDFText>
            <PDFText style={[styles.itemTableHeaderText, styles.col2]}>Particulars</PDFText>
            <PDFText style={[styles.itemTableHeaderText, styles.col3]}>Check In</PDFText>
            <PDFText style={[styles.itemTableHeaderText, styles.col4]}>Check Out</PDFText>
            <PDFText style={[styles.itemTableHeaderText, styles.col5]}>Days</PDFText>
            <PDFText style={[styles.itemTableHeaderText, styles.col6]}>Tariff</PDFText>
            <PDFText style={[styles.itemTableHeaderText, styles.col7]}>Amount</PDFText>
          </View>

          {/* Render items */}
          {processedItems.map((item: any, index: number) => {
            const currentCheckIn = item.checkIn || booking.checkIn
            const currentCheckOut = item.checkOut || booking.checkOut

            return (
              <View key={index} style={[styles.itemTableRow, { paddingVertical: 10 }]}>
                <PDFText style={[styles.col1, { fontSize: 9 }]} hyphenationCallback={() => []}>{index + 1}</PDFText>
                <PDFText style={[styles.col2, { fontSize: 9 }]} hyphenationCallback={() => []}>{item.roomType} Room {item.roomNumber}</PDFText>
                <PDFText style={[styles.col3, { fontSize: 9 }]} hyphenationCallback={() => []}>{formatShortDate(currentCheckIn)}</PDFText>
                <PDFText style={[styles.col4, { fontSize: 9 }]} hyphenationCallback={() => []}>{formatShortDate(currentCheckOut)}</PDFText>
                <PDFText style={[styles.col5, { fontSize: 9 }]} hyphenationCallback={() => []}>{item.days}</PDFText>
                <PDFText style={[styles.col6, { fontSize: 9 }]} hyphenationCallback={() => []}>{(item.basePrice || 0).toFixed(2)}</PDFText>
                <PDFText style={[styles.col7, { fontSize: 9 }]} hyphenationCallback={() => []}>{(item.rowAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</PDFText>
              </View>
            )
          })}

          <View style={[styles.itemTableTotalRow, { paddingVertical: 10 }]}>
            <PDFText style={[styles.itemTableTotalText, styles.col1]} hyphenationCallback={() => []}></PDFText>
            <PDFText style={[styles.itemTableTotalText, styles.col2]} hyphenationCallback={() => []}>Sub Total</PDFText>
            <PDFText style={[styles.itemTableTotalText, styles.col3]} hyphenationCallback={() => []}></PDFText>
            <PDFText style={[styles.itemTableTotalText, styles.col4]} hyphenationCallback={() => []}></PDFText>
            <PDFText style={[styles.itemTableTotalText, styles.col5]} hyphenationCallback={() => []}></PDFText>
            <PDFText style={[styles.itemTableTotalText, styles.col6]} hyphenationCallback={() => []}></PDFText>
            <PDFText style={[styles.itemTableTotalText, styles.col7]} hyphenationCallback={() => []}>{`\u20B9`} {(displaySubtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</PDFText>
          </View>
        </View>

        {/* Two columns: Description (left) + Payment summary (right) */}
        <View style={styles.twoCol}>
          <View style={styles.leftCol}>
            <PDFText style={styles.sectionTitle}>Description</PDFText>
            {/* List rooms briefly in description using base prices */}
            {processedItems.map((item: any, i: number) => (
              <PDFText key={i} style={styles.descText} hyphenationCallback={() => []}>
                • {item.roomType} - {item.roomNumber}: {`\u20B9`}{(item.rowAmount || 0).toLocaleString('en-IN')}/-
              </PDFText>
            ))}
            <PDFText style={[styles.descText, { marginTop: 4 }]} hyphenationCallback={() => []}>
              Consolidated Invoice for {processedItems.length} Room(s).
            </PDFText>
          </View>
          <View style={styles.rightCol}>
            <View style={styles.paymentSummaryRow}>
              <PDFText style={styles.paymentSummaryLabel}>Sub Total</PDFText>
              <PDFText style={styles.paymentSummaryValue} hyphenationCallback={() => []}>{`\u20B9`} {(displaySubtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</PDFText>
            </View>
            {displayTax > 0 && (
              <View style={styles.paymentSummaryRow}>
                <PDFText style={styles.paymentSummaryLabel}>GST (18%)</PDFText>
                <PDFText style={styles.paymentSummaryValue} hyphenationCallback={() => []}>{`\u20B9`} {(displayTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</PDFText>
              </View>
            )}
            {displayDiscount > 0 && (
              <View style={styles.paymentSummaryRow}>
                <PDFText style={styles.paymentSummaryLabel}>Discount</PDFText>
                <PDFText style={styles.paymentSummaryValue} hyphenationCallback={() => []}>- {`\u20B9`} {(displayDiscount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</PDFText>
              </View>
            )}
            <View style={styles.paymentSummaryRow}>
              <PDFText style={styles.paymentSummaryLabel}>Total</PDFText>
              <PDFText style={styles.paymentSummaryValue} hyphenationCallback={() => []}>{`\u20B9`} {(grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</PDFText>
            </View>
            <View style={styles.paymentSummaryRow}>
              <PDFText style={styles.paymentSummaryLabel}>Received</PDFText>
              <PDFText style={styles.paymentSummaryValue} hyphenationCallback={() => []}>{`\u20B9`} {(bill.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</PDFText>
            </View>
            <View style={styles.paymentSummaryRow}>
              <PDFText style={styles.paymentSummaryLabel}>Balance</PDFText>
              <PDFText style={styles.paymentSummaryValue} hyphenationCallback={() => []}>{`\u20B9`} {(balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</PDFText>
            </View>
          </View>
        </View>

        {/* Amount in words & Terms on left, Signatory on right - combined row to save space */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginHorizontal: 24, marginBottom: 20 }}>
          <View style={{ width: '55%' }}>
            {/* Invoice amount in words */}
            <View style={{ marginBottom: 12 }}>
              <PDFText style={styles.sectionTitle}>Invoice Amount In Words</PDFText>
              <PDFText style={styles.amountWordsText}>{amountInWords(grandTotal || 0)}</PDFText>
            </View>

            {/* Terms */}
            <View>
              <PDFText style={styles.sectionTitle}>Terms And Conditions</PDFText>
              <PDFText style={styles.termsText}>Thanks for doing business with us!</PDFText>
            </View>
          </View>

          {/* Authorized signatory */}
          <View style={{ alignItems: 'flex-end' }}>
            <PDFText style={styles.signatoryFor}>For Hotel The Retinue</PDFText>
            <PDFImage
              src="/images/signature.png"
              style={styles.signatureImage}
            />
            <PDFText style={styles.signatoryLabel}>Authorized Signatory</PDFText>
          </View>
        </View>

        {/* Footer strip - red + grey */}
        <View style={styles.footerStrip}>
          <View style={styles.footerStripRed} />
          <View style={styles.footerStripGrey} />
        </View>
      </Page>
    </PDFDocument>
  )
}
