import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, db, doc, getDoc, setDoc, serverTimestamp } from '../firebase';
import { motion } from 'motion/react';
import { LogIn, Mail, ShieldCheck, Hospital, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  React.useEffect(() => {
    if (!authLoading && user) {
      // Role-based destination
      const isCRMUser = ['admin', 'staff', 'lab', 'pharmacist', 'doctor'].includes(user.role as string);
      const dashboardPath = isCRMUser 
        ? (user.role === 'doctor' ? '/crm/doctor-dashboard' : 
           user.role === 'lab' ? '/crm/lab-dashboard' :
           user.role === 'pharmacist' ? '/crm/pharmacist-dashboard' : 
           '/crm/admin-dashboard')
        : '/dashboard';
      
      const fromPath = location.state?.from?.pathname;
      const restrictedPaths = ['/admin', '/lab', '/pharmacy', '/dashboard'].filter(p => p !== dashboardPath);
      const isRestricted = fromPath && restrictedPaths.some(p => fromPath.startsWith(p));
      
      if (fromPath && !isRestricted && (isCRMUser ? fromPath.startsWith('/crm') : !fromPath.startsWith('/crm'))) {
        navigate(fromPath, { replace: true });
      } else {
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [user, authLoading, navigate, location]);

  const getRedirectPath = (role: string) => {
    const isCRMUser = ['admin', 'staff', 'lab', 'pharmacist', 'doctor'].includes(role);
    const defaultStaffPath = role === 'doctor' ? '/crm/doctor-dashboard' : 
                             role === 'lab' ? '/crm/lab-dashboard' :
                             role === 'pharmacist' ? '/crm/pharmacist-dashboard' : 
                             '/crm/admin-dashboard';

    if (location.state?.from) {
      const fromPath = location.state.from.pathname;
      // If a CRM user was headed to the patient dashboard, override to CRM
      if (isCRMUser && fromPath === '/dashboard') return defaultStaffPath;
      // If a client was headed to a CRM page, override to client dashboard
      if (!isCRMUser && fromPath.startsWith('/crm')) return '/dashboard';
      return fromPath;
    }
    
    return isCRMUser ? defaultStaffPath : '/dashboard';
  };

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
          role: 'client', // Default role
          createdAt: serverTimestamp()
        });
      }

      const role = userDoc.exists() ? (userDoc.data()?.role || 'client') : 'client';
      navigate(getRedirectPath(role), { replace: true });
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      const role = userDoc.exists() ? (userDoc.data()?.role || 'client') : 'client';
      navigate(getRedirectPath(role), { replace: true });
    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password. Please try again.");
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

        <div className="space-y-6">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address" 
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" 
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold">
              <span className="bg-white px-4 text-stone-400">Or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            type="button"
            className="w-full flex items-center justify-center gap-4 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-6 py-4 rounded-2xl font-semibold transition-all disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>

          <p className="text-center text-sm text-stone-500">
            Don't have an account? <Link to="/signup" className="text-emerald-600 font-bold">Sign Up</Link>
          </p>

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
