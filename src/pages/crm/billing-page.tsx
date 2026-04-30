import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Eye, FileText, X } from 'lucide-react';

const initialBills = [
  {
    id: 'INV2025001',
    invoiceDate: '2026-04-16',
    hospitalName: 'MediPaws Veterinary Clinic',
    hospitalAddress: '123 Pet Care Avenue, Anytown, Philippines 10001',
    gstin: '27AABCU9603R1ZM',
    panNumber: 'AABCU9603R',
    patient: {
      fullName: 'Buddy (Golden Retriever)',
      owner: 'John Smith',
      age: 6,
      dateOfBirth: '2020-05-15',
      gender: 'Male',
      contactNumber: '+63 555 123-4567',
      email: 'john.smith@email.com',
      address: '123 Main St, Anytown, Philippines',
      aadhaarNumber: ''
    },
    insurance: {
      companyName: 'PetFirst Insurance',
      policyNumber: 'PET123456789',
      claimId: 'CLM2025001',
      tpaName: 'Medi Assist',
      coverageDetails: 'Pet Care Floater - ₱5,000'
    },
    provider: {
      doctorName: 'Dr. Sarah Johnson',
      registrationNumber: 'VET-12345',
      department: 'General Medicine',
      hospitalName: 'MediPaws Veterinary Clinic',
      branch: 'Main Branch'
    },
    treatment: {
      admissionDate: '2026-04-15',
      dischargeDate: '2026-04-16',
      diagnosis: 'Annual wellness checkup with vaccinations',
      referralDoctor: 'Dr. Sarah Johnson'
    },
    services: [
      { description: 'General Consultation', hsnCode: '9993', quantity: 1, rate: 4000, taxRate: 0, amount: 4000 },
      { description: 'Complete Blood Count (CBC)', hsnCode: '9993', quantity: 1, rate: 6000, taxRate: 0, amount: 6000 },
      { description: 'Vaccinations (Rabies, DHPP)', hsnCode: '9993', quantity: 1, rate: 7500, taxRate: 0, amount: 7500 }
    ],
    subtotal: 17500,
    discount: 1750,
    tax: 0,
    total: 15750,
    amountInWords: 'Fifteen Thousand Seven Hundred Fifty Pesos Only',
    payment: {
      mode: 'UPI',
      date: '2026-04-16',
      receiptNumber: 'RCP2025001',
      advancePaid: 15750,
      balanceDue: 0
    },
    status: 'Paid'
  }
];

export default function BillingPage() {
  const [bills, setBills] = useState<any[]>(initialBills);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [formData, setFormData] = useState({
    hospitalName: 'MediPaws Veterinary Clinic',
    hospitalAddress: '123 Pet Care Avenue, Anytown, Philippines 10001',
    gstin: '27AABCU9603R1ZM',
    panNumber: 'AABCU9603R',
    patient: { fullName: '', owner: '', age: '', dateOfBirth: '', gender: '', contactNumber: '', email: '', address: '', aadhaarNumber: '' },
    insurance: { companyName: '', policyNumber: '', claimId: '', tpaName: '', coverageDetails: '' },
    provider: { doctorName: '', registrationNumber: '', department: '', hospitalName: 'MediPaws Veterinary Clinic', branch: 'Main Branch' },
    treatment: { admissionDate: '', dischargeDate: '', diagnosis: '', referralDoctor: '' },
    services: [{ description: '', hsnCode: '9993', quantity: 1, rate: 0, taxRate: 0 }],
    discount: 0,
    payment: { mode: '', advancePaid: 0 }
  });

  const updatePatient = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, patient: { ...prev.patient, [field]: field === 'age' ? (parseInt(value) || 0) : value } }));
  };

  const updateInsurance = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, insurance: { ...prev.insurance, [field]: value } }));
  };

  const updateProvider = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, provider: { ...prev.provider, [field]: value } }));
  };

  const updateTreatment = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, treatment: { ...prev.treatment, [field]: value } }));
  };

  const updatePayment = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, payment: { ...prev.payment, [field]: value } }));
  };

  const addService = () => {
    setFormData(prev => ({ ...prev, services: [...prev.services, { description: '', hsnCode: '9993', quantity: 1, rate: 0, taxRate: 0 }] }));
  };

  const removeService = (index: number) => {
    setFormData(prev => ({ ...prev, services: prev.services.filter((_, i) => i !== index) }));
  };

  const updateService = (index: number, field: string, value: any) => {
    setFormData(prev => ({ ...prev, services: prev.services.map((service, i) => i === index ? { ...service, [field]: value } : service) }));
  };

  const calculateTotals = () => {
    const subtotal = formData.services.reduce((total, service) => total + (service.quantity * service.rate), 0);
    const totalTax = formData.services.reduce((total, service) => {
      const serviceAmount = service.quantity * service.rate;
      return total + (serviceAmount * service.taxRate / 100);
    }, 0);
    const total = subtotal + totalTax - formData.discount;
    return { subtotal, totalTax, total };
  };

  const numberToWords = (num: number) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 > 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 > 0 ? ' ' + numberToWords(num % 100) : '');
    return 'Amount';
  };

  const handleSubmit = () => {
    const { subtotal, totalTax, total } = calculateTotals();
    const newInvoiceId = `INV2025${String(bills.length + 1).padStart(3, '0')}`;
    const newBill = {
      id: newInvoiceId,
      invoiceDate: new Date().toISOString().split('T')[0],
      hospitalName: formData.hospitalName,
      hospitalAddress: formData.hospitalAddress,
      gstin: formData.gstin,
      panNumber: formData.panNumber,
      patient: formData.patient,
      insurance: formData.insurance,
      provider: formData.provider,
      treatment: formData.treatment,
      services: formData.services.map(service => ({ ...service, amount: service.quantity * service.rate })),
      subtotal,
      discount: formData.discount,
      tax: totalTax,
      total,
      amountInWords: numberToWords(Math.floor(total)) + ' Pesos Only',
      payment: { ...formData.payment, date: new Date().toISOString().split('T')[0], receiptNumber: `RCP2025${String(bills.length + 1).padStart(3, '0')}`, balanceDue: total - formData.payment.advancePaid },
      status: total - formData.payment.advancePaid <= 0 ? 'Paid' : 'Pending'
    };
    setBills(prev => [...prev, newBill]);
    setIsAddDialogOpen(false);
    setFormData({
      hospitalName: 'MediPaws Veterinary Clinic',
      hospitalAddress: '123 Pet Care Avenue, Anytown, Philippines 10001',
      gstin: '27AABCU9603R1ZM',
      panNumber: 'AABCU9603R',
      patient: { fullName: '', owner: '', age: '', dateOfBirth: '', gender: '', contactNumber: '', email: '', address: '', aadhaarNumber: '' },
      insurance: { companyName: '', policyNumber: '', claimId: '', tpaName: '', coverageDetails: '' },
      provider: { doctorName: '', registrationNumber: '', department: '', hospitalName: 'MediPaws Veterinary Clinic', branch: 'Main Branch' },
      treatment: { admissionDate: '', dischargeDate: '', diagnosis: '', referralDoctor: '' },
      services: [{ description: '', hsnCode: '9993', quantity: 1, rate: 0, taxRate: 0 }],
      discount: 0,
      payment: { mode: '', advancePaid: 0 }
    });
  };

  const handleView = (bill: any) => {
    setSelectedBill(bill);
    setIsViewDialogOpen(true);
  };

  const generatePDF = (bill: any) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>MediPaws Invoice ${bill.id}</title>
          <style>
            * { margin:0; padding:0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; font-size: 12px; }
            .invoice-container { max-width: 210mm; margin:0 auto; padding: 20px; background: white; }
            .header { text-align: center; border-bottom: 3px solid #2094e6; padding-bottom: 20px; margin-bottom: 25px; }
            .hospital-name { font-size: 24px; font-weight: bold; color: #2094e6; margin-bottom: 5px; }
            .invoice-title { font-size: 18px; font-weight: bold; color: #1f2937; margin: 10px 0; }
            .invoice-number { font-size: 14px; color: #6b7280; }
            .section { margin-bottom: 20px; }
            .section-title { background: #f3f4f6; padding: 8px 12px; font-weight: bold; border-left: 4px solid #2094e6; margin-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-box { padding: 15px; border: 1px solid #e5e7eb; border-radius: 5px; }
            .info-row { margin-bottom: 8px; }
            .info-label { font-weight: bold; display: inline-block; width: 120px; }
            .services-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .services-table th { background: #2094e6; color: white; padding: 12px 8px; text-align: left; font-weight: bold; }
            .services-table td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; }
            .services-table tr:nth-child(even) { background: #f9fafb; }
            .amount-section { float: right; width: 300px; margin-top: 20px; }
            .amount-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
            .total-row { font-weight: bold; font-size: 16px; background: #f3f4f6; padding: 10px; border: 2px solid #2094e6; }
            .amount-words { clear: both; margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; font-style: italic; }
            .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .signature-box { text-align: center; padding-top: 40px; border-top: 1px solid #000; }
            .terms { margin-top: 30px; font-size: 10px; color: #6b7280; }
            @media print { body { print-color-adjust: exact; } .invoice-container { margin:0; padding: 15px; } }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="hospital-name">${bill.hospitalName}</div>
              <div style="color: #6b7280; margin-bottom: 15px;">${bill.hospitalAddress}</div>
              <div style="font-size: 12px; color: #6b7280;">
                GSTIN: ${bill.gstin} | PAN: ${bill.panNumber}
              </div>
              <div class="invoice-title">VETERINARY INVOICE</div>
              <div class="invoice-number">Invoice No: ${bill.id} | Date: ${bill.invoiceDate}</div>
            </div>
            <div class="info-grid">
              <div class="info-box">
                <div class="section-title">Pet & Owner Information</div>
                <div class="info-row"><span class="info-label">Pet:</span> ${bill.patient.fullName}</div>
                <div class="info-row"><span class="info-label">Owner:</span> ${bill.patient.owner}</div>
                <div class="info-row"><span class="info-label">Age:</span> ${bill.patient.age} | <span class="info-label">Gender:</span> ${bill.patient.gender}</div>
                <div class="info-row"><span class="info-label">DOB:</span> ${bill.patient.dateOfBirth}</div>
                <div class="info-row"><span class="info-label">Contact:</span> ${bill.patient.contactNumber}</div>
                <div class="info-row"><span class="info-label">Email:</span> ${bill.patient.email}</div>
                <div class="info-row"><span class="info-label">Address:</span> ${bill.patient.address}</div>
              </div>
              <div class="info-box">
                <div class="section-title">Insurance Information</div>
                <div class="info-row"><span class="info-label">Company:</span> ${bill.insurance.companyName}</div>
                <div class="info-row"><span class="info-label">Policy No:</span> ${bill.insurance.policyNumber}</div>
                <div class="info-row"><span class="info-label">Claim ID:</span> ${bill.insurance.claimId}</div>
                <div class="info-row"><span class="info-label">TPA:</span> ${bill.insurance.tpaName}</div>
                <div class="info-row"><span class="info-label">Coverage:</span> ${bill.insurance.coverageDetails}</div>
              </div>
            </div>
            <div class="info-grid">
              <div class="info-box">
                <div class="section-title">Veterinarian Information</div>
                <div class="info-row"><span class="info-label">Doctor:</span> ${bill.provider.doctorName}</div>
                <div class="info-row"><span class="info-label">Reg. No:</span> ${bill.provider.registrationNumber}</div>
                <div class="info-row"><span class="info-label">Dept:</span> ${bill.provider.department}</div>
                <div class="info-row"><span class="info-label">Branch:</span> ${bill.provider.branch}</div>
              </div>
              <div class="info-box">
                <div class="section-title">Treatment Information</div>
                ${bill.treatment.admissionDate ? `<div class="info-row"><span class="info-label">Admission:</span> ${bill.treatment.admissionDate}</div>` : ''}
                ${bill.treatment.dischargeDate ? `<div class="info-row"><span class="info-label">Discharge:</span> ${bill.treatment.dischargeDate}</div>` : ''}
                <div class="info-row"><span class="info-label">Diagnosis:</span> ${bill.treatment.diagnosis}</div>
                ${bill.treatment.referralDoctor ? `<div class="info-row"><span class="info-label">Referred by:</span> ${bill.treatment.referralDoctor}</div>` : ''}
              </div>
            </div>
            <div class="section">
              <div class="section-title">Services & Charges</div>
              <table class="services-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>HSN</th>
                    <th>Qty</th>
                    <th>Rate (₱)</th>
                    <th>Tax %</th>
                    <th>Amount (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  ${bill.services.map((service: any) => `
                    <tr>
                      <td>${service.description}</td>
                      <td>${service.hsnCode}</td>
                      <td>${service.quantity}</td>
                      <td>₱${service.rate.toFixed(2)}</td>
                      <td>${service.taxRate}%</td>
                      <td>₱${service.amount.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="amount-section">
              <div class="amount-row"><span>Subtotal:</span><span>₱${bill.subtotal.toFixed(2)}</span></div>
              ${bill.discount > 0 ? `<div class="amount-row"><span>Discount:</span><span>-₱${bill.discount.toFixed(2)}</span></div>` : ''}
              ${bill.tax > 0 ? `<div class="amount-row"><span>Tax (GST):</span><span>₱${bill.tax.toFixed(2)}</span></div>` : ''}
              <div class="amount-row total-row"><span>Total Amount:</span><span>₱${bill.total.toFixed(2)}</span></div>
            </div>
            <div class="amount-words"><strong>Amount in Words:</strong> ${bill.amountInWords}</div>
            <div style="clear: both; margin-top: 30px;">
              <div class="section-title">Payment Details</div>
              <div class="info-grid">
                <div>
                  <div class="info-row"><span class="info-label">Payment Mode:</span> ${bill.payment.mode}</div>
                  <div class="info-row"><span class="info-label">Payment Date:</span> ${bill.payment.date}</div>
                  <div class="info-row"><span class="info-label">Receipt No:</span> ${bill.payment.receiptNumber}</div>
                </div>
                <div>
                  <div class="info-row"><span class="info-label">Amount Paid:</span> ₱${bill.payment.advancePaid.toFixed(2)}</div>
                  <div class="info-row"><span class="info-label">Balance Due:</span> ₱${bill.payment.balanceDue.toFixed(2)}</div>
                  <div class="info-row"><span class="info-label">Status:</span> <strong>${bill.status}</strong></div>
                </div>
              </div>
            </div>
            <div class="footer">
              <div class="signature-box">Pet Owner / Authorized Person<br>Signature & Date</div>
              <div class="signature-box">MediPaws Seal & Authorized Signature<br>${bill.provider.doctorName}</div>
            </div>
            <div class="terms">
              <strong>Terms & Conditions:</strong><br>
              1. This is a computer-generated invoice and does not require physical signature.<br>
              2. All payments are subject to realization.<br>
              3. Any discrepancy should be reported within 7 days.<br>
              4. This invoice is valid for insurance claim purposes.
            </div>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 250);
    }
  };

  const { subtotal, totalTax, total } = calculateTotals();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medical Billing & Invoicing</h1>
        <p className="text-gray-600 mt-1">Comprehensive veterinary billing system.</p>
      </div>

      <div className="bg-white rounded-lg p-6 shadow">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Veterinary Invoices</span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create New Veterinary Invoice</DialogTitle></DialogHeader>
              <div className="space-y-6">
                {/* Hospital Information */}
                <Card>
                  <CardHeader><CardTitle>Clinic Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Clinic Name *</Label>
                      <Input value={formData.hospitalName} onChange={(e) => setFormData(prev => ({...prev, hospitalName: e.target.value}))} required />
                    </div>
                    <div>
                      <Label>VAT/Tax ID</Label>
                      <Input value={formData.gstin} onChange={(e) => setFormData(prev => ({...prev, gstin: e.target.value}))} />
                    </div>
                    <div className="col-span-2">
                      <Label>Clinic Address *</Label>
                      <Textarea value={formData.hospitalAddress} onChange={(e) => setFormData(prev => ({...prev, hospitalAddress: e.target.value}))} required />
                    </div>
                    <div>
                      <Label>PAN Number</Label>
                      <Input value={formData.panNumber} onChange={(e) => setFormData(prev => ({...prev, panNumber: e.target.value}))} />
                    </div>
                  </CardContent>
                </Card>

                {/* Patient Information */}
                <Card>
                  <CardHeader><CardTitle>Pet & Owner Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Pet Name *</Label>
                      <Input value={formData.patient.fullName} onChange={(e) => updatePatient('fullName', e.target.value)} required />
                    </div>
                    <div>
                      <Label>Owner Name *</Label>
                      <Input value={formData.patient.owner} onChange={(e) => updatePatient('owner', e.target.value)} required />
                    </div>
                    <div>
                      <Label>Age</Label>
                      <Input type="number" value={formData.patient.age} onChange={(e) => updatePatient('age', e.target.value)} />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input type="date" value={formData.patient.dateOfBirth} onChange={(e) => updatePatient('dateOfBirth', e.target.value)} />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <Select value={formData.patient.gender} onValueChange={(value) => updatePatient('gender', value)}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Contact Number *</Label>
                      <Input value={formData.patient.contactNumber} onChange={(e) => updatePatient('contactNumber', e.target.value)} required />
                    </div>
                    <div>
                      <Label>Email ID</Label>
                      <Input type="email" value={formData.patient.email} onChange={(e) => updatePatient('email', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label>Address *</Label>
                      <Textarea value={formData.patient.address} onChange={(e) => updatePatient('address', e.target.value)} required />
                    </div>
                  </CardContent>
                </Card>

                {/* Insurance Information */}
                <Card>
                  <CardHeader><CardTitle>Insurance Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Insurance Company</Label>
                      <Select value={formData.insurance.companyName} onValueChange={(value) => updateInsurance('companyName', value)}>
                        <SelectTrigger><SelectValue placeholder="Select insurance" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PetFirst Insurance">PetFirst Insurance</SelectItem>
                          <SelectItem value="Trupanion">Trupanion</SelectItem>
                          <SelectItem value="Nationwide Pet">Nationwide Pet</SelectItem>
                          <SelectItem value="Healthy Paws">Healthy Paws</SelectItem>
                          <SelectItem value="Self-Pay">Self-Pay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Policy Number</Label>
                      <Input value={formData.insurance.policyNumber} onChange={(e) => updateInsurance('policyNumber', e.target.value)} />
                    </div>
                    <div>
                      <Label>Claim ID</Label>
                      <Input value={formData.insurance.claimId} onChange={(e) => updateInsurance('claimId', e.target.value)} />
                    </div>
                    <div>
                      <Label>TPA Name</Label>
                      <Input value={formData.insurance.tpaName} onChange={(e) => updateInsurance('tpaName', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label>Coverage Details</Label>
                      <Input value={formData.insurance.coverageDetails} onChange={(e) => updateInsurance('coverageDetails', e.target.value)} placeholder="e.g., Pet Care Floater - ₱5,000" />
                    </div>
                  </CardContent>
                </Card>

                {/* Provider Information */}
                <Card>
                  <CardHeader><CardTitle>Veterinarian Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Doctor's Name *</Label>
                      <Input value={formData.provider.doctorName} onChange={(e) => updateProvider('doctorName', e.target.value)} required />
                    </div>
                    <div>
                      <Label>Registration Number</Label>
                      <Input value={formData.provider.registrationNumber} onChange={(e) => updateProvider('registrationNumber', e.target.value)} />
                    </div>
                    <div>
                      <Label>Department/Specialty</Label>
                      <Input value={formData.provider.department} onChange={(e) => updateProvider('department', e.target.value)} />
                    </div>
                  </CardContent>
                </Card>

                {/* Treatment Information */}
                <Card>
                  <CardHeader><CardTitle>Treatment Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Visit Date</Label>
                      <Input type="date" value={formData.treatment.admissionDate} onChange={(e) => updateTreatment('admissionDate', e.target.value)} />
                    </div>
                    <div>
                      <Label>Diagnosis/Reason *</Label>
                      <Textarea value={formData.treatment.diagnosis} onChange={(e) => updateTreatment('diagnosis', e.target.value)} required />
                    </div>
                    <div>
                      <Label>Referral Doctor</Label>
                      <Input value={formData.treatment.referralDoctor} onChange={(e) => updateTreatment('referralDoctor', e.target.value)} />
                    </div>
                  </CardContent>
                </Card>

                {/* Services */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      Services & Procedures
                      <Button type="button" onClick={addService} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" /> Add Service
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formData.services.map((service, index) => (
                      <div key={index} className="grid grid-cols-6 gap-4 mb-4 p-4 border rounded">
                        <div>
                          <Label>Description *</Label>
                          <Input value={service.description} onChange={(e) => updateService(index, 'description', e.target.value)} placeholder="e.g., Consultation" required />
                        </div>
                        <div>
                          <Label>Code</Label>
                          <Input value={service.hsnCode} onChange={(e) => updateService(index, 'hsnCode', e.target.value)} />
                        </div>
                        <div>
                          <Label>Qty</Label>
                          <Input type="number" min="1" value={service.quantity} onChange={(e) => updateService(index, 'quantity', parseInt(e.target.value) || 1)} />
                        </div>
                        <div>
                          <Label>Rate (₱)</Label>
                          <Input type="number" min="0" step="0.01" value={service.rate} onChange={(e) => updateService(index, 'rate', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label>Tax Rate (%)</Label>
                          <Select value={service.taxRate.toString()} onValueChange={(value) => updateService(index, 'taxRate', parseFloat(value))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0% (Exempt)</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          {formData.services.length > 1 && (
                            <Button type="button" onClick={() => removeService(index)} size="sm" variant="destructive">
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-gray-50 rounded">
                      <div><Label>Subtotal: ₱{subtotal.toFixed(2)}</Label></div>
                      <div><Label>Tax: ₱{totalTax.toFixed(2)}</Label></div>
                      <div>
                        <Label>Discount (₱)</Label>
                        <Input type="number" min="0" step="0.01" value={formData.discount} onChange={(e) => setFormData(prev => ({...prev, discount: parseFloat(e.target.value) || 0}))} />
                      </div>
                    </div>
                    <div className="text-right text-xl font-bold mt-4 p-4 bg-blue-50 rounded">
                      Total Amount: ₱{total.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Information */}
                <Card>
                  <CardHeader><CardTitle>Payment Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Payment Mode *</Label>
                      <Select value={formData.payment.mode} onValueChange={(value) => updatePayment('mode', value)}>
                        <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Debit Card">Debit Card</SelectItem>
                          <SelectItem value="Insurance">Insurance</SelectItem>
                          <SelectItem value="Check">Check</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount Paid (₱)</Label>
                      <Input type="number" min="0" step="0.01" value={formData.payment.advancePaid} onChange={(e) => updatePayment('advancePaid', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2">
                      <div className="p-3 bg-yellow-50 rounded">
                        <div className="text-sm"><strong>Balance Due: ₱{(total - formData.payment.advancePaid).toFixed(2)}</strong></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">Create Invoice</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="py-3 px-4 font-semibold">Invoice ID</th>
                <th className="py-3 px-4 font-semibold">Pet / Owner</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Insurance</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono">{bill.id}</td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{bill.patient.fullName}</p>
                      <p className="text-sm text-gray-600">{bill.patient.owner}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold">₱{bill.total.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <Badge variant={bill.status === "Paid" ? "default" : "secondary"}>{bill.status}</Badge>
                  </td>
                  <td className="py-3 px-4">{bill.insurance.companyName}</td>
                  <td className="py-3 px-4">{bill.invoiceDate}</td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleView(bill)}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button size="sm" onClick={() => generatePDF(bill)} className="bg-green-600 hover:bg-green-700">
                        <FileText className="w-4 h-4 mr-1" /> PDF
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View Invoice Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Invoice Details - {selectedBill?.id}</DialogTitle></DialogHeader>
            {selectedBill && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle>Pet & Owner Information</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p><strong>Pet:</strong> {selectedBill.patient.fullName}</p>
                        <p><strong>Owner:</strong> {selectedBill.patient.owner}</p>
                        <p><strong>Age:</strong> {selectedBill.patient.age} | <strong>Gender:</strong> {selectedBill.patient.gender}</p>
                        <p><strong>Contact:</strong> {selectedBill.patient.contactNumber}</p>
                        <p><strong>Email:</strong> {selectedBill.patient.email}</p>
                        <p><strong>Address:</strong> {selectedBill.patient.address}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Invoice Information</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p><strong>Invoice ID:</strong> {selectedBill.id}</p>
                        <p><strong>Date:</strong> {selectedBill.invoiceDate}</p>
                        <p><strong>Status:</strong> <Badge variant={selectedBill.status === "Paid" ? "default" : "secondary"}>{selectedBill.status}</Badge></p>
                        <p><strong>Clinic:</strong> {selectedBill.hospitalName}</p>
                        <p><strong>VAT ID:</strong> {selectedBill.gstin}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader><CardTitle>Services & Charges</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Description</th>
                            <th className="text-left py-2">Code</th>
                            <th className="text-left py-2">Qty</th>
                            <th className="text-left py-2">Rate</th>
                            <th className="text-left py-2">Tax%</th>
                            <th className="text-left py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBill.services?.map((service: any, index: number) => (
                            <tr key={index} className="border-b">
                              <td className="py-2">{service.description}</td>
                              <td className="py-2">{service.hsnCode}</td>
                              <td className="py-2">{service.quantity}</td>
                              <td className="py-2">₱{service.rate}</td>
                              <td className="py-2">{service.taxRate}%</td>
                              <td className="py-2">₱{service.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 space-y-2 text-right">
                      <div>Subtotal: ₱{selectedBill.subtotal.toFixed(2)}</div>
                      {selectedBill.discount > 0 && <div>Discount: -₱{selectedBill.discount.toFixed(2)}</div>}
                      {selectedBill.tax > 0 && <div>Tax: ₱{selectedBill.tax.toFixed(2)}</div>}
                      <div className="font-bold text-lg border-t pt-2">Total: ₱{selectedBill.total.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">{selectedBill.amountInWords}</div>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex justify-end space-x-2">
                  <Button onClick={() => generatePDF(selectedBill)} variant="outline" className="bg-green-50 hover:bg-green-100">
                    <FileText className="w-4 h-4 mr-2" /> Download PDF
                  </Button>
                  <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
