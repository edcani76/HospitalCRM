import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { PageHeader } from '../../components/ui/page-header'
import { StatsCard } from '../../components/ui/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Users, Calendar, Receipt, CreditCard, TrendingUp, Activity } from 'lucide-react'
import { dashboardStats, patients, appointments } from '../../data/crm-data'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function AdminDashboard() {
  const { user } = useAuth()

  const today = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter(app => app.date === today)
  const activePatients = patients.filter(p => p.status === 'Active').length
  const inactivePatients = patients.filter(p => p.status === 'Inactive').length

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
          value={dashboardStats.totalPatients}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Appointments Today"
          value={dashboardStats.appointmentsToday}
          icon={Calendar}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Pending Lab Reports"
          value={dashboardStats.pendingLabReports}
          icon={Receipt}
          trend={{ value: 3, isPositive: false }}
        />
        <StatsCard
          title="Monthly Revenue"
          value={`$${dashboardStats.revenue.monthly.toLocaleString()}`}
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
                <LineChart data={dashboardStats.appointmentsTrend}>
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
                <BarChart data={dashboardStats.patientsByDepartment}>
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

      {/* Patient Status and Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 flex flex-col items-center justify-center p-4 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{activePatients}</p>
                  <p className="text-sm text-green-700 mt-1">Active Patients</p>
                </div>
                <div className="bg-gray-50 flex flex-col items-center justify-center p-4 rounded-lg">
                  <p className="text-3xl font-bold text-gray-600">{inactivePatients}</p>
                  <p className="text-sm text-gray-700 mt-1">Inactive Patients</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Recent Activity</CardTitle>
              <Activity size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patients.flatMap(p => (p.auditTrail || []).map(log => ({ ...log, patientName: p.name }))).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5).map((log, index) => (
                  <div key={index} className="flex gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{log.event}</p>
                      <p className="text-xs text-muted-foreground">{log.patientName} • {log.staff}</p>
                      <p className="text-[10px] text-muted-foreground/60">{log.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Patient</th>
                      <th className="text-left p-2">Owner</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAppointments.map((appointment) => {
                      const patient = patients.find(p => p.id === appointment.patientId)
                      return (
                        <tr key={appointment.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{appointment.time}</td>
                          <td className="p-2">{patient?.name || 'Unknown'}</td>
                          <td className="p-2">{patient?.owner || 'Unknown'}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              appointment.status === 'Scheduled'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
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
