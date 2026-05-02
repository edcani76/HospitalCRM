import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, User, Stethoscope, Calendar, Clock, Plus, Search } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { db, auth, collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, getDoc, arrayUnion } from '../../firebase';
import { notifyDoctor, notifyClient } from '../../lib/notifications';
import { Doctor, Pet, Appointment } from '../../types';
import PetDialog from '../../components/crm/pet-dialog';

export default function CreateAppointmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as any)?.prefill as (Appointment & { originalId?: string }) | undefined;
  const isEdit = (location.state as any)?.isEdit || false;

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [users, setUsers] = useState<{ [uid: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<string>('consultation');
  const [appointmentMode, setAppointmentMode] = useState<string>('scheduled'); // 'walk-in' or 'scheduled'
  const [notes, setNotes] = useState('');
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);

  // Pet selection mode
  const [petSearchTerm, setPetSearchTerm] = useState('');
  const [showNewPetForm, setShowNewPetForm] = useState(false);
  const [newPet, setNewPet] = useState({ name: '', species: 'Dog', breed: '', ownerUid: '' });
  const [isPetDialogOpen, setIsPetDialogOpen] = useState(false);

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  useEffect(() => {
    fetchDoctors();
    fetchPets();
    fetchUsers();
  }, []);

  // Pre-fill when editing - wait for doctors/pets to load
  useEffect(() => {
    if (prefill && doctors.length > 0 && pets.length > 0) {
      console.log('Prefill data:', prefill); // Debug log
      setSelectedDoctor(prefill.doctorId || '');
      setSelectedPet(prefill.petId || '');
      setSelectedDate(prefill.date || format(startOfToday(), 'yyyy-MM-dd'));
      setSelectedTime(prefill.time || '');

      // Parse type and mode from notes
      const notesText = prefill.notes || '';
      const typeMatch = notesText.match(/Type:\s*(\w+)/i);
      const modeMatch = notesText.match(/Mode:\s*(\w+)/i);

      if (typeMatch) setAppointmentType(typeMatch[1].toLowerCase());
      if (modeMatch) setAppointmentMode(modeMatch[1].toLowerCase());

      // Remove Type and Mode lines from notes for display
      const cleanNotes = notesText
        .replace(/Type:\s*\w+/i, '')
        .replace(/Mode:\s*\w+/i, '')
        .trim();
      setNotes(cleanNotes);
    }
  }, [prefill, doctors, pets]);

  const fetchDoctors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'doctors'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
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

  // Fetch existing appointments for selected doctor and date
  useEffect(() => {
    const fetchExistingAppointments = async () => {
      if (!selectedDoctor || !selectedDate) {
        setExistingAppointments([]);
        return;
      }
      try {
        const snapshot = await getDocs(collection(db, 'appointments'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        const filtered = data.filter(apt =>
          apt.doctorId === selectedDoctor &&
          apt.date === selectedDate
        );
        setExistingAppointments(filtered);
      } catch (error) {
        console.error('Error fetching existing appointments:', error);
      }
    };
    fetchExistingAppointments();
  }, [selectedDoctor, selectedDate]);

  // Get time slot status – treat cancelled as available
  const getSlotStatus = (time: string) => {
    const existing = existingAppointments.find(apt => apt.time === time);
    if (!existing) return 'available';
    // Only pending and confirmed block the slot
    if (existing.status === 'cancelled') return 'available';
    return existing.status;
  };

  // Get doctor's available time slots
  const getDoctorAvailability = (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor && doctor.availability) {
      return doctor.availability;
    }
    return timeSlots; // Default to all slots if no availability set
  };

  // Filter pets based on search term and selected owner
  const filteredPets = pets.filter(pet => {
    if (!petSearchTerm) return true;
    const searchLower = petSearchTerm.toLowerCase();
    const ownerName = users[pet.ownerUid] || '';
    return (
      pet.name.toLowerCase().includes(searchLower) ||
      pet.species.toLowerCase().includes(searchLower) ||
      pet.breed?.toLowerCase().includes(searchLower) ||
      ownerName.toLowerCase().includes(searchLower)
    );
  });

  // Get selected pet details
  const selectedPetData = pets.find(p => p.id === selectedPet);
  const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);
  // Fallback for edit mode: use prefill data if doctor not found in loaded list yet
  const displayDoctorData = selectedDoctorData || (
    isEdit && prefill ? {
      id: prefill.doctorId,
      name: prefill.doctorName || 'Unknown',
      department: (prefill as any).doctorDepartment || '',
      experience: (prefill as any).doctorExperience || 0,
      specialization: '',
      availability: []
    } as Doctor : null
  );

  // Handle new pet creation from PetDialog
  const handleNewPetFromDialog = async (formData: any) => {
    try {
      const petDoc = await addDoc(collection(db, 'pets'), {
        name: formData.name,
        species: formData.species,
        breed: formData.breed,
        ownerUid: formData.ownerUid,
        weight: formData.weight || 0,
        dateOfBirth: formData.dateOfBirth || '',
        gender: formData.gender || '',
        bloodType: formData.bloodType || 'Unknown',
        color: formData.color || '',
        imageUrl: formData.imageUrl || '',
        currentStatus: 'active',
        createdAt: new Date().toISOString()
      });
      // Refresh pets list
      fetchPets();
      // Auto-select the new pet
      setSelectedPet(petDoc.id);
      setShowNewPetForm(false);
      setIsPetDialogOpen(false);
    } catch (error) {
      console.error('Error creating pet from dialog:', error);
      alert('Failed to create pet. Please try again.');
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedTime) {
      alert('Please select a doctor and time slot');
      return;
    }
    if (!selectedPet && !showNewPetForm) {
      alert('Please select a pet or create a new one');
      return;
    }

    setLoading(true);
    try {
      let petId = selectedPet;
      let petName = '';
      let clientUid = '';

      if (showNewPetForm) {
        // Create new pet first
        if (!newPet.name || !newPet.ownerUid) {
          alert('Please fill in pet name and select owner');
          setLoading(false);
          return;
        }
        const petDoc = await addDoc(collection(db, 'pets'), {
          ...newPet,
          age: 0,
          weight: 0,
          type: newPet.species === 'Dog' ? 'Medium' : 'Small',
          createdAt: new Date().toISOString()
        });
        petId = petDoc.id;
        petName = newPet.name;
        clientUid = newPet.ownerUid;
      } else {
        const pet = pets.find(p => p.id === selectedPet);
        petId = pet?.id || '';
        petName = pet?.name || '';
        clientUid = pet?.ownerUid || '';
      }

      if (isEdit && prefill?.originalId) {
        // Update the original appointment
        const aptRef = doc(db, 'appointments', prefill.originalId);
        const userUid = auth.currentUser?.uid || 'unknown';
        const auditEntry = { action: 'edited', userId: userUid, timestamp: new Date().toISOString() };
        await updateDoc(aptRef, {
          doctorId: selectedDoctor,
          doctorName: displayDoctorData?.name || prefill?.doctorName || '',
          date: selectedDate,
          time: selectedTime,
          notes: `Type: ${appointmentType}\nMode: ${appointmentMode}\n${notes}`.trim(),
          updatedAt: serverTimestamp(),
          audit: arrayUnion(auditEntry)
        });
        
        // Notify doctor about the update
        await notifyDoctor(selectedDoctor, 'appointment_updated', 'Appointment Updated', 
          `Appointment for ${petName} has been updated to ${selectedDate} at ${selectedTime}`);
        
        // Notify client about the update
        if (clientUid) {
          await notifyClient(clientUid, 'appointment_updated', 'Appointment Updated', 
            `Your appointment for ${petName} has been updated to ${selectedDate} at ${selectedTime}`);
        }
      } else {
        await addDoc(collection(db, 'appointments'), {
          clientUid,
          petId,
          petName,
          doctorId: selectedDoctor,
          doctorName: displayDoctorData?.name || '',
          date: selectedDate,
          time: selectedTime,
          status: 'confirmed',
          notes: `Type: ${appointmentType}\nMode: ${appointmentMode}\n${notes}`.trim(),
          createdAt: serverTimestamp()
        });
      }

      // Clear prefill state so form resets
      navigate('/crm/appointments', { replace: true });
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      alert(`Failed to update appointment: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 px-2 sm:px-0">
      <PageHeader
        title={isEdit ? 'Edit Appointment' : 'Create New Appointment'}
        actions={
          <Button variant="ghost" onClick={() => navigate('/crm/appointments')} className="text-sm md:text-base">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back to Appointments</span>
            <span className="sm:hidden">Back</span>
          </Button>
        }
      />

      <form onSubmit={handleCreateAppointment}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Doctor & Time */}
          <div className="lg:col-span-1 space-y-4 lg:space-y-6">
            {isEdit ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-emerald-600" />
                    Edit Doctor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choose a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show prefill doctor if not in loaded list yet */}
                      {isEdit && prefill && !doctors.find(d => d.id === prefill.doctorId) && (
                        <SelectItem key={prefill.doctorId} value={prefill.doctorId}>
                          <div className="flex flex-col">
                            <span className="font-medium">{prefill.doctorName || 'Unknown'}</span>
                          </div>
                        </SelectItem>
                      )}
                      {doctors.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{doc.name}</span>
                            <span className="text-xs text-muted-foreground">{doc.specialization}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {displayDoctorData && (
                    <div className="p-4 bg-emerald-50 rounded-lg space-y-2">
                      <p className="text-sm font-bold text-emerald-800">{displayDoctorData.name}</p>
                      <p className="text-xs text-emerald-600">{displayDoctorData.department}</p>
                      <p className="text-xs text-emerald-600">{displayDoctorData.experience} years experience</p>
                      {displayDoctorData.availability && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-emerald-700 mb-1">Available slots:</p>
                          <div className="flex flex-wrap gap-1">
                            {displayDoctorData.availability.map(time => (
                              <Badge key={time} variant="outline" className="text-xs border-emerald-300 text-emerald-700">
                                {time}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-emerald-600" />
                    Select Doctor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choose a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{doc.name}</span>
                            <span className="text-xs text-muted-foreground">{doc.specialization}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {displayDoctorData && (
                    <div className="p-4 bg-emerald-50 rounded-lg space-y-2">
                      <p className="text-sm font-bold text-emerald-800">{displayDoctorData.name}</p>
                      <p className="text-xs text-emerald-600">{displayDoctorData.department}</p>
                      <p className="text-xs text-emerald-600">{displayDoctorData.experience} years experience</p>
                      {displayDoctorData.availability && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-emerald-700 mb-1">Available slots:</p>
                          <div className="flex flex-wrap gap-1">
                            {displayDoctorData.availability.map(time => (
                              <Badge key={time} variant="outline" className="text-xs border-emerald-300 text-emerald-700">
                                {time}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Select Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={format(startOfToday(), 'yyyy-MM-dd')}
                  />
                </div>

                <div>
                  <Label>Available Time Slots</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto sm:max-h-none">
                    {getDoctorAvailability(selectedDoctor).map(time => {
                      const slotStatus = getSlotStatus(time);
                      const isConfirmed = slotStatus === 'confirmed';
                      const isPending = slotStatus === 'pending';
                      const isSelected = selectedTime === time;

                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => !isConfirmed && setSelectedTime(time)}
                          disabled={isConfirmed}
                          className={`p-2 sm:p-3 rounded-lg border text-sm font-medium transition-all relative min-h-[44px] ${
                            isConfirmed
                              ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                              : isPending
                                ? isSelected
                                  ? 'bg-yellow-500 text-white border-yellow-600'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100'
                                : isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white border-stone-200 text-stone-700 hover:bg-emerald-50 hover:border-emerald-300'
                          }`}
                        >
                          {time}
                          {isPending && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white" title="Pending appointment exists" />
                          )}
                          {isConfirmed && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" title="Slot unavailable" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {existingAppointments.some(apt => apt.status === 'pending') && (
                    <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full inline-block" />
                      Yellow slots have unconfirmed appointments
                    </p>
                  )}
                  {existingAppointments.some(apt => apt.status === 'confirmed') && (
                    <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                      <span className="w-2 h-2 bg-stone-400 rounded-full inline-block" />
                      Gray slots are already booked
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Pet Selection */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {!isEdit && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    Select Patient / Pet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing Pet Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-emerald-800">Select Existing Pet</h4>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsPetDialogOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        New Pet
                      </Button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        placeholder="Search pets by name, species, breed, or owner..."
                        value={petSearchTerm}
                        onChange={(e) => setPetSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 border border-stone-200 rounded-lg p-2">
                      {filteredPets.length === 0 ? (
                        <p className="text-center text-stone-500 py-4">No pets found</p>
                      ) : (
                        filteredPets.map(pet => (
                          <button
                            key={pet.id}
                            type="button"
                            onClick={() => setSelectedPet(pet.id)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              selectedPet === pet.id
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{pet.name}</p>
                                <p className="text-xs text-stone-500">{pet.species} - {pet.breed}</p>
                                <p className="text-xs text-stone-400">Owner: {users[pet.ownerUid] || 'Unknown'}</p>
                              </div>
                              {selectedPet === pet.id && (
                                <Badge variant="success">Selected</Badge>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* When editing, show locked pet info */}
            {(isEdit) && selectedPetData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    Patient / Pet (Locked)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="font-medium">{selectedPetData.name}</p>
                    <p className="text-xs text-emerald-700">{selectedPetData.species} - {selectedPetData.breed}</p>
                    <p className="text-xs text-emerald-600">Owner: {users[selectedPetData.ownerUid] || 'Unknown'}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appointment Type & Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Appointment Mode</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={appointmentMode === 'scheduled' ? 'default' : 'outline'}
                      onClick={() => setAppointmentMode('scheduled')}
                      className={appointmentMode === 'scheduled' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    >
                      Scheduled
                    </Button>
                    <Button
                      type="button"
                      variant={appointmentMode === 'walk-in' ? 'default' : 'outline'}
                      onClick={() => setAppointmentMode('walk-in')}
                      className={appointmentMode === 'walk-in' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    >
                      Walk-in
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Appointment Type</Label>
                  <Select value={appointmentType} onValueChange={setAppointmentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="grooming">Grooming</SelectItem>
                      <SelectItem value="vaccination">Vaccination</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                      <SelectItem value="laboratory">Laboratory</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason for visit, symptoms, special instructions..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary & Submit */}
            {selectedPetData && selectedDoctorData && selectedTime && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="p-4">
                  <h4 className="font-bold text-emerald-800 mb-2">Appointment Summary</h4>
                  <div className="space-y-1 text-sm text-emerald-700">
                    <p><strong>Pet:</strong> {selectedPetData.name} ({selectedPetData.species})</p>
                    <p><strong>Owner:</strong> {users[selectedPetData.ownerUid]}</p>
                    <p><strong>Doctor:</strong> {selectedDoctorData.name}</p>
                    <p><strong>Date:</strong> {selectedDate}</p>
                    <p><strong>Time:</strong> {selectedTime}</p>
                    <p><strong>Type:</strong> {appointmentType}</p>
                    <p><strong>Mode:</strong> {appointmentMode === 'walk-in' ? 'Walk-in' : 'Scheduled'}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/crm/appointments')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loading || !selectedDoctor || !selectedTime || (!selectedPet && !showNewPetForm)}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {isEdit ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEdit ? 'Update Appointment' : 'Create Appointment'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Pet Dialog for creating new pets */}
        <PetDialog
          open={isPetDialogOpen}
          onOpenChange={setIsPetDialogOpen}
          mode="add"
          users={users}
          onSubmit={handleNewPetFromDialog}
          onCancel={() => setIsPetDialogOpen(false)}
        />
      </form>
    </div>
  );
}
