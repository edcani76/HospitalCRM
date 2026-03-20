import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, UserRound, Stethoscope, Activity, Heart, ShieldCheck, ArrowRight, Clock, Star } from 'lucide-react';

export default function Home() {
  const features = [
    { icon: <Calendar className="w-6 h-6" />, title: "Easy Booking", desc: "Book appointments with your preferred doctors in seconds." },
    { icon: <UserRound className="w-6 h-6" />, title: "Expert Doctors", desc: "Access to top-tier medical professionals across all specializations." },
    { icon: <ShieldCheck className="w-6 h-6" />, title: "Secure Data", desc: "Your medical records and personal data are fully encrypted." },
    { icon: <Activity className="w-6 h-6" />, title: "Real-time Updates", desc: "Get instant notifications about your appointments and reports." },
  ];

  const departments = [
    { name: "Cardiology", icon: <Heart className="w-8 h-8 text-red-500" />, desc: "Expert care for your heart and vascular system." },
    { name: "Neurology", icon: <Activity className="w-8 h-8 text-blue-500" />, desc: "Advanced treatment for brain and nervous system disorders." },
    { name: "Pediatrics", icon: <UserRound className="w-8 h-8 text-yellow-500" />, desc: "Compassionate healthcare for children and adolescents." },
    { name: "Orthopedics", icon: <Activity className="w-8 h-8 text-emerald-500" />, desc: "Specialized care for bones, joints, and muscles." },
  ];

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-emerald-950 text-white py-20 px-8 md:px-16">
        <div className="relative z-10 max-w-2xl space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold leading-tight"
          >
            Your Health, <br />
            <span className="text-emerald-400">Our Priority.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-emerald-100/80 max-w-lg"
          >
            Experience world-class healthcare with MediGreen. Modern facilities, expert doctors, and patient-centric care all in one place.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/doctors" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-full font-semibold flex items-center gap-2 transition-all">
              Book Appointment <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/departments" className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full font-semibold backdrop-blur-sm transition-all">
              Our Services
            </Link>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full hidden lg:block">
          <img 
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1000" 
            alt="Hospital Hallway" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-emerald-950/0 to-emerald-950" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="p-8 bg-white rounded-3xl border border-stone-200 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 transition-all group"
          >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-stone-500 text-sm leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Departments Section */}
      <section className="space-y-12">
        <div className="flex justify-between items-end">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">Our Departments</h2>
            <p className="text-stone-500 max-w-xl">We offer specialized care across various medical fields, ensuring comprehensive health solutions for all our patients.</p>
          </div>
          <Link to="/departments" className="text-emerald-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
            View All <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {departments.map((dept, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -8 }}
              className="p-8 bg-stone-100 rounded-3xl border border-transparent hover:bg-white hover:border-stone-200 transition-all"
            >
              <div className="mb-6">{dept.icon}</div>
              <h3 className="text-xl font-bold mb-3">{dept.name}</h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">{dept.desc}</p>
              <Link to={`/doctors?dept=${dept.name}`} className="text-emerald-600 text-sm font-bold flex items-center gap-2">
                Find Doctors <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-emerald-50 rounded-3xl p-12 md:p-20 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
        <div className="space-y-2">
          <p className="text-4xl md:text-5xl font-bold text-emerald-900">15k+</p>
          <p className="text-emerald-600 font-medium">Happy Patients</p>
        </div>
        <div className="space-y-2">
          <p className="text-4xl md:text-5xl font-bold text-emerald-900">120+</p>
          <p className="text-emerald-600 font-medium">Expert Doctors</p>
        </div>
        <div className="space-y-2">
          <p className="text-4xl md:text-5xl font-bold text-emerald-900">25+</p>
          <p className="text-emerald-600 font-medium">Departments</p>
        </div>
        <div className="space-y-2">
          <p className="text-4xl md:text-5xl font-bold text-emerald-900">15+</p>
          <p className="text-emerald-600 font-medium">Years Experience</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden rounded-3xl bg-stone-900 text-white p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="space-y-6 max-w-xl">
          <h2 className="text-4xl font-bold">Ready to take care of your health?</h2>
          <p className="text-stone-400">Join thousands of patients who trust MediGreen for their medical needs. Start your journey to better health today.</p>
          <div className="flex gap-4">
            <Link to="/login" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-full font-semibold transition-all">
              Get Started
            </Link>
            <Link to="/doctors" className="border border-stone-700 hover:bg-stone-800 text-white px-8 py-4 rounded-full font-semibold transition-all">
              Find a Doctor
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl absolute -top-12 -right-12" />
          <div className="bg-stone-800 p-8 rounded-3xl border border-stone-700 space-y-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-stone-400">Emergency Support</p>
                <p className="text-xl font-bold">24/7 Available</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-stone-400">Patient Rating</p>
                <p className="text-xl font-bold">4.9/5.0 Stars</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
