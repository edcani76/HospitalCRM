import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Loader2, Mail, Phone, User, Stethoscope, Activity, Thermometer,
  Heart, Wind, Droplets, Clock, FileText, DollarSign, History,
  ClipboardList, Pill, FlaskConical, Upload, Printer, Eye, Bell, Check
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { PageHeader } from '../../components/ui/page-header';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  fetchPetById, fetchEncounters, fetchEncounterById, fetchServiceCatalog,
  fetchAppointmentServices, fetchTriageVitals, fetchClinicalNotes,
  fetchLabOrders, fetchPrescriptions, fetchDispensingRecords,
  fetchInvoicesByEncounter, fetchInvoiceItems, fetchPayments,
  fetchAttachments, fetchAuditLogs,
  generateInvoiceFromEncounter, recordPayment
} from '../../lib/firestore-helpers';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, db, auth } from '../../firebase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { uploadToGoogleDrive, getGoogleDriveLink } from '../../lib/google-drive';

// Helper to get file type from file name
function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const typeMap: { [key: string]: string } = {
    'pdf': 'pdf', 'jpg': 'image', 'jpeg': 'image', 'png': 'image',
    'gif': 'image', 'bmp': 'image', 'doc': 'document', 'docx': 'document',
    'xls': 'document', 'xlsx': 'document', 'txt': 'document', 'csv': 'document'
  };
  return typeMap[ext || ''] || 'other';
}

type TabType =
  | 'visit-summary'
  | 'triage-vitals'
  | 'clinical-notes'
  | 'orders-services'
  | 'medications-pharmacy'
  | 'diagnostics-files'
  | 'billing'
  | 'history'
  | 'audit-trail';

export default function EMRPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('visit-summary');

  const [patient, setPatient] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null);
  const [mode, setMode] = useState<'active' | 'view'>('view');
  const [scheduledAppointment, setScheduledAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Service catalog
  const [serviceCatalog, setServiceCatalog] = useState<any[]>([]);

  // Current encounter data
  const [appointmentServices, setAppointmentServices] = useState<any[]>([]);
  const [triageVitals, setTriageVitals] = useState<any[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<any>(null);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [dispensingRecords, setDispensingRecords] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Form states
  const [formData, setFormData] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingVitals, setSavingVitals] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: 0, method: 'cash', referenceNo: '' });
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Doctor selector for Quick Start
  const [showDoctorDialog, setShowDoctorDialog] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<Array<{ id: string; name: string; specialization?: string }>>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDoctorName, setSelectedDoctorName] = useState('');

  const fetchAvailableDoctors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'doctors'));
      const doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Show ALL doctors for Quick Start (emergency/walk-in visits)
      setAvailableDoctors(doctors);
      
      // Pre-select current user if they're a doctor
      const userUid = auth.currentUser?.uid;
      const currentDoctor = doctors.find(d => d.uid === userUid);
      if (currentDoctor) {
        setSelectedDoctorId(currentDoctor.id);
        setSelectedDoctorName(currentDoctor.name);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleQuickStartVisit = async () => {
    if (!patientId || !patient) return;
    try {
      // Fetch ALL doctors for Quick Start (emergency/walk-in visits)
      const snapshot = await getDocs(collection(db, 'doctors'));
      const doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      setAvailableDoctors(doctors);
      
      // Pre-select current user if they're a doctor
      const userUid = auth.currentUser?.uid;
      const currentDoctor = doctors.find(d => d.uid === userUid);
      if (currentDoctor) {
        setSelectedDoctorId(currentDoctor.id);
        setSelectedDoctorName(currentDoctor.name);
      }
      
      // Show doctor selector dialog
      setShowDoctorDialog(true);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      alert('Error loading doctors. Please try again.');
    }
  };

  const confirmQuickStart = async () => {
    if (!patientId || !patient) return;
    try {
      setLoading(true);
      const userUid = auth.currentUser?.uid || 'unknown';
      const now = new Date();
      const dateStr = format(now, 'yyyy-MM-dd');
      const timeStr = format(now, 'hh:mm a');
      
      // 1. Create appointment
      const aptData = {
        clientUid: patient.ownerUid || '',
        petId: patientId,
        petName: patient.name,
        doctorId: selectedDoctorId,
        doctorName: selectedDoctorName,
        date: dateStr,
        time: timeStr,
        status: 'unconfirmed',
        notes: `Services: consultation
Mode: Walk-in`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const aptRef = await addDoc(collection(db, 'appointments'), aptData);
      const aptId = aptRef.id;
      
      // 2. Auto-confirm appointment
      await updateDoc(doc(db, 'appointments', aptId), {
        status: 'confirmed',
        updatedAt: serverTimestamp()
      });
      
      // 3. Create encounter (Quick Start)
      const encounterData = {
        appointmentId: aptId,
        petId: patientId,
        petName: patient.name,
        clientUid: patient.ownerUid || '',
        doctorId: selectedDoctorId,
        doctorName: selectedDoctorName,
        startedAt: serverTimestamp(),
        status: 'in-progress',
        vitals: { weightKg: 0, temperatureC: 0, heartRateBpm: 0, respiratoryRateRpm: 0, mmColor: '', crtSeconds: 0, notes: '' },
        clinicalNotes: { subjective: '', objective: '', assessment: '', plan: '', diagnosis: '', doctorNotes: '', followUpInstructions: '' },
        createdBy: userUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const encRef = await addDoc(collection(db, 'encounters'), encounterData);
      const encounterId = encRef.id;
      
      // 4. Create service records for ALL services
      const serviceTypes = ['consultation']; // Default for Quick Start
      
      for (const svcType of serviceTypes) {
        const serviceFee = svcType === 'consultation' ? 500 : svcType === 'grooming' ? 800 : svcType === 'vaccination' ? 300 : 1000;
        const serviceData = {
          appointmentId: aptId,
          encounterId: encounterId,
          petId: patientId,
          ownerId: patient.ownerUid || '',
          serviceCatalogId: '',
          serviceCode: svcType.toUpperCase().slice(0, 3),
          serviceName: svcType.charAt(0).toUpperCase() + svcType.slice(1),
          serviceType: svcType,
          status: 'in-progress',
          source: 'walk-in',
          billable: true,
          quantity: 1,
          unitPrice: serviceFee,
          discountAmount: 0,
          taxRate: 0,
          performedBy: selectedDoctorId || userUid,
          completedAt: null,
          createdBy: userUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await addDoc(collection(db, 'appointment_services'), serviceData);
      }
      
      // 5. Navigate directly to EMR with encounterId
      setShowDoctorDialog(false);
      navigate(`/crm/emr/${patientId}`, {
        state: { encounterId }
      });
    } catch (error) {
      console.error('Error quick starting visit:', error);
      alert('Error starting visit. Please try again.');
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    if (!scheduledAppointment) return;
    
    try {
      const { notifyClient } = await import('../../lib/notifications');
      await notifyClient(
        scheduledAppointment.clientUid,
        'appointment_reminder',
        'Appointment Reminder',
        `Reminder: You have an upcoming appointment for ${patient?.name} on ${scheduledAppointment.date} at ${scheduledAppointment.time}.`
      );
      alert('Reminder sent successfully!');
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Error sending reminder. Please try again.');
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const petData = await fetchPetById(patientId || '');
        setPatient(petData);

        // Fetch owner data if pet has ownerUid
        if (petData?.ownerUid) {
          const { fetchOwnerByUid } = await import('../../lib/firestore-helpers');
          const ownerData = await fetchOwnerByUid(petData.ownerUid);
          setOwner(ownerData);
        }

        // Fetch encounters for this patient
        const encounterData = await fetchEncounters(patientId);
        setEncounters(encounterData);

        // Check for active encounter (in-progress with startedAt)
        const activeEncounter = encounterData.find((e: any) => 
          e.status === 'in-progress' && e.startedAt
        );
        const hasActiveEncounter = !!activeEncounter;

        // Set mode based on active encounter
        if (hasActiveEncounter) {
          setMode('active');
        } else {
          setMode('view');
        }

        // Select encounter from navigation state, active encounter, or default to first
        const stateEncounterId = (location.state as any)?.encounterId;
        if (stateEncounterId) {
          const enc = encounterData.find((e: any) => e.id === stateEncounterId);
          if (enc) {
            setSelectedEncounter(enc);
          } else if (activeEncounter) {
            setSelectedEncounter(activeEncounter);
          } else if (encounterData.length > 0) {
            setSelectedEncounter(encounterData[0]);
          }
        } else if (activeEncounter) {
          setSelectedEncounter(activeEncounter);
        } else if (encounterData.length > 0) {
          setSelectedEncounter(encounterData[0]);
        }

        // Fetch service catalog
        const catalogData = await fetchServiceCatalog();
        setServiceCatalog(catalogData);

        // Check for scheduled appointments (unconfirmed/confirmed) that haven't started
        const { fetchAppointments } = await import('../../lib/firestore-helpers');
        const appointmentsData = await fetchAppointments({ petId: patientId });
        const scheduled = appointmentsData.find((apt: any) =>
          (apt.status === 'unconfirmed' || apt.status === 'confirmed') &&
          !encounterData.some((enc: any) => enc.appointmentId === apt.id)
        );
        setScheduledAppointment(scheduled || null);

      } catch (error) {
        console.error('Error loading EMR data:', error);
      } finally {
        setLoading(false);
      }
    }
    if (patientId) loadData();
  }, [patientId]);

  // Load encounter-specific data when selectedEncounter changes
  useEffect(() => {
    if (!selectedEncounter?.id) return;

    async function loadEncounterData() {
      try {
        const encounterId = selectedEncounter.id;

        const [
          services, vitals, notes, labs, rxs, dispensing,
          inv, atts, logs
        ] = await Promise.all([
          fetchAppointmentServices(encounterId),
          fetchTriageVitals(encounterId),
          fetchClinicalNotes(encounterId),
          fetchLabOrders(encounterId),
          fetchPrescriptions(encounterId),
          fetchDispensingRecords(encounterId),
          fetchInvoicesByEncounter(encounterId),
          fetchAttachments(encounterId),
          fetchAuditLogs({ encounterId })
        ]);

        // Fetch invoice items and payments based on invoice
        const invoiceId = inv?.[0]?.id || '';
        const [items, pays] = await Promise.all([
          fetchInvoiceItems(invoiceId),
          fetchPayments(invoiceId)
        ]);

        setAppointmentServices(services);
        setTriageVitals(vitals);
        setClinicalNotes(notes);
        setLabOrders(labs);
        setPrescriptions(rxs);
        setDispensingRecords(dispensing);
        setInvoice(inv?.[0] || null);
        setInvoiceItems(items);
        setPayments(pays);
        setAttachments(atts);
        setAuditLogs(logs);
      } catch (error) {
        console.error('Error loading encounter data:', error);
      }
    }

    loadEncounterData();
  }, [selectedEncounter?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (mode === 'view') return; // Ignore changes in view mode
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const saveVitals = async () => {
    if (!selectedEncounter?.id) return;
    setSavingVitals(true);
    try {
      const vitalsData = {
        encounterId: selectedEncounter.id,
        patientId: patientId,
        appointmentId: selectedEncounter.appointmentId || '',
        weightKg: parseFloat(formData.weightKg) || 0,
        temperatureC: parseFloat(formData.temperatureC) || 0,
        heartRateBpm: parseInt(formData.heartRateBpm) || 0,
        respiratoryRateRpm: parseInt(formData.respiratoryRateRpm) || 0,
        mmColor: formData.mmColor || '',
        crtSeconds: parseFloat(formData.crtSeconds) || 0,
        notes: formData.notes || '',
        createdBy: 'current-user', // Replace with actual user ID
        createdAt: serverTimestamp()
      };

      // Save to triage_vitals collection
      await addDoc(collection(db, 'triage_vitals'), vitalsData);

      // Update encounter's vitals field
      const encounterRef = doc(db, 'encounters', selectedEncounter.id);
      await updateDoc(encounterRef, {
        vitals: {
          weightKg: vitalsData.weightKg,
          temperatureC: vitalsData.temperatureC,
          heartRateBpm: vitalsData.heartRateBpm,
          respiratoryRateRpm: vitalsData.respiratoryRateRpm,
          mmColor: vitalsData.mmColor,
          crtSeconds: vitalsData.crtSeconds,
          notes: vitalsData.notes
        },
        updatedAt: serverTimestamp()
      });

      // Refresh vitals list
      const updatedVitals = await fetchTriageVitals(selectedEncounter.id);
      setTriageVitals(updatedVitals);
      setFormData({});
      alert('Vitals saved successfully!');
    } catch (error) {
      console.error('Error saving vitals:', error);
      alert('Error saving vitals. Please try again.');
    } finally {
      setSavingVitals(false);
    }
  };

  const saveClinicalNotes = async () => {
    if (!selectedEncounter?.id) return;
    setSavingNotes(true);
    try {
      const notesData = {
        encounterId: selectedEncounter.id,
        patientId: patientId,
        subjective: formData.subjective || '',
        objective: formData.objective || '',
        assessment: formData.assessment || '',
        plan: formData.plan || '',
        diagnosis: formData.diagnosis || '',
        doctorNotes: formData.doctorNotes || '',
        followUpInstructions: formData.followUpInstructions || '',
        createdBy: 'current-user', // Replace with actual user ID
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save to clinical_notes collection
      await addDoc(collection(db, 'clinical_notes'), notesData);

      // Update encounter's clinicalNotes field
      const encounterRef = doc(db, 'encounters', selectedEncounter.id);
      await updateDoc(encounterRef, {
        clinicalNotes: {
          subjective: notesData.subjective,
          objective: notesData.objective,
          assessment: notesData.assessment,
          plan: notesData.plan,
          diagnosis: notesData.diagnosis,
          doctorNotes: notesData.doctorNotes,
          followUpInstructions: notesData.followUpInstructions
        },
        updatedAt: serverTimestamp()
      });

      // Refresh clinical notes
      const updatedNotes = await fetchClinicalNotes(selectedEncounter.id);
      setClinicalNotes(updatedNotes);
      alert('Clinical notes saved successfully!');
    } catch (error) {
      console.error('Error saving clinical notes:', error);
      alert('Error saving clinical notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const addService = async () => {
    if (!selectedEncounter?.id || !formData.serviceCatalogId) return;

    try {
      // Get service details from catalog
      const catalogItem = serviceCatalog.find((s: any) => s.id === formData.serviceCatalogId);
      if (!catalogItem) {
        alert('Please select a valid service');
        return;
      }

      const qty = parseInt(formData.quantity) || 1;
      const now = serverTimestamp();

      // Create appointment_service record
      const serviceData = {
        appointmentId: selectedEncounter.appointmentId || '',
        encounterId: selectedEncounter.id,
        petId: patientId,
        ownerId: selectedEncounter.ownerId || '',
        serviceCatalogId: catalogItem.id,
        serviceCode: catalogItem.code,
        serviceName: catalogItem.name,
        serviceType: catalogItem.category,
        status: 'in-progress',
        source: 'doctor-added',
        billable: true,
        quantity: qty,
        unitPrice: catalogItem.defaultPrice,
        discountAmount: 0,
        taxRate: catalogItem.taxable ? 0.12 : 0,
        performedBy: 'current-user', // Replace with actual user ID
        completedAt: null,
        createdBy: 'current-user', // Replace with actual user ID
        createdAt: now,
        updatedAt: now
      };

      const serviceRef = await addDoc(collection(db, 'appointment_services'), serviceData);

      // If lab test, create lab_order
      if (catalogItem.category === 'lab') {
        await addDoc(collection(db, 'lab_orders'), {
          encounterId: selectedEncounter.id,
          appointmentServiceId: serviceRef.id,
          patientId: patientId,
          testName: catalogItem.name,
          testCode: catalogItem.code,
          status: 'ordered',
          orderedBy: 'current-user', // Replace with actual user ID
          orderedAt: now
        });
      }

      // If medication, create prescription
      if (catalogItem.category === 'medication') {
        await addDoc(collection(db, 'prescriptions'), {
          encounterId: selectedEncounter.id,
          patientId: patientId,
          appointmentServiceId: serviceRef.id,
          medicationName: catalogItem.name,
          medicationCatalogId: catalogItem.id,
          dosage: '',
          frequency: '',
          duration: '',
          quantityPrescribed: qty,
          instructions: '',
          status: 'prescribed',
          prescribedBy: 'current-user', // Replace with actual user ID
          prescribedAt: now
        });
      }

      // Refresh services list
      const updatedServices = await fetchAppointmentServices(selectedEncounter.id);
      setAppointmentServices(updatedServices);

      // Refresh other related data
      if (catalogItem.category === 'lab') {
        const updatedLabs = await fetchLabOrders(selectedEncounter.id);
        setLabOrders(updatedLabs);
      }
      if (catalogItem.category === 'medication') {
        const updatedRx = await fetchPrescriptions(selectedEncounter.id);
        setPrescriptions(updatedRx);
      }

      setShowAddForm(false);
      setFormData({});
      alert('Service added successfully!');
    } catch (error) {
      console.error('Error adding service:', error);
      alert('Error adding service. Please try again.');
    }
  };

  const prescribeMedication = async () => {
    if (!selectedEncounter?.id || !formData.serviceCatalogId) return;

    try {
      const catalogItem = serviceCatalog.find((s: any) => s.id === formData.serviceCatalogId);
      if (!catalogItem) {
        alert('Please select a valid medication');
        return;
      }

      const now = serverTimestamp();
      const rxData = {
        encounterId: selectedEncounter.id,
        patientId: patientId,
        appointmentServiceId: '',
        medicationName: catalogItem.name,
        medicationCatalogId: catalogItem.id,
        dosage: formData.dosage || '',
        frequency: formData.frequency || '',
        duration: formData.duration || '',
        quantityPrescribed: parseInt(formData.quantity) || 1,
        instructions: formData.instructions || '',
        status: 'prescribed',
        prescribedBy: 'current-user', // Replace with actual user ID
        prescribedAt: now
      };

      await addDoc(collection(db, 'prescriptions'), rxData);

      // Refresh prescriptions
      const updatedRx = await fetchPrescriptions(selectedEncounter.id);
      setPrescriptions(updatedRx);

      setFormData({});
      alert('Medication prescribed successfully!');
    } catch (error) {
      console.error('Error prescribing medication:', error);
      alert('Error prescribing medication. Please try again.');
    }
  };

  const dispenseMedication = async (prescriptionId: string) => {
    if (!selectedEncounter?.id) return;

    try {
      const prescription = prescriptions.find((rx: any) => rx.id === prescriptionId);
      if (!prescription) {
        alert('Prescription not found');
        return;
      }

      const catalogItem = serviceCatalog.find((s: any) => s.id === prescription.medicationCatalogId);
      const now = serverTimestamp();

      // Create appointment_service for dispensing
      const serviceData = {
        appointmentId: selectedEncounter.appointmentId || '',
        encounterId: selectedEncounter.id,
        petId: patientId,
        ownerId: selectedEncounter.ownerId || '',
        serviceCatalogId: prescription.medicationCatalogId || '',
        serviceCode: 'DISP',
        serviceName: `Dispense: ${prescription.medicationName}`,
        serviceType: 'medication',
        status: 'completed',
        source: 'pharmacy-dispensed',
        billable: true,
        quantity: prescription.quantityPrescribed || 1,
        unitPrice: catalogItem?.defaultPrice || 0,
        discountAmount: 0,
        taxRate: catalogItem?.taxable ? 0.12 : 0,
        performedBy: 'current-user', // Replace with actual user ID
        completedAt: now,
        createdBy: 'current-user',
        createdAt: now,
        updatedAt: now
      };

      const serviceRef = await addDoc(collection(db, 'appointment_services'), serviceData);

      // Create dispensing record
      const dispenseData = {
        prescriptionId: prescriptionId,
        encounterId: selectedEncounter.id,
        patientId: patientId,
        appointmentServiceId: serviceRef.id,
        inventoryItemId: catalogItem?.inventoryItemId || '',
        medicationName: prescription.medicationName,
        quantityDispensed: prescription.quantityPrescribed || 1,
        unitPrice: catalogItem?.defaultPrice || 0,
        totalPrice: (catalogItem?.defaultPrice || 0) * (prescription.quantityPrescribed || 1),
        dispensedBy: 'current-user', // Replace with actual user ID
        dispensedAt: now
      };

      await addDoc(collection(db, 'dispensing_records'), dispenseData);

      // Update prescription status
      const rxRef = doc(db, 'prescriptions', prescriptionId);
      await updateDoc(rxRef, {
        status: 'dispensed',
        updatedAt: now
      });

      // Update inventory (reduce stock)
      if (catalogItem?.inventoryItemId) {
        console.log('Deduct inventory:', catalogItem.inventoryItemId);
        // TODO: Implement inventory deduction
      }

      // Refresh data
      const [updatedServices, updatedRx, updatedDispensing] = await Promise.all([
        fetchAppointmentServices(selectedEncounter.id),
        fetchPrescriptions(selectedEncounter.id),
        fetchDispensingRecords(selectedEncounter.id)
      ]);

      setAppointmentServices(updatedServices);
      setPrescriptions(updatedRx);
      setDispensingRecords(updatedDispensing);

      alert('Medication dispensed successfully!');
    } catch (error) {
      console.error('Error dispensing medication:', error);
      alert('Error dispensing medication. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEncounter?.id) return;

    setUploadingFile(true);
    try {
      const ownerName = owner?.displayName || owner?.name || 'Unknown';
      const petName = patient?.name || 'Unknown';

      const { fileId, webViewLink, downloadUrl } = await uploadToGoogleDrive(file, {
        ownerName,
        petName,
        fileType: 'emr',
      });

      // Save attachment record to Firestore
      const attachmentData = {
        encounterId: selectedEncounter.id,
        patientId: patientId,
        appointmentId: selectedEncounter.appointmentId || '',
        fileUrl: webViewLink || downloadUrl,
        storagePath: fileId, // Store Google Drive file ID
        fileName: file.name,
        fileType: getFileType(file.name),
        uploadedBy: 'current-user', // Replace with actual user ID
        uploadedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'attachments'), attachmentData);

      // Refresh attachments list
      const updatedAttachments = await fetchAttachments(selectedEncounter.id);
      setAttachments(updatedAttachments);

      // Reset file input
      e.target.value = '';
      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const generateDraftInvoice = async () => {
    if (!selectedEncounter?.id || !patient) return;

    setGeneratingInvoice(true);
    try {
      if (invoice) {
        alert('Invoice already exists for this encounter');
        return;
      }

      const billableServices = appointmentServices.filter(s => s.billable !== false);

      if (billableServices.length === 0) {
        alert('No billable services found for this encounter');
        return;
      }

      const newInvoice = await generateInvoiceFromEncounter(
        selectedEncounter.id,
        billableServices,
        patientId || '',
        selectedEncounter.ownerId || patient?.ownerUid || ''
      );

      const [inv, items, pays] = await Promise.all([
        fetchInvoicesByEncounter(selectedEncounter.id),
        fetchInvoiceItems(newInvoice.id),
        fetchPayments(newInvoice.id)
      ]);

      setInvoice(inv[0] || null);
      setInvoiceItems(items);
      setPayments(pays);

      alert('Draft invoice generated successfully!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice. Please try again.');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!invoice?.id) return;

    setRecordingPayment(true);
    try {
      await recordPayment(
        invoice.id,
        paymentData.amount || invoice.balanceDue,
        paymentData.method,
        paymentData.referenceNo
      );

      const [inv, items, pays] = await Promise.all([
        fetchInvoicesByEncounter(selectedEncounter.id),
        fetchInvoiceItems(invoice.id),
        fetchPayments(invoice.id)
      ]);

      setInvoice(inv[0] || null);
      setInvoiceItems(items);
      setPayments(pays);
      setShowPaymentDialog(false);
      setPaymentData({ amount: 0, method: 'cash', referenceNo: '' });

      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment. Please try again.');
    } finally {
      setRecordingPayment(false);
    }
  };

  function getFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const typeMap: { [key: string]: string } = {
      'pdf': 'pdf',
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'bmp': 'image',
      'doc': 'document', 'docx': 'document',
      'xls': 'document', 'xlsx': 'document',
      'txt': 'document', 'csv': 'document'
    };
    return typeMap[ext || ''] || 'other';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Patient not found</p>
        <Button onClick={() => navigate('/crm/emr')} className="mt-4">Back to Directory</Button>
      </div>
    );
  }

  const tabs = [
    { id: 'visit-summary' as TabType, label: 'Visit Summary', icon: ClipboardList },
    { id: 'triage-vitals' as TabType, label: 'Triage & Vitals', icon: Thermometer },
    { id: 'clinical-notes' as TabType, label: 'Clinical Notes', icon: Stethoscope },
    { id: 'orders-services' as TabType, label: 'Orders & Services', icon: Activity },
    { id: 'medications-pharmacy' as TabType, label: 'Medications', icon: Pill },
    { id: 'diagnostics-files' as TabType, label: 'Diagnostics', icon: FlaskConical },
    { id: 'billing' as TabType, label: 'Billing', icon: DollarSign },
    { id: 'history' as TabType, label: 'History', icon: History },
  ];

  return (
    <div>
      <PageHeader
        title="Electronic Medical Records (EMR)"
        subtitle={
          mode === 'active'
            ? `🟢 Active Visit in Progress - ${patient.name}`
            : `⚪ No Active Visit - ${patient.name}`
        }
        backTo={location.state?.from || '/crm/emr'}
        backText="Back to Previous Page"
      />

      {mode === 'view' && (
        <div className="flex gap-2 mb-4">
          {scheduledAppointment ? (
            <Button
              onClick={handleSendReminder}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Reminder
            </Button>
          ) : (
            <Button
              onClick={handleQuickStartVisit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting Visit...
                </span>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Quick Start Visit
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setActiveTab('history')}
          >
            <History className="w-4 h-4 mr-2" />
            View Past Visits
          </Button>
        </div>
      )}

      {/* Patient Info Header */}
      <div className="bg-white rounded-lg p-6 shadow mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-blue-50 flex items-center justify-center text-3xl font-bold text-blue-600">
              {patient?.imageUrl || patient?.photo ? (
                <img src={patient.imageUrl || patient.photo} alt={patient.name} className="w-full h-full object-cover" />
              ) : (
                patient?.name?.[0] || 'P'
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{patient.name}</h2>
              <p className="text-sm text-gray-600"><span className="font-medium">Pet ID:</span> {patient.id}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Species:</span> {patient.species || 'N/A'}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Breed:</span> {patient.breed || 'N/A'}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Age:</span> {patient.age ? `${patient.age} years` : 'N/A'}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Status:</span> {patient.currentStatus || patient.status || 'N/A'}</p>
            </div>
          </div>

          {owner && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 min-w-[320px]">
              <h4 className="font-bold text-blue-900 mb-3 text-sm uppercase tracking-wider">Owner Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700/70 font-medium">Name:</span>
                  <span className="text-blue-900 font-semibold">{owner?.displayName || owner?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700/70 font-medium">Email:</span>
                  <span className="text-blue-900 underline decoration-blue-200">{owner?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700/70 font-medium">Phone:</span>
                  <span className="text-blue-900">{owner?.phone || patient?.ownerPhone || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Encounter Selector */}
        {encounters.length > 0 && (
          <div className="border-t pt-4">
            <Label className="text-sm font-medium text-gray-600">Select Encounter:</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {encounters.map((enc: any) => (
                <Button
                  key={enc.id}
                  variant={selectedEncounter?.id === enc.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedEncounter(enc)}
                  className={cn(
                    selectedEncounter?.id === enc.id
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                  )}
                >
                  {enc.startedAt?.toDate?.()?.toLocaleDateString?.() || 'New'}
                  {enc.status === 'in-progress' && (
                    <span className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-3 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2',
                activeTab === tab.id
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'text-blue-600 border-blue-200 hover:bg-blue-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'visit-summary' && (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Visit Summary</h3>
            {selectedEncounter ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Encounter ID</p>
                    <p className="font-medium">{selectedEncounter.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    {getStatusBadge(selectedEncounter.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Started At</p>
                    <p className="font-medium">
                      {selectedEncounter.startedAt?.toDate?.()?.toLocaleString?.() || 
                       selectedEncounter.createdAt?.toDate?.()?.toLocaleString?.() || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Doctor</p>
                    <p className="font-medium">{selectedEncounter.doctorName || 'N/A'}</p>
                  </div>
                </div>

                {appointmentServices.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Services</p>
                    <div className="space-y-2">
                      {appointmentServices.map((srv: any) => (
                        <div key={srv.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{srv.serviceName}</p>
                            <p className="text-sm text-gray-500">{srv.serviceType} • {srv.status}</p>
                          </div>
                          <p className="font-bold">₱{srv.unitPrice * srv.quantity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No encounter selected. Please select or start a new appointment.</p>
            )}
          </div>
        )}

        {activeTab === 'triage-vitals' && (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Triage & Vitals</h3>

            {/* Current Vitals Form */}
            <div className="mb-8">
              <h4 className="font-semibold mb-3">Current Vitals</h4>
              <form onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                saveVitals();
              }} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="weightKg">Weight (kg)</Label>
                    <Input
                      id="weightKg"
                      name="weightKg"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.weightKg || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="temperatureC">Temperature (°C)</Label>
                    <Input
                      id="temperatureC"
                      name="temperatureC"
                      type="number"
                      step="0.1"
                      min="35"
                      max="45"
                      value={formData.temperatureC || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="38.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="heartRateBpm">Heart Rate (bpm)</Label>
                    <Input
                      id="heartRateBpm"
                      name="heartRateBpm"
                      type="number"
                      value={formData.heartRateBpm || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="120"
                    />
                  </div>
                  <div>
                    <Label htmlFor="respiratoryRateRpm">Respiratory Rate (rpm)</Label>
                    <Input
                      id="respiratoryRateRpm"
                      name="respiratoryRateRpm"
                      type="number"
                      value={formData.respiratoryRateRpm || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mmColor">MM Color</Label>
                    <Input
                      id="mmColor"
                      name="mmColor"
                      value={formData.mmColor || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="Pink"
                    />
                  </div>
                  <div>
                    <Label htmlFor="crtSeconds">CRT (seconds)</Label>
                    <Input
                      id="crtSeconds"
                      name="crtSeconds"
                      type="number"
                      step="0.1"
                      value={formData.crtSeconds || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="2"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={savingVitals}
                >
                  {savingVitals ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Vitals'
                  )}
                </Button>
              </form>
            </div>

            {/* Historical Vitals Chart */}
            {triageVitals.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Historical Trends</h4>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={triageVitals.map((v: any) => ({
                      date: v.createdAt?.toDate?.()?.toLocaleDateString?.() || '',
                      weight: v.weightKg || 0,
                      temp: v.temperatureC || 0,
                      hr: v.heartRateBpm || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#3b82f6" name="Weight (kg)" />
                      <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#ef4444" name="Temp (°C)" />
                      <Line yAxisId="right" type="monotone" dataKey="hr" stroke="#10b981" name="HR (bpm)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'clinical-notes' && (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Clinical Notes (SOAP)</h3>
            <form onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              saveClinicalNotes();
            }} className="space-y-4">
              <div>
                <Label htmlFor="subjective">Subjective</Label>
                <Textarea
                  id="subjective"
                  name="subjective"
                  value={formData.subjective || clinicalNotes?.subjective || ''}
                  onChange={handleInputChange}
                  className="mt-1"
                  rows={3}
                  placeholder="Patient history, owner's complaints..."
                />
              </div>
              <div>
                <Label htmlFor="objective">Objective</Label>
                <Textarea
                  id="objective"
                  name="objective"
                  value={formData.objective || clinicalNotes?.objective || ''}
                  onChange={handleInputChange}
                  className="mt-1"
                  rows={3}
                  placeholder="Physical examination findings, vitals..."
                />
              </div>
              <div>
                <Label htmlFor="assessment">Assessment</Label>
                <Textarea
                  id="assessment"
                  name="assessment"
                  value={formData.assessment || clinicalNotes?.assessment || ''}
                  onChange={handleInputChange}
                  className="mt-1"
                  rows={3}
                  placeholder="Diagnosis, differential diagnosis..."
                />
              </div>
              <div>
                <Label htmlFor="plan">Plan</Label>
                <Textarea
                  id="plan"
                  name="plan"
                  value={formData.plan || clinicalNotes?.plan || ''}
                  onChange={handleInputChange}
                  className="mt-1"
                  rows={3}
                  placeholder="Treatment plan, medications..."
                />
              </div>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={savingNotes}
              >
                {savingNotes ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Clinical Notes'
                )}
              </Button>
            </form>
          </div>
        )}

        {activeTab === 'orders-services' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Orders & Services</h3>
              <Button onClick={() => setShowAddForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </div>

            {showAddForm && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold mb-3">Add New Service</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Service</Label>
                    <select
                      name="serviceCatalogId"
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2 border rounded-lg bg-white"
                    >
                      <option value="">Select service...</option>
                      {serviceCatalog.map((srv: any) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name} (₱{srv.defaultPrice})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      name="quantity"
                      type="number"
                      min="1"
                      defaultValue="1"
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => addService()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {appointmentServices.map((srv: any) => (
                <div key={srv.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{srv.serviceName}</p>
                      <p className="text-sm text-gray-500">
                        {srv.serviceType} • {srv.source} • Qty: {srv.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₱{srv.unitPrice * srv.quantity}</p>
                      {getStatusBadge(srv.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'medications-pharmacy' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Medications / Pharmacy</h3>
              <Button onClick={() => setShowAddForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Prescribe
              </Button>
            </div>

            {showAddForm && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold mb-3">Prescribe Medication</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Medication</Label>
                    <select
                      name="serviceCatalogId"
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2 border rounded-lg bg-white"
                    >
                      <option value="">Select medication...</option>
                      {serviceCatalog
                        .filter((s: any) => s.category === 'medication')
                        .map((srv: any) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.name} (₱{srv.defaultPrice})
                          </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Dosage</Label>
                    <Input
                      name="dosage"
                      value={formData.dosage || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="e.g., 1 tablet twice daily"
                    />
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Input
                      name="frequency"
                      value={formData.frequency || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="e.g., for 7 days"
                    />
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input
                      name="duration"
                      value={formData.duration || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="e.g., 7 days"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => prescribeMedication()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Prescribe
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Prescriptions */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Prescriptions</h4>
              <div className="space-y-2">
                {prescriptions.map((rx: any) => (
                  <div key={rx.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{rx.medicationName}</p>
                        <p className="text-sm text-gray-500">
                          {rx.dosage} • {rx.frequency} • {rx.duration}
                        </p>
                        <p className="text-xs text-gray-400">Prescribed by: {rx.prescribedBy}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {rx.status === 'prescribed' && (
                          <Button
                            size="sm"
                            onClick={() => dispenseMedication(rx.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Dispense
                          </Button>
                        )}
                        {getStatusBadge(rx.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispensing Records */}
            <div>
              <h4 className="font-semibold mb-3">Dispensing Records</h4>
              <div className="space-y-2">
                {dispensingRecords.map((disp: any) => (
                  <div key={disp.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{disp.medicationName}</p>
                        <p className="text-sm text-gray-500">
                          Qty Dispensed: {disp.quantityDispensed} • ₱{disp.totalPrice}
                        </p>
                        <p className="text-xs text-gray-400">Dispensed by: {disp.dispensedBy}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Dispensed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diagnostics-files' && (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Diagnostics & Files</h3>

            {/* Lab Orders */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Lab Orders</h4>
              <div className="space-y-2">
                {labOrders.map((lab: any) => (
                  <div key={lab.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{lab.testName}</p>
                        <p className="text-sm text-gray-500">{lab.testCode}</p>
                        {lab.resultSummary && (
                          <p className="text-sm mt-1">{lab.resultSummary}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {getStatusBadge(lab.status)}
                        {lab.resultFileUrl && (
                          <a
                            href={lab.resultFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm mt-1 block"
                          >
                            <Eye className="w-4 h-4 inline mr-1" />
                            View Result
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Files & Attachments</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileUpload(e)}
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <Button
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {attachments.map((att: any) => (
                  <div key={att.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{att.fileName}</p>
                      <p className="text-sm text-gray-500">{att.fileType}</p>
                      <p className="text-xs text-gray-400">Uploaded by: {att.uploadedBy}</p>
                    </div>
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Billing</h3>
              {invoice && invoice.status !== 'paid' && (
                <Button
                  onClick={() => setShowPaymentDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </div>

            {invoice ? (
              <div>
                {/* Invoice Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold">Invoice #{invoice.invoiceNo}</h4>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Subtotal</p>
                      <p className="font-bold text-lg">₱{invoice.subTotal?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Discount</p>
                      <p className="font-bold text-lg">₱{invoice.discountTotal?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Grand Total</p>
                      <p className="font-bold text-lg text-blue-600">₱{invoice.grandTotal?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Paid</p>
                      <p className="font-bold text-lg text-green-600">₱{invoice.amountPaid?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Balance Due</p>
                      <p className="font-bold text-lg text-red-600">₱{invoice.balanceDue?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">Invoice Items</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Qty</th>
                        <th className="text-right p-3">Unit Price</th>
                        <th className="text-right p-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item: any) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{item.description}</td>
                          <td className="p-3">{item.itemType}</td>
                          <td className="p-3">{item.quantity}</td>
                          <td className="p-3 text-right">₱{item.unitPrice?.toFixed(2)}</td>
                          <td className="p-3 text-right font-medium">₱{item.lineTotal?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Payments */}
                {payments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Payments</h4>
                    <div className="space-y-2">
                      {payments.map((pay: any) => (
                        <div key={pay.id} className="p-3 bg-green-50 rounded-lg flex justify-between">
                          <div>
                            <p className="font-medium">₱{pay.amount?.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">{pay.paymentMethod} • {pay.referenceNo}</p>
                          </div>
                          <p className="text-sm text-gray-400">
                            {pay.paidAt?.toDate?.()?.toLocaleDateString?.()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No invoice generated yet.</p>
                <Button
                  onClick={generateDraftInvoice}
                  disabled={generatingInvoice}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {generatingInvoice ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    'Generate Draft Invoice'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Visit History</h3>
            <div className="space-y-3">
              {encounters.map((enc: any) => (
                <div
                  key={enc.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors ${
                    selectedEncounter?.id === enc.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedEncounter(enc)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {enc.startedAt?.toDate?.()?.toLocaleDateString?.() || 'New Visit'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {enc.appointmentId ? 'Appointment' : 'Walk-in'} • {enc.doctorName || 'N/A'}
                      </p>
                    </div>
                    {getStatusBadge(enc.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Compact Audit Trail Card */}
      {auditLogs.length > 0 && (
        <div className="mt-6 mx-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditLogs
                  .sort((a: any, b: any) => {
                    const aTime = a.timestamp?.toDate?.()?.getTime() || 0;
                    const bTime = b.timestamp?.toDate?.()?.getTime() || 0;
                    return bTime - aTime;
                  })
                  .slice(0, 10)
                  .map((log: any, idx: number) => (
                    <div key={log.id || idx} className="text-sm flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span className="font-medium capitalize">{log.action || log.event}</span>
                        {log.details && <span className="text-gray-600 ml-2 text-xs">{log.details}</span>}
                        <span className="text-gray-500 ml-2 text-xs">by {log.userId || log.staff}</span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {log.timestamp?.toDate?.()?.toLocaleDateString?.() || 'N/A'}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount (₱)</Label>
              <Input
                type="number"
                value={paymentData.amount || invoice?.balanceDue || 0}
                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Balance due: ₱{invoice?.balanceDue?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <Label>Payment Method</Label>
              <select
                value={paymentData.method}
                onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                className="w-full mt-1 p-2 border rounded-lg bg-white"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="gcash">GCash</option>
                <option value="bank-transfer">Bank Transfer</option>
                <option value="check">Check</option>
              </select>
            </div>
            <div>
              <Label>Reference No. (Optional)</Label>
              <Input
                value={paymentData.referenceNo}
                onChange={(e) => setPaymentData({ ...paymentData, referenceNo: e.target.value })}
                placeholder="Transaction reference"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button
              onClick={handleRecordPayment}
              disabled={recordingPayment}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {recordingPayment ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </span>
              ) : (
                'Record Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Doctor Selector Dialog for Quick Start Visit */}
      <Dialog open={showDoctorDialog} onOpenChange={setShowDoctorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Doctor for Quick Start</DialogTitle>
            <DialogDescription>
              Choose a doctor who is scheduled to be on-duty at this time. 
              Quick Start is for walk-in/emergency visits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableDoctors.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No doctors available at this time.</p>
              ) : (
                availableDoctors.map(doc => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedDoctorId === doc.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedDoctorId(doc.id);
                      setSelectedDoctorName(doc.name);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.specialization || 'General'}</p>
                      </div>
                      {selectedDoctorId === doc.id && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDoctorDialog(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!selectedDoctorId || loading}
              onClick={confirmQuickStart}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting Visit...
                </span>
              ) : (
                'Confirm Quick Start'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function getStatusBadge(status: string) {
    switch (status) {
      case 'in-progress':
        return <Badge className="bg-blue-600 text-white">In Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'paid':
        return <Badge className="bg-green-600 text-white">Paid</Badge>;
      case 'partially-paid':
        return <Badge className="bg-yellow-600 text-white">Partially Paid</Badge>;
      case 'ordered':
        return <Badge className="bg-purple-600 text-white">Ordered</Badge>;
      case 'prescribed':
        return <Badge className="bg-indigo-600 text-white">Prescribed</Badge>;
      case 'dispensed':
        return <Badge className="bg-teal-600 text-white">Dispensed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }
}
