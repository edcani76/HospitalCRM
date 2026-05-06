import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Activity,
  CreditCard,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowLeft,
  DollarSign,
  FileText,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { db, doc, getDoc, collection, getDocs, query, where } from '../../firebase';

interface OwnerProfile {
  id: string;
  displayName?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  role?: string;
  status?: string;
  photo?: string;
  photoURL?: string;
  consentPrivacy?: boolean;
  consentTerms?: boolean;
  consentPrivacyTimestamp?: string;
  consentTermsTimestamp?: string;
}

export default function OwnerProfilePage() {
  const { ownerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Find the selected owner from Firebase
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [ownerPets, setOwnerPets] = useState<any[]>([]);
  const [ownerBills, setOwnerBills] = useState<any[]>([]);
  const [ownerAppointments, setOwnerAppointments] = useState<any[]>([]);

  useEffect(() => {
    const fetchOwner = async () => {
      try {
        // Fetch owner from Firebase
        const ownerDoc = await getDoc(doc(db, 'users', ownerId || ''));
        if (ownerDoc.exists()) {
          setOwner({ id: ownerDoc.id, ...ownerDoc.data() } as OwnerProfile);
        }

        // Fetch owner's pets
        const petsQuery = query(collection(db, 'pets'), where('ownerUid', '==', ownerId));
        const petsSnapshot = await getDocs(petsQuery);
        const petsData = petsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOwnerPets(petsData);

        // Fetch owner's invoices
        const invQuery = query(collection(db, 'invoices'), where('clientUid', '==', ownerId));
        const invSnapshot = await getDocs(invQuery);
        setOwnerBills(invSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch owner's appointments (via pets)
        const appQuery = query(collection(db, 'appointments'), where('clientUid', '==', ownerId));
        const appSnapshot = await getDocs(appQuery);
        const apps = appSnapshot.docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, date: data.date || '', petName: data.petName || 'Unknown', ...data } as any;
        });
        apps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setOwnerAppointments(apps);
      } catch (error) {
        console.error('Error fetching owner:', error);
      } finally {
        setLoading(false);
      }
    };

    if (ownerId) {
      fetchOwner();
    }
  }, [ownerId]);

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-slate-50 text-slate-600 border-slate-100';
    switch (status.toLowerCase()) {
      case 'paid':
      case 'active':
      case 'confirmed': 
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'unconfirmed':
      case 'scheduled': 
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'inactive':
      case 'cancelled': 
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default: 
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const totalSpent = ownerBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const UnconfirmedAmount = ownerBills
    .filter(b => b.status === 'Unconfirmed')
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  if (loading) {
    return <div className="p-8 text-center">Loading owner profile...</div>;
  }

  if (!owner) {
    return <div className="p-8 text-center">Owner not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <PageHeader 
        title="Owner Profile" 
        subtitle={`Client Management: ${owner.displayName || owner.name}`}
        backTo="/crm/owners"
        backText="Back to Owners"
        actions={
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl border-slate-200">
              <Plus className="w-4 h-4 mr-2" />
              Add Pet
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 rounded-xl px-6">
              <DollarSign className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left Column: Owner Info & Stats */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
            <div className="h-32 bg-gradient-to-br from-emerald-500 to-teal-600" />
            <CardContent className="px-8 pb-8 -mt-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-[2rem] border-4 border-white shadow-xl overflow-hidden bg-white mb-4">
                  <img 
                    src={owner.photo || `https://ui-avatars.com/api/?name=${owner.displayName || owner.name}&background=10b981&color=fff&size=256`} 
                    alt={owner.displayName || owner.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{owner.displayName || owner.name}</h2>
                <p className="text-slate-500 font-medium mb-4">{owner.id}</p>
                {owner.status && (
                  <Badge className={cn("px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider", getStatusColor(owner.status))}>
                    {owner.status}
                  </Badge>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl">
                  <Mail className="w-5 h-5 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Email Address</span>
                    <span className="text-sm font-medium truncate">{owner.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl">
                  <Phone className="w-5 h-5 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Phone Number</span>
                    <span className="text-sm font-medium">{owner.phoneNumber || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Home Address</span>
                    <span className="text-sm font-medium">{owner.address}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-emerald-50/50 rounded-3xl border border-emerald-100/50">
                    <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider mb-1">Total Spent</p>
                    <p className="text-xl font-bold text-emerald-700">₱{totalSpent.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50/50 rounded-3xl border border-amber-100/50">
                    <p className="text-[10px] text-amber-600 uppercase font-bold tracking-wider mb-1">Pending</p>
                    <p className="text-xl font-bold text-amber-700">₱{UnconfirmedAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {(owner.consentPrivacyTimestamp || owner.consentTermsTimestamp) && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Consent Records</h4>
                  <div className="space-y-2">
                    {owner.consentPrivacyTimestamp && (
                      <div className="flex items-start gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Data Privacy Consent</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(owner.consentPrivacyTimestamp).toLocaleString('en-US', { 
                              year: 'numeric', month: 'short', day: 'numeric', 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                    {owner.consentTermsTimestamp && (
                      <div className="flex items-start gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <FileCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Terms & Conditions</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(owner.consentTermsTimestamp).toLocaleString('en-US', { 
                              year: 'numeric', month: 'short', day: 'numeric', 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pets, Billing, Appointments */}
        <div className="lg:col-span-2 space-y-8">
          {/* Associated Pets */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Registered Pets
              </h3>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 rounded-lg">{ownerPets.length} Pets</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ownerPets.map(pet => (
                <Card 
                  key={pet.id} 
                  className="border-none shadow-sm rounded-[2rem] hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => navigate(`/crm/patients/${pet.id}`, { 
                    state: { 
                      from: `/crm/owners/${owner.id}`,
                      breadcrumbParent: { name: owner.displayName || owner.name, path: `/crm/owners/${owner.id}` }
                    } 
                  })}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                      <img 
                        src={pet.photo || `https://ui-avatars.com/api/?name=${pet.name}&background=10b981&color=fff`} 
                        alt={pet.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{pet.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{pet.breed} • {pet.species}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={cn("text-[8px] px-2 py-0.5 rounded-md font-bold uppercase", getStatusColor(pet.status))}>
                          {pet.status}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Billing & Appointments Tabs (Simplified Sections for CRM) */}
          <div className="grid grid-cols-1 gap-8">
            {/* Billing History */}
            <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="px-8 pt-8 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  Billing History
                </CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                {ownerBills.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 font-medium">No billing records found</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice ID</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                          <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {ownerBills.map((bill: any) => (
                          <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 text-sm font-bold text-slate-900">{bill.id}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{bill.patientName}</td>
                            <td className="px-4 py-4 text-sm text-slate-500">{bill.date}</td>
                            <td className="px-4 py-4 text-sm font-bold text-slate-900">₱{(bill.amount || 0).toFixed(2)}</td>
                            <td className="px-4 py-4 text-right">
                              <Badge className={cn("px-3 py-1 rounded-lg text-[10px] font-bold uppercase", getStatusColor(bill.status))}>
                                {bill.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appointment History */}
            <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="px-8 pt-8 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  Upcoming & Recent Appointments
                </CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                {ownerAppointments.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 font-medium">No appointment history</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ownerAppointments.map(app => (
                      <div key={app.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:border-emerald-200 transition-colors">
                        <div className="w-12 h-12 rounded-2xl bg-white flex flex-col items-center justify-center shadow-sm border border-slate-100">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase">{new Date(app.date).toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-lg font-black text-slate-900 leading-tight">{new Date(app.date).getDate()}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900">{app.reason}</h5>
                            <Badge variant="outline" className={cn("text-[8px] px-2 py-0.5 rounded-md font-bold uppercase", getStatusColor(app.status))}>
                              {app.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            {app.time} • Patient: {app.petName || 'Unknown'}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-emerald-100 hover:text-emerald-600">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
