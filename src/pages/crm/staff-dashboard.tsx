import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/ui/page-header';
import { StatsCard } from '../../components/ui/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, Calendar, CreditCard, FileText } from 'lucide-react';
import { db, collection, getDocs } from '../../firebase';

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
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [stats, setStats] = useState({ newPatients: 0, pendingBills: 0, recordsUpdated: 0 });
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

      const pets = petsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
      const pendingBillsCount = invoices.filter(inv => inv.status !== 'paid').length;

      // Records Updated: using total number of pets as a placeholder
      const recordsUpdatedCount = pets.length;

      setStats({ newPatients: newPatientsCount, pendingBills: pendingBillsCount, recordsUpdated: recordsUpdatedCount });
    } catch (error) {
      console.error('Error fetching staff dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(app => app.date === today);

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
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="New Patients"
          value={stats.newPatients}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Pending Bills"
          value={stats.pendingBills}
          icon={CreditCard}
          trend={{ value: 3, isPositive: false }}
        />
        <StatsCard
          title="Records Updated"
          value={stats.recordsUpdated}
          icon={FileText}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Patient</th>
                  <th className="text-left p-2">Doctor</th>
                  <th className="text-left p-2">Reason</th>
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
                      <td className="p-2">{appointment.notes || '-'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100'
                        }`}>
                          {appointment.status}
                        </span>
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
