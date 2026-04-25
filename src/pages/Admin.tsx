import React, { useState, useEffect } from 'react';
import { db, collection, query, getDocs, updateDoc, doc, deleteDoc, where, onSnapshot } from '../firebase';
import { Appointment, UserProfile, Doctor } from '../types';
import { motion } from 'motion/react';
import { Users, Calendar, Stethoscope, Filter, Search, CheckCircle, XCircle, Trash2, ShieldCheck, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

export default function Admin() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'appointments' | 'users' | 'doctors'>('appointments');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    // Listen to Appointments
    const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    // Listen to Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(data);
    });

    // Listen to Doctors
    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      setDoctors(data);
      setLoading(false);
    });

    return () => {
      unsubAppointments();
      unsubUsers();
      unsubDoctors();
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      try {
        await deleteDoc(doc(db, 'appointments', id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredAppointments = appointments.filter(app => {
    const matchesSearch = app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-emerald-600" />
            Admin Control Panel
          </h1>
          <p className="text-stone-500">Manage clinic operations, visits, and veterinary staff.</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 space-y-2">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-stone-500 text-sm font-bold uppercase">Total Appointments</p>
          <p className="text-4xl font-bold">{appointments.length}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-stone-200 space-y-2">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-stone-500 text-sm font-bold uppercase">Total Pets</p>
          <p className="text-4xl font-bold">{users.filter(u => u.role === 'patient').length}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-stone-200 space-y-2">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Stethoscope className="w-6 h-6" />
          </div>
          <p className="text-stone-500 text-sm font-bold uppercase">Total Veterinarians</p>
          <p className="text-4xl font-bold">{doctors.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        {(['appointments', 'users', 'doctors'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-4 text-sm font-bold capitalize transition-all border-b-2 ${
              activeTab === tab 
                ? "border-emerald-600 text-emerald-600" 
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="Search by pet owner or veterinarian..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-3 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-12 pr-10 py-3 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                >
                  <option value="All">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase">Pet Owner</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase">Veterinarian</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase">Date & Time</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredAppointments.map((app) => (
                      <tr key={app.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-stone-900">{app.patientName}</p>
                          <p className="text-xs text-stone-400">ID: {app.patientUid.slice(0, 8)}...</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-stone-900">{app.doctorName}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium">{format(new Date(app.date), 'MMM dd, yyyy')}</p>
                          <p className="text-xs text-stone-400">{app.time}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                            app.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                            app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            app.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {app.status === 'pending' && (
                              <button 
                                onClick={() => handleUpdateStatus(app.id, 'confirmed')}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Confirm"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            )}
                            {app.status !== 'cancelled' && app.status !== 'completed' && (
                              <button 
                                onClick={() => handleUpdateStatus(app.id, 'cancelled')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Cancel"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteAppointment(app.id)}
                              className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredAppointments.length === 0 && (
                <div className="p-20 text-center text-stone-400">
                  No visits found matching your criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(user => (
              <div key={user.uid} className="bg-white p-6 rounded-3xl border border-stone-200 flex items-center gap-4">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=10b981&color=fff`} 
                  alt={user.displayName} 
                  className="w-12 h-12 rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 truncate">{user.displayName || 'Anonymous'}</p>
                  <p className="text-xs text-stone-400 truncate">{user.email}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  user.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                  'bg-stone-100 text-stone-700'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'doctors' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add New Veterinarian
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map(doctor => (
                <div key={doctor.id} className="bg-white p-6 rounded-3xl border border-stone-200 space-y-4">
                  <div className="flex items-center gap-4">
                    <img src={doctor.image} alt={doctor.name} className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <h4 className="font-bold text-stone-900">{doctor.name}</h4>
                      <p className="text-xs text-emerald-600 font-bold">{doctor.department}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                    <p className="text-xs text-stone-400">Experience: <span className="text-stone-900 font-bold">{doctor.experience} Yrs</span></p>
                    <button className="text-xs font-bold text-emerald-600 hover:underline">Edit Profile</button>
                  </div>
                </div>
              ))}
              {doctors.length === 0 && (
                <div className="col-span-full p-20 text-center text-stone-400 bg-white rounded-3xl border border-dashed border-stone-300">
                  No veterinarians registered in the database yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
