import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 16, borderBottom: '2px solid #7c3aed' },
  logoBlock: { flex: 1 },
  logoName: { fontSize: 18, fontWeight: 'bold', color: '#7c3aed', marginBottom: 4 },
  logoSub: { fontSize: 8, color: '#64748b', lineHeight: 1.5 },
  reportBlock: { alignItems: 'flex-end' },
  reportLabel: { fontSize: 20, fontWeight: 'bold', color: '#7c3aed', letterSpacing: 1 },
  reportNo: { fontSize: 9, color: '#64748b', marginTop: 2 },
  reportDate: { fontSize: 9, color: '#64748b', marginTop: 1 },
  infoSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#7c3aed', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCol: { flex: 1 },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { width: 60, color: '#64748b', fontSize: 8, fontWeight: 'bold' },
  infoValue: { flex: 1, fontSize: 9, fontWeight: 'bold' },
  resultSection: { marginTop: 10 },
  resultTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#1e293b' },
  resultBox: { padding: 12, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, minHeight: 150 },
  resultText: { fontSize: 10, color: '#334155', lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 36, left: 36, right: 36, borderTop: '1px solid #e2e8f0', paddingTop: 12, textAlign: 'center', fontSize: 7, color: '#94a3b8' },
  signatureBlock: { marginTop: 40, alignItems: 'flex-end', paddingRight: 20 },
  signatureLine: { borderBottom: '1px solid #1e293b', width: 150, marginBottom: 4 },
  signatureName: { fontSize: 9, fontWeight: 'bold', textAlign: 'center', width: 150 },
  signatureRole: { fontSize: 8, color: '#64748b', textAlign: 'center', width: 150, marginTop: 2 },
});

interface LabReportPDFProps {
  order: any;
  patient: any;
  owner: any;
}

export const LabReportPDF: React.FC<LabReportPDFProps> = ({ order, patient, owner }) => {
  const dateStr = order.completedAt?.toDate?.()
    ? order.completedAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : order.orderedAt?.toDate?.()?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A';

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
          <View style={styles.reportBlock}>
            <Text style={styles.reportLabel}>LABORATORY REPORT</Text>
            <Text style={styles.reportNo}>{order.orderNo || `LAB-${order.id?.slice(-6)?.toUpperCase() || '000000'}`}</Text>
            <Text style={styles.reportDate}>{dateStr}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Patient:</Text>
                <Text style={styles.infoValue}>{patient?.name || order.petName || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Species:</Text>
                <Text style={styles.infoValue}>{patient?.species || 'N/A'} {patient?.breed ? `(${patient.breed})` : ''}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Age/Sex:</Text>
                <Text style={styles.infoValue}>{patient?.gender || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.infoCol}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Client:</Text>
                <Text style={styles.infoValue}>{owner?.displayName || owner?.name || order.ownerName || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Doctor:</Text>
                <Text style={styles.infoValue}>{order.orderedBy || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sample:</Text>
                <Text style={styles.infoValue}>{order.sampleType || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Test Details */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Test Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Test Name:</Text>
            <Text style={styles.infoValue}>{order.testName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{order.testCategory || 'Laboratory'}</Text>
          </View>
          {order.reason && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Indication:</Text>
              <Text style={styles.infoValue}>{order.reason}</Text>
            </View>
          )}
        </View>

        {/* Results */}
        <View style={styles.resultSection}>
          <Text style={styles.sectionTitle}>Results & Interpretation</Text>
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{order.resultSummary || 'No results recorded yet.'}</Text>
          </View>
        </View>

        {/* Signature */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine}></View>
          <Text style={styles.signatureName}>{order.completedBy || order.orderedBy || 'Authorized Signature'}</Text>
          <Text style={styles.signatureRole}>Veterinarian / Lab Technician</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This report is confidential and intended solely for the use of the individual or entity to whom it is addressed.</Text>
          <Text>EdvirontVet Animal Hospital | Powered by MediPaws CRM</Text>
        </View>
      </Page>
    </Document>
  );
};
