import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const fmt = (n: number) => {
  return `PHP ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 16, borderBottom: '2px solid #1e40af' },
  logoBlock: { flex: 1 },
  logoName: { fontSize: 18, fontWeight: 'bold', color: '#1e40af', marginBottom: 4 },
  logoSub: { fontSize: 8, color: '#64748b', lineHeight: 1.5 },
  invoiceBlock: { alignItems: 'flex-end' },
  invoiceLabel: { fontSize: 22, fontWeight: 'bold', color: '#1e40af', letterSpacing: 1 },
  invoiceNo: { fontSize: 9, color: '#64748b', marginTop: 2 },
  invoiceDate: { fontSize: 9, color: '#64748b', marginTop: 1 },
  infoSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#1e40af', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { width: 80, color: '#64748b', fontSize: 8 },
  infoValue: { flex: 1, fontSize: 9, fontWeight: 'bold' },
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 8, fontWeight: 'bold', fontSize: 8, borderBottom: '1px solid #cbd5e1', color: '#334155' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottom: '1px solid #f1f5f9', fontSize: 8 },
  colNum: { width: 30, textAlign: 'center' },
  colDesc: { flex: 1, paddingRight: 8 },
  colPrice: { width: 75, textAlign: 'right' },
  colTotal: { width: 75, textAlign: 'right' },
  totalsBlock: { alignItems: 'flex-end', marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: 180, paddingVertical: 3 },
  totalLabel: { fontSize: 9, color: '#64748b' },
  totalValue: { fontSize: 9, fontWeight: 'bold' },
  grandRow: { borderTop: '2px solid #1e40af', marginTop: 4, paddingTop: 4 },
  grandLabel: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' },
  grandValue: { fontSize: 11, fontWeight: 'bold', color: '#1e40af' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4, fontSize: 8, fontWeight: 'bold', marginTop: 12, alignSelf: 'flex-start' },
  statusPaid: { backgroundColor: '#dcfce7', color: '#166534' },
  statusDraft: { backgroundColor: '#f1f5f9', color: '#64748b' },
  statusPartial: { backgroundColor: '#fef3c7', color: '#92400e' },
  paymentsSection: { marginTop: 16 },
  paymentHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 8, fontWeight: 'bold', fontSize: 8, borderBottom: '1px solid #cbd5e1', color: '#334155' },
  paymentRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottom: '1px solid #f1f5f9', fontSize: 8 },
  notesBox: { marginTop: 16, padding: 10, backgroundColor: '#f8fafc', borderLeft: '3px solid #1e40af' },
  notesText: { fontSize: 8, color: '#475569', lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 36, left: 36, right: 36, borderTop: '1px solid #e2e8f0', paddingTop: 12, textAlign: 'center', fontSize: 7, color: '#94a3b8' },
  emptyRow: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 9, color: '#94a3b8' },
});

interface InvoicePDFProps {
  invoice: any;
  invoiceItems: any[];
  payments: any[];
  patient: any;
  owner: any;
  encounter: any;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({
  invoice,
  invoiceItems,
  payments,
  patient,
  owner,
  encounter,
}) => {
  const encounterDate = encounter?.startedAt?.toDate?.() || encounter?.createdAt?.toDate?.();
  const dateStr = encounterDate
    ? encounterDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : invoice?.date || invoice?.createdAt?.toDate?.()?.toLocaleDateString?.('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A';

  const lineItems = (invoiceItems || []).filter((i: any) => i.itemType !== 'tax');

  const subTotal = invoice?.subTotal ?? lineItems.reduce((sum: number, i: any) => sum + (i.lineTotal || 0), 0);
  const grandTotal = invoice?.grandTotal ?? invoice?.amount ?? subTotal;
  const discountTotal = invoice?.discountTotal || 0;
  const amountPaid = invoice?.amountPaid || 0;
  const balanceDue = invoice?.balanceDue ?? (grandTotal - amountPaid);
  const taxAmount = invoice?.taxAmount || 0;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return styles.statusPaid;
      case 'active': return styles.statusPartial;
      default: return styles.statusDraft;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'PAID IN FULL';
      case 'active': return 'OUTSTANDING';
      default: return (status || 'DRAFT').toUpperCase();
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBlock}>
            <Text style={styles.logoName}>EdvirontVet Animal Hospital</Text>
            <Text style={styles.logoSub}>888 Pawcare St., Project 6, Quezon City</Text>
            <Text style={styles.logoSub}>Quezon City, Philippines</Text>
            <Text style={styles.logoSub}>0912-6819499 | info@edvirontvet.com</Text>
          </View>
          <View style={styles.invoiceBlock}>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceNo}>{invoice?.invoiceNo || `INV-${invoice?.id?.slice(-6)?.toUpperCase() || '000000'}`}</Text>
            <Text style={styles.invoiceDate}>{dateStr}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Client:</Text>
            <Text style={styles.infoValue}>{owner?.displayName || owner?.name || invoice?.ownerName || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Patient:</Text>
            <Text style={styles.infoValue}>{patient?.name || invoice?.petName || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Species:</Text>
            <Text style={styles.infoValue}>{patient?.species || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Breed:</Text>
            <Text style={styles.infoValue}>{patient?.breed || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Doctor:</Text>
            <Text style={styles.infoValue}>{encounter?.doctorName || invoice?.doctorName || 'N/A'}</Text>
          </View>
        </View>

        {/* Services Table */}
        <View style={styles.table}>
          <Text style={styles.sectionTitle}>Services &amp; Items</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>Qty</Text>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          {lineItems.length > 0 ? lineItems.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colNum}>{item.quantity || 1}</Text>
              <Text style={styles.colDesc}>
                {item.serviceCode ? `[${item.serviceCode}] ` : ''}
                {item.description || 'Service'}
              </Text>
              <Text style={styles.colPrice}>{fmt(item.unitPrice || 0)}</Text>
              <Text style={styles.colTotal}>{fmt(item.lineTotal || 0)}</Text>
            </View>
          )) : (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No items on this invoice</Text>
            </View>
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(subTotal)}</Text>
          </View>
          {discountTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>- {fmt(discountTotal)}</Text>
            </View>
          )}
          {taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT (12%)</Text>
              <Text style={styles.totalValue}>{fmt(taxAmount)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmt(grandTotal)}</Text>
          </View>
          {amountPaid > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount Paid</Text>
              <Text style={[styles.totalValue, { color: '#166534' }]}>- {fmt(amountPaid)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandRow]}>
            <Text style={styles.grandLabel}>Balance Due</Text>
            <Text style={styles.grandValue}>{fmt(balanceDue)}</Text>
          </View>
        </View>

        {/* Status */}
        <Text style={[styles.statusBadge, getStatusStyle(invoice?.status)]}>
          {getStatusText(invoice?.status)}
        </Text>

        {/* Payment History */}
        {payments?.length > 0 && (
          <View style={styles.paymentsSection}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <View style={styles.paymentHeader}>
              <Text style={{ flex: 1 }}>Date</Text>
              <Text style={{ width: 80, textAlign: 'right' }}>Method</Text>
              <Text style={{ width: 75, textAlign: 'right' }}>Amount</Text>
            </View>
            {payments.map((payment: any, index: number) => {
              const paymentDate = payment.paidAt?.toDate?.() || payment.createdAt?.toDate?.();
              const pDate = paymentDate ? paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
              return (
                <View key={index} style={styles.paymentRow}>
                  <Text style={{ flex: 1 }}>{pDate}</Text>
                  <Text style={{ width: 80, textAlign: 'right', textTransform: 'capitalize' }}>{payment.paymentMethod || 'cash'}</Text>
                  <Text style={{ width: 75, textAlign: 'right' }}>{fmt(payment.amount || 0)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Notes */}
        {invoice?.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>Diagnosis: {invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for choosing EdvirontVet Animal Hospital!</Text>
          <Text>For inquiries, please contact us at info@edvirontvet.com or call 0912-6819499</Text>
        </View>
      </Page>
    </Document>
  );
};
