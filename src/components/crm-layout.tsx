import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/utils'
import { format } from 'date-fns'
import {
  LayoutDashboard,
  CalendarClock,
  PawPrint,
  User,
  ClipboardList,
  Wallet,
  Briefcase,
  Pill,
  FlaskConical,
  LineChart,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  History,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  Bed
} from 'lucide-react'
import { signOut, auth } from '../firebase'
import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { fetchPets, fetchUsers } from '../lib/firestore-helpers'
import { getNotifications, markAsRead, Notification } from '../lib/notifications'
import { Badge } from './ui/badge'

interface CRMBreadcrumb {
  name: string;
  path?: string;
}

const BREADCRUMB_KEY = 'crm_breadcrumbs';

interface CRMLayoutProps {
  children: React.ReactNode
}

// Helper to check if online
function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ children }) => {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarDesktop, setSidebarDesktop] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setSidebarDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSidebarDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const [online, setOnline] = useState(isOnline())
  const [syncing, setSyncing] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const navigate = useNavigate();

  // Setup online/offline listeners
  useEffect(() => {
    const updateStatus = async () => {
      setOnline(isOnline());
      try {
        const mutations = await getQueuedMutations();
        setQueuedCount(mutations.length);
      } catch (e) {}
    };
    updateStatus();

    const handleOnline = () => {
      setOnline(true);
      updateStatus();
    };

    const handleOffline = () => {
      setOnline(false);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch notifications for current user
  useEffect(() => {
    if (!user?.uid) return;
    
    const fetchNotifications = async () => {
      try {
        const notifs = await getNotifications(user.uid);
        setNotifications(notifs);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
    
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncMutations(async (mutation) => {
        // This is a simplified sync - in production, you'd call the actual Firestore functions
        console.log('Syncing mutation:', mutation);
        // You would implement actual sync logic here based on mutation.type
      });
      alert(`Sync complete: ${result.success} succeeded, ${result.failed} failed`);
      const mutations = await getQueuedMutations();
      setQueuedCount(mutations.length);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Helper functions for offline-cache (define them here or import)
  async function getQueuedMutations(): Promise<any[]> {
    try {
      const { getQueuedMutations: getM } = await import('../lib/offline-cache');
      return getM();
    } catch {
      return [];
    }
  }

  async function syncMutations(syncFn: (mutation: any) => Promise<void>): Promise<{ success: number; failed: number }> {
    try {
      const { syncMutations: syncM } = await import('../lib/offline-cache');
      return syncM(syncFn);
    } catch {
      return { success: 0, failed: 0 };
    }
  }

  const isActive = (path: string) => location.pathname === path

  const getMenuItems = () => {
    const role = user?.role
    const dashboardPath = `/crm/${role}-dashboard`

    const menuItems = [
      {
        name: 'Dashboard',
        path: dashboardPath,
        icon: LayoutDashboard,
        roles: ['admin', 'doctor', 'staff', 'lab', 'pharmacist'],
      },
      {
        name: 'Appointments',
        path: '/crm/appointments',
        icon: CalendarClock,
        roles: ['admin', 'doctor', 'staff'],
      },
      {
        name: 'Patients',
        path: '/crm/patients',
        icon: PawPrint,
        roles: ['admin', 'doctor', 'staff'],
      },
      {
        name: 'Pet Owners',
        path: '/crm/owners',
        icon: User,
        roles: ['admin', 'doctor', 'staff'],
      },
      {
        name: 'EMR & Medical Records',
        path: '/crm/emr',
        icon: ClipboardList,
        roles: ['admin', 'doctor', 'staff'],
      },
      {
        name: 'Availability',
        path: '/crm/doctor-availability',
        icon: CalendarClock,
        roles: ['doctor'],
      },
      {
        name: 'Billing',
        path: '/crm/billing',
        icon: Wallet,
        roles: ['admin', 'staff'],
      },
      {
        name: 'Pharmacy',
        path: '/crm/pharmacy',
        icon: Pill,
        roles: ['admin', 'pharmacist'],
      },
      {
        name: 'Lab & Diagnostics',
        path: '/crm/lab-reports',
        icon: FlaskConical,
        roles: ['admin', 'doctor', 'lab'],
      },
      {
        name: 'Admissions',
        path: '/crm/admissions',
        icon: Bed,
        roles: ['admin', 'doctor', 'staff'],
      },
      {
        name: 'Analytics',
        path: '/crm/analytics',
        icon: LineChart,
        roles: ['admin'],
      },
      {
        name: 'Security',
        path: '/crm/security',
        icon: ShieldCheck,
        roles: ['admin'],
      },
      {
        name: 'Audit Trail',
        path: '/crm/audit',
        icon: History,
        roles: ['admin'],
      },
      {
        name: 'Staff Management',
        path: '/crm/staff',
        icon: Briefcase,
        roles: ['admin'],
      },
      {
        name: 'Settings',
        path: '/crm/settings',
        icon: Settings,
        roles: ['admin'],
      },
    ]

    return menuItems.filter(item => item.roles.includes(role as string))
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  const [pets, setPets] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const [petsData, usersData] = await Promise.all([
          fetchPets(),
          fetchUsers()
        ])
        setPets(petsData)
        setUsers(usersData)
      } catch (error) {
        console.error('Error loading layout data:', error)
      }
    }
    loadData()
  }, [])

const getBreadcrumbs = (): CRMBreadcrumb[] => {
    const pathname = location.pathname
    const segments = pathname.split('/').filter(Boolean)
    const state = location.state as any
    
    // Build breadcrumbs from navigation state if available
    if (state?.breadcrumbParent) {
      const breadcrumbs: CRMBreadcrumb[] = [
        { name: 'Home', path: '/' },
        { name: 'CRM Portal', path: `/crm/${user?.role}-dashboard` },
      ]
      
      // Resolve hierarchy from breadcrumbParent
      const resolveHierarchy = (parent: any): CRMBreadcrumb[] => {
        if (!parent) return [];
        return [...resolveHierarchy(parent.parent), { name: parent.name, path: parent.path }];
      };
      
      const hierarchy = resolveHierarchy(state.breadcrumbParent);
      
      if (hierarchy.length > 0) {
        if (hierarchy[0].path.includes('/crm/owners')) {
          breadcrumbs.push({ name: 'Pet Owners', path: '/crm/owners' });
        } else if (hierarchy[0].path.includes('/crm/patients')) {
          breadcrumbs.push({ name: 'Patients', path: '/crm/patients' });
        }
      }
      
      breadcrumbs.push(...hierarchy);
      
      // Add current page
      const lastSegment = segments[segments.length - 1];
      const pet = pets.find(p => p?.id === lastSegment);
      const owner = users.find(u => u?.id === lastSegment);
      const entityName = pet?.name || owner?.displayName || (lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1));
      
      breadcrumbs.push({ name: entityName, path: pathname });
      
      // Save to sessionStorage for back navigation
      sessionStorage.setItem(BREADCRUMB_KEY, JSON.stringify(breadcrumbs));
      
      return breadcrumbs;
    }
    
    // If navigating from another page (with 'from' in state), include that
    if (state?.from) {
      const breadcrumbs: CRMBreadcrumb[] = [
        { name: 'Home', path: '/' },
        { name: 'CRM Portal', path: `/crm/${user?.role}-dashboard` },
      ]
      
      const fromPath = state.from;
      
      // Parse the 'from' path to extract the page and entity
      const fromSegments = fromPath.split('/').filter(Boolean);
      
      if (fromSegments.includes('patients')) {
        breadcrumbs.push({ name: 'Patients', path: '/crm/patients' });
        // Find the patient ID in the path
        const patientIdx = fromSegments.indexOf('patients');
        if (fromSegments[patientIdx + 1]) {
          const patientId = fromSegments[patientIdx + 1];
          const patient = pets.find(p => p?.id === patientId);
          if (patient) {
            breadcrumbs.push({ name: patient.name, path: fromPath });
          }
        }
      } else if (fromSegments.includes('owners')) {
        breadcrumbs.push({ name: 'Pet Owners', path: '/crm/owners' });
        const ownerIdx = fromSegments.indexOf('owners');
        if (fromSegments[ownerIdx + 1]) {
          const ownerId = fromSegments[ownerIdx + 1];
          const owner = users.find(u => u?.id === ownerId);
          if (owner) {
            breadcrumbs.push({ name: owner.displayName || owner.name, path: fromPath });
          }
        }
      } else if (fromSegments.includes('appointments')) {
        breadcrumbs.push({ name: 'Appointments', path: '/crm/appointments' });
      } else if (fromSegments.includes('emr')) {
        breadcrumbs.push({ name: 'EMR & Medical Records', path: '/crm/emr' });
      }
      
      // Add current page
      const lastSegment = segments[segments.length - 1];
      const pet = pets.find(p => p?.id === lastSegment);
      const owner = users.find(u => u?.id === lastSegment);
      const entityName = pet?.name || owner?.displayName || (lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1));
      
      breadcrumbs.push({ name: entityName, path: pathname });
      
      // Save to sessionStorage
      sessionStorage.setItem(BREADCRUMB_KEY, JSON.stringify(breadcrumbs));
      
      return breadcrumbs;
    }

    // Default: generate breadcrumbs from path segments
    const breadcrumbs: CRMBreadcrumb[] = [
      { name: 'Home', path: '/' },
      { name: 'CRM Portal', path: `/crm/${user?.role}-dashboard` },
    ]

    const pageNames: { [key: string]: string } = {
      'admin-dashboard': 'Admin Dashboard',
      'doctor-dashboard': 'Doctor Dashboard',
      'staff-dashboard': 'Staff Dashboard',
      'lab-dashboard': 'Lab Dashboard',
      'pharmacist-dashboard': 'Pharmacist Dashboard',
      'appointments': 'Appointments',
      'patients': 'Patients',
      'owners': 'Pet Owners',
      'emr': 'EMR & Medical Records',
      'billing': 'Billing',
      'pharmacy': 'Pharmacy',
      'lab-reports': 'Lab & Diagnostics',
      'analytics': 'Analytics',
      'audit': 'Audit Trail',
      'security': 'Security',
      'staff': 'Staff Management',
      'settings': 'Settings',
    }

    segments.forEach((segment, index) => {
      if (segment === 'crm') return;
      const path = '/' + segments.slice(0, index + 1).join('/');
      
      let name = pageNames[segment];
      if (!name) {
        const pet = pets.find(p => p?.id === segment);
        const owner = users.find(u => u?.id === segment);
        name = pet?.name || owner?.displayName || (segment.charAt(0).toUpperCase() + segment.slice(1));
      }
      
      if (!breadcrumbs.find(b => b.path === path)) {
        breadcrumbs.push({ name, path })
      }
    })

    // Save to sessionStorage
    sessionStorage.setItem(BREADCRUMB_KEY, JSON.stringify(breadcrumbs));

return breadcrumbs
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Mobile sidebar overlay */}
      {!sidebarDesktop && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-card border-r border-border flex flex-col z-50",
          sidebarDesktop
            ? cn("relative transition-all duration-300", sidebarOpen ? "w-64" : "w-16")
            : cn("fixed inset-y-0 left-0 w-64 transition-transform duration-300", sidebarOpen ? "translate-x-0" : "-translate-x-full")
        )}
      >
        {/* Sidebar Header - toggle removed, positioned on border instead */}
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className={cn("flex items-center gap-2 overflow-hidden transition-opacity duration-300", !sidebarOpen && "opacity-0 invisible w-0")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="text-primary-foreground" size={18} />
            </div>
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-tight truncate">edvirontvet</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{user?.role} Mode</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-1">
            {getMenuItems().map((item, index) => (
              <li key={index}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon size={18} />
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout button */}
        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Desktop toggle button - aligned with header, centered on the border */}
      {sidebarDesktop && (
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute z-50 w-8 h-8 rounded-full bg-slate-100 border border-slate-200/50 shadow-lg flex items-center justify-center text-muted-foreground hover:bg-slate-200 hover:text-foreground transition-all"
          style={{ top: '28px', left: sidebarOpen ? '256px' : '64px', transform: 'translateX(-50%)' }}
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Area (Breadcrumbs + Theme Toggle) */}
        <div className="border-b border-border px-4 py-3 bg-background flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger menu button for mobile */}
            {!sidebarDesktop && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
                title="Open Menu"
              >
                <Menu size={20} />
              </button>
            )}
            <nav className="flex items-center space-x-2 text-sm min-w-0">
            {getBreadcrumbs().map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && <span className="text-muted-foreground">/</span>}
                <Link
                  to={crumb.path}
                  className={cn(
                    "hover:text-foreground transition-colors",
                    index === getBreadcrumbs().length - 1
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {crumb.name}
                </Link>
              </React.Fragment>
            ))}
          </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Online/Offline Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${online ? 'bg-emerald-50' : 'bg-red-50'} transition-colors`}>
              {online ? (
                <Wifi size={16} className="text-emerald-600" />
              ) : (
                <WifiOff size={16} className="text-red-600" />
              )}
              <span className={`text-xs font-medium ${online ? 'text-emerald-700' : 'text-red-700'}`}>
                {online ? 'Online' : 'Offline'}
              </span>
              {queuedCount > 0 && online && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  title="Sync offline changes"
                >
                  {syncing ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <>
                      <RefreshCw size={12} />
                      Sync ({queuedCount})
                    </>
                  )}
                </button>
              )}
              {queuedCount > 0 && !online && (
                <span className="text-xs text-red-600">
                  ({queuedCount} pending)
                </span>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-foreground"
                title="Notifications"
              >
                <Bell size={18} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600">
                    {notifications.filter(n => !n.read).length}
                  </Badge>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-96 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl z-50">
                  <div className="p-3 border-b border-slate-100">
                    <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-400">
                      No notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {notifications.slice(0, 20).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={async () => {
                            if (!notif.read) {
                              await markAsRead(notif.id!);
                              setNotifications(prev => prev.map(n => n.id === notif.id ? {...n, read: true} : n));
                            }
                            if (notif.appointmentId) {
                              setShowNotifications(false);
                              navigate(`/crm/appointments/${notif.appointmentId}`);
                            }
                          }}
                          className={`p-3 cursor-pointer transition-colors hover:bg-slate-50 ${
                            notif.read ? '' : 'bg-blue-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{notif.title}</p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                              {notif.createdAt && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {format(
                                    notif.createdAt?.toDate?.() || new Date(notif.createdAt),
                                    'MMM dd, yyyy hh:mm a'
                                  )}
                                </p>
                              )}
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <User size={16} className="text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{user?.displayName || user?.email}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{user?.role}</span>
              </div>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-foreground"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-muted/30 dark:bg-background">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default CRMLayout
