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
  BarChart2,
  Thermometer,
  Stethoscope,
  CreditCard
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { db, doc, getDoc, collection, getDocs, query, where, updateDoc } from '../../firebase';
import PetDialog from '../../components/crm/pet-dialog';
import { uploadPetPhoto, deletePetPhoto } from '../../lib/storage';

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
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);

  // Find the selected patient from Firebase
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);

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

        const foundPet = pets.find(p => p.patientId === patientId);

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

          setPatient(foundPet);

          // Fetch related data
          const appQuery = query(collection(db, 'appointments'), where('petId', '==', foundPet.id));
          const appSnapshot = await getDocs(appQuery);
          setAppointments(appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
    (patient.auditTrail || []).forEach(item => {
      stats[item.staff] = (stats[item.staff] || 0) + 1;
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  };

  const auditStats = getAuditStats();
  // Premium harmonic colors for the chart
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

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
    if (tempPhoto && patient) {
      try {
        let finalImageUrl = tempPhoto;

        // If tempPhoto is a data URL and it's small enough, save directly
        if (tempPhoto.startsWith('data:')) {
          // Check size (base64 is ~33% larger than binary)
          const sizeInBytes = (tempPhoto.length * 3) / 4;
          const maxSize = 700 * 1024; // 700KB limit for Firestore

          if (sizeInBytes > maxSize) {
            alert('Photo is too large. Please use a smaller image or enable Firebase Storage.');
            return;
          }

          // Save base64 directly to Firestore
          finalImageUrl = tempPhoto;
        }

        // Update Firestore with the image URL (base64 or actual URL)
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
      const updatedData = {
        name: formData.name,
        species: formData.species,
        breed: formData.breed,
        ownerUid: formData.ownerUid || patient.ownerUid,
        weight: formData.weight || patient.weight,
        dateOfBirth: formData.dateOfBirth || patient.dateOfBirth,
        gender: formData.gender || patient.gender,
        bloodType: formData.bloodType || patient.bloodType,
        color: formData.color || patient.color,
        imageUrl: formData.imageUrl || patient.imageUrl || patient.photo || '',
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

      // Update Firestore
      await updateDoc(doc(db, 'pets', patient.id), updatedData);

      setPatient({ ...patient, ...updatedData });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to update patient. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="Patient Profile" 
        subtitle={`Managing administrative and contact details for ${patient.name}`}
        onBack={() => navigate(location.state?.from || '/crm/patients')}
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
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 rounded-xl px-6"
              onClick={() => setIsTriageModalOpen(true)}
            >
              <Activity className="w-4 h-4 mr-2" />
              Triage Check
            </Button>
            <Button 
              variant="outline"
              className="text-emerald-600 border-emerald-200 rounded-xl hover:bg-emerald-50"
              onClick={() => navigate(`/crm/emr/${patient.id}`)}
            >
              <FileText className="w-4 h-4 mr-2" />
              EMR
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="relative mb-6 group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl relative cursor-pointer group">
                {patient.photo || patient.imageUrl ? (
                  <img 
                    src={patient.photo || patient.imageUrl} 
                    alt={patient.name} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    onClick={() => setIsLightboxOpen(true)}
                  />
                ) : (
                  <div 
                    className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center text-4xl font-bold"
                    onClick={() => setIsLightboxOpen(true)}
                  >
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
                  <Camera className="w-6 h-6 text-white" />
                  <span className="sr-only">Change Photo</span>
                </div>
              </div>
              <div className="absolute bottom-1 right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{patient.name}</h2>
            <p className="text-gray-500 font-medium mb-4">{patient.species} • {patient.breed}</p>
            <div className="flex gap-2 mb-6">
              <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100">
                {patient.patientId}
              </Badge>
              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100">
                {patient.status}
              </Badge>
            </div>
            
            <div className="w-full pt-6 border-t border-gray-50 space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Date of Birth</p>
                  <p className="text-sm font-semibold text-gray-700">{patient.dateOfBirth}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Gender</p>
                  <p className="text-sm font-semibold text-gray-700">{patient.gender}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Blood Type</p>
                  <p className="text-sm font-semibold text-gray-700">{patient.bloodType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Coat Color</p>
                  <p className="text-sm font-semibold text-gray-700">{patient.color || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Size Category</p>
                  <p className="text-sm font-semibold text-gray-700">{patient.size || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Microchip ID</p>
                  <p className="text-sm font-semibold text-gray-700">{patient.microchipId || 'Not registered'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <BarChart2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Current Weight</p>
                  <p className="text-sm font-semibold text-gray-700">{patient.weight ? `${patient.weight} kg` : 'Not recorded'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Size Category</p>
                  <p className="text-sm font-semibold text-gray-700">{patient.size || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Microchip ID</p>
                  <p className="text-sm font-semibold text-gray-700">{patient.microchipId || 'Not registered'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts Card */}
          <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
            <h4 className="flex items-center gap-2 text-red-800 font-bold mb-3">
              <ShieldAlert className="w-5 h-5" />
              Critical Alerts
            </h4>
            <ul className="space-y-2">
              <li className="text-sm text-red-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                Severe Penicillin Allergy
              </li>
              <li className="text-sm text-red-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                History of Hip Dysplasia
              </li>
            </ul>
          </div>
        </div>

        {/* Middle & Right Column: Details & Timeline */}
        <div className="lg:col-span-2 space-y-8">
          {/* Owner & Contact Details */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-500" />
              Contact & Ownership
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-400 uppercase">Primary Owner</p>
                    <p className="text-lg font-bold text-gray-900">{patient.ownerName}</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-blue-600 text-xs hover:text-blue-800 transition-colors"
                      onClick={() => navigate(`/profile/${(patient as any).ownerId || 'unknown'}`)}
                    >
                      View Owner Profile
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-400 uppercase">Phone Number</p>
                    <p className="text-lg font-bold text-gray-900">{patient.contact}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-400 uppercase">Email Address</p>
                    <p className="text-lg font-bold text-gray-900">{patient.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-400 uppercase">Home Address</p>
                    <p className="text-gray-700 leading-relaxed">{patient.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-500" />
                Recent Activity
              </h3>
              <Button variant="ghost" className="text-blue-600">See All</Button>
            </div>
            <div className="space-y-8 relative before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-50">
              <div className="relative flex gap-6 group">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white z-10 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex justify-between mb-1">
                    <h4 className="font-bold text-gray-900">EMR Record Updated</h4>
                    <span className="text-xs text-gray-400 font-bold">TODAY, 10:45 AM</span>
                  </div>
                  <p className="text-sm text-gray-500">Annual checkup results added by Dr. Sarah Johnson</p>
                </div>
              </div>
              <div className="relative flex gap-6 group">
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white z-10 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex justify-between mb-1">
                    <h4 className="font-bold text-gray-900">Appointment Scheduled</h4>
                    <span className="text-xs text-gray-400 font-bold">2 DAYS AGO</span>
                  </div>
                  <p className="text-sm text-gray-500">Upcoming vaccination set for May 15, 2026</p>
                </div>
              </div>
            </div>
          </div>

          {/* Weight History */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-green-500" />
                Weight History
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => {
                  const weight = prompt("Enter new weight (kg):");
                  if (weight && !isNaN(parseFloat(weight))) {
                    const newWeight = parseFloat(weight);
                    const updatedPatient = {
                      ...patient,
                      weight: newWeight,
                      weightHistory: [
                        ...(patient.weightHistory || []),
                        { date: new Date().toISOString().split('T')[0], weight: newWeight, notes: 'Triage update' }
                      ],
                      auditTrail: [
                        ...(patient.auditTrail || []),
                        {
                          id: Date.now().toString(),
                          event: `Weight Updated: ${newWeight}kg`,
                          staff: 'Admin User',
                          timestamp: new Date().toLocaleString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric', 
                            hour: '2-digit', minute: '2-digit', hour12: true 
                          })
                        }
                      ]
                    };
                    setPatient(updatedPatient);
                  }
                }}
              >
                <Activity className="w-4 h-4 mr-2" />
                Record Weight
              </Button>
            </div>
            
            {/* Weight Chart */}
            {sortedWeightHistory.length > 0 ? (
              <div className="mb-6">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={sortedWeightHistory} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                          padding: '8px 12px' 
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}
                        formatter={(value: any) => [`${value} kg`, 'Weight']}
                      />
                      <Bar 
                        dataKey="weight" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                      >
                        {sortedWeightHistory.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill="#10b981" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No weight history recorded yet.</p>
              </div>
            )}
            
            {/* Weight History Table */}
            {sortedWeightHistory.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-xs">Date</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-xs">Weight (kg)</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-xs">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedWeightHistory.map((entry: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-green-50/30 transition-colors">
                        <td className="py-3 px-4 font-medium">{entry.date}</td>
                        <td className="py-3 px-4 font-bold text-green-700">{entry.weight} kg</td>
                        <td className="py-3 px-4 text-gray-600">{entry.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit History Log */}
          <div className="bg-[#1E293B] rounded-[2rem] p-8 text-white shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-indigo-400" />
                Audit Trail Log
              </h3>
              <Badge variant="outline" className="text-indigo-300 border-indigo-500/30">
                Verified Records
              </Badge>
            </div>

            {/* Activity Histogram */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-sm font-bold text-indigo-100 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-indigo-400" />
                    Staff Activity Distribution
                  </h4>
                  <p className="text-[10px] text-indigo-300/60 mt-1 uppercase tracking-wider">Updates by staff member</p>
                </div>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-[10px]">
                  {(patient.auditTrail || []).length} Actions
                </Badge>
              </div>
              
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={auditStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        backgroundColor: '#1e293b',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)',
                        padding: '8px 12px'
                      }}
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}
                      labelStyle={{ fontSize: '9px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[4, 4, 0, 0]} 
                      barSize={32}
                    >
                      {auditStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              {(patient.auditTrail || []).slice().reverse().map((log: any, idx: number) => (
                <div key={log.id} className="group relative pl-6 border-l border-indigo-500/20 last:border-0 pb-6 last:pb-0">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-[#1E293B] shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-indigo-100">{log.event}</span>
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                      {log.timestamp.split(',')[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-indigo-300/60">
                    <User className="w-3 h-3" />
                    <span>Updated by <span className="text-indigo-200 font-medium">{log.staff}</span></span>
                    <span className="mx-1">•</span>
                    <Clock className="w-3 h-3" />
                    <span>{log.timestamp.includes(',') ? log.timestamp.split(',')[1].trim() : log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
        <DialogContent className="max-w-xl rounded-3xl p-0 overflow-hidden bg-black">
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
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" 
              />
            ) : (
              <div className="w-64 h-64 bg-blue-100 text-blue-600 flex items-center justify-center text-6xl font-bold rounded-2xl">
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

      {/* Quick Photo Update Modal */}
      <Dialog open={isPhotoActionModalOpen} onOpenChange={setIsPhotoActionModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Update Patient Photo</DialogTitle>
            <DialogDescription>Capture a new photo or upload an image file for {patient.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-6">
              <div className="w-48 h-48 rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center relative">
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
                  className="rounded-2xl border-blue-200 text-blue-600 hover:bg-blue-50 h-14"
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
                  className="rounded-2xl border-gray-200 text-gray-600 hover:bg-gray-50 h-14"
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

      {/* Triage Dialog */}
      <Dialog open={isTriageModalOpen} onOpenChange={setIsTriageModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-green-600" />
              Triage Check - {patient.name}
            </DialogTitle>
            <DialogDescription>
              Record vital signs and weight. This will update the patient's weight history and medical records.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget as HTMLFormElement);
            const newWeight = parseFloat(formData.get('triage-weight') as string);
            const temperature = formData.get('temperature') as string;
            const heartRate = formData.get('heart-rate') as string;
            const respiratoryRate = formData.get('respiratory-rate') as string;
            const bloodPressure = formData.get('blood-pressure') as string;
            const notes = formData.get('triage-notes') as string;
            
            const weightHistory = [...(patient.weightHistory || [])];
            if (newWeight && newWeight !== patient.weight) {
              weightHistory.push({
                date: new Date().toISOString().split('T')[0],
                weight: newWeight,
                notes: `Triage: ${temperature ? temperature + '°C' : ''} ${heartRate ? ', HR: ' + heartRate + 'bpm' : ''}`.trim() || 'Triage check'
              });
            }

            const updatedPatient = {
              ...patient,
              weight: newWeight || patient.weight,
              weightHistory,
              auditTrail: [
                ...(patient.auditTrail || []),
                {
                  id: Date.now().toString(),
                  event: 'Triage Check Recorded',
                  staff: 'Admin User',
                  timestamp: new Date().toLocaleString('en-US', { 
                    year: 'numeric', month: 'short', day: 'numeric', 
                    hour: '2-digit', minute: '2-digit', hour12: true 
                  })
                }
              ]
            };
            setPatient(updatedPatient);
            setIsTriageModalOpen(false);
          }} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="triage-weight" className="font-bold text-gray-700">Weight (kg)</Label>
                <Input 
                  id="triage-weight" 
                  name="triage-weight" 
                  type="number" 
                  step="0.1" 
                  min="0"
                  defaultValue={patient.weight || ''} 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  placeholder="0.0" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature" className="font-bold text-gray-700">Temperature (°C)</Label>
                <Input 
                  id="temperature" 
                  name="temperature" 
                  type="number" 
                  step="0.1" 
                  min="35" 
                  max="45"
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  placeholder="38.5" 
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heart-rate" className="font-bold text-gray-700">Heart Rate (bpm)</Label>
                <Input 
                  id="heart-rate" 
                  name="heart-rate" 
                  type="number" 
                  min="50" 
                  max="250"
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  placeholder="120" 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="respiratory-rate" className="font-bold text-gray-700">Respiratory Rate (/min)</Label>
                <Input 
                  id="respiratory-rate" 
                  name="respiratory-rate" 
                  type="number" 
                  min="10" 
                  max="60"
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  placeholder="20" 
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blood-pressure" className="font-bold text-gray-700">Blood Pressure (mmHg)</Label>
              <Input 
                id="blood-pressure" 
                name="blood-pressure" 
                className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                placeholder="120/80" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="triage-notes" className="font-bold text-gray-700">Notes</Label>
              <textarea 
                id="triage-notes" 
                name="triage-notes" 
                className="w-full rounded-xl border border-gray-100 bg-gray-50 focus:bg-white p-3 text-sm min-h-[80px]"
                placeholder="Additional observations..."
              />
            </div>

            <DialogFooter className="pt-4 flex gap-3 border-t border-gray-50">
              <Button type="button" variant="ghost" onClick={() => setIsTriageModalOpen(false)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-green-100 flex-1">
                <Stethoscope className="w-4 h-4 mr-2" />
                Save Triage Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
