import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/utils'
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
  RefreshCw
} from 'lucide-react'
import { signOut, auth } from '../firebase'
import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { fetchPets, fetchUsers } from '../lib/firestore-helpers'
import { isOnline, getQueuedMutations, syncMutations } from '../lib/offline-cache'

interface CRMLayoutProps {
  children: React.ReactNode
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ children }) => {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [online, setOnline] = useState(isOnline())
  const [syncing, setSyncing] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)

  // Update online status and queued count
  useEffect(() => {
    const updateStatus = async () => {
      setOnline(isOnline());
      const mutations = await getQueuedMutations();
      setQueuedCount(mutations.length);
    };
    updateStatus();

    const cleanup = setupConnectivityListeners(
      async () => {
        setOnline(true);
        const mutations = await getQueuedMutations();
        setQueuedCount(mutations.length);
      },
      () => setOnline(false)
    );

    return cleanup;
  }, []);

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
        name: 'Medical Records',
        path: '/crm/emr',
        icon: ClipboardList,
        roles: ['admin', 'doctor', 'staff'],
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
        name: 'Lab Reports',
        path: '/crm/lab-reports',
        icon: FlaskConical,
        roles: ['admin', 'doctor', 'lab'],
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

  const getBreadcrumbs = () => {
    const pathname = location.pathname
    const segments = pathname.split('/').filter(Boolean)
    const state = location.state as any
    
    const breadcrumbs = [
      { name: 'Home', path: '/' },
      { name: 'CRM Portal', path: `/crm/${user?.role}-dashboard` },
    ]

    const pageNames: { [key: string]: string } = {
      'crm': 'CRM Portal',
      'admin-dashboard': 'Admin Dashboard',
      'doctor-dashboard': 'Doctor Dashboard',
      'staff-dashboard': 'Staff Dashboard',
      'lab-dashboard': 'Lab Dashboard',
      'pharmacist-dashboard': 'Pharmacist Dashboard',
      'appointments': 'Appointments',
      'patients': 'Patients',
      'owners': 'Pet Owners',
      'emr': 'Medical Records',
      'billing': 'Billing',
      'pharmacy': 'Pharmacy',
      'lab-reports': 'Lab Reports',
      'analytics': 'Analytics',
      'audit': 'Audit Trail',
      'security': 'Security',
      'staff': 'Staff Management',
    }

    // Recursive function to resolve hierarchical breadcrumbs from state
    const resolveHierarchy = (parent: any): any[] => {
      if (!parent) return [];
      return [...resolveHierarchy(parent.parent), { name: parent.name, path: parent.path }];
    };
    
    if (state?.breadcrumbParent) {
      const hierarchy = resolveHierarchy(state.breadcrumbParent);
      
      if (hierarchy.length > 0) {
        if (hierarchy[0].path.includes('/crm/owners')) {
          breadcrumbs.push({ name: 'Pet Owners', path: '/crm/owners' });
        } else if (hierarchy[0].path.includes('/crm/patients')) {
          breadcrumbs.push({ name: 'Patients', path: '/crm/patients' });
        }
      }
      
      breadcrumbs.push(...hierarchy);
      
      const lastSegment = segments[segments.length - 1];
      const pet = pets.find(p => p.id === lastSegment);
      const owner = users.find(u => u.id === lastSegment);
      const entityName = pet?.name || owner?.displayName || (lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1));
      
      breadcrumbs.push({ name: entityName, path: pathname });
      return breadcrumbs;
    }

    segments.forEach((segment, index) => {
      if (segment === 'crm') return;
      const path = '/' + segments.slice(0, index + 1).join('/');
      
      let name = pageNames[segment];
      if (!name) {
        const pet = pets.find(p => p.id === segment);
        const owner = users.find(u => u.id === segment);
        name = pet?.name || owner?.displayName || (segment.charAt(0).toUpperCase() + segment.slice(1));
      }
      
      if (!breadcrumbs.find(b => b.path === path)) {
        breadcrumbs.push({ name, path })
      }
    })

    return breadcrumbs
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {!sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-card border-r border-border flex flex-col transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Sidebar Header with Toggle */}
        <div className="p-4 border-b border-border flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
          
          <div className={cn("flex items-center gap-2 overflow-hidden transition-opacity duration-300", !sidebarOpen && "opacity-0 invisible w-0")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="text-primary-foreground" size={18} />
            </div>
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-tight truncate">MediPaws</span>
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

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Area (Breadcrumbs + Theme Toggle) */}
        <div className="border-b border-border px-6 py-3 bg-background flex items-center justify-between">
          <nav className="flex items-center space-x-2 text-sm">
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
