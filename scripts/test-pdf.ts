import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { LabReportPDF } from '../src/components/lab-report-pdf';
import * as fs from 'fs';

async function test() {
  const orderData = {
    orderNo: `LAB-12345`,
    petName: 'TestPet',
    ownerName: 'TestOwner',
    testName: 'Complete Blood Count',
    testCategory: 'Laboratory',
    resultSummary: 'All clear',
    completedAt: { toDate: () => new Date() },
    completedBy: 'System'
  };
  const patientData = { name: 'TestPet' };
  const ownerData = { displayName: 'TestOwner' };

  try {
    const buffer = await renderToBuffer(
      React.createElement(LabReportPDF, {
        order: orderData,
        patient: patientData,
        owner: ownerData
      })
    );
    fs.writeFileSync('test_lab_report.pdf', buffer);
    console.log('Successfully generated PDF');
  } catch (err) {
    console.error('Failed', err);
  }
}

test();
