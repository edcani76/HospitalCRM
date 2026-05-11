import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { User, Stethoscope, Scissors, FlaskConical, Plus, Search, X, Trash2, AlertTriangle, ClipboardList, Check } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { format, startOfToday, isBefore, parse } from 'date-fns';
import { db, auth, collection, getDocs, query, where, serverTimestamp, arrayUnion } from '../../firebase';
import { createDocument, updateDocument } from '../../lib/firestore-helpers';
import { uploadToGoogleDrive } from '../../lib/google-drive';
import { notifyDoctor, notifyClient } from '../../lib/notifications';
import { Doctor, Pet, Appointment } from '../../types';
import PetDialog from '../../components/crm/pet-dialog';

export default function CreateAppointmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as any)?.prefill as (Appointment & { originalId?: string }) | undefined;
  const isEdit = (location.state as any)?.isEdit || false;

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [groomers, setGroomers] = useState<Doctor[]>([]);
  const [labTechs, setLabTechs] = useState<Doctor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [users, setUsers] = useState<{ [uid: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const [selectedPet, setSelectedPet] = useState<string>('');
  const [petSearchTerm, setPetSearchTerm] = useState('');
  const [isPetDialogOpen, setIsPetDialogOpen] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');

  const [activeTab, setActiveTab] = useState(0);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [showServiceSelector, setShowServiceSelector] = useState(false);

  const [appointments, setAppointments] = useState<Array<{
    id: string;
    services: Array<{ type: string; notes: string; labCenter?: string }>;
    providerId: string;
    providerName: string;
    department: 'doctor' | 'grooming' | 'laboratory';
    date: string;
    time: string;
    mode: 'scheduled' | 'walk-in';
    status: 'unconfirmed' | 'confirmed';
    existingAppointments: Appointment[];
  }>>([]);

  const [showInTabSelector, setShowInTabSelector] = useState(false);
  const [showNewTabSelector, setShowNewTabSelector] = useState(!isEdit);

  // Service types grouped by department
  const doctorServices = [
    { value: 'consultation', label: 'Consultation', icon: Stethoscope },
    { value: 'vaccination', label: 'Vaccination', icon: Stethoscope },
    { value: 'procedure', label: 'Procedure', icon: Stethoscope },
    { value: 'emergency', label: 'Emergency', icon: Stethoscope },
    { value: 'follow-up', label: 'Follow-up', icon: Stethoscope },
    { value: 'other', label: 'Other', icon: Stethoscope },
  ];

  const groomingServices = [
    { value: 'grooming', label: 'Grooming', icon: Scissors },
  ];

  const laboratoryServices = [
    { value: 'laboratory', label: 'Laboratory', icon: FlaskConical },
  ];

   // Normalize time slot to consistent format (e.g., "8:00 AM")
   const normalizeTimeSlot = (time: string): string => {
     if (!time) return '';
     const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
     if (!match) return time;
     let [_, hourStr, minStr, ampm] = match;
     let hour = parseInt(hourStr);
     if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
     if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
     const h = hour > 12 ? hour - 12 : hour;
     const finalAmpm = hour >= 12 ? 'PM' : 'AM';
     return `${h}:${minStr} ${finalAmpm}`;
   };

   // Get time slots for a specific doctor and date
   const getTimeSlotsForDoctor = (doctorId: string, date: string): string[] => {
     const doctor = doctors.find(d => d.id === doctorId);
     if (!doctor?.availability) return []; // No availability set

     // New format: availability is an object with day-of-week keys
     if (typeof doctor.availability[0] === 'object' || doctor.availability.length === 0) {
       const availabilityObj = doctor.availability as unknown as { [key: string]: string[] };
       const dayOfWeek = format(new Date(date), 'i'); // '1' = Monday, '7' = Sunday (ISO)
       const dayKey = dayOfWeek === '7' ? '0' : dayOfWeek; // Convert to 0=Sunday format
       return (availabilityObj[dayKey] || []).map(s => normalizeTimeSlot(s));
     }

     // Old format: availability is a flat array (same for all days)
     return (doctor.availability as string[]).map(s => normalizeTimeSlot(s));
   };

  // Check if a time slot is in the past
  const isTimeSlotPast = (date: string, time: string): boolean => {
    if (!date || !time) return false;
    try {
      const slotDateTime = parse(`${date} ${time}`, 'yyyy-MM-dd hh:mm a', new Date());
      return isBefore(slotDateTime, new Date());
    } catch {
      return false;
    }
  };

  // Get slot status including past check and blocked dates
  const getSlotStatus = (apt: typeof appointments[0], time: string): 'available' | 'past' | 'unavailable' | 'unconfirmed' | 'confirmed' | 'cancelled' => {
    if (!apt.providerId || !apt.date) return 'available';

    // Check if time slot is in the past
    if (isTimeSlotPast(apt.date, time)) return 'past';

    // Check if doctor has this slot available in their weekly schedule
    const doctor = doctors.find(d => d.id === apt.providerId);
    if (doctor?.availability) {
      const avail = getTimeSlotsForDoctor(apt.providerId, apt.date);
      if (!avail.includes(time)) return 'unavailable';
    }

    // Check existing appointments
    const existing = apt.existingAppointments.find(a => a.time === time);
    if (!existing) return 'available';
    if (existing.status === 'cancelled') return 'available';
    if (isEdit && apt.time === time && existing.id === prefill?.originalId) return 'available';
    return existing.status as any;
  };

  useEffect(() => {
    fetchDoctors();
    fetchGroomers();
    fetchLabTechs();
    fetchPets();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (prefill && doctors.length > 0 && pets.length > 0) {
      setSelectedPet(prefill.petId || '');
      let dept: 'doctor' | 'grooming' | 'laboratory' = 'doctor';
      if (groomers.some(g => g.id === prefill.doctorId)) dept = 'grooming';
      if (labTechs.some(l => l.id === prefill.doctorId)) dept = 'laboratory';

      const notesText = prefill.notes || '';
      const typeMatches = [...notesText.matchAll(/Type:\s*(\w+)(?:\n\s*Notes:\s*(.+?))?(?:\n\s*Lab Center:\s*(.+?))?(?=\nType:|$)/gi)];
      const services = typeMatches.map(match => ({
        type: match[1].toLowerCase(),
        notes: match[2] ? match[2].trim() : '',
        labCenter: match[3] ? match[3].trim() : undefined,
      }));

      const modeMatch = notesText.match(/Mode:\s*(\w+)/i);
      const mode = (modeMatch && modeMatch[1].toLowerCase() === 'walk-in') ? 'walk-in' as const : 'scheduled' as const;
      const status = prefill.status === 'confirmed' ? 'confirmed' as const : 'unconfirmed' as const;

      const modeIndex = notesText.indexOf('Mode:');
      let generalNotesText = '';
      if (modeIndex !== -1) {
        const afterMode = notesText.substring(modeIndex);
        const modeLineEnd = afterMode.indexOf('\n');
        if (modeLineEnd !== -1) generalNotesText = afterMode.substring(modeLineEnd).trim();
      }
      setGeneralNotes(generalNotesText);

      setAppointments([{
        id: Date.now().toString(),
        services: services.length > 0 ? services : [{ type: 'consultation', notes: '', labCenter: undefined }],
        providerId: prefill.doctorId || '',
        providerName: prefill.doctorName || '',
        department: dept,
        date: prefill.date || format(startOfToday(), 'yyyy-MM-dd'),
        time: prefill.time || '',
        mode,
        status,
        existingAppointments: [],
      }]);
      setShowServiceSelector(false);
    }
  }, [prefill, doctors, pets, groomers, labTechs]);

  const fetchDoctors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'doctors'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), department: 'doctor' } as Doctor));
      setDoctors(data);
    } catch (error) { console.error('Error fetching doctors:', error); }
  };

  const fetchGroomers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'staff'));
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(s => s.role === 'groomer' || s.department?.toLowerCase() === 'grooming')
        .map(s => ({ ...s, department: 'grooming' }));
      setGroomers(data);
    } catch (error) { console.error('Error fetching groomers:', error); }
  };

  const fetchLabTechs = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'staff'));
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(s => s.role === 'lab' || s.department?.toLowerCase() === 'laboratory')
        .map(s => ({ ...s, department: 'laboratory' }));
      setLabTechs(data);
    } catch (error) { console.error('Error fetching lab techs:', error); }
  };

  const fetchPets = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'pets'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));
      setPets(data);
    } catch (error) { console.error('Error fetching pets:', error); }
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
    } catch (error) { console.error('Error fetching users:', error); }
  };

  const fetchExistingAppointments = async (providerId: string, date: string, aptIdx: number) => {
    if (!providerId || !date) return;
    try {
      const snapshot = await getDocs(collection(db, 'appointments'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      const filtered = data.filter(apt => apt.doctorId === providerId && apt.date === date);
      setAppointments(prev => prev.map((apt, idx) =>
        idx === aptIdx ? { ...apt, existingAppointments: filtered } : apt
      ));
    } catch (error) { console.error('Error fetching existing appointments:', error); }
  };

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

  const selectedPetData = pets.find(p => p.id === selectedPet);

  const handleNewPetFromDialog = async (formData: any) => {
    try {
      let imageUrl = '';
      if (formData.photoFile) {
        const ownerName = formData.ownerName || users[formData.ownerUid] || 'Unknown';
        const result = await uploadToGoogleDrive(formData.photoFile, {
          ownerName,
          petName: formData.name,
          fileType: 'photos',
        });
        imageUrl = result.downloadUrl || result.webViewLink;
      }

      // Check for duplicate pet name under same owner
      if (formData.ownerUid) {
        const dupQuery = query(
          collection(db, 'pets'),
          where('ownerUid', '==', formData.ownerUid),
          where('name', '==', formData.name.trim())
        );
        const dupSnap = await getDocs(dupQuery);
        if (!dupSnap.empty) {
          alert(`A pet named "${formData.name}" already exists for this owner.`);
          return;
        }
      }

      const petId = await createDocument('pets', {
        name: formData.name, species: formData.species, breed: formData.breed,
        ownerUid: formData.ownerUid, weight: formData.weight || 0,
        dateOfBirth: formData.dateOfBirth || '', gender: formData.gender || '',
        bloodType: formData.bloodType || 'Unknown', color: formData.color || '',
        imageUrl, currentStatus: 'active',
        createdAt: new Date().toISOString()
      });
      fetchPets();
      setSelectedPet(petId);
      setIsPetDialogOpen(false);
    } catch (error) { console.error('Error creating pet:', error); alert('Failed to create pet.'); }
  };

  const addServiceToTab = (serviceType: string) => {
    const dept = appointments[activeTab]?.department;
    setAppointments(prev => prev.map((apt, idx) => {
      if (idx !== activeTab) return apt;
      return {
        ...apt,
        services: [...apt.services, { type: serviceType, notes: '', labCenter: undefined }],
        // Update department if adding service from different dept
        department: dept === 'grooming' && serviceType !== 'grooming' ? 'doctor' as const :
                    dept === 'laboratory' && serviceType !== 'laboratory' ? 'doctor' as const : apt.department
      };
    }));
  };

  const removeServiceFromTab = (serviceIdx: number) => {
    setAppointments(prev => prev.map((apt, idx) => {
      if (idx !== activeTab) return apt;
      return { ...apt, services: apt.services.filter((_, i) => i !== serviceIdx) };
    }));
  };

  const updateServiceInTab = (serviceIdx: number, updates: any) => {
    setAppointments(prev => prev.map((apt, idx) => {
      if (idx !== activeTab) return apt;
      const newServices = [...apt.services];
      newServices[serviceIdx] = { ...newServices[serviceIdx], ...updates };
      return { ...apt, services: newServices };
    }));
  };

  const removeAppointment = (idx: number) => {
    setAppointments(prev => prev.filter((_, i) => i !== idx));
    if (activeTab >= appointments.length - 1) setActiveTab(Math.max(0, appointments.length - 2));
    setDeleteConfirmIdx(null);
  };

  const updateAppointment = (idx: number, updates: any) => {
    setAppointments(prev => prev.map((apt, i) => i === idx ? { ...apt, ...updates } : apt));
  };

  const getProviders = (dept: string) => {
    if (dept === 'grooming') return groomers;
    if (dept === 'laboratory') return labTechs;
    return doctors;
  };

  const getServicesForDept = (dept: string) => {
    if (dept === 'grooming') return groomingServices;
    if (dept === 'laboratory') return laboratoryServices;
    return doctorServices;
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet) { alert('Please select a pet'); return; }
    if (appointments.length === 0) { alert('Please add at least one appointment'); return; }
    const invalid = appointments.some(a => !a.providerId || !a.time || a.services.length === 0);
    if (invalid) { alert('Please complete all appointment details (provider, time slot, and services)'); return; }

    setLoading(true);
    try {
      const pet = pets.find(p => p.id === selectedPet);
      const petName = pet?.name || '';
      const clientUid = pet?.ownerUid || '';

      if (isEdit && prefill?.originalId) {
        const userUid = auth.currentUser?.uid || 'unknown';
        const apt = appointments[0];
        const servicesText = apt.services.map(s =>
          `Type: ${s.type}${s.notes ? `\n  Notes: ${s.notes}` : ''}${s.labCenter ? `\n  Lab Center: ${s.labCenter}` : ''}`
        ).join('\n');
        await updateDocument('appointments', prefill.originalId, {
          doctorId: apt.providerId, doctorName: apt.providerName,
          date: apt.date, time: apt.time,
          notes: `${servicesText}\nMode: ${apt.mode}${generalNotes ? `\n${generalNotes}` : ''}`.trim(),
          updatedAt: serverTimestamp(),
          audit: arrayUnion({ action: 'edited', userId: userUid, timestamp: new Date().toISOString() })
        });
        await notifyDoctor(apt.providerId, 'appointment_updated', 'Appointment Updated',
          `Appointment for ${petName} has been updated to ${apt.date} at ${apt.time}`);
        if (clientUid) await notifyClient(clientUid, 'appointment_updated', 'Appointment Updated',
          `Your appointment for ${petName} has been updated to ${apt.date} at ${apt.time}`);
      } else {
        for (const apt of appointments) {
          const servicesText = apt.services.map(s =>
            `Type: ${s.type}${s.notes ? `\n  Notes: ${s.notes}` : ''}${s.labCenter ? `\n  Lab Center: ${s.labCenter}` : ''}`
          ).join('\n');
          await createDocument('appointments', {
            clientUid, petId: selectedPet, petName,
            doctorId: apt.providerId, doctorName: apt.providerName,
            date: apt.date, time: apt.time, status: apt.status,
            notes: `${servicesText}\nMode: ${apt.mode}${generalNotes ? `\n${generalNotes}` : ''}`.trim(),
            createdAt: serverTimestamp()
          });
          await notifyDoctor(apt.providerId, 'new_appointment', 'New Appointment',
            `${petName}: ${apt.services[0].type} on ${apt.date} at ${apt.time}`);
        }
        if (clientUid) await notifyClient(clientUid, 'appointment_created', 'Appointment Confirmed',
          `Your appointment(s) for ${petName} on ${appointments[0]?.date} have been scheduled.`);
      }
      navigate('/crm/appointments', { replace: true });
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      alert(`Failed to ${isEdit ? 'update' : 'create'} appointment: ${error.message || error}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 px-2 sm:px-0">
      <PageHeader
        title={isEdit ? 'Edit Appointment' : 'Create New Appointment'}
        backText={location.state?.backText || 'Back'}
      />

      <form onSubmit={handleCreateAppointment}>
        {/* Pet Selection */}
        <Card className="mb-4">
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-emerald-600" />{isEdit ? 'Patient / Pet (Locked)' : 'Select Patient / Pet'}</CardTitle></CardHeader>
          <CardContent>
            {isEdit && selectedPetData ? (
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="font-medium">{selectedPetData.name}</p>
                <p className="text-xs text-emerald-700">{selectedPetData.species} - {selectedPetData.breed}</p>
                <p className="text-xs text-emerald-600">Owner: {users[selectedPetData.ownerUid] || 'Unknown'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-800">Select Existing Pet</h4>
                  <Button type="button" size="sm" onClick={() => setIsPetDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-1" /> New Pet
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input placeholder="Search pets..." value={petSearchTerm} onChange={e => setPetSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 border border-stone-200 rounded-lg p-2">
                  {filteredPets.length === 0 ? (
                    <p className="text-center text-stone-500 py-4">No pets found</p>
                  ) : filteredPets.map(pet => (
                    <button key={pet.id} type="button" onClick={() => setSelectedPet(pet.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${selectedPet === pet.id ? 'bg-emerald-50 border-emerald-300' : 'border-stone-200 hover:bg-stone-50'}`}>
                      <div className="flex justify-between items-start">
                        <div><p className="font-medium">{pet.name}</p><p className="text-xs text-stone-500">{pet.species} - {pet.breed}</p><p className="text-xs text-stone-400">Owner: {users[pet.ownerUid] || 'Unknown'}</p></div>
                        {selectedPet === pet.id && <Badge variant="success">Selected</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Tabs */}
        {appointments.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1 border-b border-stone-200 overflow-x-auto">
              {appointments.map((apt, idx) => {
                const firstService = apt.services[0];
                const isActive = activeTab === idx;
                const tabLabel = `${idx + 1} - ${doctorServices.concat(groomingServices).concat(laboratoryServices).find(s => s.value === firstService?.type)?.label || firstService?.type || 'Service'}`;
                return (
                  <div key={apt.id} className={`flex items-center gap-1 px-3 py-2 border-b-2 transition-colors ${isActive ? 'border-blue-600 bg-blue-50' : 'border-transparent hover:bg-stone-50'}`}>
                    <button type="button" onClick={() => setActiveTab(idx)} className={`text-sm font-medium whitespace-nowrap ${isActive ? 'text-blue-700' : 'text-stone-600'}`}>
                      {tabLabel}
                    </button>
                    <button type="button" onClick={() => setDeleteConfirmIdx(idx)} className="ml-1 text-stone-400 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {deleteConfirmIdx !== null && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-sm text-red-800">Delete Appointment {deleteConfirmIdx + 1}?</span></div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setDeleteConfirmIdx(null)} className="h-7 text-xs">Cancel</Button>
                  <Button type="button" size="sm" onClick={() => removeAppointment(deleteConfirmIdx)} className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white">Delete</Button>
                </div>
              </div>
            )}

            {/* Active Tab Content */}
            {(() => {
              const apt = appointments[activeTab];
              if (!apt) return null;
              const providers = getProviders(apt.department);
              return (
                <Card className="mt-4 border-emerald-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {apt.department === 'grooming' ? <Scissors className="w-4 h-4 text-emerald-600" /> :
                       apt.department === 'laboratory' ? <FlaskConical className="w-4 h-4 text-emerald-600" /> :
                       <Stethoscope className="w-4 h-4 text-emerald-600" />}
                      Appointment {activeTab + 1} - {apt.services.length} Service(s)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Provider */}
                    <div>
                      <Label>Provider ({apt.department})</Label>
                      <Select value={apt.providerId} onValueChange={(val) => {
                        const provider = providers.find(p => p.id === val);
                        updateAppointment(activeTab, { providerId: val, providerName: provider?.name || '' });
                        fetchExistingAppointments(val, apt.date, activeTab);
                      }}>
                        <SelectTrigger><SelectValue placeholder={`Select ${apt.department}`} /></SelectTrigger>
                        <SelectContent>{providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    {/* Date */}
                    <div>
                      <Label>Date</Label>
                      <Input type="date" value={apt.date} onChange={e => {
                        updateAppointment(activeTab, { date: e.target.value });
                        if (apt.providerId) fetchExistingAppointments(apt.providerId, e.target.value, activeTab);
                      }} min={format(startOfToday(), 'yyyy-MM-dd')} />
                    </div>

                      {/* Time Slots Grid */}
                      <div>
                        <Label>Available Time Slots</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                          {(() => {
                            // Get available slots from doctor's schedule
                            const availableSlots = getTimeSlotsForDoctor(apt.providerId, apt.date);
                            // Always include the pre-filled time slot if it's not already in the list
                            const allSlots = apt.time && !availableSlots.includes(normalizeTimeSlot(apt.time))
                              ? [...availableSlots, apt.time].sort((a, b) => {
                                  const timeToMinutes = (t: string) => {
                                    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
                                    if (!match) return 0;
                                    let [, h, m, ap] = match;
                                    let hour = parseInt(h);
                                    if (ap.toUpperCase() === 'PM' && hour !== 12) hour += 12;
                                    if (ap.toUpperCase() === 'AM' && hour === 12) hour = 0;
                                    return hour * 60 + parseInt(m);
                                  };
                                  return timeToMinutes(a) - timeToMinutes(b);
                                })
                              : availableSlots;
                            
                            return allSlots.map(time => {
                              const status = getSlotStatus(apt, time) as any;
                              const normalizedTime = normalizeTimeSlot(time);
                              const normalizedAptTime = normalizeTimeSlot(apt.time);
                              const isSelected = normalizedAptTime === normalizedTime;
                              const isPast = status === 'past';
                              const isBooked = status === 'confirmed' || status === 'unconfirmed';
                              
                              let btnClass = 'p-2 rounded-lg border text-sm font-medium transition-all relative ';
                              if (isPast) btnClass += 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed';
                              else if (isSelected) btnClass += 'bg-emerald-600 text-white border-emerald-600 border-2 border-emerald-800';
                              else if (status === 'confirmed') btnClass += 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed';
                              else if (status === 'unconfirmed') btnClass += 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100';
                              else btnClass += 'bg-white border-stone-200 text-stone-700 hover:bg-emerald-50 hover:border-emerald-300';
                              
                              return (
                                  <button
                                    key={time}
                                    type="button"
                                    disabled={isPast || (isBooked && status !== 'available')}
                                    onClick={() => ((status as string) === 'available' || (status as string) === 'unconfirmed') && updateAppointment(activeTab, { time })}
                                    className={btnClass}
                                  >
                                    {time}
                                    {isSelected && <Check className="absolute top-1 right-1 w-3 h-3" />}
                                  </button>
                              );
                            });
                          })()}
                        </div>
                      {(!apt.providerId || getTimeSlotsForDoctor(apt.providerId, apt.date).length === 0) && (
                        <p className="text-xs text-stone-500 mt-1">Select a provider and date to see available slots</p>
                      )}
                      {apt.existingAppointments.some(a => a.status === 'unconfirmed') && (
                        <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full" /> Yellow = Unconfirmed</p>
                      )}
                      {apt.existingAppointments.some(a => a.status === 'confirmed') && (
                        <p className="text-xs text-stone-500 mt-1 flex items-center gap-1"><span className="w-2 h-2 bg-stone-400 rounded-full" /> Gray = Booked</p>
                      )}
                    </div>

                    {/* Services Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Services</Label>
                        <Button type="button" size="sm" variant="outline" onClick={() => setShowInTabSelector(true)}
                          className="border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50">
                          <Plus className="w-3 h-3 mr-1" /> Add Service
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {apt.services.map((service, sIdx) => (
                          <div key={sIdx} className="p-3 border rounded-lg bg-gray-50/50">
                            <div className="flex items-center gap-2 mb-2">
                              <Select value={service.type} onValueChange={(val) => updateServiceInTab(sIdx, { type: val })}>
                                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {getServicesForDept(apt.department).map(s => (
                                    <SelectItem key={s.value} value={s.value}>
                                      <div className="flex items-center gap-2"><s.icon className="w-4 h-4" />{s.label}</div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {apt.services.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeServiceFromTab(sIdx)}
                                  className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></Button>
                              )}
                            </div>
                            {service.type === 'laboratory' && (
                              <Input value={service.labCenter || ''} onChange={e => updateServiceInTab(sIdx, { labCenter: e.target.value })}
                                placeholder="Laboratory Center" className="mb-2" />
                            )}
                            <Textarea value={service.notes} onChange={e => updateServiceInTab(sIdx, { notes: e.target.value })}
                              placeholder={`Notes for ${service.type}...`} rows={2} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Service Selector */}
                    {showInTabSelector && (
                      <Card className="border-dashed border-2 border-emerald-300 relative">
                        <button
                          type="button"
                          onClick={() => setShowInTabSelector(false)}
                          className="absolute top-2 right-2 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-emerald-800 mb-2">Add Service for {apt.department}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {getServicesForDept(apt.department).map(s => (
                              <Button key={s.value} type="button" variant="outline" size="sm"
                                onClick={() => { addServiceToTab(s.value); setShowInTabSelector(false); }}
                                className="flex items-center gap-1 border-emerald-200 hover:bg-emerald-50">
                                <s.icon className="w-4 h-4" />{s.label}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Mode */}
                    <div>
                      <Label>Appointment Mode</Label>
                      <div className="flex gap-2 mt-2">
                        <Button type="button" variant={apt.mode === 'scheduled' ? 'default' : 'outline'} onClick={() => updateAppointment(activeTab, { mode: 'scheduled' })}
                          className={apt.mode === 'scheduled' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>Scheduled</Button>
                        <Button type="button" variant={apt.mode === 'walk-in' ? 'default' : 'outline'} onClick={() => updateAppointment(activeTab, { mode: 'walk-in' })}
                          className={apt.mode === 'walk-in' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>Walk-in</Button>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <Label>Status</Label>
                      <div className="flex gap-2 mt-2">
                        <Button type="button" variant={apt.status === 'unconfirmed' ? 'default' : 'outline'} onClick={() => updateAppointment(activeTab, { status: 'unconfirmed' })}
                          className={apt.status === 'unconfirmed' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}>Unconfirmed</Button>
                        <Button type="button" variant={apt.status === 'confirmed' ? 'default' : 'outline'} onClick={() => updateAppointment(activeTab, { status: 'confirmed' })}
                          className={apt.status === 'confirmed' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>Confirmed</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}

        {/* Add Service Button (creates new tab) */}
        {showNewTabSelector ? (
          <Card className="border-dashed border-2 border-emerald-300 relative">
            <button
              type="button"
              onClick={() => setShowNewTabSelector(false)}
              className="absolute top-2 right-2 text-stone-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-emerald-800 mb-3">Select Service Type for New Tab</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {doctorServices.concat(groomingServices).concat(laboratoryServices).map(s => (
                  <Button key={s.value} type="button" variant="outline" onClick={() => {
                    const dept = s.value === 'grooming' ? 'grooming' as const : s.value === 'laboratory' ? 'laboratory' as const : 'doctor' as const;
                    setAppointments([...appointments, {
                      id: Date.now().toString(),
                      services: [{ type: s.value, notes: '', labCenter: undefined }],
                      providerId: '', providerName: '', department: dept,
                      date: format(startOfToday(), 'yyyy-MM-dd'), time: '', mode: 'scheduled' as const, status: 'unconfirmed' as const,
                      existingAppointments: []
                    }]);
                    setActiveTab(appointments.length);
                    setShowNewTabSelector(false);
                  }}
                    className="flex flex-col items-center gap-1 h-auto py-3 border-emerald-200 hover:bg-emerald-50">
                    <s.icon className="w-5 h-5 text-emerald-600" /><span className="text-xs">{s.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button type="button" variant="outline" onClick={() => setShowNewTabSelector(true)}
            className="w-full border-dashed border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50 py-6">
            <Plus className="w-5 h-5 mr-2" /> Add Service (New Tab)
          </Button>
        )}

        {/* Appointment Summary */}
        {appointments.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <ClipboardList className="w-4 h-4" />
                Appointment Summary ({appointments.length} service group{appointments.length > 1 ? 's' : ''})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointments.map((apt, idx) => {
                const provider = doctors.find(d => d.id === apt.providerId);
                const serviceLabels = apt.services.map(s =>
                  doctorServices.concat(groomingServices).concat(laboratoryServices).find(ds => ds.value === s.type)?.label || s.type
                ).join(', ');

                // Check readiness
                const missingFields: string[] = [];
                if (!selectedPet) missingFields.push('Patient');
                if (!apt.providerId) missingFields.push('Provider');
                if (!apt.date) missingFields.push('Date');
                if (!apt.time) missingFields.push('Time');
                if (apt.department === 'laboratory' && apt.services.some(s => !s.labCenter)) missingFields.push('Lab Center');

                const isReady = missingFields.length === 0;
                const isOrange = missingFields.length <= 2;
                const statusColor = isReady ? 'border-emerald-500 bg-emerald-50' : (isOrange ? 'border-orange-400 bg-orange-50' : 'border-red-500 bg-red-50');
                const textColor = isReady ? 'text-emerald-900' : (isOrange ? 'text-orange-900' : 'text-red-900');
                const subtextColor = isReady ? 'text-emerald-700' : (isOrange ? 'text-orange-700' : 'text-red-700');
                const statusBadge = isReady ? '✓ Ready' : `⚠ Missing: ${missingFields.join(', ')}`;

                return (
                  <div key={apt.id} className={`rounded-lg p-3 border-2 ${statusColor}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${textColor}`}>Group {idx + 1} - {serviceLabels}</p>
                          <Badge variant={isReady ? 'success' : 'warning'} className="text-xs">{statusBadge}</Badge>
                        </div>
                        <div className={`text-sm mt-1 space-y-0.5 ${subtextColor}`}>
                          <p>Patient: {selectedPetData?.name || 'Not selected'}</p>
                          <p>Provider: {apt.providerName || (provider ? provider.name : 'Not selected')}</p>
                          <p>Date: {apt.date || 'Not set'}</p>
                          <p>Time: {apt.time || 'Not set'}</p>
                          <p>Mode: {apt.mode} | Status: {apt.status}</p>
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setActiveTab(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={textColor}>
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* General Notes */}
        <Card>
          <CardContent className="p-4">
            <Label>General Notes</Label>
            <Textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} placeholder="Overall notes, symptoms, special instructions..." rows={3} />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/crm/appointments')} disabled={loading}>Cancel</Button>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading || appointments.length === 0 || !selectedPet}>
            {loading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />{isEdit ? 'Updating...' : 'Creating...'}</>) : (isEdit ? 'Update Appointment' : 'Create Appointment')}
          </Button>
        </div>
      </form>

      <PetDialog open={isPetDialogOpen} onOpenChange={setIsPetDialogOpen} mode="add" users={users}
        onSubmit={handleNewPetFromDialog} onCancel={() => setIsPetDialogOpen(false)} />
    </div>
  );
}
