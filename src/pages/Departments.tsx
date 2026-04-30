import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { services } from '../data/services';

export default function Departments() {
  return (
    <div className="space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold">Specialized Veterinary Services</h1>
        <p className="text-stone-500 text-lg">We bring together veterinary expertise and modern diagnostic technology to provide specialized services across key pet care areas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {services.map((service, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white p-10 rounded-3xl border border-stone-200 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 transition-all flex flex-col md:flex-row gap-8 items-start"
          >
            <div className="w-20 h-20 shrink-0 rounded-2xl flex items-center justify-center bg-emerald-100 text-emerald-700">
              {service.icon}
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">{service.name}</h3>
              <p className="text-stone-500 leading-relaxed">{service.desc}</p>
              
              {service.equipment && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Key Equipment</p>
                  <div className="flex flex-wrap gap-2">
                    {service.equipment.map((item, i) => (
                      <span key={i} className="text-xs px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 pt-2">
                <Link 
                  to={`/doctors?dept=${service.name}`} 
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
