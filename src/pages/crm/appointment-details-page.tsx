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
import { collection, doc, getDoc, getDocs, updateDoc, arrayUnion } from '../../firebase';
import { notifyDoctor, notifyClient } from '../../lib/notifications';
import { format } from 'date-fns';
import { Calendar, Clock, User, Stethoscope, FileText, CheckCircle, XCircle, Pencil, ArrowLeft } from 'lucide-react';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch doctors
        const doctorsSnap = await getDocs(collection(db, 'doctors'));
        const doctorsList = doctorsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || 'Unknown' }));
        setDoctors(doctorsList);
        
        // Fetch appointment
        const aptSnap = await getDoc(doc(db, 'appointments', appointmentId || ''));
        if (aptSnap.exists()) {
          const data = { id: aptSnap.id, ...aptSnap.data() } as Appointment;
          setAppointment(data);
          
          // Set edit fields
          setSelectedDoctorId(data.doctorId || '');
          setSelectedDate(data.date || '');
          setSelectedTime(data.time || '');
          setSelectedStatus(data.status || 'pending');
          
          // Extract type from notes
          const typeMatch = data.notes?.match(/Type: (\w+)/i);
          setSelectedType((typeMatch?.[1] as AppointmentType) || 'consultation');
          setNotes(data.notes?.replace(/Type: \w+/i, '').trim() || '');
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

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <PageHeader 
        title="Appointment Details"
        subtitle={`${appointment.petName} - ${format(new Date(appointment.date), 'MMM dd, yyyy')} at ${appointment.time}`}
        onBack={() => navigate('/crm/appointments')}
        actions={
          canEdit && (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditMode ? (
                // View Mode
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
                    <p className="text-sm text-gray-500">Type</p>
                    <Badge variant="outline" className="border-blue-500 text-blue-600">
                      {appointment.notes?.match(/Type: (\w+)/i)?.[1] || 'Consultation'}
                    </Badge>
                  </div>
                </div>
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

              {/* Notes in view mode */}
              {!isEditMode && appointment.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    {appointment.notes}
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

          {/* Audit Trail */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {appointment.audit && (appointment.audit as any[]).length > 0 ? (
                <div className="space-y-3">
                  {(appointment.audit as any[]).map((entry: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">
                            {entry.action}
                            {entry.reason && (
                              <span className="text-gray-600 font-normal"> - {entry.reason}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">By: {entry.userId}</p>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No audit entries yet</p>
              )}
            </CardContent>
          </Card>

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

        {/* Right Column - Pet Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pet Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Pet Name</p>
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
                <p className="text-sm text-gray-500">Schedule</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {appointment.date} at {appointment.time}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                {getStatusBadge(appointment.status)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <Badge variant="outline" className="border-blue-500 text-blue-600">
                  {appointment.notes?.match(/Type: (\w+)/i)?.[1] || 'Consultation'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
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
