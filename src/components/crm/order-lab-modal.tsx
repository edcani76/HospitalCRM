import React, { useState, useEffect, useMemo } from 'react';
import { FlaskConical, Loader2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription
} from '../ui/drawer';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import { collection, addDoc, serverTimestamp, db, auth, doc, getDocs, query, where, updateDoc } from '../../firebase';
import { addAuditLog, createLabOrder, appendPetMedicalHistory, fetchInvoicesByEncounter, fetchInvoiceItems } from '../../lib/firestore-helpers';

interface OrderLabModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounter: any;
  patient: any;
  owner: any;
  doctorName: string;
  serviceCatalog: any[];
  onCreated: () => void;
}

const defaultForm = {
  testName: '',
  testCode: '',
  testCategory: 'Laboratory' as 'Laboratory' | 'Imaging' | 'External Lab',
  reason: '',
  priority: 'Routine' as 'Routine' | 'Urgent' | 'STAT',
  sampleType: 'none' as 'Blood' | 'Urine' | 'Fecal' | 'Swab' | 'none',
  expectedDate: '',
  externalLab: false,
  notes: '',
  billingBehavior: 'queue' as 'queue' | 'create-invoice-line',
  ownerConsent: 'none' as 'pending' | 'signed' | 'waived' | 'none',
};

export function OrderLabModal({ open, onOpenChange, encounter, patient, owner, doctorName, serviceCatalog, onCreated }: OrderLabModalProps) {
  const [form, setForm] = useState({ ...defaultForm });
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [customTest, setCustomTest] = useState(false);
  const [saving, setSaving] = useState(false);

  const labTests = useMemo(() =>
    serviceCatalog.filter((s: any) =>
      s.category === 'lab' || s.category === 'diagnostic'
    ), [serviceCatalog]);

  const catalogTestCategories: Record<string, 'Laboratory' | 'Imaging'> = {
    lab: 'Laboratory',
    diagnostic: 'Imaging',
  };

  useEffect(() => {
    if (!open) {
      setForm({ ...defaultForm });
      setSelectedCatalogId('');
      setCustomTest(false);
    }
  }, [open]);

  const handleCatalogSelect = (value: string) => {
    setSelectedCatalogId(value);
    setCustomTest(false);
    if (value === '__custom__') {
      setCustomTest(true);
      setForm(f => ({ ...f, testName: '', testCode: '' }));
      return;
    }
    const item = serviceCatalog.find((s: any) => s.id === value);
    if (item) {
      setForm(f => ({
        ...f,
        testName: item.name,
        testCode: item.code,
        testCategory: catalogTestCategories[item.category] || 'Laboratory',
      }));
    }
  };

  const handleSubmit = async () => {
    if (!form.testName.trim() || !form.reason.trim()) return;
    if (!encounter?.id || !patient?.id) return;
    setSaving(true);
    try {
      const now = serverTimestamp();
      const userName = auth.currentUser?.displayName || doctorName || 'Unknown';
      const uid = auth.currentUser?.uid || encounter.assignedDoctorId || '';

      const labOrderResult = await createLabOrder({
        encounterId: encounter.id,
        patientId: patient.id,
        petName: patient.name || '',
        ownerName: owner?.displayName || owner?.name || owner?.email || '',
        ownerId: owner?.uid || encounter.ownerId || '',
        testName: form.testName.trim(),
        testCode: form.testCode,
        testCategory: form.testCategory,
        status: 'ordered',
        reason: form.reason.trim(),
        priority: form.priority,
        sampleType: form.sampleType === 'none' ? null : form.sampleType,
        expectedDate: form.expectedDate || null,
        externalLab: form.externalLab,
        notes: form.notes?.trim() || '',
        billingBehavior: form.billingBehavior,
        ownerConsent: form.ownerConsent === 'none' ? null : form.ownerConsent,
        orderedBy: userName,
        orderedByUid: uid,
      });

      // Always create an appointment service record for billing
      const serviceRef = await addDoc(collection(db, 'appointment_services'), {
        appointmentId: encounter.appointmentId || '',
        encounterId: encounter.id,
        petId: patient.id,
        ownerId: owner?.uid || encounter.ownerId || '',
        serviceName: form.testName.trim(),
        serviceCode: form.testCode || 'LAB-CUSTOM',
        serviceType: 'lab',
        status: form.billingBehavior === 'create-invoice-line' ? 'in-progress' : 'queued',
        source: 'doctor-ordered-lab',
        billable: true,
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        taxRate: 0.12,
        labOrderId: labOrderResult.id,
        performedBy: userName,
        createdBy: userName,
        createdAt: now,
        updatedAt: now,
      });

      // If "create-invoice-line" and an invoice already exists, add the line item immediately
      if (form.billingBehavior === 'create-invoice-line') {
        const existingInvoices = await fetchInvoicesByEncounter(encounter.id);
        if (existingInvoices.length > 0) {
          const inv = existingInvoices[0];
          await addDoc(collection(db, 'invoice_items'), {
            invoiceId: inv.id,
            encounterId: encounter.id,
            appointmentServiceId: serviceRef.id,
            itemType: 'lab',
            description: form.testName.trim(),
            quantity: 1,
            unitPrice: 0,
            discountAmount: 0,
            taxRate: 0.12,
            lineTotal: 0,
            createdAt: serverTimestamp(),
          });
          const allItems = await fetchInvoiceItems(inv.id);
          const newSubTotal = allItems.reduce((s: number, i: any) => s + (i.lineTotal || 0), 0);
          const newTax = allItems.reduce((s: number, i: any) => s + ((i.lineTotal || 0) * (i.taxRate || 0)), 0);
          const newGrandTotal = newSubTotal + newTax;
          await updateDoc(doc(db, 'invoices', inv.id), {
            subTotal: newSubTotal,
            taxAmount: newTax,
            grandTotal: newGrandTotal,
            balanceDue: newGrandTotal - (inv.amountPaid || 0),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await addAuditLog({
        action: 'lab_ordered',
        userId: uid,
        userName,
        encounterId: encounter.id,
        patientId: patient.id,
        details: `${form.testName} (${form.priority}) - ${form.reason}`
      });

      await appendPetMedicalHistory(patient.id, `Lab ordered: ${form.testName} (${form.priority}) - ${form.reason}`);

      onCreated();
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating lab order:', err);
      alert('Error creating lab order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = form.testName.trim() && form.reason.trim();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="w-5 h-5 text-purple-600" />
            Order Lab / Diagnostic
          </DrawerTitle>
          <DrawerDescription>
            Create a new laboratory order or diagnostic imaging request
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-5 py-2">
          {/* Pre-filled Info */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs">
            <div><span className="font-medium text-stone-500">Pet:</span> <span className="text-stone-800">{patient?.name || '—'}</span></div>
            <div><span className="font-medium text-stone-500">Owner:</span> <span className="text-stone-800">{owner?.displayName || owner?.name || owner?.email || '—'}</span></div>
            <div><span className="font-medium text-stone-500">Encounter:</span> <span className="text-stone-800">#{encounter?.id?.slice(-8) || '—'}</span></div>
            <div><span className="font-medium text-stone-500">Ordered by:</span> <span className="text-stone-800">{auth.currentUser?.displayName || doctorName || '—'}</span></div>
          </div>

          {/* Test Selector */}
          <div>
            <Label>Test / Diagnostic Package</Label>
            <Select value={selectedCatalogId} onValueChange={handleCatalogSelect}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a test from catalog..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">Other (manual entry)</SelectItem>
                {labTests.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.code}) — ₱{t.defaultPrice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {customTest && (
            <div>
              <Label>Test Name (manual entry)</Label>
              <Input value={form.testName} onChange={e => setForm(f => ({ ...f, testName: e.target.value }))} className="mt-1" placeholder="e.g., External Lab - Fecal PCR Panel" />
            </div>
          )}

          {/* Test Category */}
          <div>
            <Label>Test Category <span className="text-red-500">*</span></Label>
            <Select value={form.testCategory} onValueChange={v => setForm(f => ({ ...f, testCategory: v as any }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Laboratory">Laboratory</SelectItem>
                <SelectItem value="Imaging">Imaging</SelectItem>
                <SelectItem value="External Lab">External Lab</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div>
            <Label>Reason <span className="text-red-500">*</span></Label>
            <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="mt-1" placeholder="e.g., Persistent vomiting, rule out infection" />
          </div>

          {/* Priority + Sample Type row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority <span className="text-red-500">*</span></Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Routine">Routine</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="STAT">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.testCategory !== 'Imaging' && (
              <div>
                <Label>Sample Type</Label>
                <Select value={form.sampleType} onValueChange={v => setForm(f => ({ ...f, sampleType: v as any }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">N/A</SelectItem>
                    <SelectItem value="Blood">Blood</SelectItem>
                    <SelectItem value="Urine">Urine</SelectItem>
                    <SelectItem value="Fecal">Fecal</SelectItem>
                    <SelectItem value="Swab">Swab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Expected Date + External Lab row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Expected Date</Label>
              <Input type="date" value={form.expectedDate} onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>External Lab</Label>
              <Select value={form.externalLab ? 'yes' : 'no'} onValueChange={v => setForm(f => ({ ...f, externalLab: v === 'yes' }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No (in-house)</SelectItem>
                  <SelectItem value="yes">Yes (send out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Billing Behavior + Owner Consent */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Billing Behavior</Label>
              <Select value={form.billingBehavior} onValueChange={v => setForm(f => ({ ...f, billingBehavior: v as any }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="queue">Queue (add at checkout)</SelectItem>
                  <SelectItem value="create-invoice-line">Create Invoice Line</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner Consent</Label>
              <Select value={form.ownerConsent} onValueChange={v => setForm(f => ({ ...f, ownerConsent: v as any }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Not required" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not required</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="waived">Waived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} placeholder="Additional instructions or clinical context..." />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving} className="bg-purple-600 hover:bg-purple-700 text-white">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Creating...</> : 'Create Lab Order'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
