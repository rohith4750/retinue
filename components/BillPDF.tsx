import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { HOTEL_INFO } from '@/lib/hotel-info'
import { amountInWords } from '@/lib/amount-in-words'

// Tax Invoice design: dark red bar, dark grey header, red table headers, two-tone footer
const DARK_RED = '#8B2500'
const DARK_GREY = '#1f2937'

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: 'Helvetica',
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    fontStyle: 'italic',
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
  // Authorized signatory
  signatorySection: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  signatoryFor: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 24,
  },
  signatoryLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 4,
  },
  signatureImage: {
    width: 120,
    height: 40,
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
  const pricePerDay = (bill.subtotal || 0) / days
  const itemName = `${room.roomType} Room ${room.roomNumber}`

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top contact bar - dark red */}
        <View style={styles.contactBar}>
          <Text style={styles.contactBarText} hyphenationCallback={(e) => []}>📞 {HOTEL_INFO.phone}</Text>
          <Text style={styles.contactBarText} hyphenationCallback={(e) => []}>{HOTEL_INFO.email}</Text>
          <Text style={styles.contactBarText}>📍 {HOTEL_INFO.shortAddress}</Text>
        </View>

        {/* Header row: white block + Tax Invoice title */}
        <View style={styles.headerBlock}>
          <View style={styles.headerLeft}>
            <View style={styles.logoArea}>
              <Image
                src="/images/hotel-logo.png"
                style={styles.logoImage}
              />
            </View>
            <Text style={styles.hotelNameHeader}>Hotel The Retinue</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.taxInvoiceTitle}>Tax Invoice</Text>
            <Text style={styles.invoiceMeta} hyphenationCallback={(e) => []}>Invoice No.: {bill.billNumber}</Text>
            <Text style={styles.invoiceMeta} hyphenationCallback={(e) => []}>Date: {formatDate(booking.checkOut)}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <Text style={styles.billToTitle}>Bill To</Text>
          <Text style={styles.billToText}>{guest.name}</Text>
          {guest.address && <Text style={styles.billToText}>{guest.address}</Text>}
        </View>

        {/* Item details table - white header */}
        <View style={styles.itemTable}>
          <View style={styles.itemTableHeader}>
            <Text style={[styles.itemTableHeaderText, styles.col1]}>S.No</Text>
            <Text style={[styles.itemTableHeaderText, styles.col2]}>Particulars</Text>
            <Text style={[styles.itemTableHeaderText, styles.col3]}>Check In</Text>
            <Text style={[styles.itemTableHeaderText, styles.col4]}>Check Out</Text>
            <Text style={[styles.itemTableHeaderText, styles.col5]}>Days</Text>
            <Text style={[styles.itemTableHeaderText, styles.col6]}>Tariff</Text>
            <Text style={[styles.itemTableHeaderText, styles.col7]}>Amount</Text>
          </View>

          {/* Render items (for consolidated bills) or single fallback */}
          {(bill.booking.items || [bill.booking]).map((item: any, index: number) => {
            // For fallback (single booking), use root booking data if item properties missing
            const isFallback = !item.roomNumber
            const currentRoom = isFallback ? booking.room : { roomNumber: item.roomNumber, roomType: item.roomType }
            const currentCheckIn = isFallback ? booking.checkIn : item.checkIn
            const currentCheckOut = isFallback ? booking.checkOut : item.checkOut
            const currentDays = isFallback ? days : item.days
            const currentSubtotal = isFallback ? (bill.subtotal || 0) : (item.subtotal || 0)
            // Calculate tariff per day from subtotal
            const currentTariff = currentSubtotal / currentDays

            return (
              <View key={index} style={styles.itemTableRow}>
                <Text style={[styles.col1, { fontSize: 9 }]} hyphenationCallback={(e) => []}>{index + 1}</Text>
                <Text style={[styles.col2, { fontSize: 9 }]} hyphenationCallback={(e) => []}>{currentRoom.roomType} Room {currentRoom.roomNumber}</Text>
                <Text style={[styles.col3, { fontSize: 9 }]} hyphenationCallback={(e) => []}>{formatShortDate(currentCheckIn)}</Text>
                <Text style={[styles.col4, { fontSize: 9 }]} hyphenationCallback={(e) => []}>{formatShortDate(currentCheckOut)}</Text>
                <Text style={[styles.col5, { fontSize: 9 }]} hyphenationCallback={(e) => []}>{currentDays}</Text>
                <Text style={[styles.col6, { fontSize: 9 }]} hyphenationCallback={(e) => []}>{(currentTariff || 0).toFixed(2)}</Text>
                <Text style={[styles.col7, { fontSize: 9 }]} hyphenationCallback={(e) => []}>{(currentSubtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
            )
          })}

          <View style={styles.itemTableTotalRow}>
            <Text style={[styles.itemTableTotalText, styles.col1]} hyphenationCallback={(e) => []}></Text>
            <Text style={[styles.itemTableTotalText, styles.col2]} hyphenationCallback={(e) => []}>Total</Text>
            <Text style={[styles.itemTableTotalText, styles.col3]} hyphenationCallback={(e) => []}></Text>
            <Text style={[styles.itemTableTotalText, styles.col4]} hyphenationCallback={(e) => []}></Text>
            <Text style={[styles.itemTableTotalText, styles.col5]} hyphenationCallback={(e) => []}></Text>
            <Text style={[styles.itemTableTotalText, styles.col6]} hyphenationCallback={(e) => []}></Text>
            <Text style={[styles.itemTableTotalText, styles.col7]} hyphenationCallback={(e) => []}>₹ {(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* Two columns: Description (left) + Payment summary (right) */}
        <View style={styles.twoCol}>
          <View style={styles.leftCol}>
            <Text style={styles.sectionTitle}>Description</Text>
            {/* List rooms briefly in description */}
            {(bill.booking.items || [bill.booking]).map((item: any, i: number) => {
              const isFallback = !item.roomNumber
              const rNum = isFallback ? booking.room.roomNumber : item.roomNumber
              const rType = isFallback ? booking.room.roomType : item.roomType
              const sTotal = isFallback ? bill.subtotal : item.subtotal
              return (
                <Text key={i} style={styles.descText} hyphenationCallback={(e) => []}>
                  • {rType} - {rNum}: ₹{(sTotal || 0).toLocaleString('en-IN')}/-
                </Text>
              )
            })}
            <Text style={[styles.descText, { marginTop: 4 }]} hyphenationCallback={(e) => []}>
              Consolidated Invoice for {bill.booking.items ? bill.booking.items.length : 1} Room(s).
            </Text>
          </View>
          <View style={styles.rightCol}>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.paymentSummaryLabel}>Sub Total</Text>
              <Text style={styles.paymentSummaryValue} hyphenationCallback={(e) => []}>₹ {(bill.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.paymentSummaryLabel}>Total</Text>
              <Text style={styles.paymentSummaryValue} hyphenationCallback={(e) => []}>₹ {(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.paymentSummaryLabel}>Received</Text>
              <Text style={styles.paymentSummaryValue} hyphenationCallback={(e) => []}>₹ {(bill.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.paymentSummaryLabel}>Balance</Text>
              <Text style={styles.paymentSummaryValue} hyphenationCallback={(e) => []}>₹ {(bill.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        {/* Invoice amount in words */}
        <View style={styles.amountWordsSection}>
          <Text style={styles.sectionTitle}>Invoice Amount In Words</Text>
          <Text style={styles.amountWordsText}>{amountInWords(bill.totalAmount || 0)}</Text>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.sectionTitle}>Terms And Conditions</Text>
          <Text style={styles.termsText}>Thanks for doing business with us!</Text>
        </View>

        {/* Authorized signatory */}
        <View style={styles.signatorySection}>
          <Text style={styles.signatoryFor}>For Hotel The Retinue</Text>
          <Image
            src="/images/signature.png"
            style={styles.signatureImage}
          />
          <Text style={styles.signatoryLabel}>Authorized Signatory</Text>
        </View>

        {/* Footer strip - red + grey */}
        <View style={styles.footerStrip}>
          <View style={styles.footerStripRed} />
          <View style={styles.footerStripGrey} />
        </View>
      </Page>
    </Document>
  )
}
