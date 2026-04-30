import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { PageHeader } from '../../components/ui/page-header'
import { StatsCard } from '../../components/ui/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Users, Calendar, FileText, Pill } from 'lucide-react'
import { dashboardStats, patients, appointments } from '../../data/crm-data'

export default function DoctorDashboard() {
  const { user } = useAuth()

  const today = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter(app => app.date === today)
  const myAppointments = todayAppointments // In real app, filter by doctor ID

  return (
    <>
      <PageHeader
        title="Doctor Dashboard"
        subtitle={`Welcome, ${user?.displayName || 'Doctor'}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon={Calendar}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="My Patients"
          value="48"
          icon={Users}
          trend={{ value: 3, isPositive: true }}
        />
        <StatsCard
          title="Pending Records"
          value="12"
          icon={FileText}
          trend={{ value: 2, isPositive: false }}
        />
        <StatsCard
          title="Prescriptions"
          value="156"
          icon={Pill}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {myAppointments.length > 0 ? (
              <div className="space-y-3">
                {myAppointments.map((appointment) => {
                  const patient = patients.find(p => p.id === appointment.patientId)
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{patient?.name}</p>
                        <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{appointment.time}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          appointment.status === 'Scheduled' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">No appointments today</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patients.slice(0, 4).map((patient) => (
                <div key={patient.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">{patient.owner}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    patient.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {patient.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
