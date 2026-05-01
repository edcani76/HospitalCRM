import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { BarChart3, Users, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { db, collection, getDocs } from '../../firebase';

interface Pet {
  id: string;
  name: string;
  ownerUid: string;
  currentStatus: string;
  [key: string]: any;
}
interface Appointment {
  id: string;
  date: string;
  petId?: string;
  doctorId?: string;
  [key: string]: any;
}
interface Report {
  id: string;
  [key: string]: any;
}
interface Invoice {
  id: string;
  amount: number;
  status: string;
  date: string;
  [key: string]: any;
}
interface Doctor {
  id: string;
  department: string;
  [key: string]: any;
}
interface DashboardStats {
  totalPatients: number;
  revenueMonthly: number;
  appointmentsTrend: { date: string; count: number }[];
  patientsByDepartment: { department: string; count: number }[];
  reportsCount: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    revenueMonthly: 0,
    appointmentsTrend: [],
    patientsByDepartment: [],
    reportsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Fetch collections
      const petsSnap = await getDocs(collection(db, 'pets'));
      const pets = petsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));

      const appointmentsSnap = await getDocs(collection(db, 'appointments'));
      const appointments = appointmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

      const reportsSnap = await getDocs(collection(db, 'reports'));
      const reports = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));

      const invoicesSnap = await getDocs(collection(db, 'invoices'));
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));

      const doctorsSnap = await getDocs(collection(db, 'doctors'));
      const doctors = doctorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));

      // Compute stats
      const totalPatients = pets.length;
      const reportsCount = reports.length;

      // Monthly revenue (paid invoices for current month)
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const revenueMonthly = invoices
        .filter(inv => inv.status === 'paid' && typeof inv.date === 'string' && inv.date.startsWith(currentMonth))
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      // Appointments trend (last 7 days)
      const appointmentsTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = appointments.filter(app => app.date === dateStr).length;
        appointmentsTrend.push({ date: dateStr, count });
      }

      // Patients by department (based on first appointment's doctor department)
      const deptCount: { [key: string]: number } = {};
      pets.forEach(pet => {
        const petAppts = appointments.filter(app => app.petId === pet.id);
        if (petAppts.length > 0) {
          const doctorId = petAppts[0].doctorId;
          const doctor = doctors.find(d => d.id === doctorId);
          if (doctor?.department) {
            deptCount[doctor.department] = (deptCount[doctor.department] || 0) + 1;
          }
        }
      });
      const patientsByDepartment = Object.entries(deptCount).map(([department, count]) => ({
        department,
        count,
      }));

      setStats({
        totalPatients,
        revenueMonthly,
        appointmentsTrend,
        patientsByDepartment,
        reportsCount,
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  return (
    <>
      <PageHeader title="Analytics" subtitle="View detailed reports and insights" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalPatients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">+12%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${stats.revenueMonthly.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.reportsCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Appointment Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.appointmentsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2094e6" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patients by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.patientsByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2094e6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
