import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { db, auth } from '../../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from '../../firebase';
import { notifyDoctor, notifyClient } from '../../lib/notifications';
import { format } from 'date-fns';
import { Calendar, Clock, User, Stethoscope, FileText, CheckCircle, XCircle, Pencil, RefreshCw } from 'lucide-react';
import { Appointment } from '../../types';

type AppointmentType = 'consultation' | 'grooming' | 'vaccination' | 'procedure' | 'others';

export default function AppointmentDetailsPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [selectedType, setSelectedType] = useState<AppointmentType>('consultation');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const aptSnap = await getDoc(doc(db, 'appointments', appointmentId || ''));
        if (aptSnap.exists()) {
          const data = { id: aptSnap.id, ...aptSnap.data() } as Appointment;
          setAppointment(data);
          setSelectedStatus(data.status);
          // Determine appointment type from notes or default
          const typeMatch = data.notes?.match(/Type: (\w+)/i);
          setSelectedType((typeMatch?.[1] as AppointmentType) || 'consultation');
        }
      } catch (error) {
        console.error('Error fetching appointment:', error);
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) {
      fetchAppointment();
    }
  }, [appointmentId]);

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    if (!appointment) return;
    
    try {
      const aptRef = doc(db, 'appointments', appointment.id);
      const userUid = auth.currentUser?.uid || 'unknown';
      const auditEntry = { 
        action: newStatus, 
        userId: userUid, 
        timestamp: new Date().toISOString(),
        reason 
      };
      
      const updateData: any = { 
        status: newStatus, 
        audit: arrayUnion(auditEntry),
        updatedAt: new Date().toISOString()
      };
      
      if (newStatus === 'cancelled' && reason) {
        updateData.cancelReason = reason;
      }
      
      await updateDoc(aptRef, updateData);

      // Create notifications
      if (newStatus === 'cancelled') {
        await notifyDoctor(appointment.doctorId, 'appointment_cancelled', 'Appointment Cancelled',
          `Appointment for ${appointment.petName} on ${appointment.date} at ${appointment.time} was cancelled. Reason: ${reason || 'Not specified'}`);
        if (appointment.clientUid) {
          await notifyClient(appointment.clientUid, 'appointment_cancelled', 'Appointment Cancelled',
            `Your appointment for ${appointment.petName} on ${appointment.date} at ${appointment.time} has been cancelled.`);
        }
      } else if (newStatus === 'confirmed') {
        await notifyDoctor(appointment.doctorId, 'appointment_confirmed', 'Appointment Confirmed',
          `Appointment for ${appointment.petName} on ${appointment.date} at ${appointment.time} is confirmed.`);
      } else {
        await notifyDoctor(appointment.doctorId, 'appointment_updated', 'Appointment Updated',
          `Appointment for ${appointment.petName} status changed to ${newStatus}.`);
        if (appointment.clientUid) {
          await notifyClient(appointment.clientUid, 'appointment_updated', 'Appointment Updated',
            `Your appointment for ${appointment.petName} status changed to ${newStatus}.`);
        }
      }

      // Refresh appointment data
      const updatedSnap = await getDoc(aptRef);
      if (updatedSnap.exists()) {
        setAppointment({ id: updatedSnap.id, ...updatedSnap.data() } as Appointment);
      }
      
      setShowCancelDialog(false);
      setCancelReason('');
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const handleUpdateType = async () => {
    if (!appointment) return;
    
    try {
      const aptRef = doc(db, 'appointments', appointment.id);
      const userUid = auth.currentUser?.uid || 'unknown';
      const auditEntry = { 
        action: 'updated', 
        userId: userUid, 
        timestamp: new Date().toISOString(),
        reason: editReason || 'Type changed to ' + selectedType
      };
      
      const updatedNotes = appointment.notes 
        ? appointment.notes.replace(/Type: \w+/i, `Type: ${selectedType}`)
        : `Type: ${selectedType}`;
      
      await updateDoc(aptRef, { 
        notes: updatedNotes,
        audit: arrayUnion(auditEntry),
        updatedAt: new Date().toISOString()
      });

      const updatedSnap = await getDoc(aptRef);
      if (updatedSnap.exists()) {
        setAppointment({ id: updatedSnap.id, ...updatedSnap.data() } as Appointment);
      }
      
      setShowEditDialog(false);
      setEditReason('');
    } catch (error) {
      console.error('Error updating appointment type:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading appointment details...</div>;
  }

  if (!appointment) {
    return <div className="p-8 text-center">Appointment not found</div>;
  }

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

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <PageHeader 
        title="Appointment Details"
        subtitle={`${appointment.petName} - ${format(new Date(appointment.date), 'MMM dd, yyyy')} at ${appointment.time}`}
        onBack={() => navigate(location.state?.from || '/crm/appointments')}
        actions={
          <div className="flex gap-2">
            {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <>
                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                {appointment.status === 'pending' && (
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleStatusChange('confirmed')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Info */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              
              {appointment.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    {appointment.notes}
                  </div>
                </div>
              )}
              
              {appointment.cancelReason && (
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
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointment.status === 'pending' && (
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleStatusChange('confirmed')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Appointment
                </Button>
              )}
              
              {appointment.status === 'confirmed' && (
                <>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleStatusChange('completed')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                  <Button 
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                    onClick={() => handleStatusChange('no-show')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Mark No-Show
                  </Button>
                </>
              )}
              
              {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Appointment
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Change Type / Edit
              </Button>
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
              variant="destructive"
              onClick={() => handleStatusChange('cancelled', cancelReason)}
            >
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update appointment type or add notes
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Appointment Type</label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as AppointmentType)}>
                <SelectTrigger className="mt-2">
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
              <label className="text-sm font-medium">Reason for update (optional)</label>
              <Textarea
                className="w-full mt-2"
                rows={3}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Enter reason for this update..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditReason(''); }}>
              Back
            </Button>
            <Button onClick={handleUpdateType}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
