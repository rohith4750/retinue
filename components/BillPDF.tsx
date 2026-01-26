import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #1e40af',
    paddingBottom: 20,
  },
  hotelName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  hotelTagline: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },
  hotelInfo: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    borderBottom: '1 solid #e2e8f0',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 120,
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: '#1e293b',
  },
  table: {
    marginTop: 15,
    border: '1 solid #e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 10,
    color: '#1e293b',
  },
  tableCellDescription: {
    flex: 2,
    fontSize: 10,
    color: '#1e293b',
  },
  tableCellAmount: {
    flex: 1,
    fontSize: 10,
    color: '#1e293b',
    textAlign: 'right',
  },
  totals: {
    marginTop: 20,
    borderTop: '2 solid #1e40af',
    paddingTop: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  totalLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 11,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  grandTotal: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: 'bold',
  },
  paymentSection: {
    marginTop: 25,
    padding: 15,
    backgroundColor: '#f8fafc',
    border: '1 solid #e2e8f0',
    borderRadius: 5,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentStatus: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  footer: {
    marginTop: 40,
    paddingTop: 15,
    borderTop: '1 solid #e2e8f0',
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 30,
  },
  column: {
    flex: 1,
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

export function BillPDF({ bill }: BillPDFProps) {
  const { booking } = bill
  const { guest, room } = booking

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.hotelName}>THE RETINUE</Text>
          <Text style={styles.hotelTagline}>Luxury Hotel & Hospitality</Text>
          <View style={{ marginTop: 10 }}>
            <Text style={styles.hotelInfo}>123 Hotel Street, City, State - 123456</Text>
            <Text style={styles.hotelInfo}>Phone: +91 1234567890 | Email: info@theretinue.com</Text>
            <Text style={styles.hotelInfo}>GSTIN: 12ABCDE1234F1Z5</Text>
          </View>
        </View>

        {/* Bill Information */}
        <View style={styles.section}>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Bill Information</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Bill Number:</Text>
                <Text style={styles.value}>{bill.billNumber}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Bill Date:</Text>
                <Text style={styles.value}>{formatDateTime(bill.createdAt)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Booking ID:</Text>
                <Text style={styles.value}>{booking.id}</Text>
              </View>
            </View>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Guest Information</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{guest.name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{guest.phone}</Text>
              </View>
              {guest.email && (
                <View style={styles.row}>
                  <Text style={styles.label}>Email:</Text>
                  <Text style={styles.value}>{guest.email}</Text>
                </View>
              )}
              {guest.address && (
                <View style={styles.row}>
                  <Text style={styles.label}>Address:</Text>
                  <Text style={styles.value}>{guest.address}</Text>
                </View>
              )}
              {guest.idProof && (
                <View style={styles.row}>
                  <Text style={styles.label}>ID Proof:</Text>
                  <Text style={styles.value}>{guest.idProof}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.label}>Room Number:</Text>
                <Text style={styles.value}>{room.roomNumber}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Room Type:</Text>
                <Text style={styles.value}>{room.roomType}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Floor:</Text>
                <Text style={styles.value}>{room.floor}</Text>
              </View>
            </View>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.label}>Check-in:</Text>
                <Text style={styles.value}>{formatDate(booking.checkIn)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Check-out:</Text>
                <Text style={styles.value}>{formatDate(booking.checkOut)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Slot Type:</Text>
                <Text style={styles.value}>{booking.slot.slotType}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Status:</Text>
                <Text style={styles.value}>{booking.status}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Charges Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Charges Breakdown</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableCellDescription]}>Description</Text>
              <Text style={[styles.tableCell, styles.tableCellAmount]}>Amount (₹)</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellDescription}>
                Room Charges ({room.roomType} - {room.roomNumber})
              </Text>
              <Text style={styles.tableCellAmount}>{bill.subtotal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellDescription}>GST (18%)</Text>
              <Text style={styles.tableCellAmount}>{bill.tax.toLocaleString('en-IN')}</Text>
            </View>
            {bill.discount > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCellDescription}>Discount</Text>
                <Text style={[styles.tableCellAmount, { color: '#059669' }]}>
                  -{bill.discount.toLocaleString('en-IN')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>₹{bill.subtotal.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (18%):</Text>
            <Text style={styles.totalValue}>₹{bill.tax.toLocaleString('en-IN')}</Text>
          </View>
          {bill.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={[styles.totalValue, { color: '#059669' }]}>
                -₹{bill.discount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 10, paddingTop: 10, borderTop: '1 solid #e2e8f0' }]}>
            <Text style={styles.grandTotal}>Grand Total:</Text>
            <Text style={styles.grandTotal}>₹{bill.totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.label}>Total Amount:</Text>
            <Text style={styles.value}>₹{bill.totalAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.label}>Paid Amount:</Text>
            <Text style={[styles.value, { color: '#059669' }]}>
              ₹{bill.paidAmount.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.label}>Balance Amount:</Text>
            <Text style={[styles.value, { color: '#dc2626' }]}>
              ₹{bill.balanceAmount.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.paymentStatus}>
            Payment Status: {bill.paymentStatus}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for choosing THE RETINUE!</Text>
          <Text style={{ marginTop: 5 }}>
            This is a computer-generated invoice and does not require a signature.
          </Text>
          <Text style={{ marginTop: 5 }}>
            For any queries, please contact us at info@theretinue.com or +91 1234567890
          </Text>
        </View>
      </Page>
    </Document>
  )
}
