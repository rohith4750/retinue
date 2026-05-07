import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { HOTEL_INFO } from '@/lib/hotel-info'
import { amountInWords } from '@/lib/amount-in-words'

// Register Poppins font for better symbol support and premium look
Font.register({
    family: 'Poppins',
    fonts: [
        { src: '/fonts/Poppins-Regular.ttf', fontWeight: 400 },
        { src: '/fonts/Poppins-Medium.ttf', fontWeight: 500 },
        { src: '/fonts/Poppins-Bold.ttf', fontWeight: 700 },
        { src: '/fonts/Poppins-Bold.ttf', fontWeight: 'bold' },
        { src: '/fonts/Poppins-Regular.ttf', fontWeight: 'normal' },
    ]
})

const DARK_RED = '#8B2500'
const DARK_GREY = '#1f2937'
const GOLD = '#B8860B'

const styles = StyleSheet.create({
    page: {
        padding: 0,
        fontSize: 10,
        fontFamily: 'Poppins',
        backgroundColor: '#ffffff',
    },
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
    headerBlock: {
        flexDirection: 'row',
        marginBottom: 16,
        marginTop: 16,
        alignItems: 'center',
    },
    headerLeft: {
        width: '60%',
        backgroundColor: '#ffffff',
        paddingLeft: 24,
        paddingRight: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoArea: {
        width: 100,
        height: 100,
        marginRight: 16,
    },
    logoImage: {
        width: 100,
        height: 100,
        objectFit: 'contain',
    },
    hotelNameHeader: {
        color: GOLD,
        fontSize: 20,
        fontWeight: 700,
    },
    headerRight: {
        flex: 1,
        paddingRight: 24,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    taxInvoiceTitle: {
        fontSize: 20,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    invoiceMeta: {
        fontSize: 10,
        color: '#374151',
    },
    billToSection: {
        marginBottom: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
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
    itemTable: {
        marginHorizontal: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    itemTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
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
    col1: { width: '40%' },
    col2: { width: '20%', textAlign: 'right' },
    col3: { width: '20%', textAlign: 'right' },
    col4: { width: '20%', textAlign: 'right' },
    twoCol: {
        flexDirection: 'row',
        marginHorizontal: 24,
        marginBottom: 16,
    },
    leftCol: {
        width: '55%',
        paddingRight: 16,
    },
    rightCol: {
        width: '45%',
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
    amountWordsSection: {
        marginHorizontal: 24,
        marginBottom: 12,
    },
    amountWordsText: {
        fontSize: 10,
        color: '#374151',
    },
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
    footerStrip: {
        flexDirection: 'row',
        height: 12,
        marginTop: 'auto',
    },
    footerStripGold: {
        width: '35%',
        backgroundColor: GOLD,
    },
    footerStripGrey: {
        flex: 1,
        backgroundColor: DARK_GREY,
        borderTopLeftRadius: 8,
    },
})

interface ConventionBillPDFProps {
    booking: any
}

export function ConventionBillPDF({ booking }: ConventionBillPDFProps) {
    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const grandTotal = booking.grandTotal || booking.totalAmount

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Top contact bar */}
                <View style={styles.contactBar}>
                    <Text style={styles.contactBarText}>📞 {HOTEL_INFO.phone}</Text>
                    <Text style={styles.contactBarText}>{HOTEL_INFO.email}</Text>
                    <Text style={styles.contactBarText}>📍 {HOTEL_INFO.shortAddress}</Text>
                </View>

                {/* Header row */}
                <View style={styles.headerBlock}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoArea}>
                            {/* Attempt to use convention logo, fallback to hotel logo */}
                            <Image
                                src="/images/convention-logo.png"
                                style={styles.logoImage}
                            />
                        </View>
                        <View>
                            <Text style={[styles.hotelNameHeader, { fontSize: 18 }]}>BUCHI RAJU CONVENTIONS</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.taxInvoiceTitle}>Invoice</Text>
                        <Text style={styles.invoiceMeta}>Date: {formatDate(booking.eventDate)}</Text>
                        <Text style={styles.invoiceMeta}>Event: {booking.eventType}</Text>
                    </View>
                </View>

                {/* Bill To & Event Details */}
                <View style={styles.billToSection}>
                    <View>
                        <Text style={styles.billToTitle}>Bill To</Text>
                        <Text style={[styles.billToText, { fontWeight: 'bold' }]}>{booking.customerName}</Text>
                        {booking.customerAddress && <Text style={styles.billToText}>{booking.customerAddress}</Text>}

                        {booking.customerEmail && <Text style={styles.billToText}>{booking.customerEmail}</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.billToTitle}>Event Details</Text>
                        <Text style={styles.billToText}>Hall: {booking.hall?.name}</Text>
                        <Text style={styles.billToText}>Time: {booking.startTime} - {booking.endTime}</Text>
                        <Text style={styles.billToText}>Guests: {booking.expectedGuests}</Text>
                    </View>
                </View>

                {/* Item details table */}
                <View style={styles.itemTable}>
                    <View style={styles.itemTableHeader}>
                        <Text style={[styles.itemTableHeaderText, styles.col1]}>Particulars</Text>
                        <Text style={[styles.itemTableHeaderText, styles.col2]}>Rate/Unit</Text>
                        <Text style={[styles.itemTableHeaderText, styles.col3]}>Qty/Units</Text>
                        <Text style={[styles.itemTableHeaderText, styles.col4]}>Amount</Text>
                    </View>

                    {/* Hall Charges */}
                    <View style={styles.itemTableRow}>
                        <Text style={[styles.col1, { fontSize: 9 }]}>Hall Charges ({booking.hall?.name})</Text>
                        <Text style={[styles.col2, { fontSize: 9 }]}>-</Text>
                        <Text style={[styles.col3, { fontSize: 9 }]}>1</Text>
                        <Text style={[styles.col4, { fontSize: 9 }]}>₹{booking.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                    </View>

                    {/* Electricity Charges */}
                    {booking.electricityCharges > 0 && (
                        <View style={styles.itemTableRow}>
                            <View style={styles.col1}>
                                <Text style={{ fontSize: 9 }}>Electricity Charges</Text>
                                <Text style={{ fontSize: 7, color: '#6b7280' }}>
                                    Readings: {booking.meterReadingBefore} to {booking.meterReadingAfter}
                                </Text>
                            </View>
                            <Text style={[styles.col2, { fontSize: 9 }]}>₹{booking.electricityUnitPrice || 8}</Text>
                            <Text style={[styles.col3, { fontSize: 9 }]}>{booking.unitsConsumed?.toFixed(2)}</Text>
                            <Text style={[styles.col4, { fontSize: 9 }]}>₹{booking.electricityCharges?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                    )}

                    {/* Maintenance Charges */}
                    {booking.maintenanceCharges > 0 && (
                        <View style={styles.itemTableRow}>
                            <Text style={[styles.col1, { fontSize: 9 }]}>Maintenance Charges</Text>
                            <Text style={[styles.col2, { fontSize: 9 }]}>-</Text>
                            <Text style={[styles.col3, { fontSize: 9 }]}>1</Text>
                            <Text style={[styles.col4, { fontSize: 9 }]}>₹{booking.maintenanceCharges?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                    )}

                    {/* Other Charges */}
                    {booking.otherCharges > 0 && (
                        <View style={styles.itemTableRow}>
                            <View style={styles.col1}>
                                <Text style={{ fontSize: 9 }}>Other Charges</Text>
                                {booking.otherChargesNote && (
                                    <Text style={{ fontSize: 7, color: '#6b7280' }}>{booking.otherChargesNote}</Text>
                                )}
                            </View>
                            <Text style={[styles.col2, { fontSize: 9 }]}>-</Text>
                            <Text style={[styles.col3, { fontSize: 9 }]}>1</Text>
                            <Text style={[styles.col4, { fontSize: 9 }]}>₹{booking.otherCharges?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                    )}
                </View>

                {/* Two columns: Description + Payment summary */}
                <View style={styles.twoCol}>
                    <View style={styles.leftCol}>
                        <Text style={styles.sectionTitle}>Notes</Text>
                        <Text style={styles.termsText}>{booking.specialRequests || 'No special requests recorded.'}</Text>
                    </View>
                    <View style={styles.rightCol}>
                        <View style={styles.paymentSummaryRow}>
                            <Text style={styles.paymentSummaryLabel}>Sub Total</Text>
                            <Text style={styles.paymentSummaryValue}>₹{grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                        <View style={styles.paymentSummaryRow}>
                            <Text style={styles.paymentSummaryLabel}>Total Amount</Text>
                            <Text style={styles.paymentSummaryValue}>₹{grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                        <View style={[styles.paymentSummaryRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
                            <Text style={styles.paymentSummaryLabel}>Advance Paid</Text>
                            <Text style={[styles.paymentSummaryValue, { color: '#059669' }]}>- ₹{booking.advanceAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                        <View style={styles.paymentSummaryRow}>
                            <Text style={[styles.paymentSummaryLabel, { fontWeight: 'bold', color: '#111827' }]}>Balance Due</Text>
                            <Text style={[styles.paymentSummaryValue, { fontSize: 12, color: booking.balanceAmount > 0 ? '#B45309' : '#059669' }]}>
                                ₹{booking.balanceAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Amount in words */}
                <View style={styles.amountWordsSection}>
                    <Text style={styles.sectionTitle}>Total Amount In Words</Text>
                    <Text style={styles.amountWordsText}>{amountInWords(grandTotal || 0)}</Text>
                </View>

                {/* Terms */}
                <View style={styles.termsSection}>
                    <Text style={styles.sectionTitle}>Terms And Conditions</Text>
                    <Text style={styles.termsText}>1. Advance payment is non-refundable upon cancellation within 48 hours of event.</Text>
                    <Text style={styles.termsText}>2. Extra electricity charges are applicable based on actual meter readings.</Text>
                    <Text style={styles.termsText}>3. Management is not responsible for loss of personal belongings.</Text>
                    <Text style={styles.termsText}>4. Any damage to property will be charged accordingly.</Text>
                </View>

                {/* Authorized signatory */}
                <View style={styles.signatorySection}>
                    <Text style={styles.signatoryFor}>For BUCHI RAJU CONVENTIONS</Text>
                    <Image
                        src="/images/signature.png"
                        style={styles.signatureImage}
                    />
                    <Text style={styles.signatoryLabel}>Authorized Signatory</Text>
                </View>

                {/* Footer strip */}
                <View style={styles.footerStrip}>
                    <View style={styles.footerStripGold} />
                    <View style={styles.footerStripGrey} />
                </View>
            </Page>
        </Document>
    )
}
