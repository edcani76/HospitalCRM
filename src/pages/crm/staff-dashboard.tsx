import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/ui/page-header';
import { StatsCard } from '../../components/ui/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Users, Calendar, CreditCard, FileText } from 'lucide-react';
import { db, collection, getDocs } from '../../firebase';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  date: string;
  time: string;
  patientId?: string;
  doctorId?: string;
  reason?: string;
  status: string;
  [key: string]: any;
}

export default function StaffDashboard() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string; createdAt?: any; status?: string }[]>([]);
  const [stats, setStats] = useState({ newPatients: 0, UnconfirmedBills: 0, totalPets: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [aptSnap, petsSnap, invoicesSnap, doctorsSnap] = await Promise.all([
        getDocs(collection(db, 'appointments')),
        getDocs(collection(db, 'pets')),
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'doctors')),
      ]);

      const appointmentsData = aptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(appointmentsData);

      const doctorsData = doctorsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || 'Unknown' }));
      setDoctors(doctorsData);

      const pets = petsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // New Patients: created in last 30 days (based on createdAt field)
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const newPatientsCount = pets.filter(p => {
        if (!p.createdAt) return false;
        const created = new Date(p.createdAt);
        return created >= thirtyDaysAgo;
      }).length;

      // Pending Bills: invoices not marked as paid
      const UnconfirmedBillsCount = invoices.filter(inv => inv.status !== 'paid').length;

      // Total Pets registered
      const totalPetsCount = pets.length;

      setStats({ newPatients: newPatientsCount, UnconfirmedBills: UnconfirmedBillsCount, totalPets: totalPetsCount });
    } catch (error) {
      console.error('Error fetching staff dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAppointments = React.useMemo(() => {
    return appointments
      .filter(app => app.date === today)
      .sort((a, b) => {
        // Parse time strings (handle both "HH:MM AM/PM" and "HH:MM" formats)
        const parseTime = (timeStr: string) => {
          const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (!match) return 0;
          let hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const period = match[3]?.toUpperCase();
          if (period === 'PM' && hours < 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };
        return parseTime(a.time) - parseTime(b.time);
      });
  }, [appointments, today]);

  if (loading) {
    return <div className="p-8 text-center">Loading staff dashboard...</div>;
  }

  return (
    <>
      <PageHeader
        title="Staff Dashboard"
        subtitle={`Welcome, ${user?.displayName || 'Staff'}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon={Calendar}
        />
        <StatsCard
          title="New Patients (30 days)"
          value={stats.newPatients}
          icon={Users}
        />
        <StatsCard
          title="Pending Bills"
          value={stats.UnconfirmedBills}
          icon={CreditCard}
        />
        <StatsCard
          title="Total Pets"
          value={stats.totalPets}
          icon={FileText}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule - {format(new Date(), 'MMMM dd, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
               <thead>
                 <tr className="border-b">
                   <th className="text-left p-2">Time</th>
                   <th className="text-left p-2">Patient</th>
                   <th className="text-left p-2">Doctor</th>
                   <th className="text-left p-2">Type</th>
                   <th className="text-left p-2">Status</th>
                 </tr>
               </thead>
               <tbody>
                 {todayAppointments.map((appointment) => {
                   const doctor = doctors.find(d => d.id === appointment.doctorId);
                   return (
                     <tr key={appointment.id} className="border-b hover:bg-muted/50">
                       <td className="p-2">{appointment.time}</td>
                       <td className="p-2">{appointment.petName || 'Unknown Pet'}</td>
                       <td className="p-2">{doctor?.name || 'Unknown Doctor'}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const types = [...(appointment.notes?.matchAll(/Type:\s*(\w+)/gi) || [])].map(m => m[1]);
                              if (types.length === 0) return <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs">Consultation</Badge>;
                              return types.map(type => (
                                <Badge key={type} variant="outline" className="border-blue-500 text-blue-600 text-xs">
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
                                </Badge>
                              ));
                            })()}
                          </div>
                        </td>
                       <td className="p-2">
                         <Badge variant={appointment.status === 'confirmed' ? 'success' : 'secondary'} 
                           className={appointment.status === 'unconfirmed' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}>
                           {appointment.status === 'unconfirmed' ? 'Unconfirmed' : 
                            appointment.status === 'confirmed' ? 'Confirmed' :
                            appointment.status === 'cancelled' ? 'Cancelled' :
                            appointment.status === 'completed' ? 'Completed' : 
                            appointment.status}
                         </Badge>
                       </td>
                     </tr>
                   );
                 })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
