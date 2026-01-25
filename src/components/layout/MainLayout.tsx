
import React from 'react';
import SideNav from './SideNav';
import TopBar from './TopBar';
import { useAuth } from '@/contexts/AuthContext';
import AIChatAssistant from '@/components/AIChatAssistant';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { authState } = useAuth();

  if (!authState.isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (fixed width, full height) */}
      <aside className="w-64 h-full bg-white border-r">
        <SideNav />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
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

export default MainLayout;
