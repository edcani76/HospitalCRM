import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, collection, query, where, doc, getDoc, updateDoc, serverTimestamp } from '../firebase';
import { Pet } from '../types';
import { motion } from 'motion/react';
import {
  Calendar, FileText, User, Clock, CheckCircle, XCircle, AlertCircle,
  Activity, ChevronRight, Info, Heart, Plus, ClipboardList,
  Syringe, AlertTriangle, Edit, PawPrint, ShieldCheck, ClipboardCheck, Phone,
  Pill, DollarSign, Download, Stethoscope, Zap, Loader2,
  LayoutDashboard, Users
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths, parseISO, isAfter, isBefore, addDays, startOfToday } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import PetDialog from '../components/crm/pet-dialog';
import { uploadToGoogleDrive } from '../lib/google-drive';
import { fetchEncounters, fetchInvoices, fetchReports, fetchAdmissions, fetchAppointments } from '../lib/firestore-helpers';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../components/ui/drawer';

type TabType = 'overview' | 'medical-history' | 'appointments' | 'preventive' | 'medications' | 'admissions' | 'billing';

const formatPetAge = (pet: Pet) => {
  if (pet.dateOfBirth) {
    const dob = new Date(pet.dateOfBirth + 'T00:00:00');
    const years = differenceInYears(new Date(), dob);
    if (years >= 1) return `${years} year${years > 1 ? 's' : ''}`;
    const months = differenceInMonths(new Date(), dob);
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  if (pet.age) {
    if (pet.age >= 1) return `${pet.age} year${pet.age > 1 ? 's' : ''}`;
    return `${Math.round(pet.age * 12)} month${Math.round(pet.age * 12) !== 1 ? 's' : ''}`;
  }
  return 'Unknown';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'in-progress': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700"><Activity className="w-3 h-3" />In Progress</span>;
    case 'medical-completed': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700"><CheckCircle className="w-3 h-3" />Medical Complete</span>;
    case 'completed': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />Completed</span>;
    case 'confirmed': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3" />Confirmed</span>;
    case 'unconfirmed': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" />Pending</span>;
    case 'cancelled': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Cancelled</span>;
    case 'admitted': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Admitted</span>;
    case 'discharged': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Discharged</span>;
    default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700">{status}</span>;
  }
};

export default function PetProfile() {
  const { user: currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pet, setPet] = useState<Pet | null>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null);

  // Data from connected modules
  const [appointments, setAppointments] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadData() {
      try {
        const petSnap = await getDoc(doc(db, 'pets', id));
        if (!petSnap.exists() || cancelled) { if (!cancelled) setLoading(false); return; }
        const petData = { id: petSnap.id, ...petSnap.data() } as Pet;
        if (cancelled) return;
        setPet(petData);

        const [ownerSnap, apptsData, encData, invData, admData, repData] = await Promise.all([
          getDoc(doc(db, 'users', petData.ownerUid)).catch(() => null),
          fetchAppointments({ petId: petData.id }).then(res => res.filter((a: any) => a.petId === petData.id)).catch(() => []),
          fetchEncounters(petData.id).catch(() => []),
          fetchInvoices({ petId: petData.id }).then(res => res.filter((i: any) => i.petId === petData.id)).catch(() => []),
          fetchAdmissions(petData.id).then(res => res.filter((a: any) => a.petId === petData.id)).catch(() => []),
          fetchReports({ petId: petData.id }).then(res => res.filter((r: any) => r.petId === petData.id)).catch(() => []),
        ]);

        if (cancelled) return;
        if (ownerSnap?.exists()) setOwner({ uid: ownerSnap.id, ...ownerSnap.data() });
        setAppointments(apptsData);
        setEncounters(encData);
        setInvoices(invData);
        setAdmissions(admData);
        setReports(repData);
      } catch (err) {
        console.error('Error loading pet data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [id]);

  // === Computed Values ===
  const nextAppointment = useMemo(() => {
    return appointments
      .filter(a => a.status !== 'cancelled' && a.status !== 'completed' && !isBefore(new Date(a.date + 'T' + (a.time || '00:00')), startOfToday()))
      .sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')).getTime() - new Date(b.date + 'T' + (b.time || '00:00')).getTime())[0] || null;
  }, [appointments]);

  const lastVisit = useMemo(() => {
    const completed = encounters.filter(e => e.status === 'completed' || e.status === 'medical-completed');
    if (completed.length > 0) return completed.sort((a, b) => {
      const aDate = a.completedAt?.toDate?.() || a.startedAt?.toDate?.() || new Date(0);
      const bDate = b.completedAt?.toDate?.() || b.startedAt?.toDate?.() || new Date(0);
      return bDate - aDate;
    })[0];
    const completedAppts = appointments.filter(a => a.status === 'completed');
    if (completedAppts.length > 0) return completedAppts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return null;
  }, [encounters, appointments]);

  const currentAdmission = useMemo(() => admissions.find(a => a.status === 'admitted') || null, [admissions]);

  const outstandingBalance = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      const bal = inv.balanceDue ?? (inv.grandTotal ?? inv.amount ?? 0) - (inv.amountPaid ?? 0);
      return sum + (bal > 0 ? bal : 0);
    }, 0);
  }, [invoices]);

  const totalInvoiced = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.grandTotal ?? inv.amount ?? 0), 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.amountPaid ?? 0), 0);
  }, [invoices]);

  const hasMedicalAlerts = !!(pet?.allergies?.length || pet?.chronicConditions?.length || pet?.medicationReactions?.length);

  // === Helpers ===
  const handlePetUpdate = async (formData: any) => {
    if (!pet?.id) return;
    setIsSubmittingEdit(true);
    try {
      let imageUrl = pet.imageUrl || '';
      if (formData.photoFile) {
        const ownerName = owner?.displayName || owner?.email?.split('@')[0] || 'Unknown';
        const result = await uploadToGoogleDrive(formData.photoFile, { ownerName, petName: pet.name, fileType: 'photos' });
        imageUrl = result.downloadUrl || result.webViewLink;
      }
      const updatedFields = {
        name: formData.name, species: formData.species, breed: formData.breed,
        weight: formData.weight || 0, dateOfBirth: formData.dateOfBirth || '',
        gender: formData.gender || '', bloodType: formData.bloodType || '',
        color: formData.color || '', microchipId: formData.microchipId || '',
        medicalHistory: formData.medicalHistory || '', imageUrl,
      };
      await updateDoc(doc(db, 'pets', pet.id), {
        ...updatedFields,
        updatedAt: serverTimestamp(),
      });
      setPet({ ...pet, ...updatedFields } as Pet);
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to update pet:', err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const getMenuItems = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
      return [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: 'queue', label: 'Patient Queue', icon: <ClipboardList className="w-5 h-5" /> },
        { id: 'appointments', label: 'Schedules', icon: <Calendar className="w-5 h-5" /> },
        { id: 'emr', label: 'EMR & Medical Records', icon: <Activity className="w-5 h-5" /> },
        { id: 'billing', label: 'Billing', icon: <FileText className="w-5 h-5" /> },
        { id: 'inventory', label: 'Inventory', icon: <FileText className="w-5 h-5" /> },
        { id: 'users', label: 'User Management', icon: <Users className="w-5 h-5" /> },
      ];
    }
    return [
      { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'pets', label: 'My Pets', icon: <User className="w-5 h-5" /> },
      { id: 'appointments', label: 'My Appointments', icon: <Calendar className="w-5 h-5" /> },
      { id: 'billing', label: 'Billing & Invoices', icon: <FileText className="w-5 h-5" /> },
      { id: 'records', label: 'Medical Reports', icon: <Clock className="w-5 h-5" /> },
    ];
  };

  const formatDate = (d: any) => {
    if (!d) return '—';
    if (d.toDate) return format(d.toDate(), 'MMM dd, yyyy');
    if (typeof d === 'string') return format(parseISO(d), 'MMM dd, yyyy');
    return '—';
  };

  const formatTime = (d: any) => {
    if (!d) return '';
    if (d.toDate) return format(d.toDate(), 'hh:mm a');
    if (typeof d === 'string') return format(parseISO(d), 'hh:mm a');
    return '';
  };

  // ======== Render ========

  if (loading) {
    return (
      <DashboardLayout user={currentUser} menuItems={[]} activeTab="" onTabChange={() => {}} title="Pet Profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!pet) {
    return (
      <DashboardLayout user={currentUser} menuItems={[]} activeTab="" onTabChange={() => {}} title="Pet Not Found">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-stone-900">Pet not found</h2>
          <Link to="/admin" className="text-emerald-600 hover:underline mt-4 inline-block">Back to Dashboard</Link>
        </div>
      </DashboardLayout>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
    { key: 'medical-history', label: 'Medical History', icon: <Activity className="w-4 h-4" /> },
    { key: 'appointments', label: 'Appointments', icon: <Calendar className="w-4 h-4" /> },
    { key: 'preventive', label: 'Preventive Care', icon: <ShieldCheck className="w-4 h-4" /> },
    { key: 'medications', label: 'Medications', icon: <Pill className="w-4 h-4" /> },
    { key: 'admissions', label: 'Admissions', icon: <Stethoscope className="w-4 h-4" /> },
    { key: 'billing', label: 'Billing', icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout
      user={currentUser}
      menuItems={getMenuItems()}
      activeTab={currentUser?.role === 'admin' ? 'emr' : 'pets'}
      onTabChange={(tab) => { if (currentUser?.role !== 'admin') navigate('/dashboard', { state: { tab } }); }}
      title={`${pet.name}'s Profile`}
      breadcrumbs={[
        { name: 'Dashboard', path: currentUser?.role === 'admin' ? '/admin' : '/dashboard' },
        { name: 'Pets', onClick: () => navigate('/dashboard', { state: { tab: 'pets' } }) },
        { name: pet.name },
      ]}
    >
      <div className="max-w-7xl mx-auto">
        {/* ==================== STICKY PET HEADER ==================== */}
        <div className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-sm">
          <div className="px-4 py-3">
            <div className="flex items-start gap-4">
              {/* Photo */}
              <div className="relative shrink-0">
                <img
                  src={pet.imageUrl || `https://ui-avatars.com/api/?name=${pet.name}&background=10b981&color=fff&size=128`}
                  alt={pet.name}
                  className="w-16 h-16 rounded-xl object-cover border border-stone-200"
                />
                {currentAdmission && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 border-2 border-white rounded-full flex items-center justify-center">
                    <Activity className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-stone-900">{pet.name}</h1>
                  <span className="text-sm text-stone-500">
                    {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                  </span>
                  {pet.gender && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pet.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                      {pet.gender}
                    </span>
                  )}
                  <span className="text-xs text-stone-500">{formatPetAge(pet)}</span>
                  {pet.weight && <span className="text-xs text-stone-500">{pet.weight} kg</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-stone-600">
                  <Link to={owner ? `/profile/${owner.uid}` : '#'} className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors">
                    <User className="w-3.5 h-3.5" />
                    <span className="font-medium">{owner?.displayName || owner?.email?.split('@')[0] || 'Unknown'}</span>
                  </Link>
                  {owner?.phone && (
                    <span className="flex items-center gap-1 text-xs text-stone-400">
                      <Phone className="w-3 h-3" />{owner.phone}
                    </span>
                  )}
                  {pet.currentStatus && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      {pet.currentStatus}
                    </span>
                  )}
                </div>
                {/* Medical Alerts */}
                {hasMedicalAlerts && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pet.allergies?.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" />Allergy: {a}
                      </span>
                    ))}
                    {pet.chronicConditions?.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        <Activity className="w-3 h-3" />{c}
                      </span>
                    ))}
                    {pet.medicationReactions?.map((r, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700 border border-pink-200">
                        <Pill className="w-3 h-3" />Reaction: {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/book-appointment?petId=${pet.id}`} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> New Appointment
                </Link>
                <button
                  onClick={() => setIsEditDialogOpen(true)}
                  className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                  title="Edit Pet"
                >
                  <Edit className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 pb-3 sm:hidden">
            <Link to={`/book-appointment?petId=${pet.id}`} className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm w-full">
              <Plus className="w-4 h-4" /> New Appointment
            </Link>
          </div>

          {/* Summary Cards */}
          <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200">
              <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Next Appointment</p>
              {nextAppointment ? (
                <div className="mt-0.5">
                  <p className="text-sm font-bold text-stone-900">{format(new Date(nextAppointment.date), 'MMM dd')} · {nextAppointment.time}</p>
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
              <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Admission</p>
              {currentAdmission ? (
                <div className="mt-0.5">
                  <p className="text-sm font-bold text-orange-600">Admitted</p>
                  <p className="text-[10px] text-stone-500">{currentAdmission.cageWard || currentAdmission.reason?.slice(0, 25) || '—'}</p>
                </div>
              ) : <p className="text-xs text-stone-400 mt-0.5">Not admitted</p>}
            </div>
          </div>

          {/* Sticky Tabs */}
          <div className="px-4 border-t border-stone-100 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex gap-0.5 -mb-px">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.key
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                  }`}
                >
                  {tab.icon}
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
              {/* Left Column - Pet Details */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                    <PawPrint className="w-4 h-4 text-emerald-600" /> Pet Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Species</p><p className="text-sm font-medium">{pet.species || '—'}</p></div>
                    <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Breed</p><p className="text-sm font-medium">{pet.breed || '—'}</p></div>
                    <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Gender</p><p className="text-sm font-medium">{pet.gender || '—'}</p></div>
                    <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Age</p><p className="text-sm font-medium">{formatPetAge(pet)}</p></div>
                    <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Birthday</p><p className="text-sm font-medium">{pet.dateOfBirth ? format(new Date(pet.dateOfBirth + 'T00:00:00'), 'MMM dd, yyyy') : '—'}</p></div>
                    <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Weight</p><p className="text-sm font-medium">{pet.weight ? `${pet.weight} kg` : '—'}</p></div>
                    <div className="col-span-2"><p className="text-[10px] text-stone-500 uppercase font-semibold">Color/Markings</p><p className="text-sm font-medium">{pet.color || '—'}</p></div>
                    <div className="col-span-2"><p className="text-[10px] text-stone-500 uppercase font-semibold">Microchip ID</p><p className="text-sm font-medium font-mono">{pet.microchipId || '—'}</p></div>
                    <div><p className="text-[10px] text-stone-500 uppercase font-semibold">Blood Type</p><p className="text-sm font-medium">{pet.bloodType || '—'}</p></div>
                    {pet.medicalHistory && <div className="col-span-2"><p className="text-[10px] text-stone-500 uppercase font-semibold">Medical History</p><p className="text-sm font-medium whitespace-pre-wrap">{pet.medicalHistory}</p></div>}
                  </div>
                </div>

                {/* Owner Info */}
                <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" /> Owner
                  </h3>
                  {owner ? (
                    <div className="space-y-2">
                      <Link to={`/profile/${owner.uid}`} className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-stone-50 transition-all">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-100 shrink-0">
                          <img src={owner.photoURL || `https://ui-avatars.com/api/?name=${owner.displayName || owner.email}&background=10b981&color=fff`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-stone-900 text-sm truncate">{owner.displayName || owner.email}</p>
                          <p className="text-xs text-stone-500 truncate">{owner.email}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-300" />
                      </Link>
                      {owner.phone && (
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span>{owner.phone}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400 italic">Owner info not available</p>
                  )}
                </div>

                {/* Medical Alerts Detail */}
                {hasMedicalAlerts && (
                  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2 text-red-600">
                      <AlertTriangle className="w-4 h-4" /> Clinical Alerts
                    </h3>
                    <div className="space-y-2">
                      {pet.allergies?.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg text-sm">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div><span className="font-bold text-red-700">Allergy:</span> <span className="text-red-600">{a}</span></div>
                        </div>
                      ))}
                      {pet.chronicConditions?.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg text-sm">
                          <Activity className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div><span className="font-bold text-amber-700">Chronic:</span> <span className="text-amber-600">{c}</span></div>
                        </div>
                      ))}
                      {pet.medicationReactions?.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-pink-50 rounded-lg text-sm">
                          <Pill className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                          <div><span className="font-bold text-pink-700">Reaction:</span> <span className="text-pink-600">{r}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consent */}
                {(pet.consentPrivacyTimestamp || pet.consentTermsTimestamp) && (
                  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-emerald-600" /> Consent Records
                    </h3>
                    <div className="space-y-2">
                      {pet.consentPrivacyTimestamp && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-xs">
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="text-green-800">Privacy consent · {format(new Date(pet.consentPrivacyTimestamp), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      {pet.consentTermsTimestamp && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-xs">
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="text-green-800">Terms accepted · {format(new Date(pet.consentTermsTimestamp), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}


              </div>

              {/* Right Column - Recent Activity */}
              <div className="lg:col-span-2 space-y-4">
                {/* Recent Encounters Timeline */}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
                  <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600" /> Visit History ({encounters.length})
                    </h3>
                    <button onClick={() => setActiveTab('medical-history')} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
                      View All
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {encounters.length === 0 ? (
                      <div className="text-center py-6 text-stone-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No medical records yet</p>
                      </div>
                    ) : (
                      [...encounters].sort((a: any, b: any) => (b.startedAt?.toDate?.() || b.createdAt?.toDate?.() || 0) - (a.startedAt?.toDate?.() || a.createdAt?.toDate?.() || 0)).slice(0, 5).map((enc, idx) => (
                        <motion.div
                          key={enc.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                          onClick={() => {
                            if (currentUser?.role === 'admin') navigate(`/crm/emr/${enc.petId || pet?.id}`);
                            else setActiveTab('medical-history');
                          }}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            enc.status === 'completed' ? 'bg-green-100' : enc.status === 'medical-completed' ? 'bg-purple-100' : 'bg-blue-100'
                          }`}>
                            <Activity className={`w-4 h-4 ${
                              enc.status === 'completed' ? 'text-green-600' : enc.status === 'medical-completed' ? 'text-purple-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-stone-900">{enc.chiefComplaint || enc.diagnosis || 'Visit'}</p>
                              {getStatusBadge(enc.status)}
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">
                              {formatDate(enc.startedAt)} {formatTime(enc.startedAt)} · {enc.doctorName || '—'}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Billing Summary */}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
                  <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" /> Billing Summary ({invoices.length})
                    </h3>
                    <button onClick={() => setActiveTab('billing')} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
                      View All
                    </button>
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
                        <p className={`text-lg font-bold ${outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          ₱{outstandingBalance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {invoices.length > 0 && (
                      <div className="space-y-1.5">
                        {[...invoices].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 3).map((inv: any) => (
                          <div key={inv.id} className="flex items-center justify-between text-xs p-2 bg-stone-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-stone-700">{inv.invoiceNo || `INV-${inv.id?.slice(-6)}`}</span>
                              <span className="text-stone-400">{formatDate(inv.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">₱{(inv.grandTotal ?? inv.amount ?? 0).toLocaleString()}</span>
                              {getStatusBadge(inv.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Admission */}
                {currentAdmission && (
                  <div className="bg-white rounded-xl border border-orange-200 shadow-sm">
                    <div className="p-4 border-b border-orange-100 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-600" />
                      <h3 className="text-sm font-bold text-orange-700">Currently Admitted</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-stone-500">Cage/Ward:</span> <span className="font-bold">{currentAdmission.cageWard || '—'}</span></div>
                        <div><span className="text-stone-500">Vet:</span> <span className="font-bold">{currentAdmission.assignedDoctorName || '—'}</span></div>
                        <div className="col-span-2"><span className="text-stone-500">Reason:</span> <span>{currentAdmission.reason}</span></div>
                        <div className="col-span-2"><span className="text-stone-500">Admitted:</span> <span>{formatDate(currentAdmission.checkInDate)}</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {reports.length > 0 && (
                  <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
                    <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" /> Documents & Reports ({reports.length})
                      </h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {[...reports].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 5).map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-2 bg-stone-50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-stone-400" />
                            <span className="font-medium">{r.title}</span>
                            <span className="text-xs text-stone-400">{format(new Date(r.date), 'MMM dd, yyyy')}</span>
                          </div>
                          {r.fileUrl && (
                            <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEDICAL HISTORY TAB */}
          {activeTab === 'medical-history' && (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-stone-900">Medical History ({encounters.length})</h2>
                <span className="text-xs text-stone-500">{encounters.length} visit{encounters.length !== 1 ? 's' : ''}</span>
              </div>
              {encounters.length === 0 && appointments.filter(a => a.status === 'completed').length === 0 ? (
                <div className="text-center py-12 text-stone-400 bg-white rounded-xl border border-stone-200">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">No medical history yet</p>
                  <p className="text-sm mt-1">Visits and consultations will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Encounters as timeline entries */}
                  {[...encounters].sort((a: any, b: any) => (b.startedAt?.toDate?.() || b.createdAt?.toDate?.() || 0) - (a.startedAt?.toDate?.() || a.createdAt?.toDate?.() || 0)).map((enc, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <motion.div
                        key={enc.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`relative pl-8 pb-4 ${idx < encounters.length - 1 ? 'border-l-2 border-emerald-200' : ''}`}
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
                                <span className="text-xs font-bold text-stone-500">{formatDate(enc.startedAt)} {formatTime(enc.startedAt)}</span>
                                {getStatusBadge(enc.status)}
                                {isLatest && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Most recent</span>}
                              </div>
                              <h4 className="font-bold text-stone-900 mt-1">{enc.chiefComplaint || enc.diagnosis || 'Consultation'}</h4>
                              <p className="text-xs text-stone-500 mt-0.5">Dr. {enc.doctorName || '—'}</p>
                              {enc.diagnosis && (
                                <div className="mt-2 p-2 bg-stone-50 rounded-lg text-sm">
                                  <span className="text-[10px] text-stone-500 uppercase font-semibold">Diagnosis: </span>
                                  <span className="font-medium text-stone-800">{enc.diagnosis}</span>
                                </div>
                              )}
                              {enc.notes && <p className="text-sm text-stone-600 mt-2">{enc.notes}</p>}
                            </div>
                            <button
                              onClick={() => { if (currentUser?.role === 'admin') navigate(`/crm/emr/${enc.id}`); else setSelectedEncounter(enc); }}
                              className="shrink-0 px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {/* Completed appointments without encounters */}
                  {[...appointments].filter(a => a.status === 'completed' && !encounters.some((e: any) => e.appointmentId === a.id)).sort((a: any, b: any) => new Date(b.date + 'T' + (b.time || '00:00')).getTime() - new Date(a.date + 'T' + (a.time || '00:00')).getTime()).map((appt, idx) => (
                    <div key={appt.id} className="relative pl-8 pb-4">
                      <div className="absolute left-[-8px] top-1 w-4 h-4 rounded-full border-2 bg-stone-400 border-stone-200" />
                      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-500">{format(new Date(appt.date), 'MMM dd, yyyy')} · {appt.time}</span>
                          {getStatusBadge(appt.status)}
                        </div>
                        <p className="font-bold text-stone-900 mt-1">Visit · {appt.doctorName}</p>
                        {appt.notes && <p className="text-sm text-stone-600 mt-1">{appt.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Upcoming Appointments */}
              <div>
                <h2 className="text-lg font-bold text-stone-900 mb-4">Upcoming Appointments ({appointments.filter(a => a.status !== 'cancelled' && a.status !== 'completed' && !isBefore(new Date(a.date + 'T' + (a.time || '00:00')), startOfToday())).length})</h2>
                {appointments.filter(a => a.status !== 'cancelled' && a.status !== 'completed' && !isBefore(new Date(a.date + 'T' + (a.time || '00:00')), startOfToday())).length === 0 ? (
                  <div className="text-center py-12 text-stone-400 bg-white rounded-xl border border-stone-200">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-lg font-medium">No upcoming appointments</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
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
                          {[...appointments]
                            .filter(a => a.status !== 'cancelled' && a.status !== 'completed' && !isBefore(new Date(a.date + 'T' + (a.time || '00:00')), startOfToday()))
                            .sort((a: any, b: any) => new Date(a.date + 'T' + (a.time || '00:00')).getTime() - new Date(b.date + 'T' + (b.time || '00:00')).getTime())
                            .map(appt => (
                            <tr key={appt.id} className="hover:bg-stone-50/50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <p className="font-bold text-stone-700">{format(new Date(appt.date), 'MMM dd, yyyy')}</p>
                                <p className="text-xs text-stone-400">{appt.time}</p>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-stone-600">{appt.doctorName}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(appt.status)}</td>
                              <td className="px-4 py-3 text-stone-500 text-xs max-w-[200px] truncate">{appt.notes || '—'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <button className="text-emerald-600 hover:text-emerald-700 font-bold text-xs transition-colors">
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Past Appointments */}
              <div>
                <h2 className="text-lg font-bold text-stone-900 mb-4">Past Appointments ({appointments.filter(a => a.status === 'cancelled' || a.status === 'completed' || isBefore(new Date(a.date + 'T' + (a.time || '00:00')), startOfToday())).length})</h2>
                {appointments.filter(a => a.status === 'cancelled' || a.status === 'completed' || isBefore(new Date(a.date + 'T' + (a.time || '00:00')), startOfToday())).length === 0 ? (
                  <div className="text-center py-12 text-stone-400 bg-white rounded-xl border border-stone-200">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-lg font-medium">No past appointments</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase tracking-wider">
                            <th className="px-4 py-3">Date & Time</th>
                            <th className="px-4 py-3">Doctor</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-sm">
                          {[...appointments]
                            .filter(a => a.status === 'cancelled' || a.status === 'completed' || isBefore(new Date(a.date + 'T' + (a.time || '00:00')), startOfToday()))
                            .sort((a: any, b: any) => new Date(b.date + 'T' + (b.time || '00:00')).getTime() - new Date(a.date + 'T' + (a.time || '00:00')).getTime())
                            .map(appt => (
                            <tr key={appt.id} className="hover:bg-stone-50/50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <p className="font-bold text-stone-700">{format(new Date(appt.date), 'MMM dd, yyyy')}</p>
                                <p className="text-xs text-stone-400">{appt.time}</p>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-stone-600">{appt.doctorName}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(appt.status)}</td>
                              <td className="px-4 py-3 text-stone-500 text-xs max-w-[200px] truncate">{appt.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PREVENTIVE CARE TAB */}
          {activeTab === 'preventive' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-bold text-stone-900 mb-4">Preventive Care</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-emerald-600" /> Vaccines
                  </h3>
                  <div className="text-center py-8 text-stone-400">
                    <Syringe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No vaccine records yet</p>
                    <p className="text-xs mt-1">Vaccine history will appear here once recorded.</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Deworming & Parasite Control
                  </h3>
                  <div className="text-center py-8 text-stone-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No deworming records yet</p>
                    <p className="text-xs mt-1">Deworming and parasite prevention records will appear here.</p>
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
              <h2 className="text-lg font-bold text-stone-900 mb-4">Admissions & Confinement ({admissions.length})</h2>
              {currentAdmission && (
                <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-orange-700">Currently Admitted</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-stone-500">Admitted:</span> <span className="font-bold">{formatDate(currentAdmission.checkInDate)}</span></div>
                    <div><span className="text-stone-500">Ward/Cage:</span> <span className="font-bold">{currentAdmission.cageWard || '—'}</span></div>
                    <div><span className="text-stone-500">Vet:</span> <span className="font-bold">{currentAdmission.assignedDoctorName || '—'}</span></div>
                    <div className="col-span-2"><span className="text-stone-500">Reason:</span> <span>{currentAdmission.reason}</span></div>
                    {currentAdmission.initialDiagnosis && <div className="col-span-2"><span className="text-stone-500">Diagnosis:</span> <span className="font-medium">{currentAdmission.initialDiagnosis}</span></div>}
                    {currentAdmission.specialInstructions && <div className="col-span-2"><span className="text-stone-500">Instructions:</span> <span>{currentAdmission.specialInstructions}</span></div>}
                  </div>
                </div>
              )}
              {admissions.length === 0 ? (
                <div className="text-center py-12 text-stone-400 bg-white rounded-xl border border-stone-200">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">No admissions recorded</p>
                  <p className="text-sm mt-1">Admission and confinement records will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-stone-700">Past Admissions</h3>
                  {[...admissions].filter(a => a.status !== 'admitted').sort((a: any, b: any) => new Date(b.checkInDate || 0).getTime() - new Date(a.checkInDate || 0).getTime()).map((adm: any) => (
                    <div key={adm.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{formatDate(adm.checkInDate)}</span>
                            {adm.actualDischarge && <span className="text-xs text-stone-400">→ {formatDate(adm.actualDischarge)}</span>}
                            {getStatusBadge(adm.status)}
                          </div>
                          <p className="text-sm text-stone-600 mt-1">{adm.reason}</p>
                          {adm.assignedDoctorName && <p className="text-xs text-stone-500">Vet: {adm.assignedDoctorName}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-stone-900">Billing & Invoices ({invoices.length})</h2>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm text-center">
                  <p className="text-[10px] text-stone-500 uppercase font-semibold">Total Billed</p>
                  <p className="text-2xl font-bold text-stone-900 mt-1">₱{totalInvoiced.toLocaleString()}</p>
                  <p className="text-xs text-stone-400">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm text-center">
                  <p className="text-[10px] text-stone-500 uppercase font-semibold">Paid</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">₱{totalPaid.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm text-center">
                  <p className="text-[10px] text-stone-500 uppercase font-semibold">Outstanding</p>
                  <p className={`text-2xl font-bold mt-1 ${outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    ₱{outstandingBalance.toLocaleString()}
                  </p>
                </div>
              </div>

              {invoices.length === 0 ? (
                <div className="text-center py-12 text-stone-400 bg-white rounded-xl border border-stone-200">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">No invoices yet</p>
                  <p className="text-sm mt-1">Billing records will appear here once invoices are created.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
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
                        {[...invoices].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((inv: any) => {
                          const total = inv.grandTotal ?? inv.amount ?? 0;
                          const paid = inv.amountPaid ?? 0;
                          const bal = inv.balanceDue ?? (total - paid);
                          return (
                            <tr key={inv.id} className="hover:bg-stone-50/50 transition-colors cursor-pointer" onClick={() => { if(currentUser?.role === 'admin') navigate('/crm/billing'); }}>
                              <td className="px-4 py-3 font-mono font-bold text-xs">{inv.invoiceNo || `INV-${inv.id?.slice(-6)}`}</td>
                              <td className="px-4 py-3 text-stone-600 text-xs">{formatDate(inv.createdAt || inv.date)}</td>
                              <td className="px-4 py-3 text-right font-bold">₱{total.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-green-600">₱{paid.toLocaleString()}</td>
                              <td className={`px-4 py-3 text-right font-bold ${bal > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                ₱{bal.toLocaleString()}
                              </td>
                              <td className="px-4 py-3">{getStatusBadge(inv.status)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Encounter Details Drawer */}
      <Drawer open={!!selectedEncounter} onOpenChange={(open) => !open && setSelectedEncounter(null)}>
        <DrawerContent className="w-full sm:max-w-xl">
          <DrawerHeader className="border-b border-stone-100 pb-4">
            <DrawerTitle className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Visit Record
            </DrawerTitle>
            <DrawerDescription>
              {selectedEncounter && formatDate(selectedEncounter.startedAt)} · Dr. {selectedEncounter?.doctorName || '—'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-6 overflow-y-auto space-y-6 h-full pb-20">
            {selectedEncounter && (
              <>
                {/* Chief Complaint */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Chief Complaint / Reason for Visit</p>
                  <p className="text-stone-900 font-medium">{selectedEncounter.chiefComplaint || 'Routine checkup'}</p>
                </div>

                {/* Vitals */}
                {selectedEncounter.vitals && Object.keys(selectedEncounter.vitals).length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" /> Triage & Vitals</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedEncounter.vitals.weight && <div className="p-3 bg-white border border-stone-200 rounded-lg"><span className="block text-[10px] text-stone-500 uppercase font-bold">Weight</span><span className="font-medium">{selectedEncounter.vitals.weight} kg</span></div>}
                      {selectedEncounter.vitals.temperature && <div className="p-3 bg-white border border-stone-200 rounded-lg"><span className="block text-[10px] text-stone-500 uppercase font-bold">Temp</span><span className="font-medium">{selectedEncounter.vitals.temperature} °C</span></div>}
                      {selectedEncounter.vitals.heartRate && <div className="p-3 bg-white border border-stone-200 rounded-lg"><span className="block text-[10px] text-stone-500 uppercase font-bold">Heart Rate</span><span className="font-medium">{selectedEncounter.vitals.heartRate} bpm</span></div>}
                      {selectedEncounter.vitals.respiratoryRate && <div className="p-3 bg-white border border-stone-200 rounded-lg"><span className="block text-[10px] text-stone-500 uppercase font-bold">Resp Rate</span><span className="font-medium">{selectedEncounter.vitals.respiratoryRate} /min</span></div>}
                    </div>
                  </div>
                )}

                {/* Clinical Notes (SOAP) */}
                {selectedEncounter.clinicalNotes && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-blue-500" /> Clinical Notes</h3>
                    
                    {selectedEncounter.clinicalNotes.subjective && (
                      <div className="p-3 bg-blue-50/50 rounded-lg text-sm border border-blue-100">
                        <span className="font-bold text-blue-800 block mb-1">Subjective (History)</span>
                        <p className="text-stone-700 whitespace-pre-wrap">{selectedEncounter.clinicalNotes.subjective}</p>
                      </div>
                    )}
                    
                    {selectedEncounter.clinicalNotes.objective && (
                      <div className="p-3 bg-emerald-50/50 rounded-lg text-sm border border-emerald-100">
                        <span className="font-bold text-emerald-800 block mb-1">Objective (Physical Exam)</span>
                        <p className="text-stone-700 whitespace-pre-wrap">{selectedEncounter.clinicalNotes.objective}</p>
                      </div>
                    )}
                    
                    {selectedEncounter.clinicalNotes.assessment && (
                      <div className="p-3 bg-purple-50/50 rounded-lg text-sm border border-purple-100">
                        <span className="font-bold text-purple-800 block mb-1">Assessment (Diagnosis)</span>
                        <p className="text-stone-700 whitespace-pre-wrap">{selectedEncounter.clinicalNotes.assessment}</p>
                      </div>
                    )}

                    {selectedEncounter.clinicalNotes.plan && (
                      <div className="p-3 bg-orange-50/50 rounded-lg text-sm border border-orange-100">
                        <span className="font-bold text-orange-800 block mb-1">Plan (Treatment/Instructions)</span>
                        <p className="text-stone-700 whitespace-pre-wrap">{selectedEncounter.clinicalNotes.plan}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Plan Items / Prescriptions */}
                {selectedEncounter.clinicalNotes?.planItems?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2"><Pill className="w-4 h-4 text-indigo-500" /> Prescriptions & Treatments</h3>
                    <div className="space-y-2">
                      {selectedEncounter.clinicalNotes.planItems.map((item: any, i: number) => (
                        <div key={item.id || i} className="p-3 bg-white border border-stone-200 rounded-lg flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${item.type === 'prescription' ? 'bg-indigo-50 text-indigo-600' : 'bg-stone-100 text-stone-600'}`}>
                            {item.type === 'prescription' ? <Pill className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-stone-900">{item.name || item.medicationName || item.treatmentName || 'Treatment'}</p>
                            <p className="text-xs text-stone-500 mt-1">{item.instructions || item.dosage || '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit Dialog */}
      {pet && (
        <PetDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          mode="edit"
          pet={pet}
          users={{}}
          onSubmit={handlePetUpdate}
          onCancel={() => setIsEditDialogOpen(false)}
          isSubmitting={isSubmittingEdit}
        />
      )}
    </DashboardLayout>
  );
}