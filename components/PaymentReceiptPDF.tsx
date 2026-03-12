import { Document as PDFDocument, Page, Text as PDFText, View, StyleSheet, Image as PDFImage, Font } from '@react-pdf/renderer'
import { HOTEL_INFO } from '@/lib/hotel-info'
import { amountInWords } from '@/lib/amount-in-words'
import { registerFonts } from '@/lib/pdf-fonts'

registerFonts()

const DARK_RED = '#8B2500'
const DARK_GREY = '#1f2937'

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
        width: '50%',
        backgroundColor: '#ffffff',
        paddingLeft: 24,
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoArea: { width: 60, height: 60, marginRight: 12 },
    logoImage: { width: 60, height: 60, objectFit: 'contain' },
    hotelNameHeader: { color: '#111827', fontSize: 18, fontWeight: 700 },
    headerRight: {
        flex: 1,
        paddingRight: 24,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    receiptTitle: {
        fontSize: 20,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    receiptMeta: { fontSize: 9, color: '#374151' },
    section: { marginHorizontal: 24, marginBottom: 16 },
    sectionTitle: { fontSize: 10, fontWeight: 700, color: '#111827', marginBottom: 4, textTransform: 'uppercase' },
    infoBox: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 12,
        borderRadius: 4,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    label: { fontSize: 9, color: '#6b7280' },
    value: { fontSize: 10, fontWeight: 700, color: '#111827' },
    amountSection: {
        marginHorizontal: 24,
        marginVertical: 20,
        padding: 20,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    amountLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
    amountValue: { fontSize: 28, fontWeight: 700, color: DARK_RED },
    amountWords: { fontSize: 10, color: '#374151', marginTop: 8 },
    footerStrip: { flexDirection: 'row', height: 12, marginTop: 'auto' },
    footerStripRed: { width: '35%', backgroundColor: DARK_RED },
    footerStripGrey: { flex: 1, backgroundColor: DARK_GREY, borderTopLeftRadius: 8 },
    signatorySection: { marginHorizontal: 24, marginTop: 40, alignItems: 'flex-end' },
    signatureImage: { width: 100, height: 35, marginBottom: 4 },
})

interface PaymentReceiptPDFProps {
    bill: any
    transaction: {
        label: string
        amount: number
        date: string
        mode?: string
        notes?: string
    }
}

export function PaymentReceiptPDF({ bill, transaction }: PaymentReceiptPDFProps) {
    registerFonts()
    const booking = bill?.booking || {}
    const guest = booking?.guest || {}
    const room = booking?.room || {}

    // Safe date split
    const displayDate = transaction?.date ? transaction.date.split(',')[0] : ''

    return (
        <PDFDocument>
            <Page size="A4" style={styles.page}>
                <View style={styles.contactBar}>
                    <PDFText style={styles.contactBarText} hyphenationCallback={() => []}>📞 {HOTEL_INFO.phone}</PDFText>
                    <PDFText style={styles.contactBarText} hyphenationCallback={() => []}>{HOTEL_INFO.email}</PDFText>
                    <PDFText style={styles.contactBarText} hyphenationCallback={() => []}>📍 {HOTEL_INFO.shortAddress}</PDFText>
                </View>

                <View style={styles.headerBlock}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoArea}>
                            <PDFImage src="/images/hotel-logo.png" style={styles.logoImage} />
                        </View>
                        <PDFText style={styles.hotelNameHeader} hyphenationCallback={() => []}>Hotel The Retinue</PDFText>
                    </View>
                    <View style={styles.headerRight}>
                        <PDFText style={styles.receiptTitle} hyphenationCallback={() => []}>Payment Receipt</PDFText>
                        <PDFText style={styles.receiptMeta} hyphenationCallback={() => []}>Receipt No.: {bill?.billNumber || 'N/A'}-REC</PDFText>
                        <PDFText style={styles.receiptMeta} hyphenationCallback={() => []}>Date: {displayDate}</PDFText>
                    </View>
                </View>

                <View style={styles.section}>
                    <PDFText style={styles.sectionTitle} hyphenationCallback={() => []}>Guest Information</PDFText>
                    <View style={styles.infoBox}>
                        <View style={styles.row}>
                            <PDFText style={styles.label} hyphenationCallback={() => []}>Guest Name</PDFText>
                            <PDFText style={styles.value} hyphenationCallback={() => []}>{guest.name || 'N/A'}</PDFText>
                        </View>
                        <View style={styles.row}>
                            <PDFText style={styles.label} hyphenationCallback={() => []}>Phone Number</PDFText>
                            <PDFText style={styles.value} hyphenationCallback={() => []}>{guest.phone || 'N/A'}</PDFText>
                        </View>
                        <View style={styles.row}>
                            <PDFText style={styles.label} hyphenationCallback={() => []}>Room Information</PDFText>
                            <PDFText style={styles.value} hyphenationCallback={() => []}>Room {room.roomNumber || 'N/A'} ({room.roomType || 'N/A'})</PDFText>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <PDFText style={styles.sectionTitle} hyphenationCallback={() => []}>Payment Details</PDFText>
                    <View style={styles.infoBox}>
                        <View style={styles.row}>
                            <PDFText style={styles.label} hyphenationCallback={() => []}>Description</PDFText>
                            <PDFText style={styles.value} hyphenationCallback={() => []}>{transaction.label}</PDFText>
                        </View>
                        <View style={styles.row}>
                            <PDFText style={styles.label} hyphenationCallback={() => []}>Payment Method</PDFText>
                            <PDFText style={styles.value} hyphenationCallback={() => []}>{transaction.mode || 'Cash'}</PDFText>
                        </View>
                        <View style={styles.row}>
                            <PDFText style={styles.label} hyphenationCallback={() => []}>Transaction Date</PDFText>
                            <PDFText style={styles.value} hyphenationCallback={() => []}>{transaction.date || 'N/A'}</PDFText>
                        </View>
                        {transaction.notes && (
                            <View style={styles.row}>
                                <PDFText style={styles.label} hyphenationCallback={() => []}>Notes</PDFText>
                                <PDFText style={[styles.value, { maxWidth: '70%', textAlign: 'right' }]} hyphenationCallback={() => []}>{transaction.notes}</PDFText>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.amountSection}>
                    <PDFText style={styles.amountLabel} hyphenationCallback={() => []}>Total Amount Received</PDFText>
                    <PDFText style={styles.amountValue} hyphenationCallback={() => []}>{`\u20B9`} {(transaction.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</PDFText>
                    <PDFText style={styles.amountWords} hyphenationCallback={() => []}>{amountInWords(transaction.amount || 0)}</PDFText>
                </View>

                <View style={styles.signatorySection}>
                    <PDFText style={{ fontSize: 9, marginBottom: 8 }} hyphenationCallback={() => []}>For Hotel The Retinue</PDFText>
                    <PDFImage src="/images/signature.png" style={styles.signatureImage} />
                    <PDFText style={{ fontSize: 9, color: '#6b7280' }} hyphenationCallback={() => []}>Authorized Signatory</PDFText>
                </View>

                <View style={styles.footerStrip}>
                    <View style={styles.footerStripRed} />
                    <View style={styles.footerStripGrey} />
                </View>
            </Page>
        </PDFDocument>
    )
}
