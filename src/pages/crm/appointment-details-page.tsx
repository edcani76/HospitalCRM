import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { db, auth } from '../../firebase';
import { collection, doc, getDoc, getDocs, updateDoc, arrayUnion, addDoc, serverTimestamp, query, where } from '../../firebase';
import { notifyDoctor, notifyClient } from '../../lib/notifications';
import { format } from 'date-fns';
import { Calendar, Clock, User, Stethoscope, FileText, CheckCircle, XCircle, Pencil, ArrowLeft, Play } from 'lucide-react';
import { Appointment, Doctor } from '../../types';

type AppointmentType = 'consultation' | 'grooming' | 'vaccination' | 'procedure' | 'others';

export default function AppointmentDetailsPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Check if current user is the assigned doctor
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const currentDoctor = user?.role === 'doctor'
    ? doctors.find(d => d.uid === user.uid)
    : null;
  const isOwnAppointment = currentDoctor && appointment && appointment.doctorId === currentDoctor.id;
  const canEdit = user?.role !== 'doctor' || isOwnAppointment;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Edit mode fields
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedType, setSelectedType] = useState<AppointmentType>('consultation');
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  // Notifications history
  const [notifications, setNotifications] = useState<{ message: string; timestamp: Date }[]>([]);
  const [notificationSent, setNotificationSent] = useState('');
  const [emrId, setEmrId] = useState<string | null>(null);
  const [emrData, setEmrData] = useState<any | null>(null);
  const [addingService, setAddingService] = useState<string | null>(null);
  const [users, setUsers] = useState<{ [uid: string]: any }>({});
  const [petInfo, setPetInfo] = useState<any>(null);
  const [petOwner, setPetOwner] = useState<any>(null);
  
  // Fetch users for audit trail display
  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const userMap: { [uid: string]: string } = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        userMap[doc.id] = data.displayName || data.name || doc.id;
      });
      setUsers(userMap);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch doctors
        const doctorsSnap = await getDocs(collection(db, 'doctors'));
        const doctorsList = doctorsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || 'Unknown' }));
        setDoctors(doctorsList);

        // Fetch users for audit trail
        await fetchUsers();

        // Fetch appointment
        const aptSnap = await getDoc(doc(db, 'appointments', appointmentId || ''));
        if (aptSnap.exists()) {
          const data = { id: aptSnap.id, ...aptSnap.data() } as Appointment;
          setAppointment(data);

          // Fetch pet info
          if (data.petId) {
            const petSnap = await getDoc(doc(db, 'pets', data.petId));
            if (petSnap.exists()) {
              setPetInfo({ id: petSnap.id, ...petSnap.data() });
              // Fetch owner info
              const petData = petSnap.data();
              if (petData.ownerUid) {
                const ownerSnap = await getDoc(doc(db, 'users', petData.ownerUid));
                if (ownerSnap.exists()) {
                  setPetOwner({ id: ownerSnap.id, ...ownerSnap.data() });
                }
              }
            }
          }

          // Set edit fields
          setSelectedDoctorId(data.doctorId || '');
          setSelectedDate(data.date || '');
          setSelectedTime(data.time || '');
          setSelectedStatus(data.status || 'pending');

          // Extract multiple types from notes
          const typeMatches = [...(data.notes?.matchAll(/Type:\s*(\w+)/gi) || [])];
          const types = typeMatches.map(m => m[1].toLowerCase());
          setSelectedType((types[0] as AppointmentType) || 'consultation');
          setNotes(data.notes?.replace(/Type:\s*\w+/gi, '').replace(/Mode:\s*\w+/i, '').trim() || '');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) {
      fetchData();
    }
  }, [appointmentId]);

  // Auto No-Show check
  useEffect(() => {
    const checkNoShow = async () => {
      if (!appointment) return;
      const status = appointment.status;
      if (status === 'completed' || status === 'cancelled' || status === 'in-progress') return;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const aptDate = new Date(appointment.date);
      aptDate.setHours(0, 0, 0, 0);
      
      if (aptDate < today) {
        // Past appointment, mark as no-show
        try {
          const userUid = auth.currentUser?.uid || 'unknown';
          const aptRef = doc(db, 'appointments', appointment.id);
          const auditEntry = {
            action: 'no-show',
            userId: userUid,
            timestamp: new Date().toISOString(),
            reason: 'Automatically marked as no-show (missed appointment)'
          };
          
          await updateDoc(aptRef, {
            status: 'no-show',
            audit: arrayUnion(auditEntry),
            updatedAt: new Date().toISOString()
          });

          // Send notifications
          await notifyDoctor(appointment.doctorId, 'appointment_no_show', 'Appointment No-Show',
            `Appointment for ${appointment.petName} on ${appointment.date} was automatically marked as No-Show.`);
          
          if (appointment.clientUid) {
            await notifyClient(appointment.clientUid, 'appointment_no_show', 'Appointment No-Show',
              `Your appointment for ${appointment.petName} on ${appointment.date} was marked as No-Show.`);
          }

          // Refresh data
          const updatedSnap = await getDoc(aptRef);
          if (updatedSnap.exists()) {
            setAppointment({ id: updatedSnap.id, ...updatedSnap.data() } as Appointment);
          }
        } catch (error) {
          console.error('Error marking no-show:', error);
        }
      }
    };
    
    checkNoShow();
  }, [appointment?.id]);

  // Fetch EMR ID when appointment is in-progress
  useEffect(() => {
    const fetchEMR = async () => {
      if (!appointment || appointment.status !== 'in-progress') {
        setEmrId(null);
        setEmrData(null);
        return;
      }

      try {
        const q = query(collection(db, 'emrRecords'), where('appointmentId', '==', appointment.id));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const emrDoc = snapshot.docs[0];
          setEmrId(emrDoc.id);
          setEmrData({ id: emrDoc.id, ...emrDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching EMR:', error);
      }
    };

    fetchEMR();
  }, [appointment?.id, appointment?.status]);

  const handleSave = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      const userUid = auth.currentUser?.uid || 'unknown';
      const changes: string[] = [];
      
      // Build updated notes with type
      const updatedNotes = `Type: ${selectedType}${notes ? ' ' + notes : ''}`;
      
      const updateData: any = {
        doctorId: selectedDoctorId,
        date: selectedDate,
        time: selectedTime,
        notes: updatedNotes,
        status: selectedStatus,
        updatedAt: new Date().toISOString()
      };

      // Track changes for notification
      if (selectedDoctorId !== appointment.doctorId) changes.push('doctor');
      if (selectedDate !== appointment.date || selectedTime !== appointment.time) changes.push('schedule');
      if (selectedType !== (appointment.notes?.match(/Type: (\w+)/i)?.[1] || 'consultation')) changes.push('appointment type');
      if (selectedStatus !== appointment.status) changes.push(`status to ${selectedStatus}`);
      
      const aptRef = doc(db, 'appointments', appointment.id);
      const auditEntry = {
        action: 'updated',
        userId: userUid,
        timestamp: new Date().toISOString(),
        reason: `Changed: ${changes.join(', ')}`
      };
      
      updateData.audit = arrayUnion(auditEntry);
      await updateDoc(aptRef, updateData);

      // Send notification to doctor
      const changeText = changes.length > 0 ? `Changes: ${changes.join(', ')}` : 'Appointment updated';
      await notifyDoctor(selectedDoctorId, 'appointment_updated', 'Appointment Updated',
        `Appointment for ${appointment.petName} was updated. ${changeText}`);
      
      // Send notification to client
      if (appointment.clientUid) {
        await notifyClient(appointment.clientUid, 'appointment_updated', 'Appointment Updated',
          `Your appointment for ${appointment.petName} was updated. ${changeText}`);
      }

      // Refresh appointment data
      const updatedSnap = await getDoc(aptRef);
      if (updatedSnap.exists()) {
        setAppointment({ id: updatedSnap.id, ...updatedSnap.data() } as Appointment);
      }
      
      const notifData = {
        message: `Notification sent to doctor and client about: ${changes.join(', ')}`,
        timestamp: new Date()
      };
      setNotifications(prev => [notifData, ...prev]);
      setNotificationSent(`Notification sent to doctor and client about: ${changes.join(', ')}`);
      setTimeout(() => setNotificationSent(''), 5000);
      
      setIsEditMode(false); // Exit edit mode after save
    } catch (error) {
      console.error('Error updating appointment:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      const userUid = auth.currentUser?.uid || 'unknown';
      const aptRef = doc(db, 'appointments', appointment.id);
      const auditEntry = {
        action: 'cancelled',
        userId: userUid,
        timestamp: new Date().toISOString(),
        reason: cancelReason || 'Not specified'
      };
      
      await updateDoc(aptRef, {
        status: 'cancelled',
        cancelReason: cancelReason || 'Not specified',
        audit: arrayUnion(auditEntry),
        updatedAt: new Date().toISOString()
      });

      // Send notifications
      await notifyDoctor(appointment.doctorId, 'appointment_cancelled', 'Appointment Cancelled',
        `Appointment for ${appointment.petName} on ${appointment.date} at ${appointment.time} was cancelled. Reason: ${cancelReason || 'Not specified'}`);
      
      if (appointment.clientUid) {
        await notifyClient(appointment.clientUid, 'appointment_cancelled', 'Appointment Cancelled',
          `Your appointment for ${appointment.petName} on ${appointment.date} at ${appointment.time} has been cancelled.`);
      }

      // Refresh data
      const updatedSnap = await getDoc(aptRef);
      if (updatedSnap.exists()) {
        setAppointment({ id: updatedSnap.id, ...updatedSnap.data() } as Appointment);
      }
      
      const notifData = {
        message: 'Cancellation notification sent to doctor and client',
        timestamp: new Date()
      };
      setNotifications(prev => [notifData, ...prev]);
      setShowCancelDialog(false);
      setCancelReason('');
      setNotificationSent('Cancellation notification sent to doctor and client');
      setTimeout(() => setNotificationSent(''), 5000);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    } finally {
      setSaving(false);
    }
  };

  const [starting, setStarting] = useState(false);

  const confirmAppointment = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      const userUid = auth.currentUser?.uid || 'unknown';
      const aptRef = doc(db, 'appointments', appointment.id);
      const auditEntry = {
        action: 'confirmed',
        userId: userUid,
        timestamp: new Date().toISOString(),
        reason: 'Appointment confirmed'
      };
      
      await updateDoc(aptRef, {
        status: 'confirmed',
        audit: arrayUnion(auditEntry),
        updatedAt: new Date().toISOString()
      });

      // Send notifications
      await notifyDoctor(appointment.doctorId, 'appointment_confirmed', 'Appointment Confirmed',
        `Appointment for ${appointment.petName} on ${appointment.date} at ${appointment.time} has been confirmed.`);
      
      if (appointment.clientUid) {
        await notifyClient(appointment.clientUid, 'appointment_confirmed', 'Appointment Confirmed',
          `Your appointment for ${appointment.petName} on ${appointment.date} at ${appointment.time} has been confirmed.`);
      }

      // Refresh appointment data
      const updatedSnap = await getDoc(aptRef);
      if (updatedSnap.exists()) {
        setAppointment({ id: updatedSnap.id, ...updatedSnap.data() } as Appointment);
      }

      setNotificationSent('Appointment confirmed');
      setTimeout(() => setNotificationSent(''), 5000);
    } catch (error) {
      console.error('Error confirming appointment:', error);
    } finally {
      setSaving(false);
    }
  };

  const startAppointment = async () => {
    if (!appointment) return;
    setStarting(true);
    try {
      const userUid = auth.currentUser?.uid || 'unknown';
      const aptRef = doc(db, 'appointments', appointment.id);
      const startTime = new Date().toISOString();
      
      // Update appointment status to in-progress
      const auditEntry = {
        action: 'started',
        userId: userUid,
        timestamp: startTime,
        reason: 'Appointment started'
      };
      
      await updateDoc(aptRef, {
        status: 'in-progress',
        audit: arrayUnion(auditEntry),
        updatedAt: startTime
      });

      // Get appointment types for the service (use first type for EMR)
      const types = [...(appointment.notes?.matchAll(/Type:\s*(\w+)/gi) || [])].map(m => m[1]);
      const aptType = types[0] || 'consultation';

      // Create EMR record with initial service
      const emrData = {
        petId: appointment.petId,
        petName: appointment.petName,
        clientUid: appointment.clientUid,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        appointmentId: appointment.id,
        date: appointment.date,
        time: appointment.time,
        status: 'in-progress',
        type: aptType,
        vitals: {},
        diagnosis: '',
        treatment: '',
        prescriptions: [],
        labResults: [],
        notes: '',
        services: [
          {
            id: Date.now().toString(),
            name: aptType.charAt(0).toUpperCase() + aptType.slice(1),
            startTime: startTime,
            endTime: null,
            status: 'in-progress',
            fee: aptType === 'consultation' ? 500 : aptType === 'grooming' ? 800 : aptType === 'vaccination' ? 300 : 1000
          }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const emrRef = await addDoc(collection(db, 'emrRecords'), emrData);

      // Create draft invoice with the service
      const serviceFee = aptType === 'consultation' ? 500 : aptType === 'grooming' ? 800 : aptType === 'vaccination' ? 300 : 1000;
      const invoiceData = {
        petId: appointment.petId,
        petName: appointment.petName,
        clientUid: appointment.clientUid,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        appointmentId: appointment.id,
        emrId: emrRef.id,
        date: startTime,
        status: 'draft',
        items: [
          {
            description: aptType.charAt(0).toUpperCase() + aptType.slice(1),
            amount: serviceFee,
            quantity: 1
          }
        ],
        total: serviceFee,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await addDoc(collection(db, 'invoices'), invoiceData);

      // Send notifications
      await notifyDoctor(appointment.doctorId, 'appointment_started', 'Appointment Started',
        `Appointment for ${appointment.petName} has started. EMR and billing initialized.`);
      
      if (appointment.clientUid) {
        await notifyClient(appointment.clientUid, 'appointment_started', 'Appointment Started',
          `Your pet ${appointment.petName}'s appointment has started.`);
      }

      // Refresh appointment data
      const updatedSnap = await getDoc(aptRef);
      if (updatedSnap.exists()) {
        setAppointment({ id: updatedSnap.id, ...updatedSnap.data() } as Appointment);
      }

      setNotificationSent('Appointment started - EMR and billing initialized');
      setTimeout(() => setNotificationSent(''), 5000);
    } catch (error) {
      console.error('Error starting appointment:', error);
    } finally {
      setStarting(false);
    }
  };

  const addService = async (serviceType: string) => {
    if (!appointment || !emrId) return;
    setAddingService(serviceType);
    try {
      const serviceFee = serviceType === 'consultation' ? 500 : 
                         serviceType === 'grooming' ? 800 : 
                         serviceType === 'vaccination' ? 300 : 1000;
      const serviceName = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
      const startTime = new Date().toISOString();
      
      // Add service to EMR
      const emrRef = doc(db, 'emrRecords', emrId);
      const newService = {
        id: Date.now().toString(),
        name: serviceName,
        startTime: startTime,
        endTime: null,
        status: 'in-progress',
        fee: serviceFee
      };
      
      await updateDoc(emrRef, {
        services: arrayUnion(newService),
        updatedAt: new Date().toISOString()
      });

      // Add to invoice
      const invoiceQuery = query(collection(db, 'invoices'), where('appointmentId', '==', appointment.id), where('status', '==', 'draft'));
      const invoiceSnap = await getDocs(invoiceQuery);
      if (!invoiceSnap.empty) {
        const invoiceRef = doc(db, 'invoices', invoiceSnap.docs[0].id);
        await updateDoc(invoiceRef, {
          items: arrayUnion({
            description: serviceName,
            amount: serviceFee,
            quantity: 1
          }),
          total: (invoiceSnap.docs[0].data().total || 0) + serviceFee,
          updatedAt: new Date().toISOString()
        });
      }

      // Send notification to doctor
      await notifyDoctor(appointment.doctorId, 'service_added', 'Service Added',
        `${serviceName} has been added to the appointment for ${appointment.petName}.`);

      setNotificationSent(`${serviceName} added to appointment`);
      setTimeout(() => setNotificationSent(''), 5000);
    } catch (error) {
      console.error('Error adding service:', error);
    } finally {
      setAddingService(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">In Progress</Badge>;
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

  if (loading) {
    return <div className="p-8 text-center">Loading appointment details...</div>;
  }

  if (!appointment) {
    return <div className="p-8 text-center">Appointment not found</div>;
  }

  const additionalNotes = appointment.notes
    ?.replace(/Type:\s*\w+/i, '')
    .replace(/Mode:\s*\w+/i, '')
    .trim();

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <PageHeader 
        title={
          <div className="flex items-center gap-3">
            Appointment Details
            {appointment.status === 'in-progress' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-700 text-white animate-pulse">
                ● Ongoing
              </span>
            )}
          </div>
        }
        subtitle={`${appointment.petName} - ${format(new Date(appointment.date), 'MMM dd, yyyy')} at ${appointment.time}`}
        backTo="/crm/appointments"
        backText="Back to Appointments"
        actions={
          canEdit && appointment.status !== 'in-progress' && (
            <div className="flex gap-2">
              {!isEditMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {appointment.status === 'pending' && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={confirmAppointment}
                      disabled={saving}
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Confirming...
                        </span>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm
                        </>
                      )}
                    </Button>
                  )}
                  {appointment.status === 'confirmed' && (() => {
                    const today = new Date().toISOString().split('T')[0];
                    const isToday = appointment.date === today;
                    return isToday ? (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={startAppointment}
                        disabled={starting}
                      >
                        {starting ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Starting...
                          </span>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Appointment
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={true}
                        title="Can only start appointment on the scheduled date"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Appointment
                      </Button>
                    );
                  })()}
                  {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Appointment
                  </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditMode(false)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancel Edit
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </>
              )}
            </div>
          )
        }
      />

      {/* Notification Banner */}
      {notificationSent && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <p className="text-sm text-emerald-700">{notificationSent}</p>
        </div>
      )}

      {/* Pet Information Card */}
      <div className="mb-6">
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-blue-50 flex items-center justify-center text-3xl font-bold text-blue-600">
                {petInfo?.imageUrl || petInfo?.photo ? (
                  <img src={petInfo.imageUrl || petInfo.photo} alt={petInfo.name} className="w-full h-full object-cover" />
                ) : (
                  petInfo?.name?.[0] || appointment.petName?.[0] || 'P'
                )}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{petInfo?.name || appointment.petName}</h2>
                <p className="text-sm text-gray-600"><span className="font-medium">Pet ID:</span> {petInfo?.id || appointment.petId}</p>
                <p className="text-sm text-gray-600"><span className="font-medium">Species:</span> {petInfo?.species || 'N/A'}</p>
                <p className="text-sm text-gray-600"><span className="font-medium">Breed:</span> {petInfo?.breed || 'N/A'}</p>
                <p className="text-sm text-gray-600"><span className="font-medium">Age:</span> {petInfo?.age ? `${petInfo.age} years` : 'N/A'}</p>
                <p className="text-sm text-gray-600"><span className="font-medium">Status:</span> {petInfo?.currentStatus || petInfo?.status || 'N/A'}</p>
              </div>
            </div>

            {petOwner && (
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 min-w-[320px]">
                <h4 className="font-bold text-blue-900 mb-3 text-sm uppercase tracking-wider">Owner Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700/70 font-medium">Name:</span>
                    <span className="text-blue-900 font-semibold">{petOwner?.displayName || petOwner?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700/70 font-medium">Email:</span>
                    <span className="text-blue-900 underline decoration-blue-200">{petOwner?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700/70 font-medium">Phone:</span>
                    <span className="text-blue-900">{petOwner?.phone || petInfo?.ownerPhone || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Appointment Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditMode ? (
              // View Mode
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Pet</p>
                    <button 
                      className="font-medium text-emerald-600 hover:underline"
                      onClick={() => navigate(`/crm/patients/${appointment.petId}`)}
                    >
                      {appointment.petName}
                    </button>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Doctor</p>
                    <p className="font-medium">{appointment.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {appointment.date}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {appointment.time}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    {getStatusBadge(appointment.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Mode</p>
                    <Badge variant="outline" className="border-purple-500 text-purple-600">
                      {appointment.notes?.match(/Mode:\s*(\w+)/i)?.[1] === 'walk-in' ? 'Walk-in' : 'Scheduled'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type(s)</p>
                    <div className="flex flex-wrap gap-1 mt-1">
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
                  </div>
                  {additionalNotes && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-1">Additional Notes</p>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                        {additionalNotes}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Edit Mode
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Doctor</label>
                  {user?.role === 'doctor' ? (
                    <p className="mt-1 p-2 bg-muted rounded-md">{appointment.doctorName}</p>
                  ) : (
                    <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="mt-1 w-full p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Time</label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00 AM">09:00 AM</SelectItem>
                        <SelectItem value="09:30 AM">09:30 AM</SelectItem>
                        <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                        <SelectItem value="10:30 AM">10:30 AM</SelectItem>
                        <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                        <SelectItem value="02:00 PM">02:00 PM</SelectItem>
                        <SelectItem value="02:30 PM">02:30 PM</SelectItem>
                        <SelectItem value="03:00 PM">03:00 PM</SelectItem>
                        <SelectItem value="03:30 PM">03:30 PM</SelectItem>
                        <SelectItem value="04:00 PM">04:00 PM</SelectItem>
                        <SelectItem value="04:30 PM">04:30 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Appointment Type</label>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as AppointmentType)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="grooming">Grooming</SelectItem>
                      <SelectItem value="vaccination">Vaccination</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no-show">No-Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about the appointment..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
             )}

             {/* Cancel Reason in view mode */}
            {!isEditMode && appointment.cancelReason && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Cancellation Reason</p>
                <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                  {appointment.cancelReason}
                </div>
              </div>
            )}
           </CardContent>
        </Card>

        {/* Services Table (visible when in-progress) */}
        {appointment.status === 'in-progress' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Services</CardTitle>
                {emrId && (
                  <Button
                    className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white animate-pulse"
                    size="sm"
                    onClick={() => navigate(`/crm/emr/${appointment.petId}`, { 
                      state: { from: `/crm/appointments/${appointment.id}`, backText: 'Back to Appointment Details' }
                    })}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Medical Record →
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium w-[200px]">Service</th>
                      <th className="text-left p-3 font-medium">Start Time</th>
                      <th className="text-left p-3 font-medium">End Time</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">
                         {(() => {
                           const types = [...(appointment.notes?.matchAll(/Type:\s*(\w+)/gi) || [])].map(m => m[1]);
                           if (types.length === 0) return 'Consultation';
                           return types.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ');
                         })()}
                       </td>
                      <td className="p-3 text-gray-600">
                        {emrData?.services?.[0]?.startTime
                          ? new Date(emrData.services[0].startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                          : '--'}
                      </td>
                      <td className="p-3 text-gray-400">--</td>
                      <td className="p-3">
                        <Badge className="bg-blue-600 text-white">In Progress</Badge>
                      </td>
                      <td className="p-3 text-right font-medium">
                        ₱{(() => {
                          const type = appointment.notes?.match(/Type: (\w+)/i)?.[1] || 'consultation';
                          return type === 'consultation' ? '500' : 
                                 type === 'grooming' ? '800' :
                                 type === 'vaccination' ? '300' : '1000';
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {emrData && emrData.services && emrData.services.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">Duration</p>
                  <p className="text-lg font-semibold text-blue-700">
                    {(() => {
                      const startTime = new Date(emrData.services?.[0]?.startTime || Date.now());
                      const now = new Date();
                      const diffMs = now.getTime() - startTime.getTime();
                      const hours = Math.floor(diffMs / (1000 * 60 * 60));
                      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      if (hours > 0) return `${hours}h ${minutes}m`;
                      return `${minutes}m`;
                    })()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audit Trail */}
        {appointment.audit && (appointment.audit as any[]).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(appointment.audit as any[])
                  .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((entry: any, idx: number) => (
                  <div key={entry.id || idx} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                    <div className="flex justify-between items-start">
                       <div>
                         <span className="font-medium capitalize">{entry.action}</span>
                         {entry.reason && <span className="text-gray-600 ml-2">{entry.reason}</span>}
                         <span className="text-gray-500 ml-2">by {users[entry.userId] || entry.userId}</span>
                       </div>
                      <span className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications Sent */}
        {notifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Notifications Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifications.map((notif, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Sent: {notif.timestamp.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment for {appointment.petName}?
              This action will notify the doctor and client.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason for cancellation</label>
            <Textarea
              className="w-full mt-2"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCancelDialog(false); setCancelReason(''); }}>
              Back
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCancel}
              disabled={saving}
            >
              {saving ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
