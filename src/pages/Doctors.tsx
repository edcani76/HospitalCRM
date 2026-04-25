import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db, collection, getDocs } from '../firebase';
import { Doctor } from '../types';
import { motion } from 'motion/react';
import { Search, Filter, Stethoscope, ArrowRight, Star, Clock } from 'lucide-react';

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const deptFilter = searchParams.get('dept');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState(deptFilter || 'All');

  useEffect(() => {
    const fetchDoctors = async () => {
      const querySnapshot = await getDocs(collection(db, 'doctors'));
      const docsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      
      // If no doctors in DB, add some mock ones for demo
      if (docsData.length === 0) {
        const mockDoctors: Doctor[] = [
          { id: '1', name: 'Dr. Sarah Johnson', specialization: 'Cardiologist', department: 'Cardiology', experience: 12, image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400', bio: 'Expert in non-invasive cardiology and heart failure management.' },
          { id: '2', name: 'Dr. Michael Chen', specialization: 'Neurologist', department: 'Neurology', experience: 15, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400', bio: 'Specializes in stroke recovery and neurodegenerative disorders.' },
          { id: '3', name: 'Dr. Emily Rodriguez', specialization: 'Pediatrician', department: 'Pediatrics', experience: 8, image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400', bio: 'Dedicated to providing compassionate care for children of all ages.' },
          { id: '4', name: 'Dr. James Wilson', specialization: 'Orthopedic Surgeon', department: 'Orthopedics', experience: 20, image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400', bio: 'Expert in joint replacement and sports medicine surgery.' },
          { id: '5', name: 'Dr. Lisa Park', specialization: 'Dermatologist', department: 'Dermatology', experience: 10, image: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400', bio: 'Specializes in cosmetic dermatology and skin cancer treatment.' },
          { id: '6', name: 'Dr. David Miller', specialization: 'Oncologist', department: 'Oncology', experience: 18, image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400', bio: 'Focused on personalized cancer treatment and clinical trials.' },
        ];
        setDoctors(mockDoctors);
      } else {
        setDoctors(docsData);
      }
      setLoading(false);
    };

    fetchDoctors();
  }, []);

  const departments = ['All', ...Array.from(new Set(doctors.map(d => d.department)))];

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || doctor.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Our Veterinary Experts</h1>
          <p className="text-stone-500 max-w-xl">Find and book visits with our experienced veterinarians across key pet-care specialties.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input 
              type="text" 
              placeholder="Search veterinarians or specialty..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white border border-stone-200 rounded-2xl w-full sm:w-64 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white border border-stone-200 rounded-2xl w-full sm:w-48 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none transition-all"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-96 bg-stone-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDoctors.map((doctor, idx) => (
            <motion.div 
              key={doctor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-3xl border border-stone-200 overflow-hidden hover:shadow-2xl hover:shadow-emerald-900/5 transition-all group"
            >
              <div className="aspect-[4/3] relative overflow-hidden">
                <img 
                  src={doctor.image} 
                  alt={doctor.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <Star className="w-3 h-3 fill-emerald-700" />
                  4.9
                </div>
                <div className="absolute bottom-4 left-4 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  {doctor.department}
                </div>
              </div>
              <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-stone-900">{doctor.name}</h3>
                  <p className="text-emerald-600 font-medium text-sm">{doctor.specialization}</p>
                </div>
                <p className="text-stone-500 text-sm line-clamp-2 leading-relaxed">
                  {doctor.bio}
                </p>
                <div className="flex items-center gap-6 py-2 border-y border-stone-100">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    {doctor.experience} Years Exp.
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Stethoscope className="w-4 h-4 text-emerald-500" />
                    1k+ Pets Treated
                  </div>
                </div>
                <Link 
                  to={`/book-appointment?doctorId=${doctor.id}`} 
                  className="w-full bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  Book Visit <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredDoctors.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
            <Search className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold">No veterinarians found</h3>
          <p className="text-stone-500">Try adjusting your search or filter criteria.</p>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedDept('All'); }}
            className="text-emerald-600 font-bold"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
