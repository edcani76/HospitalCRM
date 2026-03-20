import React, { useState, useEffect } from 'react';
import { auth, db, collection, query, where, onSnapshot, doc, getDoc } from '../firebase';
import { Appointment, Report, UserProfile } from '../types';
import { motion } from 'motion/react';
import { Calendar, FileText, Clock, CheckCircle, XCircle, AlertCircle, Plus, User, ArrowRight, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    // Fetch User Profile
    const fetchUser = async () => {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as UserProfile);
      }
    };
    fetchUser();

    // Listen to Appointments
    const qAppointments = query(
      collection(db, 'appointments'),
      where('patientUid', '==', firebaseUser.uid)
    );
    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    // Listen to Reports
    const qReports = query(
      collection(db, 'reports'),
      where('patientUid', '==', firebaseUser.uid)
    );
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      setReports(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });

    return () => {
      unsubAppointments();
      unsubReports();
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-stone-200">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-100">
            <img 
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || user?.email}&background=10b981&color=fff`} 
              alt="Profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900">Hello, {user?.displayName?.split(' ')[0] || 'Patient'}</h1>
            <p className="text-stone-500">Welcome to your health dashboard. Stay updated with your medical records.</p>
          </div>
        </div>
        <Link 
          to="/doctors" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Book Appointment
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Appointments Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-600" />
              Recent Appointments
            </h2>
          </div>

          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-4">
                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-300">
                  <Calendar className="w-8 h-8" />
                </div>
                <p className="text-stone-500">No appointments found.</p>
                <Link to="/doctors" className="text-emerald-600 font-bold inline-block">Book your first appointment</Link>
              </div>
            ) : (
              appointments.map((app, idx) => (
                <motion.div 
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-6 rounded-3xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-emerald-200 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900">{app.doctorName}</h4>
                      <p className="text-xs text-stone-500">{format(new Date(app.date), 'MMMM dd, yyyy')} at {app.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${getStatusColor(app.status)}`}>
                      {getStatusIcon(app.status)}
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                    <button className="p-2 hover:bg-stone-50 rounded-lg text-stone-400">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Reports Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Medical Reports
          </h2>

          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-4">
                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-300">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-stone-500">No reports available.</p>
              </div>
            ) : (
              reports.map((report, idx) => (
                <motion.div 
                  key={report.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-6 rounded-3xl border border-stone-200 space-y-4 hover:border-emerald-200 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-bold text-stone-900">{report.title}</h4>
                      <p className="text-xs text-stone-500">{format(new Date(report.date), 'MMM dd, yyyy')}</p>
                    </div>
                    <a 
                      href={report.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                  {report.description && (
                    <p className="text-xs text-stone-500 leading-relaxed">{report.description}</p>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
