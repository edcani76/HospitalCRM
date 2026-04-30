import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Menu, X, ChevronRight, 
  LogOut, User, Bell, Settings, Search, Home 
} from 'lucide-react';
import { UserProfile } from '../types';
import { auth, signOut } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  menuItems: MenuItem[];
  activeTab: string;
  onTabChange: (id: any) => void;
  user: UserProfile | null;
  title?: string;
}

export default function DashboardLayout({ 
  children, 
  menuItems, 
  activeTab, 
  onTabChange, 
  user,
  title = "Dashboard"
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f8fafc] overflow-hidden font-sans">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(true)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? '280px' : '80px',
        }}
        className="relative bg-white border-r border-slate-200 z-50 flex flex-col transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.01)]"
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-8 w-7 h-7 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary shadow-sm z-50 transition-all hover:scale-110 active:scale-95"
        >
          {isSidebarOpen ? <ChevronRight className="w-4 h-4 rotate-180" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Brand / Logo Area */}
        <div className="p-6 flex items-center gap-3 overflow-hidden">
          <div className="min-w-[44px] w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/10 transform rotate-3">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-black text-2xl tracking-tighter text-slate-900"
            >
              MediPaws
            </motion.span>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group relative
                ${activeTab === item.id 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <div className={`
                min-w-[24px] transition-all duration-300
                ${activeTab === item.id ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-600'}
              `}>
                {item.icon}
              </div>
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-bold text-[13px] whitespace-nowrap tracking-tight"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-100">
          {user && (
            <div className={`flex items-center gap-4 ${!isSidebarOpen ? 'justify-center' : ''} bg-slate-50 p-3 rounded-3xl`}>
              <div className="relative shrink-0">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=3b82f6&color=fff`} 
                  alt={user.displayName} 
                  className="w-10 h-10 rounded-2xl object-cover border-2 border-white shadow-sm"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-50 rounded-full" />
              </div>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-black text-slate-900 truncate leading-tight">{user.displayName || 'User'}</p>
                  <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-0.5">{user.role}</p>
                </motion.div>
              )}
              {isSidebarOpen && (
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Sub-header with Glassmorphism and Breadcrumbs */}
        <header className="h-20 bg-white border-b border-slate-100 px-10 flex items-center justify-between shrink-0 z-30 sticky top-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">
              <Home className="w-3 h-3" />
              <span>System</span>
              <ChevronRight className="w-2 h-2" />
              <span className="text-primary">{title}</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 leading-none">{title}</h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8 relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search patients, records, or invoices..." 
              className="w-full bg-stone-100 border-none rounded-2xl py-2 pr-4 pl-10 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-3 text-slate-400 hover:text-primary bg-slate-50 hover:bg-white rounded-2xl transition-all relative shadow-sm border border-transparent hover:border-slate-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full border-2 border-white" />
            </button>
            <button className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
