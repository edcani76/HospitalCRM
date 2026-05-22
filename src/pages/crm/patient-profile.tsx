// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Activity,
  Heart,
  ShieldAlert,
  Edit,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Camera,
  X,
  Upload,
  RefreshCw,
  Check,
  Thermometer,
  CreditCard,
  Plus,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Syringe,
  Scale,
  PhilippinePeso,
  Pill
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { PageHeader } from '../../components/ui/page-header';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../../components/ui/drawer';
import { db, auth, collection, getDocs, getDoc, addDoc, updateDoc, doc, query, where, serverTimestamp } from '../../firebase';
import PetDialog from '../../components/crm/pet-dialog';
import { uploadToGoogleDrive } from '../../lib/google-drive';
import { addAuditLog } from '../../lib/firestore-helpers';

interface PatientProfile {
  id: string;
  name: string;
  ownerUid?: string;
  ownerName?: string;
  species: string;
  breed: string;
  color?: string;
  gender?: string;
  weight: number;
  weightHistory?: any[];
  currentStatus: string;
  dateOfBirth?: string;
  bloodType?: string;
  photo?: string;
  imageUrl?: string;
  medicalHistory?: string;
  auditTrail?: any[];
  recentVisits?: any[];
  patientId?: string;
  status?: string;
  size?: string;
  microchipId?: string;
  contact?: string;
  email?: string;
  address?: string;
}

export default function PatientProfilePage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [users, setUsers] = useState<{ [uid: string]: any }>({});
  const [isPhotoActionModalOpen, setIsPhotoActionModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);

  // Find the selected patient from Firebase
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [encounterVisits, setEncounterVisits] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [scheduledAppointment, setScheduledAppointment] = useState<any>(null);
  const [startingVisit, setStartingVisit] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Doctor selector for Quick Start
  const [showDoctorDialog, setShowDoctorDialog] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<Array<{ id: string; name: string; availability?: any }>>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDoctorName, setSelectedDoctorName] = useState('');
  
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        // Find pet by patientId (format: P-${doc.id.slice(0, 8)})
        const petsSnapshot = await getDocs(collection(db, 'pets'));
        const pets = petsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            patientId: `P-${doc.id.slice(0, 8)}`,
            ownerUid: data.ownerUid || '',
            weight: data.weight || 0,
            currentStatus: data.currentStatus || 'active',
          } as PatientProfile;
        });

        const foundPet = pets.find(p => p.patientId === patientId || p.id === patientId);

        if (foundPet) {
          // Fetch owner details
          if (foundPet.ownerUid) {
            const ownerDoc = await getDoc(doc(db, 'users', foundPet.ownerUid));
            const ownerData = ownerDoc.data();
            foundPet.ownerName = ownerData?.displayName || 'Unknown';
            foundPet.contact = ownerData?.phoneNumber || '';
            foundPet.email = ownerData?.email || '';
            foundPet.address = ownerData?.address || '';
          }

          // Map Firebase fields to UI fields
          foundPet.status = foundPet.currentStatus;
          foundPet.size = foundPet.weight > 25 ? 'Large' : foundPet.weight > 10 ? 'Medium' : 'Small';
          foundPet.medicalHistory = foundPet.medicalHistory || '';

          setPatient(foundPet);

          // Fetch related data
          const appQuery = query(collection(db, 'appointments'), where('petId', '==', foundPet.id));
          const appSnapshot = await getDocs(appQuery);
          setAppointments(appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          
          // Check for scheduled appointments (unconfirmed/confirmed) that haven't started
          const { fetchEncounters } = await import('../../lib/firestore-helpers');
          const encounters = await fetchEncounters(foundPet.id);
          setEncounterVisits(encounters);
          const scheduled = appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).find((apt: any) =>
            (apt.status === 'unconfirmed' || apt.status === 'confirmed') &&
            !encounters.some((enc: any) => enc.appointmentId === apt.id)
          );
          setScheduledAppointment(scheduled || null);

          const repQuery = query(collection(db, 'reports'), where('petId', '==', foundPet.id));
          const repSnapshot = await getDocs(repQuery);
          setReports(repSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          const invQuery = query(collection(db, 'invoices'), where('petId', '==', foundPet.id));
          const invSnapshot = await getDocs(invQuery);
          setInvoices(invSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          // Fallback to first pet
          if (pets.length > 0) {
            pets[0].status = pets[0].currentStatus;
            pets[0].size = pets[0].weight > 25 ? 'Large' : pets[0].weight > 10 ? 'Medium' : 'Small';
            setPatient(pets[0]);
          }
        }

        // Fetch users for PetDialog
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData: { [uid: string]: any } = {};
        usersSnapshot.docs.forEach(doc => {
          usersData[doc.id] = doc.data();
        });
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching patient:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  const nextAppointment = useMemo(() => {
    return appointments
      .filter((a: any) => a.status !== 'cancelled' && a.status !== 'completed')
      .sort((a: any, b: any) => new Date(a.date + 'T' + (a.time || '00:00')).getTime() - new Date(b.date + 'T' + (b.time || '00:00')).getTime())[0] || null;
  }, [appointments]);

  const lastVisit = useMemo(() => {
    const completed = encounterVisits.filter((e: any) => e.status === 'completed' || e.status === 'medical-completed');
    if (completed.length > 0) return completed[0];
    const doneAppts = appointments.filter((a: any) => a.status === 'completed');
    if (doneAppts.length > 0) return doneAppts[0];
    return null;
  }, [encounterVisits, appointments]);

  const outstandingBalance = useMemo(() => {
    return invoices.reduce((sum: number, inv: any) => {
      const bal = inv.balanceDue ?? (inv.grandTotal ?? inv.amount ?? 0) - (inv.amountPaid ?? 0);
      return sum + (bal > 0 ? bal : 0);
    }, 0);
  }, [invoices]);

  const totalInvoiced = useMemo(() => {
    return invoices.reduce((sum: number, inv: any) => sum + (inv.grandTotal ?? inv.amount ?? 0), 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return invoices.reduce((sum: number, inv: any) => sum + (inv.amountPaid ?? 0), 0);
  }, [invoices]);

  if (loading) {
    return <div className="p-8 text-center">Loading patient profile...</div>;
  }

  if (!patient) {
    return <div className="p-8 text-center">Patient not found</div>;
  }

  // Sort weight history chronologically (early dates on left)
  const sortedWeightHistory = [...(patient.weightHistory || [])].sort((a: any, b: any) => 
    a.date.localeCompare(b.date)
  );

  const getAuditStats = () => {
    const stats: { [key: string]: number } = {};
    (patient.auditTrail || []).forEach((item: any) => {
      const name = item.userId || item.staff || 'Unknown';
      stats[name] = (stats[name] || 0) + 1;
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  };

  const auditStats = getAuditStats();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setTempPhoto(dataUrl);
        setIsCameraModalOpen(false);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSave = async () => {
    if (!patient) return;

    if (tempPhoto && tempPhoto.startsWith('data:')) {
      try {
        const response = await fetch(tempPhoto);
        const blob = await response.blob();
        const file = new File([blob], 'pet-photo.jpg', { type: 'image/jpeg' });

        const ownerName = patient.ownerName || 'Unknown';
        const petName = patient.name;
        const result = await uploadToGoogleDrive(file, { ownerName, petName, fileType: 'photos' });
        const finalImageUrl = result.downloadUrl || result.webViewLink;

        await updateDoc(doc(db, 'pets', patient.id), {
          imageUrl: finalImageUrl,
          auditTrail: [
            ...(patient.auditTrail || []),
            {
              id: Date.now().toString(),
              event: 'Profile Photo Updated',
              staff: 'Admin User',
              timestamp: new Date().toLocaleString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
              })
            }
          ]
        });

        addAuditLog({
          action: 'pet_updated',
          userId: auth.currentUser?.uid || 'unknown',
          userName: auth.currentUser?.displayName || 'Unknown',
          patientId: patient.id,
          details: 'Profile photo updated'
        });

        setPatient({ ...patient, imageUrl: finalImageUrl });
        setIsPhotoActionModalOpen(false);
        setTempPhoto(null);
      } catch (error) {
        console.error('Error saving photo:', error);
        alert('Failed to save photo. Please try again.');
      }
    }
  };

  const handleEditSubmit = async (formData: any) => {
    if (!patient) return;
    setIsSaving(true);

    try {
      let imageUrl = patient.imageUrl || patient.photo || '';
      if (formData.photoFile) {
        const ownerName = patient.ownerName || 'Unknown';
        const result = await uploadToGoogleDrive(formData.photoFile, {
          ownerName,
          petName: patient.name,
          fileType: 'photos',
        });
        imageUrl = result.downloadUrl || result.webViewLink;
      }

      const updatedData: Record<string, any> = {
        name: formData.name,
        species: formData.species,
        breed: formData.breed,
        ownerUid: formData.ownerUid || patient.ownerUid || null,
        weight: formData.weight ?? patient.weight ?? null,
        dateOfBirth: formData.dateOfBirth || patient.dateOfBirth || null,
        gender: formData.gender || patient.gender || null,
        bloodType: formData.bloodType || patient.bloodType || null,
        color: formData.color || patient.color || null,
        microchipId: formData.microchipId || patient.microchipId || null,
        medicalHistory: formData.medicalHistory || patient.medicalHistory || null,
        imageUrl: imageUrl || null,
        // Alerts & Warnings
        allergies: formData.allergies || patient.allergies || null,
        chronicConditions: formData.chronicConditions || patient.chronicConditions || null,
        aggressionWarning: formData.aggressionWarning ?? patient.aggressionWarning ?? null,
        aggressionNotes: formData.aggressionNotes || patient.aggressionNotes || null,
        specialHandlingNotes: formData.specialHandlingNotes || patient.specialHandlingNotes || null,
        medicationReactions: formData.medicationReactions || patient.medicationReactions || null,
        contagiousDiseaseFlag: formData.contagiousDiseaseFlag ?? patient.contagiousDiseaseFlag ?? null,
        contagiousDiseaseNotes: formData.contagiousDiseaseNotes || patient.contagiousDiseaseNotes || null,
        auditTrail: [
          ...(patient.auditTrail || []),
          {
            id: Date.now().toString(),
            event: 'Record Updated',
            staff: 'Admin User',
            timestamp: new Date().toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          }
        ]
      };

      await updateDoc(doc(db, 'pets', patient.id), updatedData);

      addAuditLog({
        action: 'pet_updated',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        patientId: patient.id,
        details: `Patient record updated: ${formData.name || patient.name}`
      });

      setPatient({ ...patient, ...updatedData });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to update patient. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStartVisit = async () => {
    if (!patient) return;
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
    if (!patient) return;
    setStartingVisit(true);
    setShowDoctorDialog(false);
    try {
      const userUid = auth.currentUser?.uid || 'unknown';
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      // 1. Create appointment
      const aptData = {
        clientUid: patient.ownerUid || '',
        petId: patient.id,
        petName: patient.name,
        doctorId: selectedDoctorId,
        doctorName: selectedDoctorName,
        date: dateStr,
        time: timeStr,
        status: 'unconfirmed',
        mode: 'walk-in',
        notes: `Services: consultation\nMode: Walk-in`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const aptRef = await addDoc(collection(db, 'appointments'), aptData);
      addAuditLog({
        action: 'appointment_created',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        patientId: patient.id,
        details: `Walk-in appointment created for ${patient.name}`
      });
      const aptId = aptRef.id;

      // 2. Auto-confirm appointment
      await updateDoc(doc(db, 'appointments', aptId), {
        status: 'confirmed',
        updatedAt: serverTimestamp()
      });
      addAuditLog({
        action: 'appointment_confirmed',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        patientId: patient.id,
        appointmentId: aptId,
        details: `Appointment auto-confirmed for walk-in visit`
      });
      
      // 3. Create encounter (Quick Start)
      const encounterData = {
        appointmentId: aptId,
        petId: patient.id,
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
      addAuditLog({
        action: 'encounter_created',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown',
        patientId: patient.id,
        encounterId: encRef.id,
        details: `Walk-in encounter created for ${patient.name} with Dr. ${selectedDoctorName}`
      });
      const encounterId = encRef.id;
      
      // 4. Create initial services
      // Parse services from notes (Services: consultation, grooming) or default to consultation
      const notesStr = `Services: consultation\nMode: Walk-in`;
      const serviceTypes = notesStr.match(/Services:\s*([^\n]+)/i)?.[1]?.split(',').map((s: string) => s.trim()).filter(Boolean) || ['consultation'];
      
      for (const svcType of serviceTypes) {
        const serviceFee = svcType === 'consultation' ? 500 : svcType === 'grooming' ? 800 : svcType === 'vaccination' ? 300 : 1000;
        const serviceData = {
          appointmentId: aptId,
          encounterId: encounterId,
          petId: patient.id,
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
          performedBy: selectedDoctorName || userUid,
          completedAt: null,
          createdBy: userUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        const svcRef = await addDoc(collection(db, 'appointment_services'), serviceData);
        addAuditLog({
          action: 'service_created',
          userId: auth.currentUser?.uid || 'unknown',
          userName: auth.currentUser?.displayName || 'Unknown',
          patientId: patient.id,
          encounterId: encounterId,
          details: `Service "${svcType}" created for walk-in visit`
        });
      }
      
      // 5. Navigate directly to EMR with encounterId
      navigate(`/crm/emr/${patient.id}`, {
        state: { encounterId }
      });
    } catch (error) {
      console.error('Error quick starting visit:', error);
      alert('Error starting visit. Please try again.');
      setStartingVisit(false);
    }
  };

  // Tab type
  type TabType = 'overview' | 'medical-history' | 'appointments' | 'preventive' | 'medications' | 'admissions' | 'billing' | 'activity';

  const getAge = () => {
    if (patient.dateOfBirth) {
      const dob = new Date(patient.dateOfBirth + 'T00:00:00');
      const years = Math.floor((Date.now() - dob.getTime()) / 31557600000);
      if (years >= 1) return `${years} year${years > 1 ? 's' : ''}`;
      const months = Math.floor((Date.now() - dob.getTime()) / 2629800000);
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return '—';
  };

  const hasAlerts = !!(patient.allergies?.length || patient.aggressionWarning || patient.chronicConditions?.length || patient.medicationReactions?.length || patient.contagiousDiseaseFlag || patient.specialHandlingNotes);

  const formatDate = (d: any) => {
    if (!d) return '—';
    if (d.toDate) { try { return d.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch {} }
    if (typeof d === 'string') return d;
    return '—';
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'medical-history', label: 'Medical History' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'preventive', label: 'Preventive Care' },
    { key: 'medications', label: 'Medications' },
    { key: 'admissions', label: 'Admissions' },
    { key: 'billing', label: 'Billing' },
    { key: 'activity', label: 'Activity Log' },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* ==================== STICKY PET HEADER ==================== */}
      <div className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-start gap-4">
            {/* Photo */}
            <div className="relative shrink-0 group">
              <img
                src={patient.photo || patient.imageUrl || `https://ui-avatars.com/api/?name=${patient.name}&background=3b82f6&color=fff&size=128`}
                alt={patient.name}
                className="w-16 h-16 rounded-xl object-cover border border-stone-200 cursor-pointer"
                onClick={() => setIsLightboxOpen(true)}
              />
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-stone-900">{patient.name}</h1>
                <span className="text-sm text-stone-500">{patient.species}{patient.breed ? ` · ${patient.breed}` : ''}</span>
                {patient.gender && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${patient.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                    {patient.gender}
                  </span>
                )}
                <span className="text-xs text-stone-500">{getAge()}</span>
                {patient.weight && <span className="text-xs text-stone-500">{patient.weight} kg</span>}
                <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-xs">{patient.patientId}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-stone-600">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /><span className="font-medium">{patient.ownerName || 'Unknown'}</span></span>
                {patient.contact && <span className="flex items-center gap-1 text-xs text-stone-400"><Phone className="w-3 h-3" />{patient.contact}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${patient.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                  {patient.status || 'active'}
                </span>
              </div>
              {/* Medical Alerts */}
              {hasAlerts && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {patient.allergies?.map((a: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                      <AlertTriangle className="w-3 h-3" />Allergy: {a}
                    </span>
                  ))}
                  {patient.aggressionWarning && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                      <AlertTriangle className="w-3 h-3" />Aggressive
                    </span>
                  )}
                  {patient.chronicConditions?.map((c: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                      <Activity className="w-3 h-3" />{c}
                    </span>
                  ))}
                  {patient.contagiousDiseaseFlag && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-200 text-red-800 border border-red-300">
                      <AlertCircle className="w-3 h-3" />Contagious{patient.contagiousDiseaseNotes ? `: ${patient.contagiousDiseaseNotes}` : ''}
                    </span>
                  )}
                  {patient.specialHandlingNotes && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                      <AlertTriangle className="w-3 h-3" />{patient.specialHandlingNotes}
                    </span>
                  )}
                  {patient.medicationReactions?.map((r: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700 border border-pink-200">
                      <Pill className="w-3 h-3" />Reaction: {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Edit Button */}
            <Button variant="ghost" size="sm" className="text-stone-400 hover:text-blue-600" onClick={() => setIsEditModalOpen(true)} title="Edit Profile">
              <Edit className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={() => navigate(`/crm/emr/${patient.id}`, { state: { from: `/crm/patients/${patient.id}`, backText: 'Back to Patient Profile' } })}>
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Open EMR
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate(`/crm/appointments?petId=${patient.id}`)}>
            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule
          </Button>
          {scheduledAppointment ? (
            <Button size="sm" variant="outline" className="text-xs text-yellow-700 border-yellow-200 bg-yellow-50" onClick={() => navigate(`/crm/appointments/${scheduledAppointment.id}`)}>
              <Clock className="w-3.5 h-3.5 mr-1.5" /> View Scheduled
            </Button>
          ) : (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={handleQuickStartVisit} disabled={startingVisit}>
              {startingVisit ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              {startingVisit ? 'Starting...' : 'Quick Start Visit'}
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate(`/crm/billing`)}>
            <PhilippinePeso className="w-3.5 h-3.5 mr-1.5" /> Billing
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setIsPhotoActionModalOpen(true)}>
            <Camera className="w-3.5 h-3.5 mr-1.5" /> Photo
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200">
            <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Next Appointment</p>
            {nextAppointment ? (
              <div className="mt-0.5">
                <p className="text-sm font-bold text-stone-900">{new Date(nextAppointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {nextAppointment.time}</p>
                <p className="text-[10px] text-stone-500">{nextAppointment.doctorName}</p>
              </div>
            ) : <p className="text-xs text-stone-400 mt-0.5">None scheduled</p>}
          </div>
          <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200">
            <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Last Visit</p>
            {lastVisit ? (
              <div className="mt-0.5">
                <p className="text-sm font-bold text-stone-900">{formatDate(lastVisit.startedAt || lastVisit.date)}</p>
                <p className="text-[10px] text-stone-500">{lastVisit.doctorName || lastVisit.chiefComplaint || '—'}</p>
              </div>
            ) : <p className="text-xs text-stone-400 mt-0.5">No visits yet</p>}
          </div>
          <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200">
            <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Outstanding</p>
            <p className={`text-sm font-bold mt-0.5 ${outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              ₱{outstandingBalance.toLocaleString()}
            </p>
            <p className="text-[10px] text-stone-500">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200">
            <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Patient ID</p>
            <p className="text-sm font-bold text-stone-900 mt-0.5 font-mono">{patient.patientId}</p>
            <p className="text-[10px] text-stone-500">{patient.size || '—'} size</p>
          </div>
        </div>

        {/* Sticky Tabs */}
        <div className="px-4 border-t border-stone-100 overflow-x-auto">
          <div className="flex gap-0.5 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== TAB CONTENT ==================== */}
      <div className="p-4">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Pet Details */}
              <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" /> Pet Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Species</p><p className="text-sm font-medium">{patient.species}</p></div>
                  {patient.breed && <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Breed</p><p className="text-sm font-medium">{patient.breed}</p></div>}
                  {patient.gender && <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Gender</p><p className="text-sm font-medium">{patient.gender}</p></div>}
                  <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Age</p><p className="text-sm font-medium">{getAge()}</p></div>
                  {patient.dateOfBirth && <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Birthday</p><p className="text-sm font-medium">{patient.dateOfBirth}</p></div>}
                  {patient.weight && <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Weight</p><p className="text-sm font-medium">{patient.weight} kg</p></div>}
                  {patient.color && <div className="col-span-2"><p className="text-[10px] text-stone-500 uppercase font-semibold">Color/Markings</p><p className="text-sm font-medium">{patient.color}</p></div>}
                  {patient.microchipId && <div className="col-span-2"><p className="text-[10px] text-stone-500 uppercase font-semibold">Microchip ID</p><p className="text-sm font-medium font-mono">{patient.microchipId}</p></div>}
                  {patient.bloodType && <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Blood Type</p><p className="text-sm font-medium">{patient.bloodType}</p></div>}
                  <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Size</p><p className="text-sm font-medium">{patient.size || '—'}</p></div>
                </div>
              </div>

              {/* Medical History */}
              <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Medical History
                </h3>
                {patient.medicalHistory ? (
                  <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{patient.medicalHistory}</p>
                ) : (
                  <p className="text-sm text-stone-400 italic">No medical history recorded</p>
                )}
              </div>

              {/* Alerts Detail */}
              {hasAlerts && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Allergies & Alerts
                  </h3>
                  <div className="space-y-2">
                    {patient.allergies?.map((a: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-red-100 rounded-lg text-sm">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div><span className="font-bold text-red-700">Allergy:</span> <span className="text-red-600">{a}</span></div>
                      </div>
                    ))}
                    {patient.chronicConditions?.map((c: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-amber-100 rounded-lg text-sm">
                        <Activity className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div><span className="font-bold text-amber-700">Chronic:</span> <span className="text-amber-600">{c}</span></div>
                      </div>
                    ))}
                    {patient.medicationReactions?.map((r: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-pink-100 rounded-lg text-sm">
                        <Pill className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                        <div><span className="font-bold text-pink-700">Reaction:</span> <span className="text-pink-600">{r}</span></div>
                      </div>
                    ))}
                    {patient.aggressionWarning && (
                      <div className="flex items-start gap-2 p-2 bg-orange-100 rounded-lg text-sm">
                        <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <div><span className="font-bold text-orange-700">Behavior:</span> <span className="text-orange-600">{patient.aggressionNotes || 'Aggressive when restrained'}</span></div>
                      </div>
                    )}
                    {patient.specialHandlingNotes && (
                      <div className="flex items-start gap-2 p-2 bg-purple-100 rounded-lg text-sm">
                        <AlertTriangle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                        <div><span className="font-bold text-purple-700">Handling:</span> <span className="text-purple-600">{patient.specialHandlingNotes}</span></div>
                      </div>
                    )}
                    {patient.contagiousDiseaseFlag && (
                      <div className="flex items-start gap-2 p-2 bg-red-200 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div><span className="font-bold text-red-800">Contagious:</span> <span className="text-red-700">{patient.contagiousDiseaseNotes || 'Isolation recommended'}</span></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Columns */}
            <div className="lg:col-span-2 space-y-4">
              {/* Owner */}
              <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" /> Owner
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Name</p><p className="text-sm font-medium">{patient.ownerName || '—'}</p></div>
                  <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Phone</p><p className="text-sm font-medium">{patient.contact || '—'}</p></div>
                  <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Email</p><p className="text-sm font-medium truncate">{patient.email || '—'}</p></div>
                  <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Address</p><p className="text-sm font-medium truncate">{patient.address || '—'}</p></div>
                </div>
                {patient.ownerUid && (
                  <Button variant="link" className="p-0 h-auto text-xs text-blue-600 mt-2" onClick={() => navigate(`/crm/owners/${patient.ownerUid}`, { state: { from: `/crm/patients/${patient.id}`, fromEntity: patient.name } })}>
                    View Full Owner Profile →
                  </Button>
                )}
              </div>

              {/* Recent Visits */}
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" /> Recent Visits
                  </h3>
                  <button onClick={() => setActiveTab('medical-history')} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">View All</button>
                </div>
                <div className="p-4 space-y-2">
                  {encounterVisits.length > 0 ? (
                    [...encounterVisits].sort((a: any, b: any) => (b.startedAt?.toDate?.() || b.createdAt?.toDate?.() || 0) - (a.startedAt?.toDate?.() || a.createdAt?.toDate?.() || 0)).slice(0, 5).map((enc: any) => {
                      const encDate = enc.startedAt?.toDate?.() || enc.createdAt?.toDate?.();
                      const dateStr = encDate ? encDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                      const stale = enc.status === 'in-progress' && encDate && (Date.now() - encDate.getTime()) > 86400000;
                      return (
                        <div key={enc.id} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg">
                          <div>
                            <p className="text-sm font-bold text-stone-900">{dateStr}</p>
                            <p className="text-xs text-stone-500">{enc.doctorName || enc.chiefComplaint || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {stale && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              enc.status === 'completed' ? 'bg-green-100 text-green-700' :
                              enc.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-stone-100 text-stone-600'
                            }`}>{enc.status === 'in-progress' ? 'In Progress' : enc.status === 'completed' ? 'Completed' : enc.status}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : appointments.length > 0 ? (
                    [...appointments].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((apt: any) => (
                      <div key={apt.id} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg">
                        <div>
                          <p className="text-sm font-bold text-stone-900">{apt.date}</p>
                          <p className="text-xs text-stone-500">{apt.doctorName || '—'}</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-stone-100 text-stone-600">{apt.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-stone-400 italic text-center py-4">No visits recorded</p>
                  )}
                </div>
              </div>

              {/* Billing Summary */}
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <PhilippinePeso className="w-4 h-4 text-blue-600" /> Billing Summary
                  </h3>
                  <button onClick={() => setActiveTab('billing')} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">View All</button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-3 bg-stone-50 rounded-lg">
                      <p className="text-[10px] text-stone-500 uppercase font-semibold">Total Billed</p>
                      <p className="text-lg font-bold text-stone-900">₱{totalInvoiced.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-[10px] text-stone-500 uppercase font-semibold">Paid</p>
                      <p className="text-lg font-bold text-green-600">₱{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-[10px] text-stone-500 uppercase font-semibold">Balance</p>
                      <p className={`text-lg font-bold ${outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>₱{outstandingBalance.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEDICAL HISTORY TAB */}
        {activeTab === 'medical-history' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-900">Medical History Timeline</h2>
              <span className="text-xs text-stone-500">{encounterVisits.length} visit{encounterVisits.length !== 1 ? 's' : ''}</span>
            </div>
            {encounterVisits.length === 0 && appointments.filter((a: any) => a.status === 'completed').length === 0 ? (
              <div className="text-center py-12 text-stone-400 bg-white rounded-xl border border-stone-200">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No medical history yet</p>
                <p className="text-sm mt-1">Visits and consultations will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                      {[...encounterVisits].sort((a: any, b: any) => new Date(b.startedAt?.toDate?.() || b.date || 0).getTime() - new Date(a.startedAt?.toDate?.() || a.date || 0).getTime()).map((enc: any, idx: number) => (
                  <motion.div key={enc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                    className={`relative pl-8 pb-4 ${idx < encounterVisits.length - 1 ? 'border-l-2 border-blue-200' : ''}`}
                  >
                    <div className={`absolute left-[-8px] top-1 w-4 h-4 rounded-full border-2 ${
                      enc.status === 'completed' ? 'bg-green-500 border-green-200' :
                      enc.status === 'medical-completed' ? 'bg-purple-500 border-purple-200' :
                      'bg-blue-500 border-blue-200'
                    }`} />
                    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-stone-500">{formatDate(enc.startedAt)}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              enc.status === 'completed' ? 'bg-green-100 text-green-700' :
                              enc.status === 'medical-completed' ? 'bg-purple-100 text-purple-700' :
                              enc.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'
                            }`}>{enc.status || '—'}</span>
                          </div>
                          <h4 className="font-bold text-stone-900 mt-1">{enc.chiefComplaint || enc.diagnosis || 'Consultation'}</h4>
                          <p className="text-xs text-stone-500 mt-0.5">Dr. {enc.doctorName || '—'}</p>
                          {enc.diagnosis && (
                            <div className="mt-2 p-2 bg-stone-50 rounded-lg text-sm">
                              <span className="text-[10px] text-stone-500 uppercase font-semibold">Diagnosis: </span>
                              <span className="font-medium text-stone-800">{enc.diagnosis}</span>
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate(`/crm/emr/${enc.petId || patient.id}`)}>View Details</Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-900">Appointments</h2>
            </div>
            {appointments.length === 0 ? (
              <div className="text-center py-12 text-stone-400 bg-white rounded-xl border border-stone-200">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No appointments</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Doctor</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Notes</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                      {[...appointments].sort((a: any, b: any) => new Date(b.date + 'T' + (b.time || '00:00')).getTime() - new Date(a.date + 'T' + (a.time || '00:00')).getTime()).map((apt: any) => (
                      <tr key={apt.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-bold text-stone-700">{new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <p className="text-xs text-stone-400">{apt.time}</p>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{apt.doctorName}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            apt.status === 'unconfirmed' ? 'bg-yellow-100 text-yellow-700' :
                            apt.status === 'completed' ? 'bg-stone-100 text-stone-600' :
                            apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{apt.status}</span>
                        </td>
                        <td className="px-4 py-3 text-stone-500 text-xs max-w-[200px] truncate">{apt.notes || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="link" size="sm" className="text-blue-600 text-xs" onClick={() => navigate(`/crm/appointments/${apt.id}`)}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PREVENTIVE CARE TAB */}
        {activeTab === 'preventive' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-stone-900 mb-4">Preventive Care</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                  <Syringe className="w-4 h-4 text-blue-600" /> Vaccines
                </h3>
                <div className="text-center py-8 text-stone-400">
                  <Syringe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No vaccine records yet</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" /> Deworming
                </h3>
                <div className="text-center py-8 text-stone-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No deworming records yet</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEDICATIONS TAB */}
        {activeTab === 'medications' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-stone-900 mb-4">Medications</h2>
            <div className="text-center py-12 text-stone-400 bg-white rounded-xl border border-stone-200">
              <Pill className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No medications recorded</p>
              <p className="text-sm mt-1">Prescriptions from consultations will appear here.</p>
            </div>
          </div>
        )}

        {/* ADMISSIONS TAB */}
        {activeTab === 'admissions' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-stone-900 mb-4">Admissions & Confinement</h2>
            <div className="text-center py-12 text-stone-400 bg-white rounded-xl border border-stone-200">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No admissions recorded</p>
              <p className="text-sm mt-1">Admission records will appear here.</p>
            </div>
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-900">Billing & Invoices</h2>
              <Button size="sm" variant="outline" onClick={() => navigate('/crm/billing')}>
                <PhilippinePeso className="w-4 h-4 mr-1.5" /> Full Billing
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm text-center">
                <p className="text-[10px] text-stone-500 uppercase font-semibold">Total Billed</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">₱{totalInvoiced.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm text-center">
                <p className="text-[10px] text-stone-500 uppercase font-semibold">Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-1">₱{totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm text-center">
                <p className="text-[10px] text-stone-500 uppercase font-semibold">Outstanding</p>
                <p className={`text-2xl font-bold mt-1 ${outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>₱{outstandingBalance.toLocaleString()}</p>
              </div>
            </div>
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-stone-400 bg-white rounded-xl border border-stone-200">
                <PhilippinePeso className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No invoices yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {invoices.map((inv: any) => {
                      const total = inv.grandTotal ?? inv.amount ?? 0;
                      const paid = inv.amountPaid ?? 0;
                      const bal = inv.balanceDue ?? (total - paid);
                      return (
                        <tr key={inv.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-xs">{inv.invoiceNo || `INV-${inv.id?.slice(-6)}`}</td>
                          <td className="px-4 py-3 text-stone-600 text-xs">{formatDate(inv.createdAt || inv.date)}</td>
                          <td className="px-4 py-3 text-right font-bold">₱{total.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-green-600">₱{paid.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-right font-bold ${bal > 0 ? 'text-orange-600' : 'text-green-600'}`}>₱{bal.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                              inv.status === 'unpaid' || inv.status === 'active' ? 'bg-red-100 text-red-700' :
                              inv.status === 'partial' || inv.status === 'partially-paid' ? 'bg-orange-100 text-orange-700' :
                              inv.status === 'draft' ? 'bg-stone-100 text-stone-600' :
                              inv.status === 'overdue' ? 'bg-red-200 text-red-800' : 'bg-stone-100 text-stone-600'
                            }`}>{inv.status || '—'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'activity' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-stone-900 mb-4">Activity Log</h2>
            <Card>
              <CardContent className="p-4">
                {patient.auditTrail && patient.auditTrail.length > 0 ? (
                  <div className="space-y-3">
                    {patient.auditTrail
                      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 50)
                      .map((log: any, idx: number) => (
                      <div key={log.id || idx} className="text-sm border-b border-stone-100 pb-2 last:border-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium text-stone-700">{log.action || log.event}</span>
                            {log.reason && <span className="text-stone-500 ml-1">{log.reason}</span>}
                          </div>
                          <span className="text-xs text-stone-400 whitespace-nowrap ml-2">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-xs text-stone-400">by {log.userId || log.staff}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-400 italic text-center py-8">No activity recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* Reusable Pet Dialog for Edit */}
      <PetDialog
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        mode="edit"
        pet={patient}
        users={users}
        onSubmit={handleEditSubmit}
        onCancel={() => setIsEditModalOpen(false)}
        isSubmitting={isSaving}
      />

      {/* Camera Capture Modal */}
      <Drawer open={isCameraModalOpen} onOpenChange={(open) => {
        setIsCameraModalOpen(open);
        if (!open) stopCamera();
      }}>
        <DrawerContent className="max-w-xl p-0 overflow-hidden bg-black">
          <DrawerTitle className="sr-only">Camera Capture</DrawerTitle>
          <DrawerDescription className="sr-only">Capture a photo using your camera</DrawerDescription>
          <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 z-20">
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-black/50 text-white hover:bg-black/70 rounded-full"
                onClick={() => {
                  setIsCameraModalOpen(false);
                  stopCamera();
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="p-8 bg-white flex flex-col items-center gap-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Capture Patient Photo</h3>
              <p className="text-sm text-gray-500">Center the pet in the frame for the best result.</p>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="rounded-full w-14 h-14 border-2 border-gray-100 flex items-center justify-center"
                onClick={() => {
                  stopCamera();
                  startCamera();
                }}
              >
                <RefreshCw className="w-6 h-6 text-gray-400" />
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-20 h-20 shadow-xl shadow-blue-200 flex items-center justify-center group"
                onClick={capturePhoto}
              >
                <div className="w-16 h-16 rounded-full border-4 border-white/30 group-active:scale-95 transition-transform"></div>
              </Button>
              <div className="w-14"></div> {/* Spacer for symmetry */}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      {/* Lightbox Modal */}
      <Drawer open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DrawerContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
          <DrawerTitle className="sr-only">Patient Photo</DrawerTitle>
          <DrawerDescription className="sr-only">Full size view of patient photo</DrawerDescription>
          <div className="relative group">
            {patient.photo || patient.imageUrl ? (
              <img 
                src={patient.photo || patient.imageUrl} 
                alt={patient.name} 
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" 
              />
            ) : (
              <div className="w-64 h-64 bg-blue-100 text-blue-600 flex items-center justify-center text-6xl font-bold rounded-xl">
                {patient.name[0]}
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
      
      {/* Doctor Selector Dialog for Quick Start Visit */}
      <Drawer open={showDoctorDialog} onOpenChange={setShowDoctorDialog}>
        <DrawerContent className="">
          <DrawerHeader>
            <DrawerTitle>Select Doctor for Quick Start</DrawerTitle>
            <DrawerDescription>
              Choose a doctor who is scheduled to be on-duty at this time. 
              Quick Start is for walk-in/emergency visits.
            </DrawerDescription>
          </DrawerHeader>
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
          <div>
            <Button variant="outline" onClick={() => setShowDoctorDialog(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!selectedDoctorId}
              onClick={confirmQuickStart}
            >
              {startingVisit ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting Visit...
                </span>
              ) : (
                'Confirm Quick Start'
              )}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
      
      {/* Quick Photo Update Modal */}
      <Drawer open={isPhotoActionModalOpen} onOpenChange={setIsPhotoActionModalOpen}>
        <DrawerContent className="">
          <DrawerHeader>
            <DrawerTitle className="text-2xl font-bold">Update Patient Photo</DrawerTitle>
            <DrawerDescription>Capture a new photo or upload an image file for {patient.name}.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-6">
              <div className="w-48 h-48 rounded-xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center relative">
                {tempPhoto ? (
                  <img src={tempPhoto} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Camera className="w-12 h-12" />
                    <span className="text-xs font-bold uppercase tracking-wider">No Photo</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 h-14"
                  onClick={() => {
                    setIsCameraModalOpen(true);
                    startCamera();
                  }}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Use Camera
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 h-14"
                  onClick={() => {
                    const uploadInput = document.getElementById('quick-photo-upload') as HTMLInputElement;
                    if (uploadInput) uploadInput.click();
                  }}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload File
                </Button>
                <input 
                  id="quick-photo-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>
          <div className="pt-4 flex gap-3 border-t border-gray-50">
            <Button variant="ghost" onClick={() => setIsPhotoActionModalOpen(false)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button 
              disabled={!tempPhoto || tempPhoto === (patient.photo || patient.imageUrl)}
              onClick={handlePhotoSave}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-blue-100 flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              Update Photo
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
