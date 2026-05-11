import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db, doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Doctor, Pet } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, User, Stethoscope, ArrowRight, CheckCircle, AlertCircle, Plus, ChevronLeft, ChevronRight, PawPrint } from 'lucide-react';
import { format, addDays, startOfToday, getDay, isToday, isBefore, isSameDay, startOfDay } from 'date-fns';
import { Calendar } from '../components/ui/calendar';
import PetDialog from '../components/crm/pet-dialog';
import { uploadToGoogleDrive } from '../lib/google-drive';
import { ServiceSelector } from '../components/ServiceSelector';
import { PageHeader } from '../components/ui/page-header';
import { Breadcrumb } from '../components/ui/breadcrumb';

export default function BookAppointment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorIndex, setDoctorIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(addDays(startOfToday(), 1));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isPetDialogOpen, setIsPetDialogOpen] = useState(false);
  const [isSubmittingPet, setIsSubmittingPet] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<any[]>([]);

  const doctor = doctors[doctorIndex] || null;
  const isAnyDoctor = doctor?.id === 'any';

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'doctors'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
        const anyDoctor: Doctor = {
          id: 'any',
          name: 'Any Available Doctor',
          specialization: 'First Available Veterinarian',
          department: 'General Practice',
          experience: 0,
          image: 'https://ui-avatars.com/api/?name=Any+Doctor&background=10b981&color=fff&size=400&font-size=0.33&bold=true',
        };
        setDoctors([anyDoctor, ...data]);
      } catch (err) {
        console.error('Failed to fetch doctors:', err);
        const mockDoctors: Doctor[] = [
          { id: 'any', name: 'Any Available Doctor', specialization: 'First Available Veterinarian', department: 'General Practice', experience: 0, image: 'https://ui-avatars.com/api/?name=Any+Doctor&background=10b981&color=fff&size=400&font-size=0.33&bold=true' },
          { id: '1', name: 'Dr. Sarah Johnson', specialization: 'Veterinary Cardiologist', department: 'Diagnostic Medicine', experience: 12, image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400' },
          { id: '2', name: 'Dr. Michael Chen', specialization: 'Emergency Veterinarian', department: 'After-Hours Emergency Care', experience: 15, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400' },
          { id: '3', name: 'Dr. Emily Rodriguez', specialization: 'Preventive Care Vet', department: 'Preventive Care', experience: 8, image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400' },
          { id: '4', name: 'Dr. James Wilson', specialization: 'Veterinary Surgeon', department: 'Surgery', experience: 20, image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400' },
          { id: '5', name: 'Dr. Lisa Park', specialization: 'Exotic Animal Vet', department: 'Avian and Exotic Pet Care', experience: 10, image: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400' },
          { id: '6', name: 'Dr. David Miller', specialization: 'Rehabilitation Specialist', department: 'Therapy and Rehabilitation', experience: 18, image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400' },
        ];
        setDoctors(mockDoctors);
      } finally {
        setLoading(false);
      }
    };

    const fetchPets = async () => {
      if (user) {
        const q = query(collection(db, 'pets'), where('ownerUid', '==', user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));
        setPets(data);
        if (data.length > 0) {
          setSelectedPetId(data[0].id);
        }
      }
    };

    const fetchCatalog = async () => {
      try {
        const q = query(collection(db, 'service_catalog'), where('active', '==', true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServiceCatalog(data);
        
        const consultation = data.find((s: any) => s.category === 'consultation');
        if (consultation) {
          setSelectedServices([consultation.id]);
        }
      } catch (err) {
        console.error('Failed to load service catalog:', err);
      }
    };

    fetchDoctors();
    if (user) fetchPets();
    fetchCatalog();
  }, [user]);

  useEffect(() => {
    if (doctors.length > 0 && !loading) {
      const doctorId = searchParams.get('doctorId');
      if (doctorId) {
        const index = doctors.findIndex(d => d.id === doctorId);
        if (index !== -1) {
          setDoctorIndex(index);
        }
      }
    }
  }, [doctors, loading, searchParams]);

  useEffect(() => {
    if (!doctor || !selectedDate) {
      setAvailableSlots([]);
      setSelectedTime('');
      return;
    }

    const fetchAvailableSlots = async () => {
      setLoadingSlots(true);
      setSelectedTime('');

      try {
        const dateObj = new Date(selectedDate.toDateString());
        const dateStr = format(dateObj, 'yyyy-MM-dd');
        const dayOfWeek = getDay(dateObj);
        
        let slots: string[] = [];
        const defaultSlots = [
          '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
          '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
          '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
          '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
          '05:00 PM', '05:30 PM', '06:00 PM'
        ];
        
        if (isAnyDoctor) {
          slots = dayOfWeek >= 1 && dayOfWeek <= 5 ? [...defaultSlots] : [];
        } else if (doctor.availability && typeof doctor.availability === 'object' && !Array.isArray(doctor.availability) && '0' in doctor.availability) {
          slots = (doctor.availability as any)[dayOfWeek.toString()] || [];
        } else {
          slots = dayOfWeek >= 1 && dayOfWeek <= 5 ? [...defaultSlots] : [];
        }

        if (slots.length === 0) {
          setAvailableSlots([]);
          setLoadingSlots(false);
          return;
        }

        let bookedTimes: string[] = [];
        if (isAnyDoctor) {
          const allDoctors = doctors.filter(d => d.id !== 'any');
          const promises = allDoctors.map(d =>
            getDocs(query(collection(db, 'appointments'), where('doctorId', '==', d.id), where('date', '==', dateStr)))
          );
          const results = await Promise.all(promises);
          bookedTimes = results.flatMap(snapshot =>
            snapshot.docs
              .map(doc => doc.data())
              .filter(apt => apt.status !== 'cancelled')
              .map(apt => apt.time)
          );
        } else {
          const q = query(
            collection(db, 'appointments'),
            where('doctorId', '==', doctor.id),
            where('date', '==', dateStr)
          );
          const snapshot = await getDocs(q);
          bookedTimes = snapshot.docs
            .map(doc => doc.data())
            .filter(apt => apt.status !== 'cancelled')
            .map(apt => apt.time);
        }

        const available = slots.filter(slot => !bookedTimes.includes(slot));
        setAvailableSlots(available);
      } catch (err) {
        console.error('Failed to fetch available slots:', err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [doctor, selectedDate]);

  const navigateDoctor = (direction: 'prev' | 'next') => {
    if (doctors.length === 0) return;
    const newIndex = direction === 'next' 
      ? (doctorIndex + 1) % doctors.length
      : (doctorIndex - 1 + doctors.length) % doctors.length;
    setDoctorIndex(newIndex);
    setSelectedTime('');
  };

  const handleNewPetSubmit = async (formData: any) => {
    if (!user) {
      setIsSubmittingPet(false);
      return;
    }
    setIsSubmittingPet(true);
    try {
      let imageUrl = '';
      if (formData.photoFile) {
        const ownerName = user.displayName || user.email?.split('@')[0] || 'Unknown';
        const result = await uploadToGoogleDrive(formData.photoFile, {
          ownerName,
          petName: formData.name,
          fileType: 'photos',
        });
        imageUrl = result.downloadUrl || result.webViewLink;
      }

      // Check for duplicate pet name under same owner
      if (user) {
        const dupQuery = query(
          collection(db, 'pets'),
          where('ownerUid', '==', user.uid),
          where('name', '==', formData.name.trim())
        );
        const dupSnap = await getDocs(dupQuery);
        if (!dupSnap.empty) {
          alert(`A pet named "${formData.name}" already exists under your account.`);
          setIsSubmittingPet(false);
          return;
        }
      }

      const petRef = await addDoc(collection(db, 'pets'), {
        name: formData.name,
        species: formData.species,
        breed: formData.breed,
        ownerUid: user.uid,
        weight: formData.weight || 0,
        dateOfBirth: formData.dateOfBirth || '',
        gender: formData.gender || '',
        bloodType: formData.bloodType || 'Unknown',
        color: formData.color || '',
        microchipId: formData.microchipId || '',
        medicalHistory: formData.medicalHistory || '',
        imageUrl,
        currentStatus: 'active',
        createdAt: serverTimestamp()
      });

      const newPet = { id: petRef.id, ...formData, ownerUid: user.uid, currentStatus: 'active', imageUrl } as Pet;
      setPets(prev => [...prev, newPet]);
      setSelectedPetId(petRef.id);
      setIsPetDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to register pet:', err);
    } finally {
      setIsSubmittingPet(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    if (!selectedTime) {
      setError("Please select a time slot.");
      return;
    }
    if (!selectedPetId) {
      setError("Please select a pet for this visit.");
      return;
    }
    if (selectedServices.length === 0) {
      setError("Please select at least one service.");
      return;
    }

    setBooking(true);
    setError(null);

    try {
      if (!user) throw new Error("User not authenticated");

      const selectedPet = pets.find(p => p.id === selectedPetId);
      const selectedServiceNames = serviceCatalog
        .filter(s => selectedServices.includes(s.id))
        .map(s => s.name);

      let assignedDoctorId = doctor?.id || 'general';
      let assignedDoctorName = doctor?.name || 'Any Available Doctor';
      let assignedProviderId = doctor?.id || 'general';

      if (isAnyDoctor) {
        const allDoctors = doctors.filter(d => d.id !== 'any');
        for (const d of allDoctors) {
          const q = query(
            collection(db, 'appointments'),
            where('doctorId', '==', d.id),
            where('date', '==', dateStr),
            where('time', '==', selectedTime)
          );
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            assignedDoctorId = d.id;
            assignedDoctorName = d.name;
            assignedProviderId = d.id;
            break;
          }
        }
      }

      await addDoc(collection(db, 'appointments'), {
        clientUid: user.uid,
        petId: selectedPetId,
        petName: selectedPet?.name || 'Unknown Pet',
        doctorId: assignedDoctorId,
        doctorName: assignedDoctorName,
        date: dateStr,
        time: selectedTime,
        status: 'unconfirmed',
        notes: notes,
        services: selectedServices.map(id => ({
          catalogId: id,
          providerId: assignedProviderId,
        })),
        servicesText: `Services: ${selectedServiceNames.join(', ')}`,
        createdAt: serverTimestamp()
      });

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <PageHeader
          title="Visit Request"
          backTo="/dashboard"
          backText="Back to Dashboard"
        />
        <div className="text-center py-12 space-y-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"
        >
          <CheckCircle className="w-12 h-12" />
        </motion.div>
        <h1 className="text-3xl font-bold">Visit Request Successful!</h1>
        <p className="text-stone-500">Your visit with {doctor?.name} has been requested. You will be redirected to your dashboard shortly.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-emerald-600 font-bold flex items-center gap-2 mx-auto"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumb
        items={[
          { name: 'Dashboard', path: '/dashboard' },
          { name: 'Book Visit' },
        ]}
      />
      <PageHeader
        title="Book Visit"
        subtitle="Choose your preferred doctor, date, and time for your pet's consultation."
        backTo="/dashboard"
        backText="Back to Dashboard"
      />

      {/* Doctor Carousel */}
      <div className="mb-8" style={{ height: '360px' }}>
        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-emerald-600" />
          Select Your Doctor
        </h3>
        <div className="relative px-8" style={{ height: '280px' }}>
          {doctors.length > 1 && (
            <>
              <button
                onClick={() => navigateDoctor('prev')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateDoctor('next')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          
          <div className="overflow-hidden rounded-2xl" style={{ height: '280px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={doctorIndex}
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -300 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-full"
                style={{ height: '280px' }}
              >
                <div className="flex h-full" style={{ height: '280px' }}>
                  <div className="w-40 md:w-56 shrink-0">
                    <img 
                      src={doctor?.image} 
                      alt={doctor?.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 p-5 md:p-8 flex flex-col justify-center overflow-hidden" style={{ height: '280px' }}>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">{doctor?.name}</h2>
                          {isAnyDoctor && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full whitespace-nowrap shrink-0">Recommended</span>
                          )}
                        </div>
                        <p className="text-emerald-600 font-medium text-sm md:text-base line-clamp-1">{doctor?.specialization}</p>
                      </div>
                      <div className="flex items-center gap-5 py-3 border-y border-slate-100">
                        {!isAnyDoctor && (
                          <>
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Experience</p>
                              <p className="text-base font-bold text-slate-900">{doctor?.experience} Yrs</p>
                            </div>
                            <div className="w-px h-7 bg-slate-100" />
                          </>
                        )}
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Department</p>
                          <p className="text-base font-bold text-slate-900 line-clamp-1">{doctor?.department}</p>
                        </div>
                      </div>
                      {isAnyDoctor && (
                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                          Select this option to be matched with the first available veterinarian on your chosen date and time.
                        </p>
                      )}
                      {doctor?.bio && !isAnyDoctor && (
                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{doctor.bio}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Doctor indicator dots */}
        {doctors.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {doctors.map((_, index) => (
              <button
                key={index}
                onClick={() => { setDoctorIndex(index); setSelectedTime(''); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === doctorIndex ? 'bg-emerald-600 w-6' : 'bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Date & Time */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleBooking} className="bg-white p-8 rounded-2xl border border-slate-200 space-y-10">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Date Selection */}
            <div className="space-y-4">
              <label className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-600" />
                Select Date
              </label>
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={(date) => setSelectedDate(date)}
                minDate={startOfDay(startOfToday())}
              />
            </div>

            {/* Time Selection */}
            <div className="space-y-4">
              <label className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Available Time Slots
                {loadingSlots && (
                  <span className="text-xs font-normal text-slate-400 ml-2">Loading...</span>
                )}
              </label>
              {availableSlots.length === 0 && !loadingSlots ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-amber-700 font-medium text-sm">No available slots for this date</p>
                  <p className="text-amber-600/70 text-xs mt-1">Please select a different date or doctor</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`py-2.5 rounded-lg border text-sm font-bold transition-all ${
                          isSelected 
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
                            : "bg-slate-50 border-slate-100 hover:border-emerald-200 text-slate-600"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pet Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-bold flex items-center gap-2">
                  <PawPrint className="w-5 h-5 text-emerald-600" />
                  Select Pet
                </label>
                <button
                  type="button"
                  onClick={() => setIsPetDialogOpen(true)}
                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Register New Pet
                </button>
              </div>
              {pets.length === 0 ? (
                <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl text-sm border border-yellow-200 flex items-center justify-between">
                  <span>You don't have any registered pets yet.</span>
                  <button
                    type="button"
                    onClick={() => setIsPetDialogOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Register Pet
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select 
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 appearance-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                  >
                    <option value="" disabled>Choose your pet...</option>
                    {pets.map(pet => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species} - {pet.breed})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ArrowRight className="w-5 h-5 rotate-90" />
                  </div>
                </div>
              )}
            </div>

            {/* Services Selection */}
            <div className="space-y-4">
              <label className="text-lg font-bold flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
                Select Services
              </label>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-6">
                <ServiceSelector
                  selectedServices={selectedServices}
                  onChange={setSelectedServices}
                  providerId={doctor?.id}
                  requireConsultation={true}
                  showPrice={false}
                  hideCategories={['medication', 'supply']}
                  categoryOrder={['consultation', 'vaccination', 'procedure', 'diagnostic', 'lab', 'grooming']}
                />
              </div>
              <p className="text-xs text-slate-400">
                Consultation is always included. Select additional services as needed.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <label className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Reason for Visit (Optional)
              </label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for consultation..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 min-h-[100px] focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={booking}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all disabled:opacity-50"
            >
              {booking ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Confirm Visit Request <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Policy */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
            <h4 className="font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-emerald-400" />
              Visit Policy
            </h4>
            <ul className="text-sm text-slate-300 space-y-3 list-disc pl-4">
              <li>Please arrive 15 minutes before your scheduled time.</li>
              <li>Cancellations must be made at least 24 hours in advance.</li>
              <li>Bring your pet's vaccination history and any prior clinic records if applicable.</li>
            </ul>
          </div>

          {/* Selected Doctor Summary */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 space-y-4">
            <h4 className="font-bold text-emerald-900 text-sm uppercase">Your Selection</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img src={doctor?.image} alt={doctor?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{doctor?.name}</p>
                  <p className="text-xs text-slate-500">{doctor?.specialization}</p>
                </div>
              </div>
              {selectedDate && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CalendarIcon className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">{format(selectedDate, 'EEEE, MMM dd, yyyy')}</span>
                </div>
              )}
              {selectedTime && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">{selectedTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PetDialog
        open={isPetDialogOpen}
        onOpenChange={setIsPetDialogOpen}
        mode="add"
        users={{}}
        onSubmit={handleNewPetSubmit}
        onCancel={() => setIsPetDialogOpen(false)}
        isSubmitting={isSubmittingPet}
      />
    </div>
  );
}
