import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, doc, setDoc, serverTimestamp, collection, addDoc } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Lock, Phone, Dog, ChevronRight, CheckCircle, Hospital, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Step 1: Owner Info
  const [ownerData, setOwnerData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Pet Info
  const [petData, setPetData] = useState({
    name: '',
    species: 'Dog',
    breed: '',
    age: ''
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!ownerData.name || !ownerData.email || !ownerData.phone || !ownerData.password) {
        setError("Please fill in all owner details.");
        return;
      }
      if (ownerData.password !== ownerData.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setStep(2);
    }
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
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, ownerData.email, ownerData.password);
      const user = userCredential.user;

      // 2. Update Display Name
      await updateProfile(user, { displayName: ownerData.name });

      // 3. Create User Document
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: ownerData.email,
        displayName: ownerData.name,
        phone: ownerData.phone,
        role: 'client',
        createdAt: serverTimestamp()
      });

      // 4. Create Pet Document
      await addDoc(collection(db, 'pets'), {
        ownerUid: user.uid,
        name: petData.name,
        species: petData.species,
        breed: petData.breed,
        age: parseInt(petData.age) || 0,
        createdAt: serverTimestamp()
      });

      setStep(3); // Success step
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Progress Stepper */}
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
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                          <input 
                            type="tel" 
                            required
                            placeholder="+1 (555) 000-0000"
                            value={ownerData.phone}
                            onChange={(e) => setOwnerData({...ownerData, phone: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          />
                        </div>
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
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-700">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            required
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
                            required
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
                    <p className="text-stone-500">Add your first patient to the profile.</p>
                  </div>

                  {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">{error}</div>}

                  <form onSubmit={handleSignup} className="space-y-6">
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
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Creating Account...' : <>Complete Signup <CheckCircle className="w-5 h-5" /></>}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
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
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="mt-12 text-center text-stone-400 text-xs flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-sm text-stone-500">
            <Hospital className="w-5 h-5 text-emerald-500" />
            MediPaws Health Network
          </div>
          <p>© 2026 Professional Veterinary Services Management</p>
        </div>
      </div>
    </div>
  );
}
