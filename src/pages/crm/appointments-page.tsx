import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Calendar } from '../../components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Plus, CalendarClock, Filter, Clock, User, Stethoscope, Search, CheckCircle, XCircle } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { db, collection, getDocs, doc, getDoc } from '../../firebase';
import { updateDocument } from '../../lib/firestore-helpers';
import { arrayUnion } from 'firebase/firestore';
import { auth } from '../../firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { createNotification, notifyDoctor, notifyClient, getNotifications, markAsRead } from '../../lib/notifications';
import { Appointment, Doctor, Pet, Notification } from '../../types';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pets, setPets] = useState<Pet[]>([]);
  const [users, setUsers] = useState<{ [uid: string]: string }>({});
  const navigate = useNavigate();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // For doctors, find their doctor record
  const currentDoctor = user?.role === 'doctor'
    ? doctors.find(d => d.uid === user.uid)
    : null;

  useEffect(() => {
    fetchDoctors();
    fetchPets();
    fetchUsers();
    fetchAllAppointments();
    if (auth.currentUser) {
      fetchNotifications(auth.currentUser.uid);
    }
  }, []);

  // Auto-tag past confirmed appointments as no-show
  useEffect(() => {
    if (allAppointments.length > 0 && auth.currentUser) {
      autoTagNoShow();
    }
  }, [allAppointments, auth.currentUser]);

  useEffect(() => {
    filterAppointments();
  }, [selectedDate, selectedDoctor, allAppointments, searchTerm, pets, users, doctors]);

  const fetchDoctors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'doctors'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchAllAppointments = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'appointments'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAllAppointments(data);
    } catch (error) {
      console.error('Error fetching all appointments:', error);
    }
  };

  const fetchPets = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'pets'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));
      setPets(data);
    } catch (error) {
      console.error('Error fetching pets:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const userMap: { [uid: string]: string } = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        userMap[doc.id] = data.displayName || data.email || 'Unknown';
      });
      setUsers(userMap);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchNotifications = async (userId: string) => {
    try {
      const notifs = await getNotifications(userId);
      setNotifications(notifs as Notification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const filterAppointments = () => {
    setLoading(true);
    try {
      let data = [...allAppointments];

      // Filter by date
      data = data.filter(apt => apt.date === format(selectedDate, 'yyyy-MM-dd'));

      // Filter by doctor - if doctor role, only show their appointments
      if (user?.role === 'doctor' && currentDoctor) {
        data = data.filter(apt => apt.doctorId === currentDoctor.id);
      } else if (selectedDoctor !== 'all') {
        data = data.filter(apt => apt.doctorId === selectedDoctor);
      }

      // Filter by search term (doctor name, pet name, owner name)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        data = data.filter(apt => {
          const pet = pets.find(p => p.id === apt.petId);
          const ownerName = pet ? (users[pet.ownerUid] || '') : '';
          return (
            apt.doctorName?.toLowerCase().includes(term) ||
            apt.petName?.toLowerCase().includes(term) ||
            ownerName.toLowerCase().includes(term)
          );
        });
      }

      // Sort by time ascending
      const timeToMinutes = (time: string) => {
        const [hourMin, meridian] = time.split(' ');
        let [hour, min] = hourMin.split(':').map(Number);
        if (meridian === 'PM' && hour !== 12) hour += 12;
        if (meridian === 'AM' && hour === 12) hour = 0;
        return hour * 60 + min;
      };
      data.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

      setAppointments(data);
    } catch (error) {
      console.error('Error filtering appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-tag past confirmed appointments as no-show
  const autoTagNoShow = async () => {
    try {
      const today = format(startOfToday(), 'yyyy-MM-dd');
      const pastConfirmed = allAppointments.filter(apt => 
        apt.status === 'confirmed' && apt.date < today
      );
      
      for (const apt of pastConfirmed) {
        const userUid = auth.currentUser?.uid || 'system';
        const auditEntry = { action: 'no-show', userId: userUid, timestamp: new Date().toISOString(), reason: 'Auto-tagged: past date' };
        await updateDocument('appointments', apt.id, { 
          status: 'no-show', 
          audit: arrayUnion(auditEntry),
          autoNoShow: true 
        });
        
        // Notify doctor and client
        await notifyDoctor(apt.doctorId, 'appointment_updated', 'Appointment No-Show (Auto)', 
          `Appointment for ${apt.petName} on ${apt.date} was automatically marked as No-Show`);
        if (apt.clientUid) {
          await notifyClient(apt.clientUid, 'appointment_updated', 'Appointment No-Show (Auto)', 
            `Your appointment for ${apt.petName} on ${apt.date} was marked as No-Show`);
        }
      }
      
      if (pastConfirmed.length > 0) {
        fetchAllAppointments();
      }
    } catch (error) {
      console.error('Error auto-tagging no-show:', error);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: 'confirmed' | 'cancelled' | 'completed' | 'no-show', reason?: string) => {
    try {
      // Get current appointment data first
      const aptSnap = await getDoc(doc(db, 'appointments', appointmentId));
      const oldData = aptSnap.data();
      
      const userUid = auth.currentUser?.uid || 'unknown';
      const auditEntry = { action: newStatus, userId: userUid, timestamp: new Date().toISOString(), reason };
      const updateData: any = { status: newStatus, audit: arrayUnion(auditEntry) };
      if (newStatus === 'cancelled' && reason) {
        updateData.cancelReason = reason;
      }
      await updateDocument('appointments', appointmentId, updateData);
      
      // Get updated appointment details for notification
      const aptData = (await getDoc(doc(db, 'appointments', appointmentId))).data();
      if (aptData) {
        if (newStatus === 'cancelled') {
          // Notify doctor
          await notifyDoctor(aptData.doctorId, 'appointment_cancelled', 'Appointment Cancelled', 
            `Appointment for ${aptData.petName} on ${aptData.date} at ${aptData.time} was cancelled. Reason: ${reason || 'Not specified'}`);
          // Notify client
          if (aptData.clientUid) {
            await notifyClient(aptData.clientUid, 'appointment_cancelled', 'Appointment Cancelled', 
              `Your appointment for ${aptData.petName} on ${aptData.date} at ${aptData.time} has been cancelled.`);
          }
        } else if (newStatus === 'confirmed') {
          await notifyDoctor(aptData.doctorId, 'appointment_confirmed', 'Appointment Confirmed', 
            `Appointment for ${aptData.petName} on ${aptData.date} at ${aptData.time} is confirmed.`);
          if (aptData.clientUid) {
            await notifyClient(aptData.clientUid, 'appointment_confirmed', 'Appointment Confirmed', 
              `Your appointment for ${aptData.petName} on ${aptData.date} at ${aptData.time} is confirmed.`);
          }
        } else {
          // Notify for other status changes (e.g., no-show, completed, or reactivating from cancelled)
          const statusMessages: any = {
            'no-show': 'marked as No-Show',
            'completed': 'marked as Completed',
            'unconfirmed': 'changed to Unconfirmed',
            'confirmed': 'confirmed'
          };
          const statusText = statusMessages[newStatus] || `changed to ${newStatus}`;
          await notifyDoctor(aptData.doctorId, 'appointment_updated', 'Appointment Updated', 
            `Appointment for ${aptData.petName} on ${aptData.date} at ${aptData.time} was ${statusText}.`);
          if (aptData.clientUid) {
            await notifyClient(aptData.clientUid, 'appointment_updated', 'Appointment Updated', 
              `Your appointment for ${aptData.petName} on ${aptData.date} at ${aptData.time} was ${statusText}.`);
          }
        }
      }
      
      fetchAllAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const handleEdit = async (appointment: Appointment) => {
    // Navigate to create page with prefill data for editing
    try {
      // Find doctor details to pass in prefill
      const doctor = doctors.find(d => d.id === appointment.doctorId);
      const prefillData = {
        ...appointment,
        originalId: appointment.id,
        doctorName: doctor?.name || appointment.doctorName,
        doctorDepartment: doctor?.department || '',
        doctorExperience: doctor?.experience || 0,
      };
      navigate('/crm/appointments/create', { state: { prefill: prefillData, isEdit: true } });
    } catch (error) {
      console.error('Error editing:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
       case 'unconfirmed':
         return <Badge variant="secondary">Unconfirmed</Badge>;
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'in-progress':
        return <Badge className="bg-gradient-to-r from-blue-500 to-blue-700 text-white animate-pulse">In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed':
        return <Badge>Completed</Badge>;
      case 'no-show':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">No-Show</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const appointmentDates = useMemo(() => {
    return allAppointments.map(apt => ({ date: apt.date }));
  }, [allAppointments]);

  return (
    <>
      <PageHeader
        title="Appointments"
        actions={
          (user?.role === 'admin' || user?.role === 'staff') && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => navigate('/crm/appointments/create')}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Appointment</span>
              <span className="sm:hidden">New</span>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="lg:col-span-4 space-y-4 lg:space-y-6">
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            appointments={appointmentDates}
          />

          {(user?.role === 'admin' || user?.role === 'staff') && (
            <Card>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-2 mb-3 lg:mb-4">
                  <Filter className="w-4 h-4 text-stone-500" />
                  <h3 className="font-bold text-sm lg:text-base">Filter by Doctor</h3>
                </div>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Doctors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {doctors.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <div className="p-3 lg:p-4 bg-muted/50 rounded-lg">
              <p className="text-xs lg:text-sm text-muted-foreground">Selected Date</p>
              <p className="text-lg lg:text-xl font-bold mt-1">
                {format(selectedDate, 'MMM d')}
              </p>
            </div>
            <div className="p-3 lg:p-4 bg-muted/50 rounded-lg">
              <p className="text-xs lg:text-sm text-muted-foreground">Appointments</p>
              <p className="text-lg lg:text-xl font-bold mt-1">
                {appointments.length}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="font-bold text-base lg:text-lg flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
                  Appointments for {format(selectedDate, 'MMMM d, yyyy')}
                </h3>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input
                    placeholder="Search by doctor, pet, or owner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <CalendarClock className="w-12 h-12 mx-auto mb-4 text-stone-300" />
                  <p>No appointments scheduled for this date</p>
                </div>
              ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs lg:text-sm">Time</TableHead>
                        <TableHead className="text-xs lg:text-sm">Pet</TableHead>
                        <TableHead className="text-xs lg:text-sm">Doctor</TableHead>
                        <TableHead className="text-xs lg:text-sm">Status</TableHead>
                        <TableHead className="text-xs lg:text-sm">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment) => {
                        const pet = pets.find(p => p.id === appointment.petId);
                        const ownerName = pet ? (users[pet.ownerUid] || '') : '';
                        return (
                          <TableRow 
                            key={appointment.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => navigate(`/crm/appointments/${appointment.id}`, { 
                              state: { from: '/crm/appointments' } 
                            })}
                          >
                            <TableCell className="text-xs lg:text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-stone-400" />
                                {appointment.time}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {pet?.imageUrl ? (
                                  <img
                                    src={pet.imageUrl}
                                    alt={appointment.petName}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="w-3 h-3 text-stone-400" />
                                )}
                                <span className="text-xs lg:text-sm text-emerald-600 font-medium">
                                  {appointment.petName}
                                </span>
                                {ownerName && <span className="text-stone-500 text-xs">({ownerName})</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Stethoscope className="w-3 h-3 text-stone-400" />
                                <span className="text-xs lg:text-sm">{appointment.doctorName}</span>
                              </div>
                            </TableCell>
                             <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                              <TableCell className="text-xs lg:text-sm">
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    const types = [...(appointment.notes?.matchAll(/Type:\s*(\w+)/gi) || [])].map(m => m[1]);
                                    if (types.length === 0) return <Badge variant="outline" className="border-blue-500 text-blue-600">Consultation</Badge>;
                                    return types.map(type => (
                                      <Badge key={type} variant="outline" className="border-blue-500 text-blue-600">
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                      </Badge>
                                    ));
                                  })()}
                                </div>
                              </TableCell>
                           </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
