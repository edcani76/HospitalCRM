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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f8fafc] overflow-hidden font-sans">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? '280px' : '80px',
        }}
        className="relative bg-white border-r border-slate-200 z-50 flex flex-col transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.01)] lg:relative fixed inset-y-0 left-0 lg:inset-auto"
      >
        {/* Mobile close button */}
        {isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 z-50 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand / Logo Area */}
        <div className="p-4 flex items-center gap-3 overflow-hidden">
          <div className="min-w-[36px] w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-lg tracking-tight text-slate-900"
            >
              edvirontvet
            </motion.span>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative
                ${activeTab === item.id 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <div className={`
                min-w-[20px] transition-all duration-300
                ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}
              `}>
                {item.icon}
              </div>
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium text-sm whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-100">
          {user && (
            <div className={`flex items-center gap-3 ${!isSidebarOpen ? 'justify-center' : ''} bg-slate-50 p-2 rounded-lg`}>
              <div className="relative shrink-0">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=3b82f6&color=fff`} 
                  alt={user.displayName} 
                  className="w-8 h-8 rounded-lg object-cover border border-white shadow-sm"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border border-white rounded-full" />
              </div>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-semibold text-slate-900 truncate">{user.displayName || 'User'}</p>
                  <p className="text-[10px] font-medium text-slate-400">{user.role}</p>
                </motion.div>
              )}
              {isSidebarOpen && (
                <button 
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-md transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Sub-header */}
        <header className="h-14 bg-white border-b border-slate-100 px-4 md:px-6 flex items-center justify-between shrink-0 z-30">
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-slate-900 leading-none">{title}</h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-sm mx-4 relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-stone-100 border-none rounded-lg py-1.5 pr-3 pl-10 text-sm focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-primary bg-slate-50 hover:bg-white rounded-lg transition-all relative border border-transparent hover:border-slate-100">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full border border-white" />
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
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
