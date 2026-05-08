import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, collection, query, where, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from '../firebase';
import { Appointment, Report, Pet, UserProfile } from '../types';
import { motion } from 'motion/react';
import { 
  Calendar, 
  FileText, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Activity,
  Download,
  ChevronRight,
  Info,
  Heart,
  Plus,
  LayoutDashboard,
  ClipboardList,
  DollarSign,
  Users,
  Hash,
  Droplet,
  Palette,
  CalendarDays,
  Syringe,
  AlertTriangle,
  Edit,
  PawPrint
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader } from '../components/ui/page-header';
import PetDialog from '../components/crm/pet-dialog';
import { uploadToGoogleDrive } from '../lib/google-drive';

export default function PetProfile() {
  const { user: currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<Pet | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Define menu items based on role
  const getMenuItems = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
      return [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: 'queue', label: 'Patient Queue', icon: <ClipboardList className="w-5 h-5" /> },
        { id: 'appointments', label: 'Schedules', icon: <Calendar className="w-5 h-5" /> },
        { id: 'emr', label: 'Medical Records', icon: <Activity className="w-5 h-5" /> },
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

  useEffect(() => {
    if (!id) return;

    // Listen to Pet Details
    const unsubPet = onSnapshot(doc(db, 'pets', id), async (snapshot) => {
      if (snapshot.exists()) {
        const petData = { id: snapshot.id, ...snapshot.data() } as Pet;
        setPet(petData);

        // Fetch Owner Details
        const ownerDoc = await getDoc(doc(db, 'users', petData.ownerUid));
        if (ownerDoc.exists()) {
          setOwner({ uid: ownerDoc.id, ...ownerDoc.data() } as UserProfile);
        }
      }
    });

    // Listen to Reports (EMR)
    const qReports = query(collection(db, 'reports'), where('petId', '==', id));
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      setReports(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    // Listen to Appointments
    const qApp = query(collection(db, 'appointments'), where('petId', '==', id));
    const unsubApp = onSnapshot(qApp, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });

    return () => {
      unsubPet();
      unsubReports();
      unsubApp();
    };
  }, [id]);

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
      case 'confirmed': return <CheckCircle className="w-3 h-3" />;
      case 'unconfirmed': return <Clock className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const formatPetAge = () => {
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

  const handlePetUpdate = async (formData: any) => {
    if (!pet || !pet.id) return;
    setIsSubmittingEdit(true);
    try {
      let imageUrl = pet.imageUrl || '';
      if (formData.photoFile) {
        const ownerName = owner?.displayName || owner?.email?.split('@')[0] || 'Unknown';
        const result = await uploadToGoogleDrive(formData.photoFile, {
          ownerName,
          petName: pet.name,
          fileType: 'photos',
        });
        imageUrl = result.downloadUrl || result.webViewLink;
      }

      await updateDoc(doc(db, 'pets', pet.id), {
        name: formData.name,
        species: formData.species,
        breed: formData.breed,
        weight: formData.weight || 0,
        dateOfBirth: formData.dateOfBirth || '',
        gender: formData.gender || '',
        bloodType: formData.bloodType || 'Unknown',
        color: formData.color || '',
        microchipId: formData.microchipId || '',
        medicalHistory: formData.medicalHistory || '',
        imageUrl,
        updatedAt: serverTimestamp(),
      });

      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to update pet:', err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-stone-900">Pet not found</h2>
        <Link to="/admin" className="text-emerald-600 hover:underline mt-4 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <DashboardLayout
      user={currentUser}
      menuItems={getMenuItems()}
      activeTab={currentUser?.role === 'admin' ? 'emr' : 'pets'}
      onTabChange={(tab) => {
        if (currentUser?.role !== 'admin') {
          navigate('/dashboard', { state: { tab } });
        }
      }}
      title={`${pet.name}'s Medical Profile`}
      breadcrumbs={[
        { name: 'Dashboard', path: currentUser?.role === 'admin' ? '/admin' : '/dashboard' },
        { name: 'My Pets', onClick: () => navigate('/dashboard', { state: { tab: 'pets' } }) },
        { name: pet.name },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader
          title={`${pet.name}'s Medical Profile`}
          subtitle={`${pet.species} • ${pet.breed}`}
          onBack={null}
          actions={
            currentUser?.role === 'admin' ? (
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm">
                <Plus className="w-4 h-4" /> New Medical Entry
              </button>
            ) : currentUser?.uid === pet.ownerUid ? (
              <button 
                onClick={() => setIsEditDialogOpen(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
              >
                <Edit className="w-4 h-4" /> Edit Pet
              </button>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Pet Info & Owner */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="aspect-square relative">
                <img 
                  src={pet.imageUrl || `https://ui-avatars.com/api/?name=${pet.name}&background=10b981&color=fff&size=512`} 
                  alt={pet.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md bg-white text-stone-700 flex items-center gap-2`}>
                    <Heart className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                    {pet.currentStatus || 'Healthy'}
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-stone-900">{pet.name}</h1>
                  <p className="text-stone-500 text-sm">{pet.species}{pet.breed ? ` • ${pet.breed}` : ''}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-1">Age</p>
                    <p className="text-sm font-bold text-stone-700">{formatPetAge()}</p>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-1">Weight</p>
                    <p className="text-sm font-bold text-stone-700">{pet.weight ? `${pet.weight} kg` : 'N/A'}</p>
                  </div>
                  {pet.gender && (
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-1">Gender</p>
                      <p className="text-sm font-bold text-stone-700">{pet.gender}</p>
                    </div>
                  )}
                  {pet.color && (
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-1">Color</p>
                      <p className="text-sm font-bold text-stone-700">{pet.color}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Clinical Details */}
            {(pet.bloodType || pet.microchipId || pet.dateOfBirth || pet.medicalHistory) && (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4 shadow-sm">
                <h3 className="font-bold text-stone-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-emerald-600" /> Clinical Details
                </h3>
                <div className="space-y-3">
                  {pet.bloodType && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <Droplet className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Blood Type</p>
                        <p className="text-sm font-bold text-stone-700">{pet.bloodType}</p>
                      </div>
                    </div>
                  )}
                  {pet.microchipId && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Hash className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Microchip ID</p>
                        <p className="text-sm font-bold text-stone-700 font-mono">{pet.microchipId}</p>
                      </div>
                    </div>
                  )}
                  {pet.dateOfBirth && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Date of Birth</p>
                        <p className="text-sm font-bold text-stone-700">{format(new Date(pet.dateOfBirth + 'T00:00:00'), 'MMMM dd, yyyy')}</p>
                      </div>
                    </div>
                  )}
                  {pet.medicalHistory && (
                    <div className="pt-3 border-t border-stone-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Medical History</p>
                      </div>
                      <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap pl-11">{pet.medicalHistory}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Owner Info */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4 shadow-sm">
              <h3 className="font-bold text-stone-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <User className="w-4 h-4 text-emerald-600" /> Owner Details
              </h3>
              {owner ? (
                <div className="space-y-3">
                  <Link to={`/profile/${owner.uid}`} className="group flex items-center gap-4 p-2 -m-2 rounded-xl hover:bg-stone-50 transition-all">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-stone-100">
                      <img 
                        src={owner.photoURL || `https://ui-avatars.com/api/?name=${owner.displayName || owner.email}&background=10b981&color=fff`} 
                        alt={owner.displayName} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 group-hover:text-emerald-600 transition-colors truncate">{owner.displayName}</p>
                      <p className="text-xs text-stone-500 truncate">{owner.email}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-500 transition-colors" />
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-stone-400 italic">Owner info not available</p>
              )}
            </div>
          </div>

          {/* Right Columns: Medical History & Appointments */}
          <div className="lg:col-span-2 space-y-8">
            {/* Clinical History */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Electronic Medical Records (EMR)
              </h2>
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-4 shadow-sm">
                    <FileText className="w-12 h-12 text-stone-200 mx-auto" />
                    <p className="text-stone-500">No medical records found for {pet.name}.</p>
                  </div>
                ) : (
                  reports.map((report, idx) => (
                    <motion.div 
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm hover:border-emerald-300 transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900">{report.title}</h4>
                            <p className="text-xs text-stone-400">{format(new Date(report.date), 'MMMM dd, yyyy')}</p>
                          </div>
                        </div>
                        {report.fileUrl && (
                          <a 
                            href={report.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 bg-stone-50 text-stone-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                      <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">{report.description}</p>
                      <div className="mt-4 pt-4 border-t border-stone-50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                          <Info className="w-3 h-3" /> Verified Record
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{report.type || 'Clinical Note'}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Appointment History */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Visit History
              </h2>
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200">
                        <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                      {appointments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-stone-500 italic">No previous visits recorded.</td>
                        </tr>
                      ) : (
                        appointments.map(app => (
                          <tr key={app.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="font-bold text-stone-700">{format(new Date(app.date), 'MMM dd, yyyy')}</p>
                              <p className="text-[10px] text-stone-400">{app.time}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-stone-600 font-medium">{app.doctorName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${getStatusColor(app.status)}`}>
                                {getStatusIcon(app.status)}
                                {app.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button className="text-emerald-600 hover:text-emerald-700 font-bold text-xs transition-colors">
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
