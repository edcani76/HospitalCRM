
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";

// Pages
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Dashboards
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import DoctorDashboard from "./pages/dashboards/DoctorDashboard";
import StaffDashboard from "./pages/dashboards/StaffDashboard";
import LabDashboard from "./pages/dashboards/LabDashboard";
import PharmacistDashboard from "./pages/dashboards/PharmacistDashboard";
import MachineManagement from "./pages/dashboards/MachineMangament";

// Modules
import PatientsPage from "./pages/PatientsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import EMRPage from "./pages/EMRPage";
import BillingPage from "./pages/BillingPage";
import StaffPage from "./pages/StaffPage";
import PharmacyPage from "./pages/PharmacyPage";
import LabReportsPage from "./pages/LabReportsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SecurityPage from "./pages/SecurityPage";

// Optional: if you still use it elsewhere
import Index from "./pages/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Main layout wrapped routes */}
            <Route
              path="*"
              element={
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/admin-dashboard" element={<AdminDashboard />} />
                    <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
                    <Route path="/staff-dashboard" element={<StaffDashboard />} />
                    <Route path="/lab-dashboard" element={<LabDashboard />} />
                    <Route path="/pharmacist-dashboard" element={<PharmacistDashboard />} />
                    <Route path="/machine-management" element={<MachineManagement />} />
                    <Route path="/patients" element={<PatientsPage />} />
                    <Route path="/appointments" element={<AppointmentsPage />} />
                    <Route path="/emr" element={<EMRPage />} />
                    <Route path="/billing" element={<BillingPage />} />
                    <Route path="/staff" element={<StaffPage />} />
                    <Route path="/pharmacy" element={<PharmacyPage />} />
                    <Route path="/lab-reports" element={<LabReportsPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/security" element={<SecurityPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </MainLayout>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
