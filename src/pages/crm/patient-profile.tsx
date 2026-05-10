// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
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
  Syringe,
  Scale
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { PageHeader } from '../../components/ui/page-header';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { db, auth, collection, getDocs, getDoc, addDoc, updateDoc, doc, query, where, serverTimestamp } from '../../firebase';
import PetDialog from '../../components/crm/pet-dialog';
import { uploadToGoogleDrive } from '../../lib/google-drive';

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
  const [reports, setReports] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [scheduledAppointment, setScheduledAppointment] = useState<any>(null);
  const [startingVisit, setStartingVisit] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  
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

      setPatient({ ...patient, ...updatedData });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to update patient. Please try again.');
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
      const aptId = aptRef.id;
      
      // 2. Auto-confirm appointment
      await updateDoc(doc(db, 'appointments', aptId), {
        status: 'confirmed',
        updatedAt: serverTimestamp()
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
          performedBy: selectedDoctorId || userUid,
          completedAt: null,
          createdBy: userUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await addDoc(collection(db, 'appointment_services'), serviceData);
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

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="Patient Profile" 
        subtitle={`Managing administrative and contact details for ${patient.name}`}
        backText="Back"
        actions={
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="text-blue-600 border-blue-200 rounded-xl hover:bg-blue-50"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              variant="outline"
              className="text-emerald-600 border-emerald-200 rounded-xl hover:bg-emerald-50"
              onClick={() => navigate(`/crm/emr/${patient.id}`, { 
                state: { from: `/crm/patients/${patient.id}`, backText: 'Back to Patient Profile' }
              })}
            >
              <FileText className="w-4 h-4 mr-2" />
              EMR
            </Button>
            {scheduledAppointment ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg">
                  ⚠️ Scheduled: {scheduledAppointment.date} at {scheduledAppointment.time}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/crm/appointments/${scheduledAppointment.id}`)}
                >
                  View Appointment
                </Button>
              </div>
            ) : (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 shadow-lg"
                onClick={handleQuickStartVisit}
                disabled={startingVisit}
              >
                {startingVisit ? (
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
          </div>
        }
      />

<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Patient Details */}
        <div className="space-y-6">
          {/* Patient Info Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start gap-6">
              {/* Photo */}
              <div className="relative shrink-0 group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl cursor-pointer">
                  {patient.photo || patient.imageUrl ? (
                    <img 
                      src={patient.photo || patient.imageUrl} 
                      alt={patient.name} 
                      className="w-full h-full object-cover"
                      onClick={() => setIsLightboxOpen(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold">
                      {patient.name[0]}
                    </div>
                  )}
                  <div 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTempPhoto(patient.photo || patient.imageUrl || null);
                      setIsPhotoActionModalOpen(true);
                    }}
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              
              {/* Basic Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
                    <p className="text-sm text-gray-500">{patient.species} • {patient.breed}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 mb-3">
                  <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-xs">
                    {patient.patientId}
                  </Badge>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-xs">
                    {patient.status}
                  </Badge>
                </div>
                
                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400">Weight</p>
                    <p className="text-sm font-bold text-gray-900">{patient.weight ? `${patient.weight} kg` : 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400">Blood Type</p>
                    <p className="text-sm font-bold text-gray-900">{patient.bloodType || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400">Gender</p>
                    <p className="text-sm font-bold text-gray-900">{patient.gender || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Details Grid */}
            <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Date of Birth</p>
                  <p className="text-sm font-medium text-gray-700">{patient.dateOfBirth || 'Not recorded'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-red-400" />
                <div>
                  <p className="text-xs text-gray-400">Coat Color</p>
                  <p className="text-sm font-medium text-gray-700">{patient.color || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-400">Microchip ID</p>
                  <p className="text-sm font-medium text-gray-700">{patient.microchipId || 'Not registered'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-xs text-gray-400">Size Category</p>
                  <p className="text-sm font-medium text-gray-700">{patient.size || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Medical History */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Medical History
            </h3>
            {patient.medicalHistory ? (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{patient.medicalHistory}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No medical history recorded</p>
            )}
          </div>
          
          {/* Allergies & Alerts */}
          <div className="bg-red-50 rounded-xl p-6 border border-red-100">
            <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Allergies & Alerts
            </h3>
            <div className="space-y-3">
              {/* Allergies */}
              {patient.allergies && patient.allergies.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Allergies</p>
                    <p className="text-sm text-red-700">{patient.allergies.join(', ')}</p>
                  </div>
                </div>
              )}
              {/* Chronic Conditions */}
              {patient.chronicConditions && patient.chronicConditions.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0"></span>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Chronic Conditions</p>
                    <p className="text-sm text-red-700">{patient.chronicConditions.join(', ')}</p>
                  </div>
                </div>
              )}
              {/* Aggression Warning */}
              {patient.aggressionWarning && (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0"></span>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Aggression Warning</p>
                    <p className="text-sm text-red-700">{patient.aggressionNotes || 'Handle with caution'}</p>
                  </div>
                </div>
              )}
              {/* Medication Reactions */}
              {patient.medicationReactions && patient.medicationReactions.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0"></span>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Medication Reactions</p>
                    <p className="text-sm text-red-700">{patient.medicationReactions.join(', ')}</p>
                  </div>
                </div>
              )}
              {/* Special Handling Notes */}
              {patient.specialHandlingNotes && (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Special Handling</p>
                    <p className="text-sm text-red-700">{patient.specialHandlingNotes}</p>
                  </div>
                </div>
              )}
              {/* Contagious Disease Flag */}
              {patient.contagiousDiseaseFlag && (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0 animate-pulse"></span>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Contagious Disease</p>
                    <p className="text-sm text-red-700">{patient.contagiousDiseaseNotes || 'Exercise caution - potential contagion'}</p>
                  </div>
                </div>
              )}
              {/* No Alerts Message */}
              {!patient.allergies?.length && !patient.chronicConditions?.length && 
               !patient.aggressionWarning && !patient.medicationReactions?.length && 
               !patient.specialHandlingNotes && !patient.contagiousDiseaseFlag && (
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>No allergies or critical alerts recorded</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Owner & Activity */}
        <div className="space-y-6">
          {/* Owner & Contact Details */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Pet Owner
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{patient.ownerName}</p>
                  <Button 
                    variant="link" 
                    className={`p-0 h-auto text-xs ${patient.ownerUid ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-not-allowed'}`}
                    disabled={!patient.ownerUid}
onClick={() => patient.ownerUid && navigate(`/crm/owners/${patient.ownerUid}`, { 
                        state: { 
                          from: `/crm/patients/${patient.id}`,
                          fromEntity: patient.name
                        } 
                      })}
                  >
                    View Owner Profile
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{patient.contact || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{patient.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Address</p>
                  <p className="text-sm font-medium text-gray-700">{patient.address || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Visit Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Recent Visits
            </h3>
            <div className="space-y-3">
              {appointments.length > 0 ? (
                appointments.slice(0, 5).map((apt: any) => (
                  <div key={apt.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{apt.date}</p>
                      <p className="text-xs text-gray-500">{apt.doctorName || 'No doctor assigned'}</p>
                    </div>
                    <Badge className={apt.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' : apt.status === 'completed' ? 'bg-gray-50 text-gray-700 border-gray-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}>
                      {apt.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic">No visits recorded</p>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => navigate(`/crm/emr/${patient.id}`, { 
                  state: { from: `/crm/patients/${patient.id}`, backText: 'Back to Patient Profile' }
                })}
              >
                <FileText className="w-4 h-4 mr-2" />
                Open EMR
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => navigate(`/crm/appointments?petId=${patient.id}`)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>
              {scheduledAppointment ? (
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-3 col-span-2 text-yellow-700 border-yellow-200 bg-yellow-50"
                  onClick={() => navigate(`/crm/appointments/${scheduledAppointment.id}`)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  View Scheduled: {scheduledAppointment.date} at {scheduledAppointment.time}
                </Button>
              ) : (
                <Button 
                  className="justify-start h-auto py-3 col-span-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleQuickStartVisit}
                  disabled={startingVisit}
                >
                  {startingVisit ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Visit...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Quick Start Visit
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {/* Audit Trail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.auditTrail && patient.auditTrail.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {patient.auditTrail
                    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 10)
                    .map((log: any, idx: number) => (
                    <div key={log.id || idx} className="text-sm border-b border-gray-50 pb-2 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-gray-700">{log.action || log.event}</span>
                          {log.reason && <span className="text-gray-500 ml-1">{log.reason}</span>}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">by {log.userId || log.staff}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No activity recorded</p>
              )}
            </CardContent>
          </Card>
</div>
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
      />

      {/* Camera Capture Modal */}
      <Dialog open={isCameraModalOpen} onOpenChange={(open) => {
        setIsCameraModalOpen(open);
        if (!open) stopCamera();
      }}>
        <DialogContent className="max-w-xl rounded-xl p-0 overflow-hidden bg-black">
          <DialogTitle className="sr-only">Camera Capture</DialogTitle>
          <DialogDescription className="sr-only">Capture a photo using your camera</DialogDescription>
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
        </DialogContent>
      </Dialog>
      {/* Lightbox Modal */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
          <DialogTitle className="sr-only">Patient Photo</DialogTitle>
          <DialogDescription className="sr-only">Full size view of patient photo</DialogDescription>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Quick Photo Update Modal */}
      <Dialog open={isPhotoActionModalOpen} onOpenChange={setIsPhotoActionModalOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Update Patient Photo</DialogTitle>
            <DialogDescription>Capture a new photo or upload an image file for {patient.name}.</DialogDescription>
          </DialogHeader>
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
          <DialogFooter className="pt-4 flex gap-3 border-t border-gray-50">
            <Button variant="ghost" onClick={() => setIsPhotoActionModalOpen(false)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button 
              disabled={!tempPhoto || tempPhoto === (patient.photo || patient.imageUrl)}
              onClick={handlePhotoSave}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-blue-100 flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              Update Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
