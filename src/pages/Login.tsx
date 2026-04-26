import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, googleProvider, signInWithPopup, db, doc, getDoc, setDoc, serverTimestamp } from '../firebase';
import { motion } from 'motion/react';
import { LogIn, Mail, ShieldCheck, Hospital } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'patient', // Default role
          createdAt: serverTimestamp()
        });
      }

      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError("Domain not authorized by Firebase. Please make sure you are accessing the site via http://localhost:3000 (not 0.0.0.0 or your IP) and that localhost is in your Firebase Authorized Domains.");
      } else {
        setError(err.message || "Failed to login with Google");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-emerald-900/10 border border-stone-100 p-8 md:p-12 space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-2xl text-emerald-600 mb-4">
            <Hospital className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900">Welcome Back</h1>
          <p className="text-stone-500">Access your pet care dashboard and manage your visits securely.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-6 py-4 rounded-2xl font-semibold transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-stone-300 border-t-emerald-600 rounded-full animate-spin" />
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            )}
            Continue with Google
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-stone-400">Secure Access</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs text-stone-400 text-center">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Secure Pet Data Storage
            </div>
            <p>By continuing, you agree to our Terms of Service and Privacy Policy.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
