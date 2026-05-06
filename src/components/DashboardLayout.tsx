import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Menu, X, ChevronLeft, ChevronRight,
  LogOut, User, Bell, Search
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 1024;
      setIsMobile(m);
      if (!m) setMobileOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f8fafc] overflow-hidden font-sans">
      {/* Mobile overlay - blocks interaction with main content when sidebar is open */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          bg-white border-r border-slate-200 flex flex-col z-50 shadow-sm transition-all duration-300 ease-in-out
          ${isMobile
            ? 'fixed inset-y-0 left-0 w-[280px] transition-transform duration-300'
            : `relative ${expanded ? 'w-[280px]' : 'w-20'}`
          }
          ${isMobile ? (mobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-3 border-b border-slate-100 flex items-center gap-2">
          {/* Mobile close button */}
          {isMobile && mobileOpen && (
            <button 
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* Desktop toggle button */}
          {!isMobile && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 shrink-0"
            >
              {expanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {/* Mobile hamburger trigger (when closed) - not needed here, in header */}
          
          <div className="min-w-[32px] w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white shrink-0">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          {(expanded || (isMobile && mobileOpen)) && (
            <motion.span 
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-base tracking-tight text-slate-900 truncate"
            >
              edvirontvet
            </motion.span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                if (isMobile) setMobileOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all
                ${activeTab === item.id 
                  ? 'bg-slate-900 text-white' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <div className={`min-w-[20px] shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`}>
                {item.icon}
              </div>
              {(expanded || (isMobile && mobileOpen)) && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium text-sm whitespace-nowrap truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-2 border-t border-slate-100">
          {user && (
            <div className={`flex items-center gap-2 bg-slate-50 p-2 rounded-lg ${(expanded || (isMobile && mobileOpen)) ? '' : 'justify-center'}`}>
              <div className="relative shrink-0">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=3b82f6&color=fff`} 
                  alt={user.displayName} 
                  className="w-7 h-7 rounded-md object-cover border border-white"
                />
              </div>
              {(expanded || (isMobile && mobileOpen)) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-semibold text-slate-900 truncate">{user.displayName || 'User'}</p>
                  <p className="text-[10px] font-medium text-slate-400">{user.role}</p>
                </motion.div>
              )}
              {(expanded || (isMobile && mobileOpen)) && (
                <button 
                  onClick={handleLogout}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Header */}
        <header className="h-12 bg-white border-b border-slate-100 px-3 md:px-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger for mobile */}
            {isMobile && !mobileOpen && (
              <button
                onClick={() => setMobileOpen(true)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 shrink-0"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-sm font-semibold text-slate-900 leading-none truncate">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-slate-50 border-none rounded-md py-1.5 pr-3 pl-9 text-xs focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all outline-none w-48"
              />
            </div>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
