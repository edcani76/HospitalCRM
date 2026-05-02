import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/ui/page-header';
import { StatsCard } from '../../components/ui/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, Calendar, FileText, Pill } from 'lucide-react';
import { db, collection, getDocs } from '../../firebase';
import { getNotifications, markAsRead, Notification } from '../../lib/notifications';
import { Badge } from '../../components/ui/badge';

interface Pet {
  id: string;
  name: string;
  ownerUid: string;
  currentStatus: string;
  [key: string]: any;
}
interface User {
  uid: string;
  displayName: string;
  [key: string]: any;
}
interface Appointment {
  id: string;
  date: string;
  time: string;
  petId?: string;
  petName?: string;
  doctorId?: string;
  doctorName?: string;
  status: string;
  notes?: string;
  [key: string]: any;
}
interface Patient {
  id: string;
  name: string;
  owner: string;
  status: string;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [petsSnap, usersSnap, apptsSnap] = await Promise.all([
        getDocs(collection(db, 'pets')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'appointments')),
      ]);

      // Fetch notifications for doctor
      if (user?.uid) {
        const notifs = await getNotifications(user.uid);
        setNotifications(notifs);
      }

      const pets = petsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));
      const users = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      const appts = apptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

      // Build patient list for display
      const patientList = pets.map(pet => {
        const owner = users.find(u => u.uid === pet.ownerUid);
        return {
          id: pet.id,
          name: pet.name,
          owner: owner?.displayName || 'Owner',
          status: pet.currentStatus === 'discharged' || pet.currentStatus === 'active' ? 'Active' : 'Inactive',
        } as Patient;
      });

      setPatients(patientList);
      setAppointments(appts);
    } catch (error) {
      console.error('Error fetching doctor dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  if (loading) {
    return <div className="p-8 text-center">Loading doctor dashboard...</div>;
  }

  return (
    <>
      <PageHeader
        title="Doctor Dashboard"
        subtitle={`Welcome, ${user?.displayName || 'Doctor'}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="All Appointments"
          value={appointments.length}
          icon={Calendar}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="My Patients"
          value={patients.length}
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
            <CardTitle>All Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map(appointment => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{appointment.petName || 'Patient'}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
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
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">No appointments</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patients.slice(0, 4).map(patient => (
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
      
      {/* Activity Feed */}
      {notifications.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications.slice(0, 20).map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border ${notif.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}
                    onClick={async () => {
                      if (!notif.read && notif.id) {
                        await markAsRead(notif.id);
                        if (user?.uid) {
                          const notifs = await getNotifications(user.uid);
                          setNotifications(notifs);
                        }
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{notif.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                      </div>
                      {!notif.read && (
                        <Badge variant="default" className="text-xs">New</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {notif.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
