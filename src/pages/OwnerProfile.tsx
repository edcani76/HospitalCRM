import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, collection, query, where, onSnapshot, doc, getDoc } from '../firebase';
import { Appointment, UserProfile, Invoice, Pet } from '../types';
import { motion } from 'motion/react';
import { 
  Calendar, 
  FileText, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  CreditCard,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users, 
  Activity, 
  DollarSign, 
  ClipboardList, 
  Beaker, 
  Pill,
  LayoutDashboard
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader } from '../components/ui/page-header';

export default function OwnerProfile() {
  const { user: currentUser } = useAuth();
  const { uid } = useParams<{ uid: string }>();
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Define menu items based on role
  const getMenuItems = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
      return [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: 'queue', label: 'Patient Queue', icon: <ClipboardList className="w-5 h-5" /> },
        { id: 'appointments', label: 'Schedules', icon: <Calendar className="w-5 h-5" /> },
        { id: 'emr', label: 'Medical Records', icon: <Activity className="w-5 h-5" /> },
        { id: 'billing', label: 'Billing', icon: <DollarSign className="w-5 h-5" /> },
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
    if (!uid) return;

    // Fetch Owner Profile
    const fetchOwner = async () => {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setOwner({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
      }
    };
    fetchOwner();

    // Listen to Pets
    const qPets = query(collection(db, 'pets'), where('ownerUid', '==', uid));
    const unsubPets = onSnapshot(qPets, (snapshot) => {
      setPets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet)));
    });

    // Listen to Appointments (Visit History)
    const qApp = query(collection(db, 'appointments'), where('clientUid', '==', uid));
    const unsubApp = onSnapshot(qApp, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    // Listen to Invoices
    const qInv = query(collection(db, 'invoices'), where('clientUid', '==', uid));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
      setLoading(false);
    });

    return () => {
      unsubPets();
      unsubApp();
      unsubInv();
    };
  }, [uid]);

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

  // Group invoices by pet
  const invoicesByPet = invoices.reduce((acc, inv) => {
    const petName = inv.petName || 'Other';
    if (!acc[petName]) acc[petName] = [];
    acc[petName].push(inv);
    return acc;
  }, {} as Record<string, Invoice[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-stone-900">Owner not found</h2>
        <Link to="/admin" className="text-emerald-600 hover:underline mt-4 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <DashboardLayout
      user={currentUser}
      menuItems={getMenuItems()}
      activeTab={currentUser?.role === 'admin' ? 'users' : 'overview'}
      onTabChange={() => {}}
      title="User Profile Detail"
      breadcrumbs={[
        { name: 'Dashboard', path: currentUser?.role === 'admin' ? '/admin' : '/dashboard' },
        { name: 'Users', path: currentUser?.role === 'admin' ? '/crm/users' : '/dashboard' },
        { name: owner.displayName || 'Profile' },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader
          title="User Profile"
          subtitle={owner.displayName || owner.email}
          backTo={currentUser?.role === 'admin' ? "/admin" : "/dashboard"}
          backText="Back to Dashboard"
        />

        {/* Profile Header */}
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <div className="px-8 pb-8">
            <div className="relative flex items-end gap-6 -mt-12 mb-6">
              <div className="w-32 h-32 rounded-3xl border-4 border-white overflow-hidden shadow-lg bg-white">
                <img 
                  src={owner.photoURL || `https://ui-avatars.com/api/?name=${owner.displayName || owner.email}&background=10b981&color=fff&size=256`} 
                  alt={owner.displayName} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="pb-2">
                <h1 className="text-3xl font-bold text-stone-900">{owner.displayName || 'Unnamed User'}</h1>
                <p className="text-stone-500 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  {owner.role.charAt(0).toUpperCase() + owner.role.slice(1)} Account
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold text-stone-900 flex items-center gap-2 uppercase text-xs tracking-wider">
                  <User className="w-4 h-4" /> Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-stone-600">
                    <Mail className="w-4 h-4 text-stone-400" />
                    <span className="text-sm">{owner.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-600">
                    <Phone className="w-4 h-4 text-stone-400" />
                    <span className="text-sm">{(owner as any).phone || '+1 (555) 000-0000'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-600">
                    <MapPin className="w-4 h-4 text-stone-400" />
                    <span className="text-sm">{(owner as any).address || 'No address provided'}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Total Pets</p>
                  <p className="text-2xl font-bold text-emerald-700">{pets.length}</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Total Visits</p>
                  <p className="text-2xl font-bold text-emerald-700">{appointments.length}</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Unpaid Balance</p>
                  <p className="text-2xl font-bold text-red-600">
                    PHP${invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0)}
                  </p>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Member Since</p>
                  <p className="text-sm font-bold text-stone-700">
                    {owner.createdAt?.seconds ? format(new Date(owner.createdAt.seconds * 1000), 'MMM yyyy') : 'Recently'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Registered Pets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pets.map(pet => (
                <Link 
                  key={pet.id} 
                  to={`/pet/${pet.id}`}
                  className="group bg-white p-5 rounded-3xl border border-stone-200 flex items-center gap-4 hover:border-emerald-300 hover:shadow-md transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-stone-100">
                    <img 
                      src={pet.imageUrl || `https://ui-avatars.com/api/?name=${pet.name}&background=10b981&color=fff`} 
                      alt={pet.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-stone-900 truncate">{pet.name}</h4>
                    <p className="text-xs text-stone-500">{pet.breed || pet.species} • {pet.age} yrs</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-500 transition-colors" />
                </Link>
              ))}
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Recent Consultations
              </h2>
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Pet</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-stone-500">No appointments found.</td>
                      </tr>
                    ) : (
                      appointments.slice(0, 10).map(app => (
                        <tr key={app.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-stone-700">
                            {format(new Date(app.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-stone-600">
                            <Link to={`/pet/${app.petId}`} className="hover:text-emerald-600 font-medium">
                              {app.petName}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-stone-600">{app.doctorName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${getStatusColor(app.status)}`}>
                              {getStatusIcon(app.status)}
                              {app.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Billing & Invoices
            </h2>
            
            <div className="space-y-6">
              {Object.keys(invoicesByPet).length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-stone-500">
                  No invoices found.
                </div>
              ) : (
                Object.entries(invoicesByPet).map(([petName, petInvoices]) => (
                  <div key={petName} className="space-y-3">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest px-2">{petName}'s Bills</h4>
                    <div className="space-y-2">
                      {petInvoices.map(invoice => (
                        <div key={invoice.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm hover:border-emerald-200 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <div className="min-w-0">
                              <p className="font-bold text-stone-900 truncate text-sm">{invoice.description}</p>
                              <p className="text-[10px] text-stone-400">{format(new Date(invoice.date), 'MMM dd, yyyy')}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {invoice.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-stone-50">
                            <span className="text-xs text-stone-500">Amount</span>
                            <span className="font-bold text-stone-900">PHP${invoice.amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
