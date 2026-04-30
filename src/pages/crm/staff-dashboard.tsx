import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { PageHeader } from '../../components/ui/page-header'
import { StatsCard } from '../../components/ui/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Users, Calendar, CreditCard, FileText } from 'lucide-react'
import { dashboardStats, appointments } from '../../data/crm-data'

export default function StaffDashboard() {
  const { user } = useAuth()

  const today = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter(app => app.date === today)

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
          value="8"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Pending Bills"
          value="15"
          icon={CreditCard}
          trend={{ value: 3, isPositive: false }}
        />
        <StatsCard
          title="Records Updated"
          value="24"
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
                {todayAppointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{appointment.time}</td>
                    <td className="p-2">Patient #{appointment.patientId}</td>
                    <td className="p-2">Dr. #{appointment.doctorId}</td>
                    <td className="p-2">{appointment.reason}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        appointment.status === 'Scheduled' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                      }`}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
