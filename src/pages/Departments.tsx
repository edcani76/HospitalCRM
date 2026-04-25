import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Activity, UserRound, Brain, Eye, Baby, Bone, Microscope, ArrowRight } from 'lucide-react';

export default function Departments() {
  const departments = [
    { name: "Cardiology", icon: <Heart className="w-10 h-10" />, color: "bg-red-50 text-red-600", desc: "Our veterinary cardiology team supports pets with heart conditions through diagnostics, treatment, and long-term monitoring." },
    { name: "Neurology", icon: <Brain className="w-10 h-10" />, color: "bg-blue-50 text-blue-600", desc: "Expert neurologists treating complex brain and nervous system disorders using the latest diagnostic and therapeutic technologies." },
    { name: "Puppy & Kitten Care", icon: <Baby className="w-10 h-10" />, color: "bg-yellow-50 text-yellow-600", desc: "Specialized care for puppies and kittens, including vaccination schedules, nutrition guidance, and growth checkups." },
    { name: "Orthopedics", icon: <Bone className="w-10 h-10" />, color: "bg-emerald-50 text-emerald-600", desc: "Comprehensive treatment for musculoskeletal conditions, including joint replacements, sports injuries, and spinal disorders." },
    { name: "Ophthalmology", icon: <Eye className="w-10 h-10" />, color: "bg-purple-50 text-purple-600", desc: "Advanced eye care services, from routine vision exams to complex surgical procedures for cataracts and glaucoma." },
    { name: "Oncology", icon: <Microscope className="w-10 h-10" />, color: "bg-indigo-50 text-indigo-600", desc: "Personalized cancer care plans for pets, combining advanced treatment options with supportive family guidance." },
    { name: "Dermatology", icon: <UserRound className="w-10 h-10" />, color: "bg-orange-50 text-orange-600", desc: "Expert care for skin, hair, and nail conditions, including medical, surgical, and cosmetic dermatology services." },
    { name: "Urgent Care", icon: <Activity className="w-10 h-10" />, color: "bg-rose-50 text-rose-600", desc: "24/7 urgent and emergency care with experienced veterinary teams ready for critical situations." },
  ];

  return (
    <div className="space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold">Specialized Veterinary Services</h1>
        <p className="text-stone-500 text-lg">We bring together veterinary expertise and modern diagnostic technology to provide specialized services across key pet care areas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {departments.map((dept, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white p-10 rounded-3xl border border-stone-200 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 transition-all flex flex-col md:flex-row gap-8 items-start"
          >
            <div className={`w-20 h-20 shrink-0 rounded-2xl flex items-center justify-center ${dept.color}`}>
              {dept.icon}
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">{dept.name}</h3>
              <p className="text-stone-500 leading-relaxed">{dept.desc}</p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link 
                  to={`/doctors?dept=${dept.name}`} 
                  className="text-emerald-600 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all"
                >
                  Find Veterinarians <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="bg-stone-900 text-white rounded-3xl p-12 md:p-20 text-center space-y-8">
        <h2 className="text-3xl md:text-4xl font-bold">Can't find what you're looking for?</h2>
        <p className="text-stone-400 max-w-2xl mx-auto">Our general veterinary team handles a wide range of pet health concerns. Contact us for guidance on the right specialist for your pet.</p>
        <div className="flex justify-center gap-4">
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-full font-semibold transition-all">
            Contact Support
          </button>
          <button className="border border-stone-700 hover:bg-stone-800 text-white px-8 py-4 rounded-full font-semibold transition-all">
            Call (555) 123-4567
          </button>
        </div>
      </section>
    </div>
  );
}
