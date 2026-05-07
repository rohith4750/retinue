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
        width: 80,
        height: 80,
        marginRight: 16,
    },
    logoImage: {
        width: 80,
        height: 80,
        objectFit: 'contain',
    },
    hotelNameHeader: {
        color: GOLD,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 1,
    },
    headerRight: {
        flex: 1,
        paddingRight: 24,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    taxInvoiceTitle: {
        fontSize: 22,
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
        marginBottom: 20,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    billToTitle: {
        fontSize: 11,
        fontWeight: 700,
        color: '#111827',
        textTransform: 'uppercase',
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 2,
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
        paddingVertical: 10,
        paddingHorizontal: 10,
    },
    itemTableHeaderText: {
        color: '#111827',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    itemTableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    col1: { width: '40%' },
    col2: { width: '20%', textAlign: 'right' },
    col3: { width: '20%', textAlign: 'right' },
    col4: { width: '20%', textAlign: 'right' },
    
    // Electricity Detail Section
    electricityBox: {
        marginHorizontal: 24,
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#fffdf0',
        borderWidth: 1,
        borderColor: '#fef3c7',
        borderRadius: 4,
    },
    electricityTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: '#92400e',
        marginBottom: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    electricityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    electricityItem: {
        width: '50%',
        marginBottom: 4,
        flexDirection: 'row',
    },
    electricityLabel: {
        fontSize: 9,
        color: '#92400e',
        width: 100,
    },
    electricityValue: {
        fontSize: 9,
        fontWeight: 700,
        color: '#111827',
    },

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
        fontSize: 10,
        fontWeight: 'bold',
        color: '#111827',
        textTransform: 'uppercase',
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
    termsText: {
        fontSize: 8,
        color: '#6b7280',
        marginBottom: 2,
        lineHeight: 1.4,
    },
    signatorySection: {
        marginHorizontal: 24,
        marginBottom: 24,
        alignItems: 'flex-end',
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
        <Document title={`Bill - ${booking.customerName}`}>
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
                            <Image
                                src="/images/convention-logo.png"
                                style={styles.logoImage}
                            />
                        </View>
                        <View>
                            <Text style={styles.hotelNameHeader}>BUCHIRAJU CONVENTIONS</Text>
                            <Text style={{ fontSize: 9, color: GOLD, marginTop: 2 }}>Elegant Celebrations & Events</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.taxInvoiceTitle}>Tax Invoice</Text>
                        <Text style={styles.invoiceMeta}>Date: {formatDate(booking.eventDate)}</Text>
                        <Text style={styles.invoiceMeta}>Invoice No: {booking.id?.substring(0, 8).toUpperCase()}</Text>
                    </View>
                </View>

                {/* Bill To & Event Details */}
                <View style={styles.billToSection}>
                    <View style={{ width: '45%' }}>
                        <Text style={styles.billToTitle}>Bill To</Text>
                        <Text style={[styles.billToText, { fontWeight: 'bold', fontSize: 11 }]}>{booking.customerName}</Text>
                        {booking.customerAddress && <Text style={styles.billToText}>{booking.customerAddress}</Text>}
                        {booking.customerEmail && <Text style={[styles.billToText, { color: '#6b7280' }]}>{booking.customerEmail}</Text>}
                    </View>
                    <View style={{ width: '45%', alignItems: 'flex-end' }}>
                        <Text style={styles.billToTitle}>Event Details</Text>
                        <Text style={styles.billToText}><Text style={{ fontWeight: 'bold' }}>Hall:</Text> {booking.hall?.name}</Text>
                        <Text style={styles.billToText}><Text style={{ fontWeight: 'bold' }}>Event:</Text> {booking.eventType}</Text>
                        <Text style={styles.billToText}><Text style={{ fontWeight: 'bold' }}>Time:</Text> {booking.startTime} - {booking.endTime}</Text>
                        <Text style={styles.billToText}><Text style={{ fontWeight: 'bold' }}>Guests:</Text> {booking.expectedGuests}</Text>
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
                            <Text style={[styles.col1, { fontSize: 9 }]}>Electricity Charges</Text>
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
                                    <Text style={{ fontSize: 7, color: '#6b7280' }}>({booking.otherChargesNote})</Text>
                                )}
                            </View>
                            <Text style={[styles.col2, { fontSize: 9 }]}>-</Text>
                            <Text style={[styles.col3, { fontSize: 9 }]}>1</Text>
                            <Text style={[styles.col4, { fontSize: 9 }]}>₹{booking.otherCharges?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                    )}
                </View>

                {/* Electricity Meter Details Section - PREMIUM LOOK */}
                {booking.meterReadingBefore !== null && (
                    <View style={styles.electricityBox}>
                        <Text style={styles.electricityTitle}>⚡ Electricity Meter Readings</Text>
                        <View style={styles.electricityGrid}>
                            <View style={styles.electricityItem}>
                                <Text style={styles.electricityLabel}>Start Reading:</Text>
                                <Text style={styles.electricityValue}>{booking.meterReadingBefore}</Text>
                            </View>
                            <View style={styles.electricityItem}>
                                <Text style={styles.electricityLabel}>End Reading:</Text>
                                <Text style={styles.electricityValue}>{booking.meterReadingAfter || 'Pending'}</Text>
                            </View>
                            <View style={styles.electricityItem}>
                                <Text style={styles.electricityLabel}>Total Consumed:</Text>
                                <Text style={styles.electricityValue}>{booking.unitsConsumed?.toFixed(2) || '0.00'} Units</Text>
                            </View>
                            <View style={styles.electricityItem}>
                                <Text style={styles.electricityLabel}>Rate per Unit:</Text>
                                <Text style={styles.electricityValue}>₹{booking.electricityUnitPrice || 8}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Two columns: Description + Payment summary */}
                <View style={styles.twoCol}>
                    <View style={styles.leftCol}>
                        <Text style={styles.sectionTitle}>Notes & Special Requests</Text>
                        <Text style={[styles.termsText, { color: '#374151', fontSize: 9 }]}>
                            {booking.specialRequests || 'No special requests recorded for this event.'}
                        </Text>
                        
                        <View style={{ marginTop: 12 }}>
                            <Text style={styles.sectionTitle}>Terms And Conditions</Text>
                            <Text style={styles.termsText}>1. Advance payment is non-refundable upon cancellation.</Text>
                            <Text style={styles.termsText}>2. Electricity charges are as per actual meter readings.</Text>
                            <Text style={styles.termsText}>3. Management is not responsible for loss of belongings.</Text>
                            <Text style={styles.termsText}>4. Damages to property will be charged to the customer.</Text>
                        </View>
                    </View>
                    <View style={styles.rightCol}>
                        <View style={styles.paymentSummaryRow}>
                            <Text style={styles.paymentSummaryLabel}>Sub Total</Text>
                            <Text style={styles.paymentSummaryValue}>₹{grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                        <View style={[styles.paymentSummaryRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
                            <Text style={styles.paymentSummaryLabel}>Total Amount</Text>
                            <Text style={[styles.paymentSummaryValue, { fontSize: 11 }]}>₹{grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                        <View style={styles.paymentSummaryRow}>
                            <Text style={styles.paymentSummaryLabel}>Advance Paid</Text>
                            <Text style={[styles.paymentSummaryValue, { color: '#059669' }]}>- ₹{booking.advanceAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                        <View style={[styles.paymentSummaryRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 2, borderTopColor: '#111827' }]}>
                            <Text style={[styles.paymentSummaryLabel, { fontWeight: 'bold', color: '#111827' }]}>Balance Due</Text>
                            <Text style={[styles.paymentSummaryValue, { fontSize: 13, color: booking.balanceAmount > 0 ? DARK_RED : '#059669' }]}>
                                ₹{booking.balanceAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Amount in words */}
                <View style={styles.amountWordsSection}>
                    <Text style={styles.sectionTitle}>Total Amount In Words</Text>
                    <Text style={[styles.amountWordsText, { fontWeight: 'bold' }]}>{amountInWords(grandTotal || 0)}</Text>
                </View>

                {/* Authorized signatory */}
                <View style={styles.signatorySection}>
                    <Text style={styles.signatoryFor}>For BUCHIRAJU CONVENTIONS</Text>
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
