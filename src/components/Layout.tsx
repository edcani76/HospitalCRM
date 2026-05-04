import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, signOut, onAuthStateChanged, db, doc, getDoc } from '../firebase';
import { UserProfile } from '../types';
import { Menu, X, Hospital, User, LogOut, LayoutDashboard, Calendar, ShieldCheck } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children, showFooter = true }: { children: React.ReactNode, showFooter?: boolean }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        } else {
          // If user exists in Auth but not in Firestore yet
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            role: 'client',
            createdAt: new Date()
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/departments' },
    { name: 'Veterinarians', path: '/doctors' },
  ];

  if (user) {
    let dashboardPath = '/dashboard';
    if (user.role === 'admin' || user.role === 'staff') dashboardPath = '/crm/admin-dashboard';
    else if (user.role === 'lab') dashboardPath = '/crm/lab-dashboard';
    else if (user.role === 'pharmacist') dashboardPath = '/crm/pharmacist-dashboard';
    else if (user.role === 'doctor') dashboardPath = '/crm/doctor-dashboard';

    navLinks.push({ name: 'Dashboard', path: dashboardPath });
    
    // Also update the profile image link to point to the correct dashboard
    // instead of always /dashboard
    const profileLink = dashboardPath;
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 text-emerald-700 font-bold text-xl">
              <Hospital className="w-8 h-8" />
              <span>edvirontvet</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-emerald-600",
                    location.pathname === link.path ? "text-emerald-600" : "text-stone-600"
                  )}
                >
                  {link.name}
                </Link>
              ))}
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-stone-200 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                  <Link to={user.role === 'client' ? '/dashboard' : '/crm/admin-dashboard'} className="w-8 h-8 rounded-full overflow-hidden border border-emerald-200">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=10b981&color=fff`} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Login / Signup
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-stone-600">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200 py-4 px-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className="block text-base font-medium text-stone-600 hover:text-emerald-600"
              >
                {link.name}
              </Link>
            ))}
            {!user && (
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-center bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-medium"
              >
                Login / Signup
              </Link>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-base font-medium text-stone-600 hover:text-red-600"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            )}
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>

      {showFooter && (
        <footer className="bg-stone-900 text-stone-400 py-12 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-xl">
                <Hospital className="w-8 h-8 text-emerald-500" />
                <span>edvirontvet</span>
              </div>
              <p className="text-sm">Providing trusted veterinary care with a focus on wellness, prevention, and compassionate support for pets and their families.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-emerald-500 transition-colors">Home</Link></li>
                <li><Link to="/departments" className="hover:text-emerald-500 transition-colors">Services</Link></li>
                <li><Link to="/doctors" className="hover:text-emerald-500 transition-colors">Veterinarians</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>888 Pawcare St., Project 6, Quezon City</li>
                <li>Quezon City, Philippines</li>
                <li>Phone: 0912-6819499</li>
                <li>Email: info@edvirontvet.com</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Emergency</h4>
              <div className="bg-red-900/30 border border-red-900/50 p-4 rounded-xl">
                <p className="text-red-400 font-bold text-lg">0917-8596023</p>
                <p className="text-xs">Available 24/7 for urgent pet care needs</p>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-stone-800 text-center text-xs">
            © 2026 edvirontvet Veterinary. All rights reserved.
          </div>
        </footer>
      )}

    </div>
  );
}
