import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../../components/ui/drawer';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { db, auth, collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, serverTimestamp } from '../../firebase';
import { addAuditLog } from '../../lib/firestore-helpers';
import { format } from 'date-fns';
import { 
  Plus, Search, Calendar, Clock, User, Heart, 
  Activity, Pill, FileText, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Loader2, Bed, Thermometer, Droplet, Wind, Scale,
  Trash2, LogOut, Eye, ArrowLeftRight, ClipboardList, Wallet, DollarSign, History
} from 'lucide-react';
import { SearchBar } from '../../components/ui/search-bar';
import { Admission, Pet, Doctor } from '../../types';

// Cages Master Dictionary
interface Cage {
  id: string;
  name: string;
  wardId: string;
  wardName: string;
  type: 'general' | 'icu' | 'isolation';
  rate: number;
}

const DEFAULT_CAGES: Cage[] = [
  // Ward A
  { id: 'cage-a1', name: 'Cage A1', wardId: 'ward-a', wardName: 'General Ward A', type: 'general', rate: 800 },
  { id: 'cage-a2', name: 'Cage A2', wardId: 'ward-a', wardName: 'General Ward A', type: 'general', rate: 800 },
  { id: 'cage-a3', name: 'Cage A3', wardId: 'ward-a', wardName: 'General Ward A', type: 'general', rate: 800 },
  { id: 'cage-a4', name: 'Cage A4', wardId: 'ward-a', wardName: 'General Ward A', type: 'general', rate: 800 },
  { id: 'cage-a5', name: 'Cage A5', wardId: 'ward-a', wardName: 'General Ward A', type: 'general', rate: 800 },
  
  // Ward B
  { id: 'cage-b1', name: 'Cage B1', wardId: 'ward-b', wardName: 'General Ward B', type: 'general', rate: 800 },
  { id: 'cage-b2', name: 'Cage B2', wardId: 'ward-b', wardName: 'General Ward B', type: 'general', rate: 800 },
  { id: 'cage-b3', name: 'Cage B3', wardId: 'ward-b', wardName: 'General Ward B', type: 'general', rate: 800 },
  { id: 'cage-b4', name: 'Cage B4', wardId: 'ward-b', wardName: 'General Ward B', type: 'general', rate: 800 },
  { id: 'cage-b5', name: 'Cage B5', wardId: 'ward-b', wardName: 'General Ward B', type: 'general', rate: 800 },
  
  // ICU Ward
  { id: 'cage-icu1', name: 'ICU Cage 1', wardId: 'ward-icu', wardName: 'ICU / Recovery', type: 'icu', rate: 1500 },
  { id: 'cage-icu2', name: 'ICU Cage 2', wardId: 'ward-icu', wardName: 'ICU / Recovery', type: 'icu', rate: 1500 },
  { id: 'cage-icu3', name: 'ICU Cage 3', wardId: 'ward-icu', wardName: 'ICU / Recovery', type: 'icu', rate: 1500 },
  
  // Isolation Ward
  { id: 'cage-iso1', name: 'Isolation 1', wardId: 'ward-iso', wardName: 'Isolation Ward', type: 'isolation', rate: 1200 },
  { id: 'cage-iso2', name: 'Isolation 2', wardId: 'ward-iso', wardName: 'Isolation Ward', type: 'isolation', rate: 1200 },
  { id: 'cage-iso3', name: 'Isolation 3', wardId: 'ward-iso', wardName: 'Isolation Ward', type: 'isolation', rate: 1200 },
];

export default function AdmissionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { admissionId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [filteredAdmissions, setFilteredAdmissions] = useState<any[]>([]);
  
  // States for sub-collections
  const [monitoringNotes, setMonitoringNotes] = useState<any[]>([]);
  const [admissionCharges, setAdmissionCharges] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // Lookup states
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Navigation / Filter states
  const [activeTab, setActiveTab] = useState<'queue' | 'active' | 'board' | 'monitoring' | 'charges' | 'discharge' | 'completed' | 'audit'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterVet, setFilterVet] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterIsolation, setFilterIsolation] = useState<string>('all');

  // Interactive draw actions
  const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null);
  
  // Drawer visibility
  const [isAdmitDrawerOpen, setIsAdmitDrawerOpen] = useState(false);
  const [isProcessDrawerOpen, setIsProcessDrawerOpen] = useState(false);
  const [isConsentDrawerOpen, setIsConsentDrawerOpen] = useState(false);
  const [isDepositDrawerOpen, setIsDepositDrawerOpen] = useState(false);
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false);
  const [isMonitoringDrawerOpen, setIsMonitoringDrawerOpen] = useState(false);
  const [isChargesDrawerOpen, setIsChargesDrawerOpen] = useState(false);
  const [isDischargeDrawerOpen, setIsDischargeDrawerOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Admit / Process Form
  const [admitForm, setAdmitForm] = useState({
    petId: '',
    petName: '',
    reason: '',
    admissionType: 'Medical confinement',
    initialDiagnosis: '',
    severity: 'stable',
    isolationRequired: false,
    cageId: '',
    attendingVetId: '',
    monitoringFrequency: 'q4h',
    estimateAmount: '0',
    depositAmount: '0',
    specialInstructions: '',
  });

  // Vitals form
  const [vitalsForm, setVitalsForm] = useState({
    temperature: '',
    weight: '',
    heartRate: '',
    respiratoryRate: '',
    appetite: 'normal',
    waterIntake: 'normal',
    urine: 'normal',
    stool: 'normal',
    vomiting: 'none',
    painScore: 'none',
    mentation: 'alert',
    hydration: 'normal',
    ivFluids: 'none',
    notes: '',
    status: 'completed',
    skipReason: '',
  });

  // Charges Form
  const [chargeForm, setChargeForm] = useState({
    itemName: '',
    chargeType: 'medication',
    quantity: '1',
    unitPrice: '0',
  });

  // Discharge form
  const [dischargeForm, setDischargeForm] = useState({
    summary: '',
    finalDiagnosis: '',
    homeMedications: '',
    dietInstructions: '',
    warningSigns: '',
    followUpDate: '',
    isReceivableApproved: false,
    receivableReason: '',
  });

  // Override/Justification states
  const [overrideReason, setOverrideReason] = useState('');

  // Fetch initial collections
  useEffect(() => {
    async function loadAllData() {
      try {
        setLoading(true);
        const [admSnap, petSnap, docSnap, notesSnap, chargesSnap, logsSnap, invSnap] = await Promise.all([
          getDocs(collection(db, 'admissions')),
          getDocs(collection(db, 'pets')),
          getDocs(collection(db, 'doctors')),
          getDocs(collection(db, 'monitoring_notes')),
          getDocs(collection(db, 'admission_charges')),
          getDocs(collection(db, 'audit_logs')),
          getDocs(collection(db, 'invoices')),
        ]);

        const admData = admSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const petData = petSnap.docs.map(d => ({ id: d.id, ...d.data() } as Pet));
        const docData = docSnap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor));
        const notesData = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const chargesData = chargesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const logsData = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const invData = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setAdmissions(admData);
        setPets(petData);
        setDoctors(docData);
        setMonitoringNotes(notesData);
        setAdmissionCharges(chargesData);
        setAuditLogs(logsData);
        setInvoices(invData);

        // If specific admissionId in URL, locate and set active drawer or view
        if (admissionId) {
          const match = admData.find(a => a.id === admissionId);
          if (match) {
            setSelectedAdmission(match);
            setIsProcessDrawerOpen(true);
          }
        }
      } catch (err) {
        console.error('Error fetching admissions dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, [admissionId]);

  // Main filter engine
  useEffect(() => {
    let list = [...admissions];

    // Filter by tab
    if (activeTab === 'queue') {
      list = list.filter(a => ['recommended', 'Recommended', 'pending_consent', 'Pending Owner Consent', 'pending_deposit', 'Pending Deposit', 'ready_to_admit'].includes(a.status));
    } else if (activeTab === 'active') {
      list = list.filter(a => ['admitted', 'under_monitoring', 'critical', 'For Discharge', 'for_discharge', 'awaiting_billing', 'ready_for_release'].includes(a.status));
    } else if (activeTab === 'discharge') {
      list = list.filter(a => ['For Discharge', 'for_discharge', 'awaiting_billing', 'ready_for_release'].includes(a.status));
    } else if (activeTab === 'completed') {
      list = list.filter(a => ['discharged', 'completed', 'cancelled', 'declined'].includes(a.status));
    }

    // Search query matching
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      list = list.filter(a => 
        (a.petName || '').toLowerCase().includes(q) ||
        (a.ownerName || '').toLowerCase().includes(q) ||
        (a.reason || '').toLowerCase().includes(q) ||
        (a.cageWard || '').toLowerCase().includes(q) ||
        (a.initialDiagnosis || '').toLowerCase().includes(q) ||
        (a.assignedDoctorName || '').toLowerCase().includes(q)
      );
    }

    // Advanced filters
    if (filterType !== 'all') {
      list = list.filter(a => (a.admissionType || '').toLowerCase() === filterType.toLowerCase());
    }
    if (filterVet !== 'all') {
      list = list.filter(a => a.assignedDoctorId === filterVet);
    }
    if (filterSeverity !== 'all') {
      list = list.filter(a => (a.severity || '').toLowerCase() === filterSeverity.toLowerCase());
    }
    if (filterIsolation !== 'all') {
      const isIso = filterIsolation === 'yes';
      list = list.filter(a => !!a.isolationRequired === isIso);
    }

    // Sort order: newest updated first
    list.sort((a, b) => {
      const timeA = a.updatedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
      const timeB = b.updatedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });

    setFilteredAdmissions(list);
  }, [admissions, activeTab, searchTerm, filterType, filterVet, filterSeverity, filterIsolation]);

  const refreshAllData = async () => {
    try {
      const [admSnap, notesSnap, chargesSnap, logsSnap, invSnap] = await Promise.all([
        getDocs(collection(db, 'admissions')),
        getDocs(collection(db, 'monitoring_notes')),
        getDocs(collection(db, 'admission_charges')),
        getDocs(collection(db, 'audit_logs')),
        getDocs(collection(db, 'invoices')),
      ]);
      setAdmissions(admSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMonitoringNotes(notesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAdmissionCharges(chargesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAuditLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setInvoices(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  // Helper: Stay Length Calculations
  const getStayMetrics = (checkIn: any) => {
    if (!checkIn) return { days: 0, hours: 0, text: 'N/A' };
    const date = checkIn.toDate?.() || new Date(checkIn);
    const diffMs = Math.abs(new Date().getTime() - date.getTime());
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    return {
      days,
      hours: remainingHours,
      text: days > 0 ? `${days}d ${remainingHours}h` : `${remainingHours}h`,
      totalHours
    };
  };

  // Helper: dynamic room/cage charge computation
  const getDynamicRoomChargesAmount = (admission: any) => {
    if (!admission.cageId || !admission.checkInDate) return 0;
    const cage = DEFAULT_CAGES.find(c => c.id === admission.cageId);
    if (!cage) return 0;
    const metrics = getStayMetrics(admission.checkInDate);
    const billableDays = Math.max(1, Math.ceil(metrics.totalHours / 24));
    return billableDays * cage.rate;
  };

  // Helper: calculate total running bill
  const getRunningBillTotal = (admission: any) => {
    const dynamicRoomCharge = getDynamicRoomChargesAmount(admission);
    const otherCharges = admissionCharges
      .filter(c => c.admissionId === admission.id && c.billingStatus !== 'voided' && c.billingStatus !== 'waived')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return dynamicRoomCharge + otherCharges;
  };

  // Helper: Get cage vacancy states
  const getCagesWithOccupancy = () => {
    return DEFAULT_CAGES.map(cage => {
      const activeOccupant = admissions.find(a => 
        a.cageId === cage.id && 
        ['admitted', 'under_monitoring', 'critical', 'For Discharge', 'for_discharge', 'awaiting_billing', 'ready_for_release'].includes(a.status)
      );
      return {
        ...cage,
        occupant: activeOccupant,
        status: activeOccupant ? (activeOccupant.severity === 'critical' ? 'occupied-critical' : 'occupied') : 'available'
      };
    });
  };

  // Interactive Operations
  const handleAdmitSubmit = async () => {
    if (!admitForm.petId || !admitForm.reason) {
      alert('Please select a pet and specify admission reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedPet = pets.find(p => p.id === admitForm.petId);
      const ownerDoc = selectedPet?.ownerUid ? await getDoc(doc(db, 'users', selectedPet.ownerUid)) : null;
      const ownerName = ownerDoc?.exists() ? (ownerDoc.data()?.displayName || ownerDoc.data()?.name || 'Unknown') : 'Unknown';

      const admNo = `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newAdmissionObj = {
        admissionNo: admNo,
        petId: admitForm.petId,
        petName: selectedPet?.name || 'Unknown',
        ownerId: selectedPet?.ownerUid || '',
        ownerName,
        admissionType: admitForm.admissionType,
        reason: admitForm.reason,
        initialDiagnosis: admitForm.initialDiagnosis,
        severity: admitForm.severity,
        isolationRequired: admitForm.isolationRequired,
        cageId: admitForm.cageId,
        assignedDoctorId: admitForm.attendingVetId,
        assignedDoctorName: doctors.find(d => d.id === admitForm.attendingVetId)?.name || '',
        monitoringFrequency: admitForm.monitoringFrequency,
        estimateAmount: Number(admitForm.estimateAmount) || 0,
        depositAmount: Number(admitForm.depositAmount) || 0,
        depositStatus: Number(admitForm.depositAmount) > 0 ? 'paid' : 'pending',
        consentStatus: 'signed',
        status: 'admitted',
        checkInDate: serverTimestamp(),
        specialInstructions: admitForm.specialInstructions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || 'system',
      };

      const docRef = await addDoc(collection(db, 'admissions'), newAdmissionObj);

      // Create base cage fee item in admission_charges
      const activeCage = DEFAULT_CAGES.find(c => c.id === admitForm.cageId);
      if (activeCage) {
        await addDoc(collection(db, 'admission_charges'), {
          admissionId: docRef.id,
          chargeType: 'room',
          itemName: `Confinement Room - ${activeCage.name} (${activeCage.wardName})`,
          quantity: 1,
          unitPrice: activeCage.rate,
          amount: activeCage.rate,
          billingStatus: 'queued',
          sourceType: 'cage_rule',
          sourceId: activeCage.id,
          addedBy: auth.currentUser?.uid || 'system',
          addedByName: auth.currentUser?.displayName || 'System',
          createdAt: serverTimestamp(),
        });
      }

      await addAuditLog({
        action: 'patient_admitted',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        details: `Admitted patient ${newAdmissionObj.petName} into ${activeCage?.name || 'N/A'}. Stay No: ${admNo}.`
      });

      alert('Patient successfully admitted!');
      setIsAdmitDrawerOpen(false);
      await refreshAllData();
    } catch (err) {
      console.error('Error admitting patient:', err);
      alert('Failed to admit patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert recommended EMR queues to actual admitted state
  const handleProcessQueueAdmission = async () => {
    if (!selectedAdmission || !admitForm.cageId) {
      alert('Please select a confinement cage/room.');
      return;
    }
    setIsSubmitting(true);
    try {
      const activeCage = DEFAULT_CAGES.find(c => c.id === admitForm.cageId);
      const admNo = selectedAdmission.admissionNo || `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await updateDoc(doc(db, 'admissions', selectedAdmission.id), {
        status: 'admitted',
        admissionNo: admNo,
        cageId: admitForm.cageId,
        assignedDoctorId: admitForm.attendingVetId,
        assignedDoctorName: doctors.find(d => d.id === admitForm.attendingVetId)?.name || '',
        monitoringFrequency: admitForm.monitoringFrequency,
        checkInDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || 'system',
      });

      // Add cage charge
      if (activeCage) {
        await addDoc(collection(db, 'admission_charges'), {
          admissionId: selectedAdmission.id,
          chargeType: 'room',
          itemName: `Confinement Room - ${activeCage.name} (${activeCage.wardName})`,
          quantity: 1,
          unitPrice: activeCage.rate,
          amount: activeCage.rate,
          billingStatus: 'queued',
          sourceType: 'cage_rule',
          sourceId: activeCage.id,
          addedBy: auth.currentUser?.uid || 'system',
          addedByName: auth.currentUser?.displayName || 'System',
          createdAt: serverTimestamp(),
        });
      }

      await addAuditLog({
        action: 'patient_admitted',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        details: `Processed Queue Confinement. Admitted ${selectedAdmission.petName} into ${activeCage?.name || 'N/A'}.`
      });

      alert('Patient successfully admitted!');
      setIsProcessDrawerOpen(false);
      setSelectedAdmission(null);
      await refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to process admission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cage Transfer Process
  const handleCageTransfer = async () => {
    if (!selectedAdmission || !admitForm.cageId || !overrideReason.trim()) {
      alert('Please specify a new cage and provide transfer reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      const oldCage = DEFAULT_CAGES.find(c => c.id === selectedAdmission.cageId);
      const newCage = DEFAULT_CAGES.find(c => c.id === admitForm.cageId);

      await updateDoc(doc(db, 'admissions', selectedAdmission.id), {
        cageId: admitForm.cageId,
        updatedAt: serverTimestamp()
      });

      await addAuditLog({
        action: 'cage_transfer',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        details: `Transferred ${selectedAdmission.petName} from ${oldCage?.name || 'Unassigned'} to ${newCage?.name}. Reason: ${overrideReason}.`
      });

      // Add a charge log for the new cage
      if (newCage) {
        await addDoc(collection(db, 'admission_charges'), {
          admissionId: selectedAdmission.id,
          chargeType: 'room',
          itemName: `Cage Transfer Charge - ${newCage.name} (${newCage.wardName})`,
          quantity: 1,
          unitPrice: newCage.rate,
          amount: newCage.rate,
          billingStatus: 'queued',
          sourceType: 'cage_rule',
          sourceId: newCage.id,
          addedBy: auth.currentUser?.uid || 'system',
          addedByName: auth.currentUser?.displayName || 'System',
          createdAt: serverTimestamp(),
        });
      }

      alert('Patient successfully transferred!');
      setIsTransferDrawerOpen(false);
      setOverrideReason('');
      setSelectedAdmission(null);
      await refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to transfer patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign / Waiver Consent
  const handleSignConsent = async (consentState: 'signed' | 'waived' | 'declined') => {
    if (!selectedAdmission) return;
    if (consentState === 'waived' && !overrideReason.trim()) {
      alert('Override reason is required to waive consent.');
      return;
    }
    try {
      await updateDoc(doc(db, 'admissions', selectedAdmission.id), {
        consentStatus: consentState,
        consentWaiverReason: consentState === 'waived' ? overrideReason : '',
        updatedAt: serverTimestamp(),
      });

      await addAuditLog({
        action: 'admission_consent_signed',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        details: `${consentState === 'signed' ? 'Signed' : 'Waived'} consent for ${selectedAdmission.petName}. ${consentState === 'waived' ? 'Reason: ' + overrideReason : ''}`
      });

      alert('Consent status updated!');
      setIsConsentDrawerOpen(false);
      setOverrideReason('');
      setSelectedAdmission(null);
      await refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to update consent.');
    }
  };

  // Add Vitals Monitoring
  const handleAddVitalsMonitoring = async () => {
    if (!selectedAdmission) return;
    if (vitalsForm.status === 'skipped' && !vitalsForm.skipReason.trim()) {
      alert('Please provide a skip reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      const vitalData = {
        admissionId: selectedAdmission.id,
        scheduledAt: serverTimestamp(),
        recordedAt: serverTimestamp(),
        temperature: Number(vitalsForm.temperature) || null,
        weight: Number(vitalsForm.weight) || null,
        heartRate: Number(vitalsForm.heartRate) || null,
        respiratoryRate: Number(vitalsForm.respiratoryRate) || null,
        appetite: vitalsForm.appetite,
        waterIntake: vitalsForm.waterIntake,
        urine: vitalsForm.urine,
        stool: vitalsForm.stool,
        vomiting: vitalsForm.vomiting,
        painScore: vitalsForm.painScore,
        mentation: vitalsForm.mentation,
        hydration: vitalsForm.hydration,
        ivFluids: vitalsForm.ivFluids,
        notes: vitalsForm.notes,
        recordedBy: auth.currentUser?.uid || 'system',
        recordedByName: auth.currentUser?.displayName || 'Staff',
        status: vitalsForm.status,
        skipReason: vitalsForm.skipReason,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'monitoring_notes'), vitalData);

      await updateDoc(doc(db, 'admissions', selectedAdmission.id), {
        lastMonitoringTime: serverTimestamp(),
        status: 'under_monitoring',
        updatedAt: serverTimestamp(),
      });

      await addAuditLog({
        action: 'monitoring_recorded',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        details: `Recorded vital checks for ${selectedAdmission.petName}. Status: ${vitalsForm.status}.`
      });

      alert('Monitoring logs saved!');
      setIsMonitoringDrawerOpen(false);
      setSelectedAdmission(null);
      setVitalsForm({
        temperature: '',
        weight: '',
        heartRate: '',
        respiratoryRate: '',
        appetite: 'normal',
        waterIntake: 'normal',
        urine: 'normal',
        stool: 'normal',
        vomiting: 'none',
        painScore: 'none',
        mentation: 'alert',
        hydration: 'normal',
        ivFluids: 'none',
        notes: '',
        status: 'completed',
        skipReason: '',
      });
      await refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to log monitoring check.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Confinement Running Charge
  const handleAddRunningCharge = async () => {
    if (!selectedAdmission || !chargeForm.itemName) {
      alert('Please specify the charge item.');
      return;
    }
    setIsSubmitting(true);
    try {
      const price = Number(chargeForm.unitPrice) || 0;
      const qty = Number(chargeForm.quantity) || 1;
      const totalAmount = price * qty;

      await addDoc(collection(db, 'admission_charges'), {
        admissionId: selectedAdmission.id,
        chargeType: chargeForm.chargeType,
        itemName: chargeForm.itemName,
        quantity: qty,
        unitPrice: price,
        amount: totalAmount,
        billingStatus: 'queued',
        sourceType: 'manual',
        addedBy: auth.currentUser?.uid || 'system',
        addedByName: auth.currentUser?.displayName || 'System',
        createdAt: serverTimestamp(),
      });

      await addAuditLog({
        action: 'charge_added',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        details: `Added ${qty}x ${chargeForm.itemName} (₱${totalAmount}) to running bill of ${selectedAdmission.petName}`
      });

      alert('Charge successfully added!');
      setIsChargesDrawerOpen(false);
      setChargeForm({ itemName: '', chargeType: 'medication', quantity: '1', unitPrice: '0' });
      await refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to add charge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void Confinement Charge
  const handleVoidCharge = async (chargeId: string) => {
    const reason = prompt('Please specify a reason to void this charge:');
    if (!reason || !reason.trim()) {
      alert('A void justification reason is required.');
      return;
    }

    try {
      await updateDoc(doc(db, 'admission_charges', chargeId), {
        billingStatus: 'voided',
        voidReason: reason,
        voidedAt: serverTimestamp(),
      });

      const chgItem = admissionCharges.find(c => c.id === chargeId);

      await addAuditLog({
        action: 'charge_voided',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        details: `Voided charge "${chgItem?.itemName || 'N/A'}" from patient ${selectedAdmission?.petName}. Reason: ${reason}`
      });

      alert('Charge successfully voided.');
      await refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to void charge.');
    }
  };

  // Mark Clinically Cleared for Discharge
  const handleClinicallyClear = async (adm: any) => {
    try {
      await updateDoc(doc(db, 'admissions', adm.id), {
        status: 'For Discharge',
        updatedAt: serverTimestamp(),
      });
      await addAuditLog({
        action: 'admission_updated',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        details: `Attending vet marked ${adm.petName} as clinically cleared for discharge.`
      });
      alert('Attending vet successfully cleared the patient!');
      await refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Final Release Discharge Process
  const handleReleasePatientSubmit = async () => {
    if (!selectedAdmission || !dischargeForm.summary) {
      alert('Please fill out the discharge summary.');
      return;
    }

    // Strict Billing Validation
    const totalDue = getRunningBillTotal(selectedAdmission);
    const relatedInvoice = invoices.find(i => i.petId === selectedAdmission.petId && i.status !== 'paid');
    
    const isUnsettled = relatedInvoice && relatedInvoice.status !== 'paid' && totalDue > 0;
    
    if (isUnsettled && !dischargeForm.isReceivableApproved) {
      alert('Discharge BLOCKED. This patient has outstanding billing charges. You must settle the invoice, or check the formal manager receivable override.');
      return;
    }

    if (dischargeForm.isReceivableApproved && !dischargeForm.receivableReason.trim()) {
      alert('Manager receivable override requires an override justification reason.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Transition admission status
      await updateDoc(doc(db, 'admissions', selectedAdmission.id), {
        status: 'completed',
        actualDischarge: serverTimestamp(),
        finalDiagnosis: dischargeForm.finalDiagnosis,
        billingStatus: isUnsettled ? 'receivable_approved' : 'paid',
        receivableOverrideReason: dischargeForm.isReceivableApproved ? dischargeForm.receivableReason : '',
        updatedAt: serverTimestamp(),
      });

      // Create detailed Discharge Summary
      await addDoc(collection(db, 'discharge_summaries'), {
        admissionId: selectedAdmission.id,
        petId: selectedAdmission.petId,
        petName: selectedAdmission.petName,
        dischargeDate: serverTimestamp(),
        summary: dischargeForm.summary,
        finalDiagnosis: dischargeForm.finalDiagnosis || 'N/A',
        homeMedications: dischargeForm.homeMedications,
        dietInstructions: dischargeForm.dietInstructions,
        warningSigns: dischargeForm.warningSigns,
        followUpDate: dischargeForm.followUpDate,
        signedBy: auth.currentUser?.uid || 'unknown',
        signedByName: auth.currentUser?.displayName || 'Vet',
        createdAt: serverTimestamp(),
      });

      // Set billing invoice lines to paid/completed if voided or settled
      if (relatedInvoice && !isUnsettled) {
        await updateDoc(doc(db, 'invoices', relatedInvoice.id), {
          status: 'paid',
          updatedAt: serverTimestamp()
        });
      }

      await addAuditLog({
        action: 'patient_released',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        details: `Successfully discharged and released patient ${selectedAdmission.petName}. ${dischargeForm.isReceivableApproved ? 'Billing Override Justification: ' + dischargeForm.receivableReason : ''}`
      });

      alert('Patient successfully discharged!');
      setIsDischargeDrawerOpen(false);
      setSelectedAdmission(null);
      setDischargeForm({
        summary: '',
        finalDiagnosis: '',
        homeMedications: '',
        dietInstructions: '',
        warningSigns: '',
        followUpDate: '',
        isReceivableApproved: false,
        receivableReason: '',
      });
      await refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to release patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-4 pb-4 -mt-4 px-4 -mx-4 md:pt-6 md:-mt-6 md:px-6 md:-mx-6 lg:pt-8 lg:-mt-8 lg:px-8 lg:-mx-8 border-b border-gray-200/50 mb-6">
        <PageHeader 
          title="Admissions & Confinement" 
          subtitle="Manage admitted patients, cage assignments, monitoring, running charges, and discharge"
          actions={
            (user?.role === 'admin' || user?.role === 'staff' || user?.role === 'doctor') && (
              <div className="flex gap-2">
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg px-6 h-12 rounded-xl font-bold"
                  onClick={() => {
                    setAdmitForm({
                      petId: '',
                      petName: '',
                      reason: '',
                      admissionType: 'Medical confinement',
                      initialDiagnosis: '',
                      severity: 'stable',
                      isolationRequired: false,
                      cageId: '',
                      attendingVetId: '',
                      monitoringFrequency: 'q4h',
                      estimateAmount: '0',
                      depositAmount: '0',
                      specialInstructions: '',
                    });
                    setIsAdmitDrawerOpen(true);
                  }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Admit Patient
                </Button>
              </div>
            )
          }
        />

        {/* Dashboard KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <Card 
            className={`cursor-pointer transition-all border-l-4 border-l-blue-500 hover:shadow-md ${activeTab === 'active' ? 'bg-blue-50/30' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <CardContent className="p-4 flex flex-col justify-between h-20">
              <span className="text-xs text-gray-500 font-semibold uppercase">Confined</span>
              <span className="text-2xl font-bold text-blue-600">
                {admissions.filter(a => ['admitted', 'under_monitoring', 'critical'].includes(a.status)).length}
              </span>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all border-l-4 border-l-purple-500 hover:shadow-md ${activeTab === 'queue' ? 'bg-purple-50/30' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <CardContent className="p-4 flex flex-col justify-between h-20">
              <span className="text-xs text-gray-500 font-semibold uppercase">Pending Adm</span>
              <span className="text-2xl font-bold text-purple-600">
                {admissions.filter(a => ['recommended', 'Recommended', 'pending_consent', 'Pending Owner Consent', 'pending_deposit', 'Pending Deposit', 'ready_to_admit'].includes(a.status)).length}
              </span>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all border-l-4 border-l-amber-500 hover:shadow-md ${activeTab === 'board' ? 'bg-amber-50/30' : ''}`}
            onClick={() => setActiveTab('board')}
          >
            <CardContent className="p-4 flex flex-col justify-between h-20">
              <span className="text-xs text-gray-500 font-semibold uppercase">Occupancy</span>
              <span className="text-2xl font-bold text-amber-600">
                {Math.round((admissions.filter(a => ['admitted', 'under_monitoring', 'critical', 'For Discharge', 'for_discharge', 'awaiting_billing', 'ready_for_release'].includes(a.status)).length / DEFAULT_CAGES.length) * 100)}%
              </span>
            </CardContent>
          </Card>

          <Card 
            className="border-l-4 border-l-rose-500 hover:shadow-md cursor-pointer"
            onClick={() => {
              setActiveTab('active');
              setFilterSeverity('critical');
            }}
          >
            <CardContent className="p-4 flex flex-col justify-between h-20">
              <span className="text-xs text-gray-500 font-semibold uppercase">Critical Cases</span>
              <span className="text-2xl font-bold text-rose-600">
                {admissions.filter(a => a.severity === 'critical' && ['admitted', 'under_monitoring', 'critical'].includes(a.status)).length}
              </span>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all border-l-4 border-l-green-500 hover:shadow-md ${activeTab === 'discharge' ? 'bg-green-50/30' : ''}`}
            onClick={() => setActiveTab('discharge')}
          >
            <CardContent className="p-4 flex flex-col justify-between h-20">
              <span className="text-xs text-gray-500 font-semibold uppercase">For Discharge</span>
              <span className="text-2xl font-bold text-green-600">
                {admissions.filter(a => ['For Discharge', 'for_discharge', 'awaiting_billing', 'ready_for_release'].includes(a.status)).length}
              </span>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 hover:shadow-md">
            <CardContent className="p-4 flex flex-col justify-between h-20">
              <span className="text-xs text-gray-500 font-semibold uppercase">Active Revenue</span>
              <span className="text-sm font-bold text-emerald-700 truncate">
                ₱{admissions.filter(a => ['admitted', 'under_monitoring', 'critical', 'For Discharge', 'for_discharge', 'awaiting_billing', 'ready_for_release'].includes(a.status))
                  .reduce((sum, item) => sum + getRunningBillTotal(item), 0).toLocaleString()}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Sticky Filters, Search, and Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <SearchBar 
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by pet, owner, cage, diagnosis, vet, reason..."
                color="indigo"
              />
            </div>
            
            {/* Advanced filters line */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white p-2 text-xs"
              >
                <option value="all">All Types</option>
                <option value="medical confinement">Medical</option>
                <option value="surgical admission">Surgical</option>
                <option value="isolation">Isolation</option>
                <option value="icu monitoring">ICU</option>
              </select>

              <select
                value={filterVet}
                onChange={(e) => setFilterVet(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white p-2 text-xs"
              >
                <option value="all">All Vets</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white p-2 text-xs"
              >
                <option value="all">All Severities</option>
                <option value="stable">Stable</option>
                <option value="guarded">Guarded</option>
                <option value="critical">Critical</option>
              </select>

              <select
                value={filterIsolation}
                onChange={(e) => setFilterIsolation(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white p-2 text-xs"
              >
                <option value="all">Isolation?</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>

              {(filterType !== 'all' || filterVet !== 'all' || filterSeverity !== 'all' || filterIsolation !== 'all' || searchTerm) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-red-600 hover:text-red-700"
                  onClick={() => {
                    setFilterType('all');
                    setFilterVet('all');
                    setFilterSeverity('all');
                    setFilterIsolation('all');
                    setSearchTerm('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Styled Segmented Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto pb-px scrollbar-none">
            {[
              { id: 'queue', label: 'Admissions Queue', count: admissions.filter(a => ['recommended', 'Recommended', 'pending_consent', 'Pending Owner Consent', 'pending_deposit', 'Pending Deposit', 'ready_to_admit'].includes(a.status)).length },
              { id: 'active', label: 'Active Confinements', count: admissions.filter(a => ['admitted', 'under_monitoring', 'critical', 'For Discharge', 'for_discharge', 'awaiting_billing', 'ready_for_release'].includes(a.status)).length },
              { id: 'board', label: 'Ward / Cage Board', count: null },
              { id: 'monitoring', label: 'Monitoring Checks', count: null },
              { id: 'charges', label: 'Running Ledger', count: null },
              { id: 'discharge', label: 'Discharge Queue', count: admissions.filter(a => ['For Discharge', 'for_discharge', 'awaiting_billing', 'ready_for_release'].includes(a.status)).length },
              { id: 'completed', label: 'History Archive', count: admissions.filter(a => ['discharged', 'completed', 'cancelled', 'declined'].includes(a.status)).length },
              { id: 'audit', label: 'Inpatient Audit', count: null },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-indigo-500 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workspace Content */}
      <div className="space-y-6">
        
        {/* TABS 1: Admissions Queue */}
        {activeTab === 'queue' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-4">Adm No.</th>
                    <th className="p-4">Pet / Owner</th>
                    <th className="p-4">Type / Reason</th>
                    <th className="p-4">Attending Vet</th>
                    <th className="p-4 text-center">Consent</th>
                    <th className="p-4 text-center">Deposit</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAdmissions.map(adm => (
                    <tr key={adm.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-gray-600">{adm.admissionNo || 'Pending'}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{adm.petName}</div>
                        <div className="text-xs text-gray-500">Owner: {adm.ownerName}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs font-semibold">{adm.admissionType || 'Medical'}</Badge>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-1">{adm.reason}</div>
                      </td>
                      <td className="p-4 text-gray-600">{adm.assignedDoctorName || 'Not Assigned'}</td>
                      <td className="p-4 text-center">
                        <Badge className={
                          adm.consentStatus === 'signed' ? 'bg-green-100 text-green-700' :
                          adm.consentStatus === 'waived' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }>
                          {adm.consentStatus || 'pending'}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Badge className={
                          adm.depositStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }>
                          {adm.depositStatus || 'pending'}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="secondary" className="capitalize">{adm.status}</Badge>
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedAdmission(adm);
                            setIsConsentDrawerOpen(true);
                          }}
                        >
                          Consent
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedAdmission(adm);
                            setIsDepositDrawerOpen(true);
                          }}
                        >
                          Deposit
                        </Button>
                        <Button 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white" 
                          size="sm"
                          onClick={() => {
                            setSelectedAdmission(adm);
                            setAdmitForm(prev => ({
                              ...prev,
                              petId: adm.petId,
                              petName: adm.petName,
                              reason: adm.reason,
                              admissionType: adm.admissionType || 'Medical confinement',
                              initialDiagnosis: adm.initialDiagnosis || '',
                              attendingVetId: adm.assignedDoctorId || '',
                            }));
                            setIsProcessDrawerOpen(true);
                          }}
                        >
                          Admit Patient
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredAdmissions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        No pending admissions in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TABS 2: Active Confinements */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {filteredAdmissions.map(adm => {
              const metrics = getStayMetrics(adm.checkInDate);
              const isCritical = adm.severity === 'critical';
              const isIsolation = !!adm.isolationRequired;
              
              return (
                <Card 
                  key={adm.id} 
                  className={`hover:shadow-md transition-shadow relative overflow-hidden ${
                    isCritical ? 'border-l-4 border-l-red-500 bg-red-50/10' :
                    isIsolation ? 'border-l-4 border-l-purple-500 bg-purple-50/10' : ''
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Patient Info */}
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${
                          isCritical ? 'bg-red-100 text-red-700' :
                          isIsolation ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {adm.petName?.[0] || 'P'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-slate-800">{adm.petName}</h3>
                            {isCritical && <Badge className="bg-red-600 text-white">Critical</Badge>}
                            {isIsolation && <Badge className="bg-purple-600 text-white">Isolation</Badge>}
                            <Badge className="bg-blue-100 text-blue-700 capitalize">{adm.status}</Badge>
                          </div>
                          <p className="text-xs text-gray-500">Owner: {adm.ownerName} &bull; Stay No: <span className="font-mono">{adm.admissionNo || 'N/A'}</span></p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px]">
                              <Bed className="w-3 h-3 mr-1" />
                              {DEFAULT_CAGES.find(c => c.id === adm.cageId)?.name || 'Cage Unassigned'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              <Clock className="w-3 h-3 mr-1" />
                              Monitored {adm.monitoringFrequency}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              <User className="w-3 h-3 mr-1" />
                              Vet: {adm.assignedDoctorName || 'Not Assigned'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Confinement Vitals / Progress Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <div className="text-center shrink-0">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Stayed</p>
                          <p className="text-sm font-bold text-slate-700">{metrics.text}</p>
                        </div>
                        <div className="text-center shrink-0">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Diagnosis</p>
                          <p className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{adm.initialDiagnosis || 'N/A'}</p>
                        </div>
                        <div className="text-center shrink-0">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Running Bill</p>
                          <p className="text-sm font-bold text-emerald-700">₱{getRunningBillTotal(adm).toLocaleString()}</p>
                        </div>
                        <div className="text-center shrink-0">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Last Checked</p>
                          <p className="text-sm font-bold text-slate-700">
                            {adm.lastMonitoringTime ? format(adm.lastMonitoringTime.toDate(), 'hh:mm a') : 'Never'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap lg:flex-col items-stretch justify-end gap-2 whitespace-nowrap">
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedAdmission(adm);
                              setIsMonitoringDrawerOpen(true);
                            }}
                          >
                            <Activity className="w-4 h-4 mr-1 text-indigo-600" />
                            + Check
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedAdmission(adm);
                              setIsTransferDrawerOpen(true);
                            }}
                          >
                            <ArrowLeftRight className="w-4 h-4 mr-1 text-amber-600" />
                            Transfer
                          </Button>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedAdmission(adm);
                              setIsChargesDrawerOpen(true);
                            }}
                          >
                            <Wallet className="w-4 h-4 mr-1 text-emerald-600" />
                            + Charge
                          </Button>

                          {['For Discharge', 'for_discharge'].includes(adm.status) ? (
                            <Button 
                              className="bg-green-600 hover:bg-green-700 text-white flex-1" 
                              size="sm"
                              onClick={() => {
                                setSelectedAdmission(adm);
                                setDischargeForm(prev => ({
                                  ...prev,
                                  finalDiagnosis: adm.initialDiagnosis || '',
                                }));
                                setIsDischargeDrawerOpen(true);
                              }}
                            >
                              <LogOut className="w-4 h-4 mr-1" />
                              Release
                            </Button>
                          ) : (
                            <Button 
                              variant="outline"
                              className="border-green-200 text-green-700 hover:bg-green-50 flex-1" 
                              size="sm"
                              onClick={() => handleClinicallyClear(adm)}
                            >
                              Clear Patient
                            </Button>
                          )}
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredAdmissions.length === 0 && (
              <Card className="p-12 text-center text-gray-400">
                No active inpatient admissions.
              </Card>
            )}
          </div>
        )}

        {/* TABS 3: Ward / Cage Board */}
        {activeTab === 'board' && (
          <div className="space-y-6">
            {['ward-a', 'ward-b', 'ward-icu', 'ward-iso'].map(wId => {
              const wName = wId === 'ward-a' ? 'General Ward A' :
                            wId === 'ward-b' ? 'General Ward B' :
                            wId === 'ward-icu' ? 'ICU / Recovery Ward' : 'Isolation Ward';
              const cagesInWard = getCagesWithOccupancy().filter(c => c.wardId === wId);

              return (
                <div key={wId} className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-600 uppercase tracking-wider">{wName}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {cagesInWard.map(cage => {
                      const occ = cage.occupant;
                      return (
                        <Card 
                          key={cage.id} 
                          className={`transition-all border hover:shadow-md relative overflow-hidden ${
                            cage.status === 'occupied-critical' ? 'border-red-200 bg-red-50/5' :
                            cage.status === 'occupied' ? 'border-indigo-100 bg-indigo-50/5' : 'border-dashed border-gray-200 bg-white'
                          }`}
                        >
                          <CardContent className="p-4 h-36 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-xs text-gray-500 font-mono">{cage.name}</span>
                              <Badge className={
                                cage.status === 'occupied-critical' ? 'bg-red-100 text-red-700' :
                                cage.status === 'occupied' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                              }>
                                {cage.status === 'occupied-critical' ? 'Critical' :
                                 cage.status === 'occupied' ? 'Occupied' : 'Vacant'}
                              </Badge>
                            </div>

                            {occ ? (
                              <div className="my-2">
                                <div className="font-bold text-sm text-slate-800 truncate">{occ.petName}</div>
                                <div className="text-[10px] text-gray-500 truncate">Attending: {occ.assignedDoctorName || 'N/A'}</div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-400 italic">Ready / Vacant</div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px]">
                              <span className="text-gray-400">Rate: ₱{cage.rate}/day</span>
                              {occ && (
                                <button 
                                  onClick={() => {
                                    setSelectedAdmission(occ);
                                    setIsTransferDrawerOpen(true);
                                  }}
                                  className="text-indigo-600 font-bold hover:underline"
                                >
                                  Transfer
                                </button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TABS 4: Monitoring Checks */}
        {activeTab === 'monitoring' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-4">Check Date</th>
                    <th className="p-4">Patient</th>
                    <th className="p-4">Vitals Summary</th>
                    <th className="p-4 text-center">Appetite / Hydration</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4">Attending Staff</th>
                    <th className="p-4">Clinical Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monitoringNotes.map(n => {
                    const matchedAdm = admissions.find(a => a.id === n.admissionId);
                    return (
                      <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-semibold text-xs text-gray-600">
                          {n.recordedAt ? format(n.recordedAt.toDate(), 'MMM dd, hh:mm a') : 'N/A'}
                        </td>
                        <td className="p-4 font-bold text-slate-800">{matchedAdm?.petName || 'Unknown Patient'}</td>
                        <td className="p-4 font-mono text-xs text-gray-600">
                          Temp: {n.temperature ? `${n.temperature}°C` : 'N/A'} &bull; 
                          HR: {n.heartRate ? `${n.heartRate} bpm` : 'N/A'} &bull; 
                          RR: {n.respiratoryRate ? `${n.respiratoryRate} /m` : 'N/A'} &bull; 
                          Weight: {n.weight ? `${n.weight} kg` : 'N/A'}
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-xs text-gray-700 font-medium">App: {n.appetite} &bull; Hyd: {n.hydration}</span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge className={
                            n.status === 'skipped' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }>
                            {n.status || 'completed'}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-600">{n.recordedByName}</td>
                        <td className="p-4 text-xs text-gray-600 max-w-[200px] truncate" title={n.notes}>
                          {n.status === 'skipped' ? `SKIPPED: ${n.skipReason}` : n.notes || 'No observations recorded.'}
                        </td>
                      </tr>
                    );
                  })}
                  {monitoringNotes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        No vitals check-ins documented yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TABS 5: Running Charges Ledger */}
        {activeTab === 'charges' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-4">Charge Date</th>
                    <th className="p-4">Patient</th>
                    <th className="p-4">Item Name / Category</th>
                    <th className="p-4 text-right">Qty</th>
                    <th className="p-4 text-right">Rate</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4">Added By</th>
                    <th className="p-4 text-center">Billing State</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Dynamic dynamicRoomCharges logs rendered along with manual logs */}
                  {admissions.filter(a => ['admitted', 'under_monitoring', 'critical', 'For Discharge', 'for_discharge', 'awaiting_billing', 'ready_for_release'].includes(a.status)).map(adm => {
                    const dynamicRoomCharge = getDynamicRoomChargesAmount(adm);
                    const cage = DEFAULT_CAGES.find(c => c.id === adm.cageId);
                    const stay = getStayMetrics(adm.checkInDate);
                    const billableDays = Math.max(1, Math.ceil(stay.totalHours / 24));
                    
                    if (dynamicRoomCharge <= 0) return null;

                    return (
                      <tr key={`dyn-room-${adm.id}`} className="bg-emerald-50/20 font-medium">
                        <td className="p-4 text-xs text-emerald-800">Dynamic (Live)</td>
                        <td className="p-4 text-emerald-950 font-bold">{adm.petName}</td>
                        <td className="p-4 text-emerald-900">
                          <div>Confinement Daily Room - {cage?.name}</div>
                          <div className="text-[10px] text-emerald-600">Calculated dynamic cage billing ({billableDays} days accrued)</div>
                        </td>
                        <td className="p-4 text-right text-emerald-900">{billableDays}</td>
                        <td className="p-4 text-right text-emerald-900">₱{cage?.rate}</td>
                        <td className="p-4 text-right text-emerald-950 font-bold">₱{dynamicRoomCharge.toLocaleString()}</td>
                        <td className="p-4 text-emerald-700">Auto Generator</td>
                        <td className="p-4 text-center">
                          <Badge className="bg-emerald-100 text-emerald-800">Live Accrual</Badge>
                        </td>
                        <td className="p-4 text-right text-gray-400 italic text-xs">Locked</td>
                      </tr>
                    );
                  })}

                  {/* Manual / Persistent charges */}
                  {admissionCharges.map(c => {
                    const matchedAdm = admissions.find(a => a.id === c.admissionId);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-xs text-gray-500">
                          {c.createdAt ? format(c.createdAt.toDate(), 'MMM dd, yyyy') : 'N/A'}
                        </td>
                        <td className="p-4 font-bold text-slate-800">{matchedAdm?.petName || 'Unknown'}</td>
                        <td className="p-4 text-slate-700">
                          <div>{c.itemName}</div>
                          <div className="text-[10px] text-gray-400 uppercase font-semibold">{c.chargeType}</div>
                        </td>
                        <td className="p-4 text-right">{c.quantity}</td>
                        <td className="p-4 text-right">₱{(c.unitPrice || 0).toLocaleString()}</td>
                        <td className="p-4 text-right font-bold">₱{(c.amount || 0).toLocaleString()}</td>
                        <td className="p-4 text-gray-600">{c.addedByName}</td>
                        <td className="p-4 text-center">
                          <Badge className={
                            c.billingStatus === 'voided' ? 'bg-red-100 text-red-700' :
                            c.billingStatus === 'invoiced' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }>
                            {c.billingStatus || 'queued'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          {c.billingStatus !== 'voided' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setSelectedAdmission(matchedAdm);
                                handleVoidCharge(c.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {c.billingStatus === 'voided' && (
                            <span className="text-xs text-red-500 italic" title={c.voidReason}>Voided</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {admissionCharges.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-400">
                        No manual charge lines registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TABS 6: Discharge Queue */}
        {activeTab === 'discharge' && (
          <div className="space-y-4">
            {filteredAdmissions.map(adm => {
              const stay = getStayMetrics(adm.checkInDate);
              const relatedInvoice = invoices.find(i => i.petId === adm.petId && i.status !== 'paid');
              const isPaid = !relatedInvoice || relatedInvoice.status === 'paid';

              return (
                <Card key={adm.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      
                      {/* Left Side: Summary info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-slate-800">{adm.petName}</h3>
                          <Badge className="bg-green-100 text-green-700">Ready for Release</Badge>
                        </div>
                        <p className="text-xs text-gray-500">Owner: {adm.ownerName} &bull; Stayed: {stay.text}</p>
                        <p className="text-xs text-slate-600 font-medium">Initial Diagnosis: {adm.initialDiagnosis || 'N/A'}</p>
                      </div>

                      {/* Middle: Checklist status */}
                      <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[280px]">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Discharge Eligibility Checklist</p>
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          <span>Vet Clinical Clearance Approved</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                          {isPaid ? (
                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                          <span className={isPaid ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                            {isPaid ? 'Confinement Invoice Settled' : 'Confinement Invoice Unpaid'}
                          </span>
                        </div>
                      </div>

                      {/* Right Side Actions */}
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white h-11 px-5 rounded-xl font-bold flex items-center gap-1.5"
                          onClick={() => {
                            setSelectedAdmission(adm);
                            setDischargeForm({
                              summary: '',
                              finalDiagnosis: adm.initialDiagnosis || '',
                              homeMedications: '',
                              dietInstructions: '',
                              warningSigns: '',
                              followUpDate: '',
                              isReceivableApproved: false,
                              receivableReason: '',
                            });
                            setIsDischargeDrawerOpen(true);
                          }}
                        >
                          <LogOut className="w-4 h-4" />
                          Prepare Discharge
                        </Button>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredAdmissions.length === 0 && (
              <Card className="p-12 text-center text-gray-400">
                No patients actively waiting in the discharge queue.
              </Card>
            )}
          </div>
        )}

        {/* TABS 7: History Archive */}
        {activeTab === 'completed' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-4">Adm No.</th>
                    <th className="p-4">Patient</th>
                    <th className="p-4">Attending Vet</th>
                    <th className="p-4">Stay Duration</th>
                    <th className="p-4">Discharge Date</th>
                    <th className="p-4">Final Diagnosis</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Billing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAdmissions.map(adm => {
                    const metrics = getStayMetrics(adm.checkInDate);
                    return (
                      <tr key={adm.id} className="hover:bg-slate-50 transition-colors text-slate-700">
                        <td className="p-4 font-mono text-xs font-bold">{adm.admissionNo}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{adm.petName}</div>
                          <div className="text-xs text-gray-500">Owner: {adm.ownerName}</div>
                        </td>
                        <td className="p-4">{adm.assignedDoctorName}</td>
                        <td className="p-4 font-semibold">{metrics.text}</td>
                        <td className="p-4 text-xs">
                          {adm.actualDischarge ? format(adm.actualDischarge.toDate(), 'MMM dd, yyyy') : 'N/A'}
                        </td>
                        <td className="p-4 text-xs font-semibold">{adm.finalDiagnosis || 'N/A'}</td>
                        <td className="p-4 text-center">
                          <Badge className="bg-gray-100 text-gray-700 border border-gray-200 capitalize">
                            {adm.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right font-bold">
                          ₱{getRunningBillTotal(adm).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAdmissions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        No completed or archived admission cases found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TABS 8: Inpatient Audit Trail */}
        {activeTab === 'audit' && (
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-600 uppercase tracking-wider mb-2">Confinement Activity Logs</h3>
            <div className="relative border-l border-slate-200 ml-4 space-y-6">
              {auditLogs.filter(l => l.action?.startsWith('patient_') || l.action?.startsWith('admission_') || l.action?.startsWith('cage_') || l.action?.startsWith('monitoring_') || l.action?.startsWith('charge_')).slice(0, 50).map(log => (
                <div key={log.id} className="relative pl-6">
                  <div className="absolute -left-[6px] top-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white" />
                  <div className="text-xs text-gray-500 font-semibold">
                    {log.createdAt ? format(log.createdAt.toDate(), 'MMM dd, yyyy - hh:mm a') : 'N/A'}
                  </div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5 capitalize">
                    {log.action?.replaceAll('_', ' ')}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 max-w-xl">{log.details}</p>
                  <div className="text-[10px] text-gray-400 font-mono mt-1">Logged by: {log.userName || 'System'}</div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p className="text-gray-400 text-center italic py-4">No inpatient audit logs gathered yet.</p>
              )}
            </div>
          </Card>
        )}

      </div>

      {/* DRAWER A: Admit Patient (Manual) */}
      <Drawer open={isAdmitDrawerOpen} onOpenChange={setIsAdmitDrawerOpen}>
        <DrawerContent className="max-w-2xl mx-auto h-full flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2"><Bed className="w-5 h-5 text-indigo-600" /> Admit Patient</DrawerTitle>
            <DrawerDescription>Create and register a new patient admission</DrawerDescription>
          </DrawerHeader>
          
          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-2">
            <div className="space-y-1">
              <Label>Select Pet *</Label>
              <select
                value={admitForm.petId}
                onChange={(e) => {
                  const pet = pets.find(p => p.id === e.target.value);
                  setAdmitForm(p => ({ ...p, petId: e.target.value, petName: pet?.name || '' }));
                }}
                className="w-full rounded-lg border border-gray-200 p-2.5 text-sm"
              >
                <option value="">Choose a pet patient...</option>
                {pets.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Admission Type</Label>
                <select
                  value={admitForm.admissionType}
                  onChange={e => setAdmitForm(p => ({ ...p, admissionType: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
                >
                  <option>Medical confinement</option>
                  <option>Surgical admission</option>
                  <option>Isolation</option>
                  <option>ICU monitoring</option>
                </select>
              </div>
              <div>
                <Label>Severity</Label>
                <select
                  value={admitForm.severity}
                  onChange={e => setAdmitForm(p => ({ ...p, severity: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
                >
                  <option value="stable">Stable</option>
                  <option value="guarded">Guarded</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Attending Vet</Label>
                <select
                  value={admitForm.attendingVetId}
                  onChange={e => setAdmitForm(p => ({ ...p, attendingVetId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
                >
                  <option value="">Select veterinarian...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Monitoring Frequency</Label>
                <select
                  value={admitForm.monitoringFrequency}
                  onChange={e => setAdmitForm(p => ({ ...p, monitoringFrequency: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
                >
                  <option value="q1h">Every 1 hour (q1h)</option>
                  <option value="q2h">Every 2 hours (q2h)</option>
                  <option value="q4h">Every 4 hours (q4h)</option>
                  <option value="q6h">Every 6 hours (q6h)</option>
                  <option value="q8h">Every 8 hours (q8h)</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Confinement Cage / Room *</Label>
                <select
                  value={admitForm.cageId}
                  onChange={e => setAdmitForm(p => ({ ...p, cageId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
                >
                  <option value="">Choose cage assignment...</option>
                  {DEFAULT_CAGES.map(c => {
                    const isOccupied = admissions.some(a => a.cageId === c.id && ['admitted', 'under_monitoring', 'critical'].includes(a.status));
                    return (
                      <option key={c.id} value={c.id} disabled={isOccupied}>
                        {c.name} ({c.wardName}) - ₱{c.rate}/day {isOccupied ? '[OCCUPIED]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input 
                  type="checkbox"
                  id="isolationRequired"
                  checked={admitForm.isolationRequired}
                  onChange={e => setAdmitForm(p => ({ ...p, isolationRequired: e.target.checked }))}
                />
                <Label htmlFor="isolationRequired" className="cursor-pointer">Isolation Required?</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estimate Amount (₱)</Label>
                <Input 
                  type="number" 
                  value={admitForm.estimateAmount}
                  onChange={e => setAdmitForm(p => ({ ...p, estimateAmount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Deposit Amount Paid (₱)</Label>
                <Input 
                  type="number"
                  value={admitForm.depositAmount}
                  onChange={e => setAdmitForm(p => ({ ...p, depositAmount: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Admission Reason *</Label>
              <Textarea 
                value={admitForm.reason}
                onChange={e => setAdmitForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Reason for admitting/hospitalization..."
                rows={2}
              />
            </div>

            <div>
              <Label>Initial Working Diagnosis</Label>
              <Input 
                value={admitForm.initialDiagnosis}
                onChange={e => setAdmitForm(p => ({ ...p, initialDiagnosis: e.target.value }))}
                placeholder="Working or suspected diagnosis..."
              />
            </div>

            <div>
              <Label>Special Instructions</Label>
              <Textarea 
                value={admitForm.specialInstructions}
                onChange={e => setAdmitForm(p => ({ ...p, specialInstructions: e.target.value }))}
                placeholder="Feeding, handling precautions, notes..."
                rows={2}
              />
            </div>
          </div>

          <div className="p-6 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsAdmitDrawerOpen(false)}>Cancel</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={handleAdmitSubmit}
              disabled={isSubmitting || !admitForm.petId || !admitForm.reason || !admitForm.cageId}
            >
              {isSubmitting ? 'Admitting...' : 'Confirm Admission'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER B: Process Recommended EMR Queue */}
      <Drawer open={isProcessDrawerOpen} onOpenChange={setIsProcessDrawerOpen}>
        <DrawerContent className="max-w-2xl mx-auto h-full flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2"><Bed className="w-5 h-5 text-indigo-600" /> Complete Admission Process</DrawerTitle>
            <DrawerDescription>Process EMR recommendation for {selectedAdmission?.petName}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-2">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">EMR Recommended Specs</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                <div><span className="font-semibold">Type:</span> {selectedAdmission?.admissionType || 'Confinement'}</div>
                <div><span className="font-semibold">Reason:</span> {selectedAdmission?.reason}</div>
                <div><span className="font-semibold">Diagnosis:</span> {selectedAdmission?.initialDiagnosis || 'N/A'}</div>
                <div><span className="font-semibold">Isolation:</span> {selectedAdmission?.isolationRequired ? 'Yes' : 'No'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Attending Vet</Label>
                <select
                  value={admitForm.attendingVetId}
                  onChange={e => setAdmitForm(p => ({ ...p, attendingVetId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
                >
                  <option value="">Select veterinarian...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Monitoring Frequency</Label>
                <select
                  value={admitForm.monitoringFrequency}
                  onChange={e => setAdmitForm(p => ({ ...p, monitoringFrequency: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
                >
                  <option value="q1h">Every 1 hour (q1h)</option>
                  <option value="q2h">Every 2 hours (q2h)</option>
                  <option value="q4h">Every 4 hours (q4h)</option>
                  <option value="q6h">Every 6 hours (q6h)</option>
                  <option value="q8h">Every 8 hours (q8h)</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Confinement Cage / Room *</Label>
              <select
                value={admitForm.cageId}
                onChange={e => setAdmitForm(p => ({ ...p, cageId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
              >
                <option value="">Choose cage assignment...</option>
                {DEFAULT_CAGES.map(c => {
                  const isOccupied = admissions.some(a => a.cageId === c.id && ['admitted', 'under_monitoring', 'critical'].includes(a.status));
                  return (
                    <option key={c.id} value={c.id} disabled={isOccupied}>
                      {c.name} ({c.wardName}) - ₱{c.rate}/day {isOccupied ? '[OCCUPIED]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="p-6 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsProcessDrawerOpen(false)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={handleProcessQueueAdmission}
              disabled={isSubmitting || !admitForm.cageId}
            >
              {isSubmitting ? 'Processing...' : 'Confirm Admission'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER C: Capture Consent */}
      <Drawer open={isConsentDrawerOpen} onOpenChange={setIsConsentDrawerOpen}>
        <DrawerContent className="max-w-2xl mx-auto h-full flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-600" /> Confinement Consent form</DrawerTitle>
            <DrawerDescription>Sign or waive medical confinement consent for {selectedAdmission?.petName}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-2">
            <p className="text-xs text-gray-500">I, the owner of the pet, authorize the clinical confinement and nursing diagnostics of this animal under standard vet practices.</p>

            <div className="space-y-2">
              <Label>Consent Override Justification (Only for waiving)</Label>
              <Textarea 
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Reason for waiving signed consent document (e.g. emergency admission with phone confirmation)..."
                rows={3}
              />
            </div>
          </div>

          <div className="p-6 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsConsentDrawerOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleSignConsent('declined')}>Decline Confinement</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleSignConsent('waived')}>Waive Consent</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSignConsent('signed')}>Sign Consent Document</Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER D: Process Confinement Deposit */}
      <Drawer open={isDepositDrawerOpen} onOpenChange={setIsDepositDrawerOpen}>
        <DrawerContent className="max-w-2xl mx-auto h-full flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-indigo-600" /> Collect Confinement Deposit</DrawerTitle>
            <DrawerDescription>Verify or record cost deposit received for {selectedAdmission?.petName}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-2">
            <div className="space-y-2">
              <Label>Waiver Justification Reason (Only if waiving deposit)</Label>
              <Textarea 
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Enter justification for waiving cost deposit..."
                rows={3}
              />
            </div>
          </div>

          <div className="p-6 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsDepositDrawerOpen(false)}>Cancel</Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={async () => {
                if (!overrideReason.trim()) {
                  alert('Waiver reason is required to waive deposit.');
                  return;
                }
                await updateDoc(doc(db, 'admissions', selectedAdmission.id), {
                  depositStatus: 'waived',
                  depositWaiverReason: overrideReason,
                  updatedAt: serverTimestamp(),
                });
                await addAuditLog({
                  action: 'admission_deposit_paid',
                  userId: auth.currentUser?.uid || 'unknown',
                  userName: auth.currentUser?.displayName || 'Unknown',
                  details: `Waived deposit for ${selectedAdmission.petName}. Reason: ${overrideReason}`
                });
                alert('Deposit waived.');
                setIsDepositDrawerOpen(false);
                setOverrideReason('');
                await refreshAllData();
              }}
            >
              Waive Deposit
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
              onClick={async () => {
                await updateDoc(doc(db, 'admissions', selectedAdmission.id), {
                  depositStatus: 'paid',
                  updatedAt: serverTimestamp(),
                });
                await addAuditLog({
                  action: 'admission_deposit_paid',
                  userId: auth.currentUser?.uid || 'unknown',
                  userName: auth.currentUser?.displayName || 'Unknown',
                  details: `Recorded deposit payments received for ${selectedAdmission.petName}`
                });
                alert('Deposit registered successfully!');
                setIsDepositDrawerOpen(false);
                await refreshAllData();
              }}
            >
              Mark Deposit Paid
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER E: Transfer Cage */}
      <Drawer open={isTransferDrawerOpen} onOpenChange={setIsTransferDrawerOpen}>
        <DrawerContent className="max-w-2xl mx-auto h-full flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-indigo-600" /> Transfer Confinement Cage</DrawerTitle>
            <DrawerDescription>Reassign room or cage for {selectedAdmission?.petName}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-2">
            <div>
              <Label>Select New Cage / Room Assignment *</Label>
              <select
                value={admitForm.cageId}
                onChange={e => setAdmitForm(p => ({ ...p, cageId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
              >
                <option value="">Select cage...</option>
                {DEFAULT_CAGES.map(c => {
                  const isOccupied = admissions.some(a => a.cageId === c.id && ['admitted', 'under_monitoring', 'critical'].includes(a.status));
                  return (
                    <option key={c.id} value={c.id} disabled={isOccupied}>
                      {c.name} ({c.wardName}) - ₱{c.rate}/day {isOccupied ? '[OCCUPIED]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <Label>Transfer Reason *</Label>
              <Textarea 
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Reason for room/cage transfer..."
                rows={3}
              />
            </div>
          </div>

          <div className="p-6 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsTransferDrawerOpen(false)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={handleCageTransfer}
              disabled={isSubmitting || !admitForm.cageId || !overrideReason.trim()}
            >
              {isSubmitting ? 'Transferring...' : 'Confirm Cage Transfer'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER F: Record Inpatient Monitoring / Check */}
      <Drawer open={isMonitoringDrawerOpen} onOpenChange={setIsMonitoringDrawerOpen}>
        <DrawerContent className="max-w-2xl mx-auto h-full flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-600" /> Log Confinement Vitals & Vitals Check</DrawerTitle>
            <DrawerDescription>Record structured vitals and clinical status for {selectedAdmission?.petName}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-2">
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Document Action Status</Label>
                <select
                  value={vitalsForm.status}
                  onChange={e => setVitalsForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
                >
                  <option value="completed">Completed Check-in</option>
                  <option value="skipped">Skipped Check-in</option>
                </select>
              </div>

              {vitalsForm.status === 'skipped' && (
                <div>
                  <Label>Skip Reason *</Label>
                  <Input 
                    value={vitalsForm.skipReason}
                    onChange={e => setVitalsForm(p => ({ ...p, skipReason: e.target.value }))}
                    placeholder="Provide justification reason..."
                  />
                </div>
              )}
            </div>

            {vitalsForm.status === 'completed' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-red-500" /> Temperature (°C)</Label>
                    <Input 
                      type="number" step="0.1"
                      value={vitalsForm.temperature}
                      onChange={e => setVitalsForm(p => ({ ...p, temperature: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Scale className="w-3.5 h-3.5 text-blue-500" /> Weight (kg)</Label>
                    <Input 
                      type="number" step="0.1"
                      value={vitalsForm.weight}
                      onChange={e => setVitalsForm(p => ({ ...p, weight: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-500" /> HR (bpm)</Label>
                    <Input 
                      type="number"
                      value={vitalsForm.heartRate}
                      onChange={e => setVitalsForm(p => ({ ...p, heartRate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Wind className="w-3.5 h-3.5 text-indigo-500" /> RR (/min)</Label>
                    <Input 
                      type="number"
                      value={vitalsForm.respiratoryRate}
                      onChange={e => setVitalsForm(p => ({ ...p, respiratoryRate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Appetite</Label>
                    <select
                      value={vitalsForm.appetite}
                      onChange={e => setVitalsForm(p => ({ ...p, appetite: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="fair">Fair / Reduced</option>
                      <option value="poor">Poor / None</option>
                    </select>
                  </div>
                  <div>
                    <Label>Hydration Status</Label>
                    <select
                      value={vitalsForm.hydration}
                      onChange={e => setVitalsForm(p => ({ ...p, hydration: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
                    >
                      <option value="normal">Hydrated / Normal</option>
                      <option value="mild">Mild Dehydration</option>
                      <option value="severe">Severe Dehydration</option>
                    </select>
                  </div>
                  <div>
                    <Label>Mentation</Label>
                    <select
                      value={vitalsForm.mentation}
                      onChange={e => setVitalsForm(p => ({ ...p, mentation: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
                    >
                      <option value="alert">Alert & Responsive</option>
                      <option value="depressed">Depressed / Lethargic</option>
                      <option value="stuporous">Stuporous / Unresponsive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label>Urine Output</Label>
                    <select
                      value={vitalsForm.urine}
                      onChange={e => setVitalsForm(p => ({ ...p, urine: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="increased">Polyuria / High</option>
                      <option value="decreased">Oliguria / Low</option>
                      <option value="none">Anuria / None</option>
                    </select>
                  </div>
                  <div>
                    <Label>Stool Status</Label>
                    <select
                      value={vitalsForm.stool}
                      onChange={e => setVitalsForm(p => ({ ...p, stool: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
                    >
                      <option value="normal">Normal / Formed</option>
                      <option value="soft">Soft Stool</option>
                      <option value="diarrhea">Diarrhea</option>
                      <option value="none">No defecation</option>
                    </select>
                  </div>
                  <div>
                    <Label>Vomiting Frequency</Label>
                    <select
                      value={vitalsForm.vomiting}
                      onChange={e => setVitalsForm(p => ({ ...p, vomiting: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
                    >
                      <option value="none">None</option>
                      <option value="once">Once</option>
                      <option value="multiple">Multiple episodes</option>
                    </select>
                  </div>
                  <div>
                    <Label>Pain Score</Label>
                    <select
                      value={vitalsForm.painScore}
                      onChange={e => setVitalsForm(p => ({ ...p, painScore: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
                    >
                      <option value="none">No Pain (0/10)</option>
                      <option value="mild">Mild (1-3/10)</option>
                      <option value="moderate">Moderate (4-6/10)</option>
                      <option value="severe">Severe (7-10/10)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>IV Fluid Administration</Label>
                    <select
                      value={vitalsForm.ivFluids}
                      onChange={e => setVitalsForm(p => ({ ...p, ivFluids: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
                    >
                      <option value="none">None</option>
                      <option value="ongoing">Ongoing infusion</option>
                      <option value="completed">Infusion completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Clinical observations & Nursing notes</Label>
                  <Textarea 
                    value={vitalsForm.notes}
                    onChange={e => setVitalsForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Enter nurse or assistant progress notes..."
                    rows={3}
                  />
                </div>
              </>
            )}

          </div>

          <div className="p-6 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsMonitoringDrawerOpen(false)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={handleAddVitalsMonitoring}
              disabled={isSubmitting || (vitalsForm.status === 'skipped' && !vitalsForm.skipReason.trim())}
            >
              {isSubmitting ? 'Logging...' : 'Save Vitals Check-in'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER G: Add Manual Charge */}
      <Drawer open={isChargesDrawerOpen} onOpenChange={setIsChargesDrawerOpen}>
        <DrawerContent className="max-w-2xl mx-auto h-full flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-indigo-600" /> Log Confinement Charge</DrawerTitle>
            <DrawerDescription>Add medication, services, supply, or customized cost charges to {selectedAdmission?.petName}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-2">
            <div>
              <Label>Category</Label>
              <select
                value={chargeForm.chargeType}
                onChange={e => setChargeForm(p => ({ ...p, chargeType: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
              >
                <option value="medication">Medication Administered</option>
                <option value="supply">Supplies / Syringe / IV lines</option>
                <option value="procedure">Procedure performed</option>
                <option value="lab">Lab / Diagnostics ordered</option>
                <option value="professional_fee">Attending Vet Fee</option>
                <option value="other">Other Charge</option>
              </select>
            </div>

            <div>
              <Label>Description / Item Name *</Label>
              <Input 
                value={chargeForm.itemName}
                onChange={e => setChargeForm(p => ({ ...p, itemName: e.target.value }))}
                placeholder="e.g. Cerenia 10mg injection, Syringe 5ml..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input 
                  type="number"
                  value={chargeForm.quantity}
                  onChange={e => setChargeForm(p => ({ ...p, quantity: e.target.value }))}
                />
              </div>
              <div>
                <Label>Unit Rate (₱) *</Label>
                <Input 
                  type="number"
                  value={chargeForm.unitPrice}
                  onChange={e => setChargeForm(p => ({ ...p, unitPrice: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsChargesDrawerOpen(false)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={handleAddRunningCharge}
              disabled={isSubmitting || !chargeForm.itemName}
            >
              {isSubmitting ? 'Registering...' : 'Add Ledger Line'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER H: Prepare Discharge Summary & Finalize Release */}
      <Drawer open={isDischargeDrawerOpen} onOpenChange={setIsDischargeDrawerOpen}>
        <DrawerContent className="max-w-2xl mx-auto h-full flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2"><LogOut className="w-5 h-5 text-indigo-600" /> Prepare Inpatient Discharge Summary</DrawerTitle>
            <DrawerDescription>Document clinical guidelines and complete discharge release for {selectedAdmission?.petName}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 flex-1 overflow-y-auto px-6 py-2">
            
            {/* Dynamic Billing Status Warning Block */}
            {selectedAdmission && (() => {
              const totalDue = getRunningBillTotal(selectedAdmission);
              const unpaidInv = invoices.find(i => i.petId === selectedAdmission.petId && i.status !== 'paid');
              const isUnsettled = unpaidInv && unpaidInv.status !== 'paid' && totalDue > 0;

              return (
                <div className={`p-4 rounded-xl border ${
                  isUnsettled ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
                } space-y-2`}>
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                    {isUnsettled ? <ShieldAlert className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
                    <span>{isUnsettled ? 'CONFINEMENT BILLING BLOCKED' : 'CONFINEMENT BILLING CLEAR'}</span>
                  </div>
                  <p className="text-xs">
                    {isUnsettled 
                      ? `This patient has ₱${totalDue.toLocaleString()} unsettled. Release is blocked unless invoice is processed, or manager receivable override justification is specified.`
                      : 'Excellent! Confinement account is fully paid and settled. Patient is cleared for release.'
                    }
                  </p>

                  {isUnsettled && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-red-200/50">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={dischargeForm.isReceivableApproved}
                          onChange={e => setDischargeForm(p => ({ ...p, isReceivableApproved: e.target.checked }))}
                        />
                        <span>Enable Manager Receivable Override?</span>
                      </label>

                      {dischargeForm.isReceivableApproved && (
                        <div>
                          <Label className="text-xs text-red-950 font-bold">Override Justification Reason *</Label>
                          <Input 
                            value={dischargeForm.receivableReason}
                            onChange={e => setDischargeForm(p => ({ ...p, receivableReason: e.target.value }))}
                            placeholder="Enter accounting / release override details..."
                            className="bg-white text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <div>
              <Label>Discharge Summary / Stay Overview *</Label>
              <Textarea 
                value={dischargeForm.summary}
                onChange={e => setDischargeForm(p => ({ ...p, summary: e.target.value }))}
                placeholder="Summarize the patient's stay, diagnostic results, and recovery..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Final Diagnosis *</Label>
                <Input 
                  value={dischargeForm.finalDiagnosis}
                  onChange={e => setDischargeForm(p => ({ ...p, finalDiagnosis: e.target.value }))}
                  placeholder="Final diagnosed medical condition..."
                />
              </div>
              <div>
                <Label>Follow-up Date / Recheck Schedule</Label>
                <Input 
                  type="date"
                  value={dischargeForm.followUpDate}
                  onChange={e => setDischargeForm(p => ({ ...p, followUpDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Take-Home Medications</Label>
              <Textarea 
                value={dischargeForm.homeMedications}
                onChange={e => setDischargeForm(p => ({ ...p, homeMedications: e.target.value }))}
                placeholder="Dosages, frequencies, durations for home drugs..."
                rows={2}
              />
            </div>

            <div>
              <Label>Diet & Home Care Instructions</Label>
              <Textarea 
                value={dischargeForm.dietInstructions}
                onChange={e => setDischargeForm(p => ({ ...p, dietInstructions: e.target.value }))}
                placeholder="Diet changes, bandages care, limits on exercise..."
                rows={2}
              />
            </div>

            <div>
              <Label>Warning Signs to Watch For</Label>
              <Textarea 
                value={dischargeForm.warningSigns}
                onChange={e => setDischargeForm(p => ({ ...p, warningSigns: e.target.value }))}
                placeholder="e.g. Return immediately if vomiting resumes or sutures are opened..."
                rows={2}
              />
            </div>

          </div>

          <div className="p-6 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsDischargeDrawerOpen(false)}>Cancel</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
              onClick={handleReleasePatientSubmit}
              disabled={isSubmitting || !dischargeForm.summary || !dischargeForm.finalDiagnosis}
            >
              {isSubmitting ? 'Releasing Patient...' : 'Finalize Discharge & Release'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}

// Inline Icon fallback
function ShieldAlert({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}