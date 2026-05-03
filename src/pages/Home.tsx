import React from 'react';
import { motion } from 'motion/react';
import { Shield, Clock, Heart, Clipboard, Star, CheckCircle, ArrowRight, Activity, Users, Stethoscope, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Advanced Diagnostics',
    desc: 'State-of-the-art laboratory and imaging services for accurate pet health assessment.',
    icon: Activity,
    color: 'bg-emerald-50 text-emerald-600'
  },
  {
    title: 'Expert Specialists',
    desc: 'A dedicated team of veterinary professionals with decades of combined experience.',
    icon: Stethoscope,
    color: 'bg-indigo-50 text-indigo-600'
  },
  {
    title: '24/7 Monitoring',
    desc: 'Round-the-clock patient tracking and emergency response systems.',
    icon: Clock,
    color: 'bg-rose-50 text-rose-600'
  }
];

const services = [
  { title: 'Cardiology', description: 'Advanced heart health monitoring.', icon: '❤️' },
  { title: 'Oncology', description: 'Compassionate cancer care.', icon: '🎗️' },
  { title: 'Orthopedics', description: 'Surgical bone and joint repair.', icon: '🦴' },
  { title: 'Neurology', description: 'Expert nervous system care.', icon: '🧠' },
];

export default function Home() {
  return (
    <div className="space-y-32 pb-32">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] -mr-96 -mt-96" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] -ml-72 -mb-72" />
        
        <div className="container mx-auto px-6 relative z-10 max-w-7xl">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-emerald-100"
            >
              <ShieldCheck className="w-4 h-4" />
              Advanced Clinical Care
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-7xl md:text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter mb-8"
            >
              Excellence in <br />
              <span className="text-emerald-500">Pet Medicine.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-slate-500 font-medium max-w-2xl leading-relaxed mb-12"
            >
              MediPaws combines world-class clinical expertise with state-of-the-art technology to provide the highest standard of care for your family members.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-6"
            >
              <Link 
                to="/book-appointment" 
                className="px-10 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 hover:bg-emerald-600 hover:scale-105 transition-all shadow-2xl shadow-slate-900/20"
              >
                Schedule Consultation <ArrowRight className="w-6 h-6" />
              </Link>
                <Link 
                  to="/departments" 
                  className="px-10 py-6 bg-white text-slate-900 border border-slate-100 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-xl"
                >
                  Check Our Services
                </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Grid */}
      <section className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { icon: <Clock className="w-8 h-8" />, title: "24/7 Clinical", desc: "Always available emergency response unit for critical care." },
            { icon: <Stethoscope className="w-8 h-8" />, title: "Specialized", desc: "From oncology to orthopedics, we cover every field of vet care." },
            { icon: <ShieldCheck className="w-8 h-8" />, title: "Tech-Driven", desc: "Integrated digital health records and AI diagnostic tools." }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-10 bg-white rounded-[3rem] border border-slate-50 shadow-2xl shadow-slate-200/40 group hover:border-emerald-100 transition-all"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-emerald-500 mb-8 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                {item.icon}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">{item.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Services Section removed */}

      {/* CTA Section */}
      <section className="container mx-auto px-6 max-w-7xl">
        <div className="bg-slate-900 rounded-[4rem] p-12 md:p-24 relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-50" />
          <div className="relative z-10 max-w-3xl mx-auto space-y-10">
            <h2 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tighter">
              Ready to provide the <span className="text-emerald-400">best</span> care?
            </h2>
            <p className="text-slate-400 text-xl font-medium">Join the MediPaws family today and ensure a healthier future for your companions.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link 
                to="/signup" 
                className="px-12 py-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-[2rem] font-black text-lg transition-all shadow-2xl shadow-emerald-500/40"
              >
                Get Started
              </Link>
              <Link 
                to="/contact" 
                className="px-12 py-6 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-[2rem] font-black text-lg transition-all"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
