import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
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
  // Top contact bar - full width, dark red
  contactBar: {
    flexDirection: 'row',
    backgroundColor: DARK_RED,
    paddingVertical: 8,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactBarText: {
    color: '#ffffff',
    fontSize: 9,
  },
  // Main header block - dark grey, left side
  headerBlock: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  headerLeft: {
    width: '42%',
    backgroundColor: DARK_GREY,
    paddingVertical: 20,
    paddingLeft: 24,
    paddingRight: 16,
  },
  logoArea: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  hotelNameHeader: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stateText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
  },
  // Invoice title and details - right of header
  headerRight: {
    flex: 1,
    paddingTop: 12,
    paddingRight: 24,
    alignItems: 'flex-end',
  },
  taxInvoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
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
    backgroundColor: DARK_RED,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  itemTableHeaderText: {
    color: '#fff',
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
    backgroundColor: DARK_RED,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  itemTableTotalText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  col1: { width: '8%' },
  col2: { flex: 1, paddingRight: 8 },
  col3: { width: '12%' },
  col4: { width: '12%' },
  col5: { width: '14%' },
  col6: { width: '14%', textAlign: 'right' },
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
  const pricePerDay = bill.subtotal / days
  const itemName = `${room.roomType} Room ${room.roomNumber}`

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top contact bar - dark red */}
        <View style={styles.contactBar}>
          <Text style={styles.contactBarText}>📞 {HOTEL_INFO.phone}</Text>
          <Text style={styles.contactBarText}>✉ {HOTEL_INFO.email}</Text>
          <Text style={styles.contactBarText}>📍 {HOTEL_INFO.shortAddress}</Text>
        </View>

        {/* Header row: dark grey block + Tax Invoice title */}
        <View style={styles.headerBlock}>
          <View style={styles.headerLeft}>
            <View style={styles.logoArea}>
              <Text style={styles.logoText}>THE RETINUE</Text>
            </View>
            <Text style={styles.hotelNameHeader}>{HOTEL_INFO.brandName}</Text>
            <Text style={styles.stateText}>State: {HOTEL_INFO.stateCode}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.taxInvoiceTitle}>Tax Invoice</Text>
            <Text style={styles.invoiceMeta}>Invoice No.: {bill.billNumber}</Text>
            <Text style={styles.invoiceMeta}>Date: {formatDate(bill.createdAt)}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <Text style={styles.billToTitle}>Bill To</Text>
          <Text style={styles.billToText}>{guest.name}</Text>
          {guest.address && <Text style={styles.billToText}>{guest.address}</Text>}
        </View>

        {/* Item details table - red header */}
        <View style={styles.itemTable}>
          <View style={styles.itemTableHeader}>
            <Text style={[styles.itemTableHeaderText, styles.col1]}>#</Text>
            <Text style={[styles.itemTableHeaderText, styles.col2]}>Item name</Text>
            <Text style={[styles.itemTableHeaderText, styles.col3]}>HSN/SAC</Text>
            <Text style={[styles.itemTableHeaderText, styles.col4]}>Quantity</Text>
            <Text style={[styles.itemTableHeaderText, styles.col5]}>Price/Unit</Text>
            <Text style={[styles.itemTableHeaderText, styles.col6]}>Amount</Text>
          </View>
          <View style={styles.itemTableRow}>
            <Text style={[styles.col1, { fontSize: 9 }]}>1</Text>
            <Text style={[styles.col2, { fontSize: 9 }]}>{itemName}</Text>
            <Text style={[styles.col3, { fontSize: 9 }]}></Text>
            <Text style={[styles.col4, { fontSize: 9 }]}>{days}</Text>
            <Text style={[styles.col5, { fontSize: 9 }]}>₹ {pricePerDay.toFixed(2)}</Text>
            <Text style={[styles.col6, { fontSize: 9 }]}>₹ {bill.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.itemTableTotalRow}>
            <Text style={[styles.itemTableTotalText, styles.col1]}></Text>
            <Text style={[styles.itemTableTotalText, styles.col2]}>Total</Text>
            <Text style={[styles.itemTableTotalText, styles.col3]}></Text>
            <Text style={[styles.itemTableTotalText, styles.col4]}></Text>
            <Text style={[styles.itemTableTotalText, styles.col5]}></Text>
            <Text style={[styles.itemTableTotalText, styles.col6]}>₹ {bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* Two columns: Description (left) + Payment summary (right) */}
        <View style={styles.twoCol}>
          <View style={styles.leftCol}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descText}>Room - {room.roomType.toLowerCase()} - {room.roomNumber}</Text>
            <Text style={styles.descText}>Check in: {formatShortDate(booking.checkIn)}</Text>
            <Text style={styles.descText}>Check out: {formatShortDate(booking.checkOut)}</Text>
            <Text style={styles.descText}>{pricePerDay.toFixed(0)}/- per day</Text>
            <Text style={styles.descText}>{days} day{days !== 1 ? 's' : ''} × {pricePerDay.toFixed(0)} = {bill.subtotal.toLocaleString('en-IN')}/-</Text>
          </View>
          <View style={styles.rightCol}>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.paymentSummaryLabel}>Sub Total</Text>
              <Text style={styles.paymentSummaryValue}>₹ {bill.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.paymentSummaryLabel}>Total</Text>
              <Text style={styles.paymentSummaryValue}>₹ {bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.paymentSummaryLabel}>Received</Text>
              <Text style={styles.paymentSummaryValue}>₹ {bill.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.paymentSummaryLabel}>Balance</Text>
              <Text style={styles.paymentSummaryValue}>₹ {bill.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        {/* Invoice amount in words */}
        <View style={styles.amountWordsSection}>
          <Text style={styles.sectionTitle}>Invoice Amount In Words</Text>
          <Text style={styles.amountWordsText}>{amountInWords(bill.totalAmount)}</Text>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.sectionTitle}>Terms And Conditions</Text>
          <Text style={styles.termsText}>Thanks for doing business with us!</Text>
        </View>

        {/* Authorized signatory */}
        <View style={styles.signatorySection}>
          <Text style={styles.signatoryFor}>For {HOTEL_INFO.brandName}</Text>
          <View style={{ height: 28, borderBottomWidth: 1, borderBottomColor: '#9ca3af', width: 140 }} />
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
