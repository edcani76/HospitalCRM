import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helvetica/v10/ Helvetica.woff' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 5,
  },
  clinicInfo: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.6,
  },
  invoiceTitle: {
    position: 'absolute',
    right: 40,
    top: 40,
    textAlign: 'right',
  },
  invoiceTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 5,
  },
  invoiceNo: {
    fontSize: 10,
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 100,
    color: '#64748b',
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
    borderBottom: 1,
    borderBottomColor: '#cbd5e1',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#f1f5f9',
    fontSize: 9,
  },
  col1: { width: 60 },
  col2: { flex: 1 },
  col3: { width: 60, textAlign: 'right' },
  col4: { width: 50, textAlign: 'right' },
  col5: { width: 70, textAlign: 'right' },
  totals: {
    marginTop: 15,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  grandTotal: {
    borderTop: 1,
    borderTopColor: '#2563eb',
    marginTop: 5,
    paddingTop: 5,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  statusPaid: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusDraft: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  statusPartial: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 15,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderLeft: 3,
    borderLeftColor: '#2563eb',
  },
  notesText: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.5,
  },
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
  const dateStr = encounterDate ? encounterDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid':
        return styles.statusPaid;
      case 'partially-paid':
        return styles.statusPartial;
      default:
        return styles.statusDraft;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'PAID';
      case 'partially-paid':
        return 'PARTIALLY PAID';
      default:
        return status?.toUpperCase() || 'DRAFT';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>MediPaws Veterinary Clinic</Text>
          <Text style={styles.clinicInfo}>123 Pet Care Street, Animal City 12345</Text>
          <Text style={styles.clinicInfo}>Phone: (555) 123-4567 | Email: info@medipaws.com</Text>
        </View>

        {/* Invoice Title & Number */}
        <View style={styles.invoiceTitle}>
          <Text style={styles.invoiceTitleText}>INVOICE</Text>
          <Text style={styles.invoiceNo}>{invoice?.invoiceNo || 'N/A'}</Text>
          <Text style={styles.invoiceNo}>Date: {dateStr}</Text>
        </View>

        {/* Client & Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Client:</Text>
            <Text style={styles.value}>{owner?.displayName || owner?.name || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Patient:</Text>
            <Text style={styles.value}>{patient?.name || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Species:</Text>
            <Text style={styles.value}>{patient?.species || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Breed:</Text>
            <Text style={styles.value}>{patient?.breed || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Doctor:</Text>
            <Text style={styles.value}>{encounter?.doctorName || 'N/A'}</Text>
          </View>
        </View>

        {/* Services Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services & Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Qty</Text>
              <Text style={styles.col2}>Description</Text>
              <Text style={styles.col3}>Unit Price</Text>
              <Text style={styles.col4}>Tax</Text>
              <Text style={styles.col5}>Total</Text>
            </View>
            {invoiceItems?.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{item.quantity || 1}</Text>
                <Text style={styles.col2}>{item.description || 'Service'}</Text>
                <Text style={styles.col3}>₱{(item.unitPrice || 0).toFixed(2)}</Text>
                <Text style={styles.col4}>{((item.taxRate || 0) * 100).toFixed(0)}%</Text>
                <Text style={styles.col5}>₱{(item.lineTotal || 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>₱{(invoice?.subTotal || 0).toFixed(2)}</Text>
          </View>
          {invoice?.discountTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={styles.totalValue}>-₱{(invoice.discountTotal || 0).toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (12%):</Text>
            <Text style={styles.totalValue}>₱{(invoice?.taxAmount || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount Paid:</Text>
            <Text style={[styles.totalValue, { color: '#166534' }]}>₱{(invoice?.amountPaid || 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Balance Due:</Text>
            <Text style={styles.grandTotalValue}>₱{(invoice?.balanceDue || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Status Badge */}
        <Text style={[styles.statusBadge, getStatusStyle(invoice?.status)]}>
          {getStatusText(invoice?.status)}
        </Text>

        {/* Payments */}
        {payments?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {payments.map((payment: any, index: number) => {
              const paymentDate = payment.paidAt?.toDate?.() || payment.createdAt?.toDate?.();
              const dateStr = paymentDate ? paymentDate.toLocaleDateString() : 'N/A';
              return (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.col1}>{dateStr}</Text>
                  <Text style={styles.col2}>{payment.paymentMethod || 'Cash'}</Text>
                  <Text style={styles.col5}>₱{(payment.amount || 0).toFixed(2)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Notes */}
        {invoice?.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for choosing MediPaws Veterinary Clinic!</Text>
          <Text>For inquiries, please contact us at info@medipaws.com or call (555) 123-4567</Text>
        </View>
      </Page>
    </Document>
  );
};
