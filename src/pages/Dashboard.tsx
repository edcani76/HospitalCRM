import React, { useState, useEffect } from 'react';
import { auth, db, collection, query, where, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from '../firebase';
import { Appointment, Report, UserProfile, Invoice, Pet } from '../types';
import { motion } from 'motion/react';
import { LayoutDashboard, Calendar, FileText, Clock, CheckCircle, XCircle, AlertCircle, Plus, User, ArrowRight, Download, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import PetDialog from '../components/crm/pet-dialog';
import { uploadToGoogleDrive } from '../lib/google-drive';

function PetImage({ pet }: { pet: Pet }) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name)}&background=10b981&color=fff&size=300&bold=true`;
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

  useEffect(() => {
    if (user && user.role !== 'client') {
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

  useEffect(() => {
    if (!user || !user.uid) return;

    // Listen to Appointments
    const qAppointments = query(
      collection(db, 'appointments'),
      where('clientUid', '==', user.uid)
    );
    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
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
        console.log('[Pet Submit] Uploading photo to Google Drive...');
        try {
          const ownerName = user.displayName || user.email?.split('@')[0] || 'Unknown';
          const result = await uploadToGoogleDrive(formData.photoFile, {
            ownerName,
            petName: formData.name,
            fileType: 'photos',
          });
          console.log('[Pet Submit] Drive upload result:', result);
          imageUrl = result.downloadUrl || result.webViewLink;
        } catch (uploadErr) {
          console.warn('[Pet Submit] Google Drive upload failed, using base64 fallback:', uploadErr);
          const reader = new FileReader();
          imageUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(formData.photoFile);
          });
          console.log('[Pet Submit] Base64 fallback complete, length:', imageUrl.length);
        }
      } else {
        console.log('[Pet Submit] No photo file, skipping upload');
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

  const menuItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'pets', label: 'My Pets', icon: <User className="w-5 h-5" /> },
    { id: 'appointments', label: 'My Appointments', icon: <Calendar className="w-5 h-5" /> },
    { id: 'billing', label: 'Billing & Invoices', icon: <FileText className="w-5 h-5" /> },
    { id: 'records', label: 'Medical Reports', icon: <Clock className="w-5 h-5" /> },
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
    >
      <div className="space-y-12 pb-12">
        {activeTab === 'overview' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Premium Welcome Hero */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl shadow-slate-900/40">
              {/* Animated Background Element */}
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                <div className="flex items-center gap-10">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white/10 ring-8 ring-emerald-500/10 shadow-2xl">
                      <img 
                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || user?.email}&background=10b981&color=fff`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-8 h-8 rounded-2xl border-4 border-slate-900 flex items-center justify-center shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                      <Activity className="w-3 h-3" />
                      Premium Member
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                      Welcome home, <br />
                      <span className="text-emerald-400">{user?.displayName?.split(' ')[0] || 'Pet Parent'}</span>
                    </h1>
                    <p className="text-slate-400 text-xl font-medium max-w-md">Your edvirontvet family health summary is ready.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <Link 
                    to="/doctors" 
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-emerald-500/30 group"
                  >
                    <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
                    Schedule Clinical Visit
                  </Link>
                  <p className="text-slate-500 text-xs text-center font-bold uppercase tracking-tighter">Next availability: Today, 2:30 PM</p>
                </div>
              </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { label: 'Registered Pets', value: pets.length, icon: User, color: 'text-blue-500', bg: 'bg-blue-50', shadow: 'shadow-blue-500/10' },
                { label: 'Scheduled Visits', value: appointments.filter(a => a.status === 'confirmed' || a.status === 'unconfirmed').length, icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50', shadow: 'shadow-emerald-500/10' },
                { label: 'Outstanding Balance', value: `PHP${invoices.filter(i => i.status === 'active').reduce((sum, inv) => sum + inv.amount, 0).toFixed(0)}`, icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50', shadow: 'shadow-rose-500/10' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-slate-100/50 transition-colors" />
                  <div className="relative z-10">
                    <div className={`${stat.bg} ${stat.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${stat.shadow} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-8 h-8" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-2">{stat.label}</p>
                    <h3 className="text-5xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-indigo-500" />
                    Next Clinical Appointment
                  </h3>
                  <Link to="/appointments" className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">View All History</Link>
                </div>
                
                {(() => {
                  const upcoming = appointments
                    .filter(a => a.status !== 'cancelled' && a.status !== 'completed' && new Date(a.date) >= new Date(new Date().toDateString()))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  const nextAppt = upcoming[0];
                  
                  if (!nextAppt) return (
                    <div className="bg-white/40 p-12 rounded-[2.5rem] border-4 border-dashed border-slate-200 text-center space-y-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <Calendar className="w-8 h-8 text-slate-200" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-lg font-black uppercase tracking-widest">No Active Visits</p>
                        <p className="text-slate-400 font-medium">Keep your companions healthy by scheduling a routine checkup.</p>
                      </div>
                      <Link to="/doctors" className="inline-flex items-center gap-2 bg-white text-emerald-500 px-6 py-3 rounded-2xl font-black text-sm border border-emerald-100 shadow-sm hover:bg-emerald-50 transition-all">
                        Browse Specialists <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  );

                  const isUnconfirmed = nextAppt.status === 'unconfirmed';

                  return (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col md:flex-row items-center gap-8">
                      <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex flex-col items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
                        <span className="text-xs font-black uppercase tracking-tighter">
                          {format(new Date(nextAppt.date), 'MMM')}
                        </span>
                        <span className="text-4xl font-black leading-none">
                          {format(new Date(nextAppt.date), 'dd')}
                        </span>
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        {isUnconfirmed && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full text-amber-600 text-[10px] font-black uppercase tracking-widest mb-3">
                            Pending Confirmation
                          </div>
                        )}
                        {!isUnconfirmed && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-3">
                            General Consultation
                          </div>
                        )}
                        <h4 className="text-3xl font-black text-slate-900 leading-tight">
                          {nextAppt.petName}'s Visit
                        </h4>
                        <p className="text-slate-400 font-bold mt-1 text-lg">
                          Dr. {nextAppt.doctorName} • <span className="text-slate-900">{nextAppt.time}</span>
                        </p>
                      </div>
                      <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
                        Manage Visit
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col justify-between shadow-2xl shadow-slate-900/30">
                <div>
                  <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-emerald-400">
                    <LayoutDashboard className="w-6 h-6" />
                    Quick Pulse
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Register Pet', icon: Plus, tab: 'pets', color: 'text-emerald-400' },
                      { label: 'Invoices', icon: FileText, tab: 'billing', color: 'text-amber-400' },
                      { label: 'EMR Vault', icon: Clock, tab: 'records', color: 'text-indigo-400' },
                      { label: 'Messages', icon: AlertCircle, tab: 'overview', color: 'text-rose-400' }
                    ].map((action, i) => (
                      <button 
                        key={i}
                        onClick={() => setActiveTab(action.tab as any)}
                        className="bg-white/5 hover:bg-white/10 p-6 rounded-[2rem] transition-all text-left flex flex-col gap-4 group border border-white/5"
                      >
                        <action.icon className={`w-7 h-7 ${action.color} group-hover:scale-110 transition-transform`} />
                        <span className="font-black text-xs uppercase tracking-widest">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-white/5">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Support ID</p>
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
            className="space-y-12"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <User className="w-7 h-7" />
                  </div>
                  My Beloved Pets
                </h2>
                <p className="text-slate-500 mt-2 font-medium text-lg">Detailed clinical oversight for your companions.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pets.map(pet => (
                <Link 
                  key={pet.id} 
                  to={`/pet/${pet.id}`}
                  className="group relative bg-white rounded-3xl border border-slate-100 overflow-hidden hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300"
                >
                  {/* Pet Photo */}
                  <div className="relative h-48 bg-gradient-to-br from-emerald-50 to-slate-50 overflow-hidden">
                    <PetImage pet={pet} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                    {/* Species Badge */}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-600 shadow-sm">
                      {pet.species}
                    </div>
                  </div>
                  
                  {/* Pet Info */}
                  <div className="p-6 space-y-5">
                    <div>
                      <h4 className="font-black text-2xl text-slate-900 group-hover:text-emerald-600 transition-colors leading-tight">{pet.name}</h4>
                      {pet.breed && (
                        <p className="text-sm font-bold text-slate-400 mt-1">{pet.breed}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-2xl text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Age</p>
                        <p className="text-base font-black text-slate-900">{pet.age || '?'}y</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Weight</p>
                        <p className="text-base font-black text-slate-900">{pet.weight || '?'}kg</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">View Profile</span>
                      <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              
<button 
                  onClick={() => setIsPetDialogOpen(true)}
                  className="group relative rounded-3xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all duration-300 flex flex-col items-center justify-center py-16 px-8 text-slate-400 hover:text-emerald-600 cursor-pointer min-h-[340px]"
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 group-hover:bg-emerald-100 flex items-center justify-center mb-4 transition-colors shadow-sm">
                    <Plus className="w-8 h-8" />
                  </div>
                  <p className="font-black text-base uppercase tracking-widest">Register New Pet</p>
                  <p className="text-xs font-bold text-slate-400 mt-2 group-hover:text-emerald-500/70 transition-colors">Add to your family</p>
                </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'appointments' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Calendar className="w-7 h-7" />
                  </div>
                  Visit History
                </h2>
                <p className="text-slate-500 mt-2 font-medium text-lg">Full clinical audit of your hospital visits.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
              {appointments.length === 0 ? (
                <div className="p-32 text-center space-y-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Calendar className="w-12 h-12 text-slate-200" />
                  </div>
                  <div>
                    <p className="text-slate-900 text-xl font-black uppercase tracking-widest">Registry Clear</p>
                    <p className="text-slate-400 font-medium">No appointments found in your clinical history.</p>
                  </div>
                  <Link to="/doctors" className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all">
                    Schedule Visit <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {appointments.map((app) => (
                    <div key={app.id} className="p-10 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50/50 transition-colors group gap-8">
                      <div className="flex items-center gap-10">
                        <div className="w-20 h-20 bg-slate-900 rounded-[1.5rem] flex flex-col items-center justify-center text-white shadow-2xl shadow-slate-900/20 group-hover:scale-105 transition-transform">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                            {format(new Date(app.date), 'MMM')}
                          </span>
                          <span className="text-3xl font-black leading-none">
                            {format(new Date(app.date), 'dd')}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-2xl text-slate-900">{app.petName}'s Consultation</h4>
                            <Badge variant="outline" className="rounded-lg text-[10px] font-black uppercase tracking-tighter border-slate-200">OPD</Badge>
                          </div>
                          <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">
                            Dr. {app.doctorName} • <span className="text-slate-900">{app.time}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                        <div className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] ${getStatusColor(app.status)} border border-current opacity-80`}>
                          {app.status}
                        </div>
                        <button className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                          <ArrowRight className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'billing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                  <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                    <FileText className="w-7 h-7" />
                  </div>
                  Financial Records
                </h2>
                <p className="text-slate-500 mt-2 font-medium text-lg">Transparency in your pet's healthcare investments.</p>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
              {invoices.length === 0 ? (
                <div className="p-32 text-center text-slate-300 font-black uppercase tracking-widest">No financial history found.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="p-10 flex flex-col md:flex-row items-center justify-between hover:bg-rose-50/20 transition-colors group gap-8">
                      <div className="flex items-center gap-10">
                        <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-300 group-hover:text-rose-500 transition-all border border-slate-100 shadow-inner">
                          <Download className="w-10 h-10" />
                        </div>
                        <div>
                          <h4 className="font-black text-2xl text-slate-900">{inv.description}</h4>
                          <p className="text-sm font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">
                            Patient: {inv.petName} • Due <span className="text-rose-500">{format(new Date(inv.dueDate), 'MMM dd, yyyy')}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center md:items-end gap-2">
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">PHP${inv.amount.toFixed(2)}</p>
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${inv.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
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
            className="space-y-12"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <FileText className="w-7 h-7" />
                  </div>
                  EMR Vault
                </h2>
                <p className="text-slate-500 mt-2 font-medium text-lg">Secure access to clinical summaries and diagnostic results.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {reports.map((report) => (
                <div key={report.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 hover:border-indigo-500/20 transition-all shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-20 h-20 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-500 border border-indigo-100 shadow-inner group-hover:scale-105 transition-transform">
                        <FileText className="w-10 h-10" />
                      </div>
                      <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                          Clinical Report
                        </div>
                        <h4 className="font-black text-2xl text-slate-900 leading-tight">{report.title}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(report.date), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl mb-10">
                      <p className="text-slate-600 font-bold leading-relaxed line-clamp-3 italic">
                        "{report.description}"
                      </p>
                    </div>
                  </div>
                  <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-900/10">
                    <Download className="w-5 h-5" /> Download Secure PDF
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
    </>
  );
}
