import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, doc, setDoc, serverTimestamp, collection, addDoc, getDocs, query, where } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Lock, Phone, Dog, ChevronRight, CheckCircle, Hospital, ArrowLeft, Eye, EyeOff, Stethoscope } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface Doctor {
  uid: string;
  displayName: string;
}

export default function Signup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Step1: Owner Info
  const [ownerData, setOwnerData] = useState({
    name: '',
    email: '',
    phoneDigits: '',
    password: '',
    confirmPassword: '',
    createAccount: false
  });

  // Computed full phone number
  const fullPhone = '+63' + ownerData.phoneDigits;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step2: Pet Info
  const [petData, setPetData] = useState({
    name: '',
    species: 'Dog',
    breed: '',
    age: '',
    selectedDoctorId: '',
    selectedDoctorName: ''
  });

  // Doctors list
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Doctor availability
  const [doctorAvailability, setDoctorAvailability] = useState<{ [key: string]: string[] }>({});
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'doctor')));
        const docs = snapshot.docs.map(doc => ({
          uid: doc.id,
          displayName: doc.data().displayName || 'Doctor'
        } as Doctor));
        setDoctors(docs);
      } catch (err) {
        console.error('Error fetching doctors:', err);
      }
    };
    fetchDoctors();
  }, []);

  // Fetch doctor availability when selected doctor changes
  useEffect(() => {
    if (!petData.selectedDoctorId) {
      setDoctorAvailability({});
      setAvailableDates([]);
      setSelectedDate('');
      setSelectedTime('');
      return;
    }

    const fetchAvailability = async () => {
      try {
        const doctorSnap = await getDocs(query(collection(db, 'doctors'), where('uid', '==', petData.selectedDoctorId)));
        if (!doctorSnap.empty) {
          const doctorData = doctorSnap.docs[0].data();
          const avail = doctorData.availability || {};
          setDoctorAvailability(avail);

          // Calculate available dates in next 30 days
          const dates: string[] = [];
          const today = new Date();
          for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dayOfWeek = d.getDay(); // 0=Sunday, 1=Monday, etc.
            const dayKey = dayOfWeek.toString();
            const slots = avail[dayKey] || [];
            if (slots.length > 0) {
              dates.push(d.toISOString().split('T')[0]);
            }
          }
          setAvailableDates(dates);
        }
      } catch (err) {
        console.error('Error fetching doctor availability:', err);
      }
    };

    fetchAvailability();
  }, [petData.selectedDoctorId]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!ownerData.name || !ownerData.email || !ownerData.phoneDigits) {
        setError("Please fill in all required fields.");
        return;
      }
      if (ownerData.createAccount) {
        if (!ownerData.password) {
          setError("Please enter a password to create an account.");
          return;
        }
        if (ownerData.password !== ownerData.confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
      }
      // Validate phone: should be 10 digits
      if (ownerData.phoneDigits.length !== 10) {
        setError("Please enter a valid 10-digit phone number.");
        return;
      }
      setStep(2);
    }
  };

  const proceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petData.name) {
      setError("Please enter your pet's name.");
      return;
    }
    if (petData.selectedDoctorId && (!selectedDate || !selectedTime)) {
      setError("Please select both date and time slot for your preferred doctor.");
      return;
    }
    setError(null);
    setStep(3); // Go to confirmation step
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petData.name) {
      setError("Please enter your pet's name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // FULL ACCOUNT CREATION
      const userCredential = await createUserWithEmailAndPassword(auth, ownerData.email, ownerData.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: ownerData.name });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: ownerData.email,
        displayName: ownerData.name,
        phone: fullPhone,
        role: 'client',
        createdAt: serverTimestamp()
      });

      // Check for duplicate pet name under same owner
      const dupQuery = query(
        collection(db, 'pets'),
        where('ownerUid', '==', user.uid),
        where('name', '==', petData.name.trim())
      );
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        alert(`A pet named "${petData.name}" already exists under your account.`);
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'pets'), {
        ownerUid: user.uid,
        name: petData.name,
        species: petData.species,
        breed: petData.breed,
        age: parseInt(petData.age) || 0,
        createdAt: serverTimestamp()
      });

      setStep(4); // Success step - account created
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account");
      setLoading(false);
    }
  };

  const confirmBooking = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Step 1: Creating guest user...');
      // 1. Create a guest user record in users collection
      const guestUserRef = await addDoc(collection(db, 'users'), {
        email: ownerData.email,
        displayName: ownerData.name,
        phone: fullPhone,
        role: 'client',
        isGuest: true,
        createdAt: serverTimestamp()
      });
      const guestUserId = guestUserRef.id;
      console.log('Guest user created with ID:', guestUserId);

      console.log('Step 2: Creating pet record...');
      // Check for duplicate pet name under same owner
      const dupQuery = query(
        collection(db, 'pets'),
        where('ownerUid', '==', guestUserId),
        where('name', '==', petData.name.trim())
      );
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        alert(`A pet named "${petData.name}" already exists under your account.`);
        setLoading(false);
        return;
      }

      // 2. Create pet record linked to guest user
      const petRef = await addDoc(collection(db, 'pets'), {
        ownerUid: guestUserId,
        name: petData.name,
        species: petData.species,
        breed: petData.breed,
        age: parseInt(petData.age) || 0,
        currentStatus: 'discharged',
        createdAt: serverTimestamp()
      });
      const petId = petRef.id;
      console.log('Pet created with ID:', petId);

      console.log('Step 3: Creating appointment...');
      console.log('Data being saved:', {
        date: selectedDate || new Date().toISOString().split('T')[0],
        time: selectedTime || '09:00 AM',
        clientUid: guestUserId,
        petId: petId,  // This should be the pet document ID
        petName: petData.name,
        ownerName: ownerData.name,
        // ... other fields
      });
      
      // 3. Create appointment with status "unconfirmed"
      const appointmentData: any = {
        date: selectedDate || new Date().toISOString().split('T')[0],
        time: selectedTime || '09:00 AM',
        clientUid: guestUserId,
        petId: petId,
        petName: petData.name,
        ownerName: ownerData.name,
        petSpecies: petData.species,
        petBreed: petData.breed,
        petAge: parseInt(petData.age) || 0,
        status: 'unconfirmed',
        notes: `Web booking - Guest: ${ownerData.name}, Email: ${ownerData.email}, Phone: ${fullPhone}`,
        createdAt: serverTimestamp()
      };

      // Add selected doctor if any
      if (petData.selectedDoctorId) {
        appointmentData.doctorId = petData.selectedDoctorId;
        appointmentData.doctorName = petData.selectedDoctorName;
      }

      const appointmentRef = await addDoc(collection(db, 'appointments'), appointmentData);
      const appointmentId = appointmentRef.id;
      console.log('Appointment created with ID:', appointmentId);

      console.log('Step 4: Saving lead to CRM...');
      // 4. Save as lead to CRM (for tracking)
      const leadData: any = {
        userId: guestUserId,
        name: ownerData.name,
        email: ownerData.email,
        phone: fullPhone,
        petId: petId,
        petName: petData.name,
        petSpecies: petData.species,
        petBreed: petData.breed,
        petAge: parseInt(petData.age) || 0,
        status: 'scheduled',
        appointmentId: appointmentId,
        notes: 'Quick booking - no account created',
        createdAt: serverTimestamp()
      };

      if (petData.selectedDoctorId) {
        leadData.preferredDoctorId = petData.selectedDoctorId;
        leadData.preferredDoctorName = petData.selectedDoctorName;
      }

      await addDoc(collection(db, 'guest_leads'), leadData);
      console.log('Lead saved to guest_leads');

      console.log('Step 5: Creating notifications...');
      // 5. Create notification for admin/staff users with appointmentId
      const usersSnapshot = await getDocs(query(
        collection(db, 'users'),
        where('role', 'in', ['admin', 'staff'])
      ));

      const notificationPromises = usersSnapshot.docs.map(userDoc => {
        return addDoc(collection(db, 'notifications'), {
          userId: userDoc.id,
          userRole: userDoc.data().role,
          type: 'new_guest_booking',
          title: 'New Portal Booking',
          message: `${ownerData.name} booked for ${petData.name} (${petData.species}). Contact: ${fullPhone}${petData.selectedDoctorName ? ` - Preferred: Dr. ${petData.selectedDoctorName}` : ''}`,
          appointmentId: appointmentId,
          read: false,
          createdAt: serverTimestamp()
        });
      });

      // Notify selected doctor if any
      if (petData.selectedDoctorId) {
        notificationPromises.push(
          addDoc(collection(db, 'notifications'), {
            userId: petData.selectedDoctorId,
            userRole: 'doctor',
            type: 'new_guest_booking',
            title: 'New Portal Booking (Preferred)',
            message: `${ownerData.name} requested you for ${petData.name} (${petData.species}). Contact: ${fullPhone}`,
            appointmentId: appointmentId,
            read: false,
            createdAt: serverTimestamp()
          })
        );
      }

      await Promise.all(notificationPromises);
      console.log('Notifications sent');

      setStep(5); // Success step - lead created
    } catch (err: any) {
      console.error('Error in confirmBooking:', err);
      setError(err.message || "Failed to process booking");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Progress Stepper - hidden on success steps */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-4 mb-12">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  step >= s ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" : "bg-stone-200 text-stone-500"
                }`}>
                  {step > s ? <CheckCircle className="w-6 h-6" /> : s}
                </div>
                {s < 3 && <div className={`h-1 w-12 rounded-full ${step > s ? "bg-emerald-600" : "bg-stone-200"}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 border border-stone-100 overflow-hidden"
        >
          <div className="p-8 md:p-12">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                      <User className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold">Owner Information</h1>
                    <p className="text-stone-500">Let's start with your basic details.</p>
                  </div>

                  {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">{error}</div>}

                  <form onSubmit={handleNext} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-700">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                          <input 
                            type="text" 
                            required
                            placeholder="John Doe"
                            value={ownerData.name}
                            onChange={(e) => setOwnerData({...ownerData, name: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-700">Phone Number</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-4 bg-stone-100 border border-r-0 border-stone-100 rounded-l-2xl text-stone-500 font-medium">
                            +63
                          </span>
                          <input 
                            type="tel" 
                            required
                            placeholder="9123456789"
                            maxLength={10}
                            value={ownerData.phoneDigits}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setOwnerData({...ownerData, phoneDigits: digits})
                            }}
                            className="flex-1 pl-4 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-r-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          />
                        </div>
                        <p className="text-xs text-stone-400">Enter 10-digit number (e.g., 9123456789)</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <input 
                          type="email" 
                          required
                          placeholder="john@example.com"
                          value={ownerData.email}
                          onChange={(e) => setOwnerData({...ownerData, email: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Optional: Create Account Checkbox */}
                    <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <input 
                        type="checkbox" 
                        id="createAccount"
                        checked={ownerData.createAccount}
                        onChange={(e) => setOwnerData({...ownerData, createAccount: e.target.checked})}
                        className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="createAccount" className="text-sm font-medium text-stone-700 cursor-pointer">
                        Create an account to access the portal (optional)
                      </label>
                    </div>

                    {ownerData.createAccount && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-stone-700">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                            <input 
                              type={showPassword ? "text" : "password"} 
                              required={ownerData.createAccount}
                              placeholder="••••••••"
                              value={ownerData.password}
                              onChange={(e) => setOwnerData({...ownerData, password: e.target.value})}
                              className="w-full pl-12 pr-12 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-emerald-600 transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-stone-700">Confirm Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                            <input 
                              type={showConfirmPassword ? "text" : "password"} 
                              required={ownerData.createAccount}
                              placeholder="••••••••"
                              value={ownerData.confirmPassword}
                              onChange={(e) => setOwnerData({...ownerData, confirmPassword: e.target.value})}
                              className="w-full pl-12 pr-12 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-emerald-600 transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <button 
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      Continue to Pet Details <ChevronRight className="w-5 h-5" />
                    </button>
                    <p className="text-center text-sm text-stone-500">
                      Already have an account? <Link to="/login" className="text-emerald-600 font-bold">Sign In</Link>
                    </p>
                  </form>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <button 
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Owner Info
                  </button>

                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                      <Dog className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold">Tell us about your pet</h1>
                    <p className="text-stone-500">{ownerData.createAccount ? 'Add your first patient to the profile.' : 'Tell us about your pet for the booking.'}</p>
                  </div>

                  {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">{error}</div>}

                  <form onSubmit={ownerData.createAccount ? handleSignup : proceedToConfirmation} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">Pet Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Buddy"
                        value={petData.name}
                        onChange={(e) => setPetData({...petData, name: e.target.value})}
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-700">Species</label>
                        <select 
                          value={petData.species}
                          onChange={(e) => setPetData({...petData, species: e.target.value})}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                        >
                          <option>Dog</option>
                          <option>Cat</option>
                          <option>Bird</option>
                          <option>Rabbit</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-700">Breed (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="Golden Retriever"
                          value={petData.breed}
                          onChange={(e) => setPetData({...petData, breed: e.target.value})}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">Age (Years)</label>
                      <input 
                        type="number" 
                        placeholder="3"
                        value={petData.age}
                        onChange={(e) => setPetData({...petData, age: e.target.value})}
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">Preferred Doctor (Optional)</label>
                      <div className="relative">
                        <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <select 
                          value={petData.selectedDoctorId}
                          onChange={(e) => {
                            const doctor = doctors.find(d => d.uid === e.target.value);
                            setPetData({...petData, selectedDoctorId: e.target.value, selectedDoctorName: doctor?.displayName || ''});
                            setSelectedDate(''); // Reset date when doctor changes
                            setSelectedTime(''); // Reset time when doctor changes
                          }}
                          className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                        >
                          <option value="">No preference</option>
                          {doctors.map(doc => (
                            <option key={doc.uid} value={doc.uid}>{doc.displayName}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Calendar - only show if doctor selected and has availability */}
                    {petData.selectedDoctorId && availableDates.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-700">Select Date</label>
                        <style>{`
                          .react-calendar {
                            width: 100%;
                            border: none;
                            font-family: inherit;
                          }
                          .react-calendar__tile--now {
                            background: #f0fdf4;
                            color: #059669;
                          }
                          .react-calendar__tile--active {
                            background: #059669;
                            color: white;
                          }
                          .react-calendar__tile:enabled:hover,
                          .react-calendar__tile:enabled:focus {
                            background: #d1fae5;
                          }
                          .react-calendar__navigation button:enabled:hover,
                          .react-calendar__navigation button:enabled:focus {
                            background: #d1fae5;
                          }
                        `}</style>
                        <div className="react-calendar-wrapper border border-stone-100 rounded-2xl overflow-hidden bg-white">
                          <Calendar
                            onChange={(date: Date) => {
                              if (date) {
                                const dateStr = date.toISOString().split('T')[0];
                                setSelectedDate(dateStr);
                                setSelectedTime(''); // Reset time when date changes
                              }
                            }}
                            value={selectedDate ? new Date(selectedDate + 'T00:00:00') : null}
                            tileDisabled={({ date }: { date: Date }) => {
                              const dateStr = date.toISOString().split('T')[0];
                              return !availableDates.includes(dateStr);
                            }}
                            minDate={new Date()}
                            maxDate={(() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 30);
                              return d;
                            })()}
                          />
                        </div>
                      </div>
                    )}

                    {/* Time Slot Selection - only show if date selected */}
                    {selectedDate && (() => {
                      const d = new Date(selectedDate + 'T00:00:00');
                      const dayOfWeek = d.getDay();
                      const dayKey = dayOfWeek.toString();
                      const slots = doctorAvailability[dayKey] || [];
                      return slots.length > 0 ? (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-stone-700">Select Time Slot</label>
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                            {slots.map(slot => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setSelectedTime(slot)}
                                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                  selectedTime === slot
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                                }`}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : <>{ownerData.createAccount ? 'Create Account' : 'Review Booking'} <CheckCircle className="w-5 h-5" /></>}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <button 
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Pet Details
                  </button>

                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold">Confirm Your Booking</h1>
                    <p className="text-stone-500">Please review your information before submitting.</p>
                  </div>

                  <div className="space-y-6 bg-stone-50 rounded-2xl p-6">
                    <div>
                      <h3 className="font-bold text-stone-900 mb-3">Owner Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-stone-500">Name:</span> <span className="font-medium">{ownerData.name}</span></p>
                        <p><span className="text-stone-500">Email:</span> <span className="font-medium">{ownerData.email}</span></p>
                        <p><span className="text-stone-500">Phone:</span> <span className="font-medium">{fullPhone}</span></p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 mb-3">Pet Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-stone-500">Name:</span> <span className="font-medium">{petData.name}</span></p>
                        <p><span className="text-stone-500">Species:</span> <span className="font-medium">{petData.species}</span></p>
                        {petData.breed && <p><span className="text-stone-500">Breed:</span> <span className="font-medium">{petData.breed}</span></p>}
                        {petData.age && <p><span className="text-stone-500">Age:</span> <span className="font-medium">{petData.age} years</span></p>}
                        {petData.selectedDoctorName && <p><span className="text-stone-500">Preferred Doctor:</span> <span className="font-medium">Dr. {petData.selectedDoctorName}</span></p>}
                        {selectedDate && <p><span className="text-stone-500">Date:</span> <span className="font-medium">{selectedDate}</span></p>}
                        {selectedTime && <p><span className="text-stone-500">Time:</span> <span className="font-medium">{selectedTime}</span></p>}
                      </div>
                    </div>
                  </div>

                  {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">{error}</div>}

                  <button 
                    onClick={confirmBooking}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : <>Confirm Booking <CheckCircle className="w-5 h-5" /></>}
                  </button>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 space-y-8"
                >
                  <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-4xl font-bold text-stone-900">Welcome to the Family!</h1>
                    <p className="text-xl text-stone-500">Your profile and pet record have been created successfully.</p>
                  </div>
                  <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 inline-block">
                    <p className="text-emerald-800 font-medium">Redirecting you to your dashboard...</p>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div 
                  key="step5"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 space-y-8"
                >
                  <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-4xl font-bold text-stone-900">Booking Received!</h1>
                    <p className="text-xl text-stone-500">Thank you for your information. A confirmation email has been sent.</p>
                    <p className="text-stone-500">Our staff will contact you shortly at {fullPhone} to confirm your appointment.</p>
                  </div>
                  <div className="p-8 bg-blue-50 rounded-3xl border border-blue-100 inline-block space-y-4">
                    <p className="text-blue-800 font-medium">Want to track your pet's records online?</p>
                    <Link to="/signup" className="text-emerald-600 font-bold hover:underline">Create an account here</Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="mt-12 text-center text-stone-400 text-xs flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-sm text-stone-500">
            <Hospital className="w-5 h-5 text-emerald-500" />
            edvirontvet Health Network
          </div>
          <p>© 2026 Professional Veterinary Services Management</p>
        </div>
      </div>
    </div>
  );
}
