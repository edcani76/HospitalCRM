import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { PageHeader } from '../../components/ui/page-header'
import { StatsCard } from '../../components/ui/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Users, Calendar, Receipt, CreditCard, TrendingUp, Activity } from 'lucide-react'
import { db, collection, getDocs } from '../../firebase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Pet {
  id: string
  name: string
  ownerUid: string
  currentStatus: string
  [key: string]: any
}

interface Appointment {
  id: string
  petId: string
  petName: string
  doctorId: string
  date: string
  time: string
  status: string
  [key: string]: any
}

interface Report {
  id: string
  status: string
  [key: string]: any
}

interface Invoice {
  id: string
  status: string
  date: string
  amount: number
  [key: string]: any
}

interface Doctor {
  id: string
  name: string
  department: string
  [key: string]: any
}

interface DashboardStats {
  totalPatients: number
  appointmentsToday: number
  pendingLabReports: number
  monthlyRevenue: number
  appointmentsTrend: { date: string; count: number }[]
  patientsByDepartment: { department: string; count: number }[]
  activePatients: number
  inactivePatients: number
  todayAppointments: Appointment[]
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    appointmentsToday: 0,
    pendingLabReports: 0,
    monthlyRevenue: 0,
    appointmentsTrend: [],
    patientsByDepartment: [],
    activePatients: 0,
    inactivePatients: 0,
    todayAppointments: []
  })
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Fetch pets
      const petsSnapshot = await getDocs(collection(db, 'pets'))
      const pets: Pet[] = petsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet))

      // Fetch appointments
      const appointmentsSnapshot = await getDocs(collection(db, 'appointments'))
      const appointments: Appointment[] = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment))

      // Fetch reports
      const reportsSnapshot = await getDocs(collection(db, 'reports'))
      const reports: Report[] = reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report))

      // Fetch invoices
      const invoicesSnapshot = await getDocs(collection(db, 'invoices'))
      const invoices: Invoice[] = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice))

      // Fetch doctors for department info
      const doctorsSnapshot = await getDocs(collection(db, 'doctors'))
      const doctors: Doctor[] = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor))

      // Calculate stats
      const totalPatients = pets.length
      const appointmentsToday = appointments.filter(app => app.date === today).length
      const pendingLabReports = reports.filter(r => r.status === 'pending' || r.status === 'in_progress').length

      // Monthly revenue (sum of paid invoices for current month)
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const monthlyRevenue = invoices
        .filter(inv => inv.status === 'paid' && inv.date?.startsWith(currentMonth))
        .reduce((sum, inv) => sum + (inv.amount || 0), 0)

      // Appointments trend (last 7 days)
      const appointmentsTrend = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const count = appointments.filter(app => app.date === dateStr).length
        appointmentsTrend.push({ date: dateStr, count })
      }

      // Patients by department (based on doctor's department)
      const deptCount: { [key: string]: number } = {}
      pets.forEach((pet: Pet) => {
        // Find appointments for this pet to determine department
        const petAppts = appointments.filter(app => app.petId === pet.id)
        if (petAppts.length > 0) {
          const doctorId = petAppts[0].doctorId
          const doctor = doctors.find(d => d.id === doctorId)
          if (doctor?.department) {
            deptCount[doctor.department] = (deptCount[doctor.department] || 0) + 1
          }
        }
      })

      // Add pets without appointments to "Unassigned"
      const patientsByDepartment = Object.entries(deptCount).map(([department, count]) => ({
        department,
        count
      }))

      // Active/Inactive patients (based on current status field)
      const activePatients = pets.filter(p => p.currentStatus === 'discharged' || p.currentStatus === 'active').length
      const inactivePatients = pets.filter(p => p.currentStatus !== 'discharged' && p.currentStatus !== 'active').length

      // Today's appointments with details
      const todayAppointments = appointments
        .filter(app => app.date === today)
        .map(app => {
          const pet = pets.find(p => p.id === app.petId)
          return { ...app, petName: pet?.name || 'Unknown', ownerName: pet ? 'Owner' : 'Unknown' }
        })

      setStats({
        totalPatients,
        appointmentsToday,
        pendingLabReports,
        monthlyRevenue,
        appointmentsTrend,
        patientsByDepartment,
        activePatients,
        inactivePatients,
        todayAppointments
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>
  }

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle={`Welcome back, ${user?.displayName || 'Admin'}`}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Appointments Today"
          value={stats.appointmentsToday}
          icon={Calendar}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Pending Lab Reports"
          value={stats.pendingLabReports}
          icon={Receipt}
          trend={{ value: 3, isPositive: false }}
        />
        <StatsCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          icon={CreditCard}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Appointment Trends (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={stats.appointmentsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => {
                      const d = new Date(date)
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`${value} appointments`, 'Count']}
                    labelFormatter={(date) => {
                      const d = new Date(date)
                      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#2094e6" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Patients by Department</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={stats.patientsByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} patients`, 'Count']} />
                  <Bar dataKey="count" fill="#2094e6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Status and Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 flex flex-col items-center justify-center p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{stats.activePatients}</p>
                <p className="text-sm text-green-700 mt-1">Active Patients</p>
              </div>
              <div className="bg-gray-50 flex flex-col items-center justify-center p-4 rounded-lg">
                <p className="text-3xl font-bold text-gray-600">{stats.inactivePatients}</p>
                <p className="text-sm text-gray-700 mt-1">Inactive Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.todayAppointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Patient</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.todayAppointments.map((appointment: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2">{appointment.time}</td>
                        <td className="p-2">{appointment.petName}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            appointment.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : appointment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No appointments scheduled for today.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
