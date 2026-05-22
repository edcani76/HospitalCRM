import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, doc, setDoc, getDoc, serverTimestamp, collection, addDoc, getDocs, query, where, orderBy } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, fetchSignInMethodsForEmail } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { sendEmail } from '../lib/email-service';
import {
  bookingConfirmation, newBookingAlert
} from '../lib/email-templates';
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
  const [isReturningGuest, setIsReturningGuest] = useState(false);
  const [returningGuestId, setReturningGuestId] = useState<string | null>(null);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [guestDetectionLoading, setGuestDetectionLoading] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [existingPets, setExistingPets] = useState<any[]>([]);
  const [selectedExistingPetId, setSelectedExistingPetId] = useState<string | null>(null);
  const [existingPetsLoading, setExistingPetsLoading] = useState(false);
  const [existingRegisteredUser, setExistingRegisteredUser] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, ownerData.email);
      setPasswordResetSent(true);
    } catch {
      setError("Failed to send reset email. Please try again.");
    }
  };
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

        // Pre-fill from pending booking when doctors load
        const pending = sessionStorage.getItem('pendingBooking');
        if (pending) {
          try {
            const data = JSON.parse(pending);
            if (data.doctorUid && docs.some(d => d.uid === data.doctorUid)) {
              const match = docs.find(d => d.uid === data.doctorUid);
              setPetData(prev => ({ ...prev, selectedDoctorId: data.doctorUid, selectedDoctorName: match?.displayName || data.doctorName }));
            } else if (data.doctorName) {
              // Fallback: match by display name
              const nameMatch = docs.find(d => d.displayName.toLowerCase().trim() === data.doctorName.toLowerCase().trim());
              if (nameMatch) {
                setPetData(prev => ({ ...prev, selectedDoctorId: nameMatch.uid, selectedDoctorName: nameMatch.displayName }));
              } else {
                setPetData(prev => ({ ...prev, selectedDoctorName: data.doctorName }));
              }
            }
          } catch {}
        }
      } catch (err) {
        console.error('Error fetching doctors:', err);
      }
    };
    fetchDoctors();
  }, []);

  const pendingRestored = useRef(false);

  // Restore pending booking fields on mount (doctorName, date, time) regardless of doctor list
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingBooking');
    if (pending) {
      try {
        const data = JSON.parse(pending);
        if (data.doctorName && !petData.selectedDoctorId) {
          setPetData(prev => ({ ...prev, selectedDoctorName: data.doctorName }));
        }
        if (data.date) setSelectedDate(data.date);
        if (data.time) setSelectedTime(data.time);
        if (data.date || data.time) pendingRestored.current = true;
      } catch {}
    }
  }, []);

  // Fetch doctor availability when selected doctor changes
  useEffect(() => {
    if (!petData.selectedDoctorId) {
      setDoctorAvailability({});
      setAvailableDates([]);
      // Don't clear date/time on initial mount if pendingBooking already set them
      if (!pendingRestored.current) {
        setSelectedDate('');
        setSelectedTime('');
      }
      pendingRestored.current = false;
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

  // Auto-redirect registered users to login page with countdown
  useEffect(() => {
    if (existingRegisteredUser) {
      setRedirectCountdown(4);
      const interval = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            navigate('/login', { state: { email: ownerData.email } });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setRedirectCountdown(0);
    }
  }, [existingRegisteredUser, navigate]);

  // Fetch existing pets when entering Step 2 as a returning guest
  useEffect(() => {
    if (step === 2 && isReturningGuest && returningGuestId) {
      setExistingPetsLoading(true);
      getDocs(query(collection(db, 'pets'), where('ownerUid', '==', returningGuestId)))
        .then(snap => {
          setExistingPets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        })
        .catch(() => {})
        .finally(() => setExistingPetsLoading(false));
    }
  }, [step, isReturningGuest, returningGuestId]);

  // Debounced returning guest detection — check if email belongs to an existing guest user
  useEffect(() => {
    if (!ownerData.email || !ownerData.email.includes('@')) {
      setIsReturningGuest(false);
      setReturningGuestId(null);
      setBookingHistory([]);
      return;
    }
    const timer = setTimeout(async () => {
      setGuestDetectionLoading(true);
      try {
        // First check: is this a guest user?
        const guestQ = query(collection(db, 'users'), where('email', '==', ownerData.email.trim().toLowerCase()), where('isGuest', '==', true));
        const guestSnap = await getDocs(guestQ);
        if (!guestSnap.empty) {
          const guestId = guestSnap.docs[0].id;
          setIsReturningGuest(true);
          setExistingRegisteredUser(false);
          setReturningGuestId(guestId);
          setOwnerData(prev => ({ ...prev, createAccount: true }));
          // Fetch booking history
          setHistoryLoading(true);
          const aptQuery = query(collection(db, 'appointments'), where('clientUid', '==', guestId), orderBy('createdAt', 'desc'));
          const aptSnap = await getDocs(aptQuery);
          const history = aptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setBookingHistory(history);
          setHistoryLoading(false);
        } else {
          // Second check: is this a registered (non-guest) user in Firestore?
          const registeredQ = query(collection(db, 'users'), where('email', '==', ownerData.email.trim().toLowerCase()), where('isGuest', '==', false));
          const registeredSnap = await getDocs(registeredQ);
          let foundRegistered = false;
          if (!registeredSnap.empty) {
            foundRegistered = true;
          } else {
            // Also check if there's any user doc without isGuest field (legacy registered users)
            const legacyQ = query(collection(db, 'users'), where('email', '==', ownerData.email.trim().toLowerCase()));
            const legacySnap = await getDocs(legacyQ);
            if (!legacySnap.empty && !legacySnap.docs[0].data().isGuest) {
              foundRegistered = true;
            }
          }

          // Third check: does a Firebase Auth account exist for this email (even without Firestore doc)?
          if (!foundRegistered) {
            try {
              const signInMethods = await fetchSignInMethodsForEmail(auth, ownerData.email.trim().toLowerCase());
              if (signInMethods.length > 0) {
                foundRegistered = true;
              }
            } catch {
              // fetchSignInMethodsForEmail can fail if Firebase config is incomplete; fall through
            }
          }

          if (foundRegistered) {
            setExistingRegisteredUser(true);
            setIsReturningGuest(false);
            setReturningGuestId(null);
            setBookingHistory([]);
          } else {
            setExistingRegisteredUser(false);
            setIsReturningGuest(false);
            setReturningGuestId(null);
            setBookingHistory([]);
          }
        }
      } catch {} finally {
        setGuestDetectionLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [ownerData.email]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (existingRegisteredUser) {
        setError("This email is already registered. Please sign in instead.");
        return;
      }
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
      // Check if a guest user with this email already exists
      const existingGuestQuery = query(collection(db, 'users'), where('email', '==', ownerData.email.trim().toLowerCase()), where('isGuest', '==', true));
      const existingGuestSnap = await getDocs(existingGuestQuery);
      const existingGuest = existingGuestSnap.empty ? null : existingGuestSnap.docs[0];
      const guestUserId = existingGuest?.id;

      // FULL ACCOUNT CREATION — try to create account, fallback to sign-in if email exists
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, ownerData.email, ownerData.password);
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          try {
            userCredential = await signInWithEmailAndPassword(auth, ownerData.email, ownerData.password);
          } catch {
            throw new Error("This email is already registered but the password you entered is incorrect. Please try again.");
          }
        } else {
          throw createErr;
        }
      }
      const user = userCredential.user;

      await updateProfile(user, { displayName: ownerData.name });

      if (existingGuest && guestUserId) {
        // Upgrade the guest user doc to a full account (in-place)
        await setDoc(doc(db, 'users', guestUserId), {
          uid: user.uid,
          email: ownerData.email,
          displayName: ownerData.name,
          phone: fullPhone,
          role: 'client',
          isGuest: false,
          upgradedAt: serverTimestamp(),
          createdAt: existingGuest.data().createdAt || serverTimestamp()
        });

        // Create a linking doc under the auth UID — queries will check both via linkedTo
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          linkedTo: guestUserId,
          email: ownerData.email,
          displayName: ownerData.name,
          phone: fullPhone,
          role: 'client',
          isMigratedGuest: true,
          createdAt: serverTimestamp()
        });
      } else {
        // Only create user doc if one doesn't already exist (protect against overwriting)
        const existingDoc = await getDoc(doc(db, 'users', user.uid));
        if (!existingDoc.exists()) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: ownerData.email,
            displayName: ownerData.name,
            phone: fullPhone,
            role: 'client',
            createdAt: serverTimestamp()
          });
        }
      }

      // Check for duplicate pet name — search both auth UID and linked guest UID
      const dupOwnerUids = [user.uid];
      if (existingGuest && guestUserId) dupOwnerUids.push(guestUserId);
      const dupQuery = query(
        collection(db, 'pets'),
        where('ownerUid', 'in', dupOwnerUids),
        where('name', '==', petData.name.trim())
      );
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        if (existingGuest) {
          alert(`Pet "${petData.name}" found from your previous visit — we'll use the existing record.`);
        } else {
          alert(`A pet named "${petData.name}" already exists under your account.`);
          setLoading(false);
          return;
        }
      } else {
        await addDoc(collection(db, 'pets'), {
          ownerUid: user.uid,
          name: petData.name,
          species: petData.species,
          breed: petData.breed,
          age: parseInt(petData.age) || 0,
          createdAt: serverTimestamp()
        });
      }

      setStep(4); // Success step - account created
      const hasPending = !!sessionStorage.getItem('pendingBooking');
      setTimeout(() => navigate(hasPending ? '/book-appointment' : '/dashboard'), 3000);
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
      console.log('Step 1: Checking for existing guest...');
      // Check if a guest user with this email already exists
      const existingUserQuery = query(collection(db, 'users'), where('email', '==', ownerData.email.trim().toLowerCase()), where('isGuest', '==', true));
      const existingUserSnap = await getDocs(existingUserQuery);

      let guestUserId: string;
      let isReturning = false;

      if (!existingUserSnap.empty) {
        guestUserId = existingUserSnap.docs[0].id;
        isReturning = true;
        console.log('Returning guest found, reusing ID:', guestUserId);
      } else {
        console.log('Step 1: Creating new guest user...');
        const guestUserRef = await addDoc(collection(db, 'users'), {
          email: ownerData.email,
          displayName: ownerData.name,
          phone: fullPhone,
          role: 'client',
          isGuest: true,
          createdAt: serverTimestamp()
        });
        guestUserId = guestUserRef.id;
      }

      console.log('Step 2: Checking for existing pet...');
      // Check if this pet already exists under this guest user
      const existingPetQuery = query(
        collection(db, 'pets'),
        where('ownerUid', '==', guestUserId),
        where('name', '==', petData.name.trim())
      );
      const existingPetSnap = await getDocs(existingPetQuery);

      let petId: string;
      if (!existingPetSnap.empty) {
        petId = existingPetSnap.docs[0].id;
        console.log('Existing pet found, reusing ID:', petId);
      } else {
        console.log('Step 2: Creating new pet record...');
        const petRef = await addDoc(collection(db, 'pets'), {
          ownerUid: guestUserId,
          name: petData.name,
          species: petData.species,
          breed: petData.breed,
          age: parseInt(petData.age) || 0,
          currentStatus: 'active',
          createdAt: serverTimestamp()
        });
        petId = petRef.id;
      }
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
      if (petData.selectedDoctorName) {
        appointmentData.doctorName = petData.selectedDoctorName;
        if (petData.selectedDoctorId) {
          appointmentData.doctorId = petData.selectedDoctorId;
        }
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
        notes: isReturning ? 'Repeat guest booking' : 'Quick booking - no account created',
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
          title: isReturning ? 'Repeat Guest Booking' : 'New Portal Booking',
          message: `${ownerData.name} ${isReturning ? 're-booked' : 'booked'} for ${petData.name} (${petData.species}). Contact: ${fullPhone}${petData.selectedDoctorName ? ` - Preferred: Dr. ${petData.selectedDoctorName}` : ''}`,
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
            title: isReturning ? 'Repeat Guest Booking (Preferred)' : 'New Portal Booking (Preferred)',
            message: `${ownerData.name} ${isReturning ? 're-requested' : 'requested'} you for ${petData.name} (${petData.species}). Contact: ${fullPhone}`,
            appointmentId: appointmentId,
            read: false,
            createdAt: serverTimestamp()
          })
        );
      }

      await Promise.all(notificationPromises);
      console.log('Notifications sent');

      // Send email notifications (fire-and-forget)
      const emailSubject = isReturning ? 'Booking Confirmed (Returning Guest)' : 'Booking Confirmed';
      sendEmail({
        to: ownerData.email,
        subject: emailSubject,
        html: bookingConfirmation(ownerData.name, petData.name, selectedDate || '', selectedTime || '', petData.selectedDoctorName),
      });
      const staffEmails = usersSnapshot.docs.map(d => d.data().email).filter(Boolean);
      if (staffEmails.length > 0) {
        sendEmail({
          to: staffEmails,
          subject: `New Booking: ${ownerData.name} - ${petData.name}`,
          html: newBookingAlert(ownerData.name, petData.name, petData.species, selectedDate || '', selectedTime || '', fullPhone, petData.selectedDoctorName),
        });
      }

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

                  {isReturningGuest && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-lg">👋</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-amber-900">Welcome back!</h3>
                          <p className="text-sm text-amber-700 mt-1">
                            We remember you from a previous visit. Create an account to manage your bookings, 
                            view visit history, and check in faster next time.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100/50 rounded-xl px-3 py-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Account creation has been pre-selected for you below.</span>
                      </div>

                      {historyLoading ? (
                        <div className="flex items-center gap-2 text-sm text-stone-500 py-2">
                          <div className="w-4 h-4 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin" />
                          Loading your booking history...
                        </div>
                      ) : bookingHistory.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowHistory(!showHistory)}
                            className="flex items-center gap-2 text-sm font-medium text-amber-800 hover:text-amber-900 transition-colors"
                          >
                            {showHistory ? 'Hide' : 'View'} your previous bookings ({bookingHistory.length})
                            <ChevronRight className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                          </button>

                          {showHistory && (
                            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                              {bookingHistory.map((booking: any) => {
                                const statusColor = 
                                  booking.status === 'cancelled' ? 'text-red-600 bg-red-50 border-red-200' :
                                  booking.status === 'completed' || booking.status === 'confirmed' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                                  booking.status === 'unconfirmed' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                                  'text-stone-600 bg-stone-50 border-stone-200';
                                return (
                                  <div key={booking.id} className="bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-stone-800 truncate">
                                        {booking.petName || 'Pet'} {booking.petSpecies && <span className="text-stone-400 font-normal">({booking.petSpecies})</span>}
                                      </p>
                                      <p className="text-xs text-stone-500">
                                        {booking.date} at {booking.time}
                                        {booking.doctorName && <> &middot; Dr. {booking.doctorName.replace(/^Dr\.\s*/i, '')}</>}
                                      </p>
                                    </div>
                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ml-3 capitalize ${statusColor}`}>
                                      {booking.status || 'scheduled'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {guestDetectionLoading && (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-center gap-2 text-sm text-stone-500">
                      <div className="w-4 h-4 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin" />
                      Checking if you've visited before...
                    </div>
                  )}

                  {existingRegisteredUser && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-lg">⚠️</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-red-900">Account Already Exists</h3>
                          <p className="text-sm text-red-700 mt-1">
                            This email is already registered with a full account. Please sign in instead.
                          </p>
                          <p className="text-sm text-red-600 font-medium mt-2">
                            Redirecting to Sign In in <span className="text-base">{redirectCountdown}</span> seconds...
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/login"
                        className="block w-full text-center bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition-all"
                      >
                        Go to Sign In
                      </Link>
                    </div>
                  )}

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
                          onChange={(e) => setOwnerData({...ownerData, email: e.target.value.toLowerCase()})}
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
                      disabled={existingRegisteredUser}
                      className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                        existingRegisteredUser
                          ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {existingRegisteredUser ? 'Sign In Required' : 'Continue to Pet Details'} {!existingRegisteredUser && <ChevronRight className="w-5 h-5" />}
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
                    <h1 className="text-3xl font-bold">{ownerData.createAccount ? 'Create Your Account & Add a Pet' : 'Tell us about your pet'}</h1>
                    <p className="text-stone-500">
                      {ownerData.createAccount
                        ? 'Your account will be created when you finish. Select an existing pet or register a new one.'
                        : 'Tell us about your pet for the booking.'}
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 space-y-2">
                      <p>{error}</p>
                      {error.includes('password you entered is incorrect') && !passwordResetSent && (
                        <button type="button" onClick={handlePasswordReset} className="text-emerald-600 font-bold text-xs hover:underline">
                          Forgot your password? Reset it here
                        </button>
                      )}
                      {passwordResetSent && (
                        <p className="text-emerald-600 font-medium text-xs">Password reset email sent! Check your inbox.</p>
                      )}
                    </div>
                  )}

                  {/* Existing pets for returning guest */}
                  {ownerData.createAccount && isReturningGuest && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-stone-700 text-sm flex items-center gap-2">
                        <span>Your Existing Pets</span>
                        {existingPetsLoading && <div className="w-4 h-4 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin" />}
                      </h3>
                      {existingPetsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-stone-500 py-3">
                          <div className="w-4 h-4 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin" />
                          Loading your pets...
                        </div>
                      ) : existingPets.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {existingPets.map(pet => (
                            <button
                              key={pet.id}
                              type="button"
                              onClick={() => {
                                setSelectedExistingPetId(selectedExistingPetId === pet.id ? null : pet.id);
                                if (selectedExistingPetId === pet.id) {
                                  // Deselect — clear form
                                  setPetData({ ...petData, name: '', species: 'Dog', breed: '', age: '' });
                                } else {
                                  // Select — populate form
                                  setPetData({
                                    ...petData,
                                    name: pet.name || '',
                                    species: pet.species || 'Dog',
                                    breed: pet.breed || '',
                                    age: pet.age?.toString() || '',
                                  });
                                }
                              }}
                              className={`text-left p-4 rounded-2xl border-2 transition-all ${
                                selectedExistingPetId === pet.id
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-stone-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/50'
                              }`}
                            >
                              <p className="font-bold text-stone-800">{pet.name}</p>
                              <p className="text-xs text-stone-500 mt-0.5">
                                {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}{pet.age ? ` · ${pet.age} yrs` : ''}
                              </p>
                              {selectedExistingPetId === pet.id && (
                                <p className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Selected — will reuse this record
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500">No previous pets found. You can register a new one below.</p>
                      )}

                      {existingPets.length > 0 && (
                        <div className="relative py-2">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-stone-200" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-3 text-stone-400 font-medium">Or register a new pet</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                    <p className="text-xl text-stone-500">
                      {isReturningGuest
                        ? 'Your account is now linked to your previous visits. All your pets and bookings are available.'
                        : 'Your profile and pet record have been created successfully.'}
                    </p>
                    {isReturningGuest && existingPets.length > 0 && (
                      <div className="flex items-center justify-center gap-2 text-stone-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium">{existingPets.length} pet{existingPets.length !== 1 ? 's' : ''} linked to your account</span>
                      </div>
                    )}
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
