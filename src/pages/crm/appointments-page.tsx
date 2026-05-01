import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Calendar } from '../../components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Plus, CalendarClock, Filter, Clock, User, Stethoscope, Search, CheckCircle, XCircle } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { db, collection, getDocs, doc, updateDoc } from '../../firebase';
import { Appointment, Doctor, Pet } from '../../types';

export default function AppointmentsPage() {
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

  useEffect(() => {
    fetchDoctors();
    fetchPets();
    fetchUsers();
    fetchAllAppointments();
  }, []);

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

  const filterAppointments = () => {
    setLoading(true);
    try {
      let data = [...allAppointments];

      // Filter by date
      data = data.filter(apt => apt.date === format(selectedDate, 'yyyy-MM-dd'));

      // Filter by doctor
      if (selectedDoctor !== 'all') {
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

  const handleStatusChange = async (appointmentId: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      const aptRef = doc(db, 'appointments', appointmentId);
      await updateDoc(aptRef, { status: newStatus });
      fetchAllAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed':
        return <Badge>Completed</Badge>;
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
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => navigate('/crm/appointments/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New Appointment</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="lg:col-span-4 space-y-4 lg:space-y-6">
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            appointments={appointmentDates}
          />

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
                        <TableHead className="text-xs lg:text-sm">Notes</TableHead>
                        <TableHead className="text-xs lg:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment) => {
                        const pet = pets.find(p => p.id === appointment.petId);
                        const ownerName = pet ? (users[pet.ownerUid] || '') : '';
                        return (
                          <TableRow key={appointment.id}>
                            <TableCell className="text-xs lg:text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-stone-400" />
                                {appointment.time}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-stone-400" />
                                <span className="text-xs lg:text-sm">{appointment.petName}</span>
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
                            <TableCell className="max-w-[200px] truncate text-xs lg:text-sm">
                              {appointment.notes || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {appointment.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                                    title="Confirm"
                                    className="hover:bg-emerald-50 hover:text-emerald-700"
                                  >
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  </Button>
                                )}
                                {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                                    title="Cancel"
                                    className="hover:bg-red-50 hover:text-red-700"
                                  >
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  </Button>
                                )}
                                {appointment.status === 'confirmed' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStatusChange(appointment.id, 'completed')}
                                    title="Mark Complete"
                                    className="hover:bg-blue-50 hover:text-blue-700"
                                  >
                                    <CheckCircle className="w-4 h-4 text-blue-600" />
                                  </Button>
                                )}
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
