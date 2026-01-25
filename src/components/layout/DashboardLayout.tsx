import React, { useState } from "react";
import SideNav from "./SideNav";
import TopBar from "./TopBar";
import { useAuth } from "@/contexts/AuthContext";
import AIChatAssistant from "@/components/AIChatAssistant";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * @deprecated Use MainLayout instead for consistency across the app.
 * This component is kept for backward compatibility but MainLayout is preferred.
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { authState } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!authState.isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (fixed width, full height) */}
      <aside className="hidden lg:block w-64 h-full bg-white border-r">
        <SideNav />
      </aside>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-white z-50">
          <SideNav />
          <button
            className="absolute top-4 right-4 text-gray-700"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile menu button */}
        <div className="lg:hidden p-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* AI Chat Assistant */}
      <AIChatAssistant />
    </div>
  );
};

export default DashboardLayout;
