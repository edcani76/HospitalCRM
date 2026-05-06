import React, { useState, useEffect } from 'react';
import { auth, db, collection, query, where, onSnapshot, doc, getDoc, addDoc, serverTimestamp, updateDoc } from '../firebase';
import { Appointment, Report, UserProfile, Invoice, Pet } from '../types';
import { motion } from 'motion/react';
import { LayoutDashboard, Calendar, FileText, Clock, CheckCircle, XCircle, AlertCircle, Plus, User, ArrowRight, Download, Activity, ChevronRight, Edit, Ban, X } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import PetDialog from '../components/crm/pet-dialog';
import { uploadToGoogleDrive } from '../lib/google-drive';
import { ServiceSelector } from '../components/ServiceSelector';

function PetImage({ pet }: { pet: Pet }) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name)}&background=10b981&color=fff&size=200&font-size=0.33&bold=false`;
  const [src, setSrc] = useState('');

  useEffect(() => {
    let url = fallback;
    if (pet.imageUrl) {
      const driveMatch = pet.imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        url = `https://lh3.googleusercontent.com/d/${driveMatch[1]}=w1000`;
      } else if (pet.imageUrl.startsWith('data:') || pet.imageUrl.startsWith('http')) {
        url = pet.imageUrl;
      }
    }
    setSrc(url);
  }, [pet.imageUrl, pet.name]);

  return (
    <img 
      src={src || fallback} 
      alt={pet.name} 
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
    />
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const tab = (location.state as any)?.tab;
    if (tab) setActiveTab(tab);
  }, []);

  useEffect(() => {
    if (!user || !user.uid) return;
    if (user.role !== 'client') {
      let path = '/crm/admin-dashboard';
      if (user.role === 'doctor') path = '/crm/doctor-dashboard';
      else if (user.role === 'lab') path = '/crm/lab-dashboard';
      else if (user.role === 'pharmacist') path = '/crm/pharmacist-dashboard';
      navigate(path, { replace: true });
    }
  }, [user, navigate]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pets' | 'appointments' | 'billing' | 'records'>('overview');
  const [isPetDialogOpen, setIsPetDialogOpen] = useState(false);
  const [isSubmittingPet, setIsSubmittingPet] = useState(false);
  const [showMoreAppointments, setShowMoreAppointments] = useState(false);
  const [manageApt, setManageApt] = useState<Appointment | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (!user || !user.uid) return;

    // Listen to Appointments
    const qAppointments = query(
      collection(db, 'appointments'),
      where('clientUid', '==', user.uid)
    );
    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const apt = { id: doc.id, ...doc.data() } as Appointment;
        const servicesMatch = apt.notes?.match(/Services:\s*([^\n]+)/i);
        if (servicesMatch) {
          apt.services = servicesMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        return apt;
      });
      setAppointments(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    // Listen to Reports
    const qReports = query(
      collection(db, 'reports'),
      where('clientUid', '==', user.uid)
    );
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      setReports(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });

    // Listen to Invoices
    const qInvoices = query(
      collection(db, 'invoices'),
      where('clientUid', '==', user.uid)
    );
    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      setInvoices(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    // Listen to Pets
    const qPets = query(
      collection(db, 'pets'),
      where('ownerUid', '==', user.uid)
    );
    const unsubPets = onSnapshot(qPets, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));
      console.log('[Dashboard] Pets loaded:', data.map(p => ({ id: p.id, name: p.name, imageUrl: p.imageUrl })));
      setPets(data);
      setLoading(false);
    });

    return () => {
      unsubAppointments();
      unsubReports();
      unsubInvoices();
      unsubPets();
    };
  }, [user]);

  const handleNewPetSubmit = async (formData: any) => {
    console.log('[Pet Submit] handleNewPetSubmit called, user:', !!user, 'photo:', !!formData.photoFile);
    if (!user) {
      console.error('[Pet Submit] No user, returning');
      setIsSubmittingPet(false);
      return;
    }
    setIsSubmittingPet(true);
    try {
      let imageUrl = '';
      if (formData.photoFile) {
        const ownerName = user.displayName || user.email?.split('@')[0] || 'Unknown';
        const result = await uploadToGoogleDrive(formData.photoFile, {
          ownerName,
          petName: formData.name,
          fileType: 'photos',
        });
        imageUrl = result.downloadUrl || result.webViewLink;
      }

      console.log('[Pet Submit] Saving to Firestore, imageUrl:', imageUrl);
      await addDoc(collection(db, 'pets'), {
        name: formData.name,
        species: formData.species,
        breed: formData.breed,
        ownerUid: user.uid,
        weight: formData.weight || 0,
        dateOfBirth: formData.dateOfBirth || '',
        gender: formData.gender || '',
        bloodType: formData.bloodType || 'Unknown',
        color: formData.color || '',
        imageUrl,
        currentStatus: 'active',
        createdAt: serverTimestamp()
      });
      console.log('[Pet Submit] Firestore save complete');
      setIsPetDialogOpen(false);
    } catch (err: any) {
      console.error('[Pet Submit] Failed to register pet:', err);
    } finally {
      console.log('[Pet Submit] Finally block - stopping spinner');
      setIsSubmittingPet(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-700';
      case 'unconfirmed': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'unconfirmed': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleCancelAppointment = async () => {
    if (!manageApt || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await updateDoc(doc(db, 'appointments', manageApt.id), {
        status: 'cancelled',
        cancelReason: cancelReason.trim(),
        cancelledAt: serverTimestamp(),
      });
      setShowCancelDialog(false);
      setManageApt(null);
      setCancelReason('');
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
      alert('Failed to cancel appointment. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!manageApt || !rescheduleDate || !rescheduleTime) return;
    setRescheduling(true);
    try {
      await updateDoc(doc(db, 'appointments', manageApt.id), {
        date: rescheduleDate,
        time: rescheduleTime,
        rescheduledAt: serverTimestamp(),
        status: 'unconfirmed',
      });
      setShowRescheduleDialog(false);
      setManageApt(null);
      setRescheduleDate('');
      setRescheduleTime('');
    } catch (err) {
      console.error('Failed to reschedule appointment:', err);
      alert('Failed to reschedule appointment. Please try again.');
    } finally {
      setRescheduling(false);
    }
  };

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  const menuItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'pets', label: 'My Pets', icon: <User className="w-5 h-5" /> },
    { id: 'appointments', label: 'My Appointments', icon: <Calendar className="w-5 h-5" /> },
    { id: 'billing', label: 'Billing & Invoices', icon: <FileText className="w-5 h-5" /> },
    { id: 'records', label: 'Medical Reports', icon: <Clock className="w-5 h-5" /> },
  ];

  const breadcrumbs = [
    { name: 'Dashboard', path: '/dashboard' },
    ...(activeTab !== 'overview' ? [{
      name: menuItems.find(m => m.id === activeTab)?.label || activeTab,
      onClick: () => setActiveTab(activeTab),
    }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <DashboardLayout
      user={user}
      menuItems={menuItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title="Pet Parent Portal"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-12 pb-12">
        {activeTab === 'overview' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Premium Welcome Hero */}
            <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-6 md:p-10 text-white shadow-lg">
              {/* Animated Background Element */}
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white/10">
                      <img 
                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || user?.email}&background=10b981&color=fff`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-md border-2 border-slate-900 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                      <Activity className="w-3 h-3" />
                      Premium Member
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-none">
                      Welcome, <br />
                      <span className="text-emerald-400">{user?.displayName?.split(' ')[0] || 'Pet Parent'}</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium max-w-md">Your edvirontvet family health summary is ready.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Link 
                    to="/doctors" 
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Schedule Clinical Visit
                  </Link>
                  <p className="text-slate-500 text-[10px] text-center font-medium">Next availability: Today, 2:30 PM</p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Registered Pets', value: pets.length, icon: User, color: 'text-blue-500', bg: 'bg-blue-50', shadow: 'shadow-blue-500/10' },
                { label: 'Scheduled Visits', value: appointments.filter(a => a.status === 'confirmed' || a.status === 'unconfirmed').length, icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50', shadow: 'shadow-emerald-500/10' },
                { label: 'Outstanding Balance', value: `PHP${invoices.filter(i => i.status === 'active').reduce((sum, inv) => sum + inv.amount, 0).toFixed(0)}`, icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50', shadow: 'shadow-rose-500/10' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="relative z-10">
                    <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${stat.shadow} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <p className="text-slate-400 font-medium text-xs mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Upcoming Visits
                  </h3>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="text-xs font-medium text-slate-400 hover:text-primary transition-colors"
                  >
                    View All History
                  </button>
                </div>
                
                {(() => {
                  const upcoming = appointments
                    .filter(a => a.status !== 'cancelled' && a.status !== 'completed' && new Date(a.date) >= new Date(new Date().toDateString()))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  
                  if (upcoming.length === 0) return (
                    <div className="bg-white/40 p-8 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-3">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto shadow-sm">
                        <Calendar className="w-6 h-6 text-slate-200" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm font-semibold">No Active Visits</p>
                        <p className="text-slate-400 text-xs">Keep your companions healthy by scheduling a routine checkup.</p>
                      </div>
                      <Link to="/doctors" className="inline-flex items-center gap-2 bg-white text-emerald-500 px-4 py-2 rounded-lg text-xs font-semibold border border-emerald-100 shadow-sm hover:bg-emerald-50 transition-all">
                        Browse Specialists <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  );

                  const visible = showMoreAppointments ? upcoming : upcoming.slice(0, 5);

                  return (
                    <div className="space-y-3">
                      {visible.map((apt) => {
                        const isUnconfirmed = apt.status === 'unconfirmed';
                        return (
                          <div key={apt.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-50 rounded-lg flex flex-col items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                              <span className="text-[10px] font-bold uppercase">
                                {format(new Date(apt.date), 'MMM')}
                              </span>
                              <span className="text-xl font-bold leading-none">
                                {format(new Date(apt.date), 'dd')}
                              </span>
                            </div>
                            <div className="flex-1 text-center md:text-left min-w-0">
                              {isUnconfirmed && (
                                <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-amber-50 rounded-md text-amber-600 text-[10px] font-semibold mb-1">
                                  Pending Confirmation
                                </div>
                              )}
                              {!isUnconfirmed && (
                                <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-indigo-50 rounded-md text-indigo-600 text-[10px] font-semibold mb-1">
                                  Confirmed
                                </div>
                              )}
                              <h4 className="text-base font-bold text-slate-900 truncate">
                                {apt.petName}'s Visit
                              </h4>
                              <p className="text-slate-400 text-xs mt-0.5">
                                Dr. {apt.doctorName} • <span className="text-slate-900">{apt.time}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setManageApt(apt);
                                setCancelReason('');
                                setRescheduleDate(apt.date);
                                setRescheduleTime(apt.time);
                              }}
                              className="bg-slate-900 text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm shrink-0"
                            >
                              Manage
                            </button>
                          </div>
                        );
                      })}
                      {upcoming.length > 5 && !showMoreAppointments && (
                        <button
                          onClick={() => setShowMoreAppointments(true)}
                          className="w-full py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-700 transition-all"
                        >
                          Load More ({upcoming.length - 5} more)
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-slate-900 p-6 rounded-xl text-white flex flex-col justify-between shadow-lg">
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-400">
                    <LayoutDashboard className="w-5 h-5" />
                    Quick Pulse
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Register Pet', icon: Plus, tab: 'pets', color: 'text-emerald-400' },
                      { label: 'Invoices', icon: FileText, tab: 'billing', color: 'text-amber-400' },
                      { label: 'EMR Vault', icon: Clock, tab: 'records', color: 'text-indigo-400' },
                      { label: 'Messages', icon: AlertCircle, tab: 'overview', color: 'text-rose-400' }
                    ].map((action, i) => (
                      <button 
                        key={i}
                        onClick={() => setActiveTab(action.tab as any)}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl transition-all text-left flex flex-col gap-3 group border border-white/5"
                      >
                        <action.icon className={`w-5 h-5 ${action.color} group-hover:scale-110 transition-transform`} />
                        <span className="font-semibold text-xs uppercase">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="text-slate-500 text-[10px] font-medium mb-1">Support ID</p>
                  <p className="font-mono text-xs text-white/40">MP-USR-{user?.uid.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'pets' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                    <User className="w-5 h-5" />
                  </div>
                  My Beloved Pets
                </h2>
                <p className="text-slate-500 mt-1 text-sm font-medium">Detailed clinical oversight for your companions.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pets.map(pet => (
                <Link 
                  key={pet.id} 
                  to={`/pet/${pet.id}`}
                  className="group relative bg-white rounded-xl border border-slate-100 overflow-hidden hover:border-emerald-200 hover:shadow-md transition-all duration-300"
                >
                  {/* Pet Photo */}
                  <div className="relative h-40 bg-gradient-to-br from-emerald-50 to-slate-50 overflow-hidden">
                    <PetImage pet={pet} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                    {/* Species Badge */}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-600 shadow-sm">
                      {pet.species}
                    </div>
                  </div>
                  
                  {/* Pet Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 group-hover:text-emerald-600 transition-colors leading-tight">{pet.name}</h4>
                      {pet.breed && (
                        <p className="text-xs font-medium text-slate-400 mt-0.5">{pet.breed}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded-lg text-center">
                        <p className="text-[9px] font-medium text-slate-400 mb-0.5">Age</p>
                        <p className="text-sm font-bold text-slate-900">{pet.age || '?'}y</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg text-center">
                        <p className="text-[9px] font-medium text-slate-400 mb-0.5">Weight</p>
                        <p className="text-sm font-bold text-slate-900">{pet.weight || '?'}kg</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-600 transition-colors">View Profile</span>
                      <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              
<button 
                  onClick={() => setIsPetDialogOpen(true)}
                  className="group relative rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all duration-300 flex flex-col items-center justify-center py-12 px-6 text-slate-400 hover:text-emerald-600 cursor-pointer min-h-[240px]"
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-50 group-hover:bg-emerald-100 flex items-center justify-center mb-3 transition-colors shadow-sm">
                    <Plus className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-sm">Register New Pet</p>
                  <p className="text-xs text-slate-400 mt-1 group-hover:text-emerald-500/70 transition-colors">Add to your family</p>
                </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'appointments' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  Visit History
                </h2>
                <p className="text-slate-500 mt-1 text-sm font-medium">All your appointments - upcoming and past.</p>
              </div>
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to Overview
              </button>
            </div>
            
            {(() => {
              const today = new Date(new Date().toDateString());
              const upcoming = appointments
                .filter(a => a.status !== 'cancelled' && new Date(a.date) >= today)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              const past = appointments
                .filter(a => a.status === 'completed' || a.status === 'cancelled' || new Date(a.date) < today)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return (
                <>
                  {upcoming.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-3 bg-indigo-50/50 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-indigo-600">Upcoming ({upcoming.length})</h3>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {upcoming.map((app) => (
                          <div key={app.id} className="p-4 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50/50 transition-colors group gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-50 rounded-lg flex flex-col items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                                <span className="text-[8px] font-bold uppercase">
                                  {format(new Date(app.date), 'MMM')}
                                </span>
                                <span className="text-lg font-bold leading-none">
                                  {format(new Date(app.date), 'dd')}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h4 className="font-semibold text-sm text-slate-900">{app.petName}'s Consultation</h4>
                                  {app.status === 'unconfirmed' && (
                                    <Badge variant="outline" className="rounded-md text-[10px] font-medium bg-amber-50 text-amber-600 border-amber-200">Pending</Badge>
                                  )}
                                  {app.status === 'confirmed' && (
                                    <Badge variant="outline" className="rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-600 border-emerald-200">Confirmed</Badge>
                                  )}
                                </div>
                                <p className="text-xs font-medium text-slate-400">
                                  Dr. {app.doctorName} • <span className="text-slate-900">{app.time}</span>
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setManageApt(app);
                                setCancelReason('');
                                setRescheduleDate(app.date);
                                setRescheduleTime(app.time);
                              }}
                              className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all shrink-0"
                            >
                              Manage
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-500">Past Visits ({past.length})</h3>
                    </div>
                    {past.length === 0 ? (
                      <div className="p-12 text-center">
                        <p className="text-slate-400 text-sm">No past visits yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {past.map((app) => (
                          <div key={app.id} className="p-4 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50/50 transition-colors group gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-500 shrink-0">
                                <span className="text-[8px] font-medium uppercase">
                                  {format(new Date(app.date), 'MMM')}
                                </span>
                                <span className="text-lg font-bold leading-none">
                                  {format(new Date(app.date), 'dd')}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h4 className="font-semibold text-sm text-slate-900">{app.petName}'s Consultation</h4>
                                  <Badge variant="outline" className={`rounded-md text-[10px] font-medium border ${
                                    app.status === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                    app.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                                    'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}>
                                    {app.status}
                                  </Badge>
                                </div>
                                <p className="text-xs font-medium text-slate-400">
                                  Dr. {app.doctorName} • <span className="text-slate-900">{app.time}</span>
                                </p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

        {activeTab === 'billing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  Financial Records
                </h2>
                <p className="text-slate-500 mt-1 text-sm font-medium">Transparency in your pet's healthcare investments.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              {invoices.length === 0 ? (
                <div className="p-16 text-center text-slate-300 text-sm font-medium">No financial history found.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="p-6 flex flex-col md:flex-row items-center justify-between hover:bg-rose-50/20 transition-colors group gap-4">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover:text-rose-500 transition-all border border-slate-100">
                          <Download className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-base text-slate-900">{inv.description}</h4>
                          <p className="text-xs font-medium text-slate-400 mt-0.5">
                            Patient: {inv.petName} • Due <span className="text-rose-500">{format(new Date(inv.dueDate), 'MMM dd, yyyy')}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center md:items-end gap-1">
                        <p className="text-xl font-bold text-slate-900">PHP${inv.amount.toFixed(2)}</p>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md text-[10px] font-semibold ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          {inv.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'records' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  EMR Vault
                </h2>
                <p className="text-slate-500 mt-1 text-sm font-medium">Secure access to clinical summaries and diagnostic results.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reports.map((report) => (
                <div key={report.id} className="bg-white p-6 rounded-xl border border-slate-100 hover:border-indigo-500/20 transition-all shadow-sm hover:shadow-md group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 border border-indigo-100 group-hover:scale-105 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-semibold mb-1">
                          Clinical Report
                        </div>
                        <h4 className="font-semibold text-lg text-slate-900 leading-tight">{report.title}</h4>
                        <p className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(report.date), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg mb-6">
                      <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 italic">
                        "{report.description}"
                      </p>
                    </div>
                  </div>
                  <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>

    <PetDialog
      open={isPetDialogOpen}
      onOpenChange={setIsPetDialogOpen}
      mode="add"
      users={{}}
      onSubmit={handleNewPetSubmit}
      onCancel={() => setIsPetDialogOpen(false)}
      isSubmitting={isSubmittingPet}
    />

    {/* Manage Appointment Dialog */}
    {manageApt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setManageApt(null)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="bg-slate-900 text-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Manage Appointment</h3>
              <button onClick={() => setManageApt(null)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Appointment Details */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex flex-col items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                  <span className="text-[8px] font-bold uppercase">{format(new Date(manageApt.date), 'MMM')}</span>
                  <span className="text-lg font-bold leading-none">{format(new Date(manageApt.date), 'dd')}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{manageApt.petName}'s Visit</p>
                  <p className="text-xs text-slate-500">Dr. {manageApt.doctorName}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Time</span>
                <span className="font-semibold text-slate-900">{manageApt.time}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <Badge className={getStatusColor(manageApt.status)}>{manageApt.status}</Badge>
              </div>
              {manageApt.services && manageApt.services.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {manageApt.services.map((s, i) => (
                      <span key={i} className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {manageApt.notes && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500">Notes: {manageApt.notes}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {manageApt.status === 'cancelled' || manageApt.status === 'completed' ? (
              <p className="text-sm text-center text-slate-400 italic">This appointment is {manageApt.status}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setShowCancelDialog(true); }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  <span className="text-sm font-semibold">Cancel Appointment</span>
                </button>
                <button
                  onClick={() => { setShowRescheduleDialog(true); }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-sm font-semibold">Reschedule</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Cancel Dialog */}
    {showCancelDialog && manageApt && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCancelDialog(false)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="bg-red-600 text-white p-4">
            <h3 className="text-lg font-bold">Cancel Appointment</h3>
            <p className="text-red-100 text-xs mt-1">{manageApt.petName}'s visit on {format(new Date(manageApt.date), 'MMM dd, yyyy')}</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Reason for Cancellation</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Please let us know why you need to cancel..."
                className="w-full border border-slate-200 rounded-xl p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={cancelling || !cancelReason.trim()}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Reschedule Dialog */}
    {showRescheduleDialog && manageApt && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowRescheduleDialog(false)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="bg-indigo-600 text-white p-4">
            <h3 className="text-lg font-bold">Reschedule Appointment</h3>
            <p className="text-indigo-100 text-xs mt-1">{manageApt.petName}'s visit with Dr. {manageApt.doctorName}</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">New Date</label>
              <input
                type="date"
                value={rescheduleDate}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setRescheduleDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">New Time</label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setRescheduleTime(time)}
                    className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                      rescheduleTime === time
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-slate-50 border-slate-200 hover:border-indigo-200 text-slate-600'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRescheduleDialog(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleAppointment}
                disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {rescheduling ? 'Rescheduling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
