import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth, db, doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Doctor, Pet } from '../types';
import { motion } from 'motion/react';
import { Calendar, Clock, User, Stethoscope, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get('doctorId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(format(addDays(startOfToday(), 1), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  useEffect(() => {
    const fetchDoctor = async () => {
      if (!doctorId) {
        setDoctor(null);
        setLoading(false);
        return;
      }

      const docRef = doc(db, 'doctors', doctorId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setDoctor({ id: docSnap.id, ...docSnap.data() } as Doctor);
      } else {
        // Fallback for mock data if not in DB
        const mockDoctors: Doctor[] = [
          { id: '1', name: 'Dr. Sarah Johnson', specialization: 'Veterinary Cardiologist', department: 'Diagnostic Medicine', experience: 12, image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400' },
          { id: '2', name: 'Dr. Michael Chen', specialization: 'Emergency Veterinarian', department: 'After-Hours Emergency Care', experience: 15, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400' },
          { id: '3', name: 'Dr. Emily Rodriguez', specialization: 'Preventive Care Vet', department: 'Preventive Care', experience: 8, image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400' },
          { id: '4', name: 'Dr. James Wilson', specialization: 'Veterinary Surgeon', department: 'Surgery', experience: 20, image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400' },
          { id: '5', name: 'Dr. Lisa Park', specialization: 'Exotic Animal Vet', department: 'Avian and Exotic Pet Care', experience: 10, image: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400' },
          { id: '6', name: 'Dr. David Miller', specialization: 'Rehabilitation Specialist', department: 'Therapy and Rehabilitation', experience: 18, image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400' },
        ];
        const found = mockDoctors.find(d => d.id === doctorId);
        if (found) setDoctor(found);
      }
      setLoading(false);
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

    fetchDoctor();
    if (user) fetchPets();
  }, [doctorId, user]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) {
      setError("Please select a time slot.");
      return;
    }
    if (!selectedPetId) {
      setError("Please select a pet for this visit.");
      return;
    }

    setBooking(true);
    setError(null);

    try {
      if (!user) throw new Error("User not authenticated");

      const selectedPet = pets.find(p => p.id === selectedPetId);

      await addDoc(collection(db, 'appointments'), {
        clientUid: user.uid,
        petId: selectedPetId,
        petName: selectedPet?.name || 'Unknown Pet',
        doctorId: doctor?.id || 'general',
        doctorName: doctor?.name || 'Any Available Doctor',
        date: selectedDate,
        time: selectedTime,
        status: 'unconfirmed',
        notes: notes,
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
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
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
    );
  }

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
      {/* Doctor Info Card */}
      <div className="lg:col-span-1 space-y-8">
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden">
          <div className="aspect-square">
            <img 
              src={doctor?.image} 
              alt={doctor?.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="p-8 space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">{doctor?.name || 'Any Available Doctor'}</h2>
              <p className="text-emerald-600 font-medium">{doctor?.specialization || 'General Consultation'}</p>
            </div>
            <div className="flex items-center gap-4 py-4 border-y border-stone-100">
              <div className="text-center flex-1">
                <p className="text-xs text-stone-400 uppercase font-bold">Experience</p>
                <p className="text-lg font-bold text-stone-900">{doctor?.experience} Yrs</p>
              </div>
              <div className="w-px h-8 bg-stone-100" />
              <div className="text-center flex-1">
                <p className="text-xs text-stone-400 uppercase font-bold">Rating</p>
                <p className="text-lg font-bold text-stone-900">4.9/5</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-stone-400 uppercase font-bold">Service</p>
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                <Stethoscope className="w-3 h-3" />
                {doctor?.department}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-950 text-white p-8 rounded-3xl space-y-4">
          <h4 className="font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-emerald-400" />
            Visit Policy
          </h4>
          <ul className="text-sm text-emerald-100/70 space-y-2 list-disc pl-4">
            <li>Please arrive 15 minutes before your scheduled time.</li>
            <li>Cancellations must be made at least 24 hours in advance.</li>
            <li>Bring your pet's vaccination history and any prior clinic records if applicable.</li>
          </ul>
        </div>
      </div>

      {/* Booking Form */}
      <div className="lg:col-span-2 space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Book Visit</h1>
          <p className="text-stone-500">Select your preferred date and time for your pet's consultation.</p>
        </div>

        <form onSubmit={handleBooking} className="bg-white p-8 md:p-12 rounded-3xl border border-stone-200 space-y-10">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Date Selection */}
          <div className="space-y-6">
            <label className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Select Date
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(days => {
                const date = addDays(startOfToday(), days);
                const dateStr = format(date, 'yyyy-MM-dd');
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-4 rounded-2xl border transition-all text-center space-y-1 ${
                      isSelected 
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/20" 
                        : "bg-white border-stone-200 hover:border-emerald-200 text-stone-600"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase opacity-70">{format(date, 'EEE')}</p>
                    <p className="text-xl font-bold">{format(date, 'dd')}</p>
                    <p className="text-[10px] font-bold uppercase opacity-70">{format(date, 'MMM')}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-6">
            <label className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Select Time Slot
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {timeSlots.map(time => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                      isSelected 
                        ? "bg-emerald-600 border-emerald-600 text-white" 
                        : "bg-stone-50 border-stone-100 hover:border-emerald-200 text-stone-600"
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pet Selection */}
          <div className="space-y-4">
            <label className="text-lg font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Select Pet
            </label>
            {pets.length === 0 ? (
              <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl text-sm border border-yellow-200">
                You don't have any registered pets. Please contact the clinic.
              </div>
            ) : (
              <div className="relative">
                <select 
                  value={selectedPetId}
                  onChange={(e) => setSelectedPetId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-4 appearance-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                >
                  <option value="" disabled>Choose your pet...</option>
                  {pets.map(pet => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} ({pet.species} - {pet.breed})
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                  <ArrowRight className="w-5 h-5 rotate-90" />
                </div>
              </div>
            )}
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
              className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-6 min-h-[120px] focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={booking}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50"
          >
            {booking ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Confirm Visit Request <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
