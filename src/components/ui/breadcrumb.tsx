import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const ROUTE_MAP: Record<string, BreadcrumbItem> = {
  '/dashboard': { name: 'Dashboard', path: '/dashboard' },
  '/book-appointment': { name: 'Book Appointment', path: '/book-appointment' },
  '/doctors': { name: 'Our Doctors', path: '/doctors' },
  '/departments': { name: 'Departments', path: '/departments' },
  '/login': { name: 'Login', path: '/login' },
  '/signup': { name: 'Sign Up', path: '/signup' },
};

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const location = useLocation();

  const getAutoBreadcrumbs = (): BreadcrumbItem[] => {
    const pathname = location.pathname;
    const state = location.state as any;
    const crumbs: BreadcrumbItem[] = [];

    if (state?.breadcrumbs) {
      return state.breadcrumbs as BreadcrumbItem[];
    }

    if (state?.breadcrumbParent) {
      const parent = state.breadcrumbParent as BreadcrumbItem[];
      crumbs.push(...parent);
    }

    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) {
      crumbs.push({ name: 'Home', path: '/' });
      return crumbs;
    }

    if (!state?.breadcrumbParent) {
      crumbs.push({ name: 'Dashboard', path: '/dashboard' });
    }

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const path = '/' + segments.slice(0, i + 1).join('/');

      if (segment === 'dashboard') continue;

      const routeMatch = ROUTE_MAP[path];
      if (routeMatch) {
        crumbs.push(routeMatch);
        continue;
      }

      if (segment === 'pet') {
        const petName = state?.petName || 'Pet Profile';
        crumbs.push({ name: petName, path: path });
      } else if (segment === 'profile') {
        const userName = state?.userName || 'Profile';
        crumbs.push({ name: userName, path: path });
      } else if (!crumbs.find(c => c.path === path)) {
        crumbs.push({
          name: segment.charAt(0).toUpperCase() + segment.slice(1),
          path,
        });
      }
    }

    return crumbs;
  };

  const breadcrumbs = items || getAutoBreadcrumbs();

  if (breadcrumbs.length <= 1 && !items) return null;

  return (
    <nav className={`flex items-center gap-1 text-sm ${className || ''}`}>
      <Link
        to="/dashboard"
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <React.Fragment key={crumb.path || crumb.name}>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            {crumb.path && !isLast ? (
              <Link
                to={crumb.path}
                className="text-slate-400 hover:text-slate-700 transition-colors truncate max-w-[160px]"
              >
                {crumb.name}
              </Link>
            ) : (
              <span className="text-slate-700 font-medium truncate max-w-[160px]">
                {crumb.name}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
