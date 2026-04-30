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
          { id: '1', name: 'Dr. Sarah Johnson', specialization: 'Veterinary Cardiologist', department: 'Diagnostic Medicine', experience: 12, image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400', bio: 'Expert in non-invasive veterinary cardiology and advanced diagnostics.' },
          { id: '2', name: 'Dr. Michael Chen', specialization: 'Emergency Veterinarian', department: 'After-Hours Emergency Care', experience: 15, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400', bio: 'Specializes in critical care, trauma response, and intensive monitoring.' },
          { id: '3', name: 'Dr. Emily Rodriguez', specialization: 'Preventive Care Vet', department: 'Preventive Care', experience: 8, image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400', bio: 'Dedicated to wellness planning, vaccinations, and long-term health for companion animals.' },
          { id: '4', name: 'Dr. James Wilson', specialization: 'Veterinary Surgeon', department: 'Surgery', experience: 20, image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400', bio: 'Expert in soft tissue and orthopedic surgery with advanced anesthesia monitoring.' },
          { id: '5', name: 'Dr. Lisa Park', specialization: 'Exotic Animal Vet', department: 'Avian and Exotic Pet Care', experience: 10, image: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400', bio: 'Specializes in the unique medical needs of birds, reptiles, and small mammals.' },
          { id: '6', name: 'Dr. David Miller', specialization: 'Rehabilitation Specialist', department: 'Therapy and Rehabilitation', experience: 18, image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400', bio: 'Focused on physical therapy, post-operative recovery, and mobility improvement.' },
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
    <div className="space-y-16 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100">
            <Stethoscope className="w-3.5 h-3.5" />
            Medical Staff Directory
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-none">
            Our Veterinary <br />
            <span className="text-emerald-500">Experts</span>
          </h1>
          <p className="text-slate-500 max-w-xl text-lg font-medium">Find and book visits with our world-class specialists dedicated to your companion's health.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
          <div className="relative group flex-1 sm:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search specialists..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-8 py-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/20 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
            />
          </div>
          <div className="relative group">
            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="pl-14 pr-12 py-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/20 outline-none appearance-none transition-all font-bold text-slate-900 cursor-pointer min-w-[200px]"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
              <ArrowRight className="w-4 h-4 rotate-90 text-slate-300" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {/* Featured: Any Available Doctor */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 text-white rounded-[3.5rem] border border-slate-800 p-10 overflow-hidden hover:shadow-3xl hover:shadow-slate-900/40 transition-all group flex flex-col justify-between relative"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] -mr-24 -mt-24" />
          
          <div className="relative z-10 space-y-8">
            <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
              <Clock className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                Fast Track
              </div>
              <h3 className="text-4xl font-black tracking-tight leading-none">Any Available <br />Specialist</h3>
              <p className="text-slate-400 font-medium">The quickest way to get professional care.</p>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed font-bold uppercase tracking-tighter">
              Ideal for non-critical checkups or immediate clinical concerns.
            </p>
          </div>

          <div className="relative z-10 mt-12">
            <Link 
              to="/book-appointment" 
              className="w-full bg-white hover:bg-emerald-500 hover:text-white text-slate-900 py-6 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 transition-all group/btn shadow-xl"
            >
              Express Booking <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
            </Link>
          </div>
        </motion.div>

        {filteredDoctors.map((doctor, idx) => (
          <motion.div 
            key={doctor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all group flex flex-col"
          >
            <div className="aspect-[4/5] relative overflow-hidden">
              <img 
                src={doctor.image} 
                alt={doctor.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-black text-slate-900 shadow-xl border border-white/20">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                4.9
              </div>
              
              <div className="absolute bottom-6 left-6 right-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mb-2">
                  {doctor.department}
                </div>
                <h3 className="text-2xl font-black text-white leading-tight">{doctor.name}</h3>
              </div>
            </div>

            <div className="p-10 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors lg:hidden">{doctor.name}</h3>
                  <p className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">{doctor.specialization}</p>
                </div>
                <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2 italic">
                  "{doctor.bio}"
                </p>
                
                <div className="grid grid-cols-2 gap-4 py-6 border-y border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Experience</p>
                    <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      {doctor.experience}Y+ Clinical
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Caseload</p>
                    <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-emerald-500" />
                      1.2k+ Treated
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link 
                  to={`/book-appointment?doctorId=${doctor.id}`} 
                  className="w-full bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 py-5 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 transition-all group/btn shadow-sm"
                >
                  Schedule Visit <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {!loading && filteredDoctors.length === 0 && (
        <div className="text-center py-32 space-y-8 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-100">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto text-slate-200 shadow-xl">
            <Search className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">No Specialists Found</h3>
            <p className="text-slate-400 font-medium">Refine your search parameters to find a clinical match.</p>
          </div>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedDept('All'); }}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all shadow-xl shadow-slate-900/20"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>

  );
}
