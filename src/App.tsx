import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CRMLayout from './components/crm-layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Doctors from './pages/Doctors';
import Departments from './pages/Departments';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import BookAppointment from './pages/BookAppointment';
import OwnerProfile from './pages/OwnerProfile';
import PetProfile from './pages/PetProfile';

// CRM Pages
import AdminDashboard from './pages/crm/admin-dashboard';
import DoctorDashboard from './pages/crm/doctor-dashboard';
import StaffDashboard from './pages/crm/staff-dashboard';
import LabDashboardCRM from './pages/crm/lab-dashboard';
import PharmacistDashboard from './pages/crm/pharmacist-dashboard';
import PatientsPage from './pages/crm/patients-page';
import OwnersPage from './pages/crm/owners-page';
import AppointmentsPage from './pages/crm/appointments-page';
import CreateAppointmentPage from './pages/crm/create-appointment-page';
import EMRPage from './pages/crm/emr-page';
import EMRDirectory from './pages/crm/emr-directory';
import BillingPage from './pages/crm/billing-page';
import PharmacyPage from './pages/crm/pharmacy-page';
import LabReportsPage from './pages/crm/lab-reports-page';
import AnalyticsPage from './pages/crm/analytics-page';
import SecurityPage from './pages/crm/security-page';
import StaffManagementPage from './pages/crm/staff-management-page';
import PatientProfilePage from './pages/crm/patient-profile';
import OwnerProfilePage from './pages/crm/owner-profile';
import AppointmentDetailsPage from './pages/crm/appointment-details-page';
import AuditLogPage from './pages/crm/audit-log-page';
import DoctorAvailabilityPage from './pages/crm/doctor-availability-page';
import SeedDoctorAvailabilityPage from './pages/crm/seed-doctor-availability-page';
import LinkDoctorUidPage from './pages/crm/link-doctor-uid-page';
import GoogleDriveSettingsPage from './pages/crm/google-drive-settings';
import AdminServicesPage from './pages/crm/admin-services';
import AdmissionsPage from './pages/crm/admissions-page';

// Contexts
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="my-hospital-theme">
      <Router>
        <Routes>
          {/* CRM Portal Routes - Fully Decoupled */}
          <Route
            path="/crm/*"
            element={
              <ProtectedRoute allowedRoles={['admin', 'doctor', 'staff', 'lab', 'pharmacist']}>
                <CRMLayout>
                  <Routes>
                    <Route path="admin-dashboard" element={<AdminDashboard />} />
                    <Route path="doctor-dashboard" element={<DoctorDashboard />} />
                    <Route path="staff-dashboard" element={<StaffDashboard />} />
                    <Route path="lab-dashboard" element={<LabDashboardCRM />} />
                    <Route path="pharmacist-dashboard" element={<PharmacistDashboard />} />
                    <Route path="patients" element={<PatientsPage />} />
                    <Route path="owners" element={<OwnersPage />} />
                    <Route path="owners/:ownerId" element={<OwnerProfilePage />} />
                    <Route path="patients/:patientId" element={<PatientProfilePage />} />
                    <Route path="appointments" element={<AppointmentsPage />} />
                    <Route path="appointments/create" element={<CreateAppointmentPage />} />
                    <Route path="appointments/:appointmentId" element={<AppointmentDetailsPage />} />
                    <Route path="emr" element={<EMRDirectory />} />
                    <Route path="emr/:patientId" element={<EMRPage />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="pharmacy" element={<PharmacyPage />} />
                    <Route path="lab-reports" element={<LabReportsPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="security" element={<SecurityPage />} />
                    <Route path="staff" element={<StaffManagementPage />} />
                    <Route path="audit" element={<AuditLogPage />} />
                    <Route path="doctor-availability" element={<DoctorAvailabilityPage />} />
                    <Route path="services" element={<AdminServicesPage />} />
                    <Route path="admissions" element={<AdmissionsPage />} />
                    <Route path="admissions/:admissionId" element={<AdmissionsPage />} />
                    <Route path="seed-doctor-availability" element={<SeedDoctorAvailabilityPage />} />
                    <Route path="link-doctor-uid" element={<LinkDoctorUidPage />} />
                    <Route path="settings" element={<GoogleDriveSettingsPage />} />
                    <Route path="*" element={<Navigate to="/crm/admin-dashboard" replace />} />
                  </Routes>
                </CRMLayout>
              </ProtectedRoute>
            }
          />

          {/* Marketing / Public Pages (with Footer) */}
          <Route path="/" element={<Layout showFooter={true}><Home /></Layout>} />
          <Route path="/doctors" element={<Layout showFooter={true}><Doctors /></Layout>} />
          <Route path="/departments" element={<Layout showFooter={true}><Departments /></Layout>} />
          <Route path="/login" element={<Layout showFooter={true}><Login /></Layout>} />
          <Route path="/signup" element={<Layout showFooter={true}><Signup /></Layout>} />

          {/* Patient Portal / User Pages (with Header, NO Footer) */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout showFooter={false}>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/book-appointment" 
            element={
              <ProtectedRoute>
                <Layout showFooter={false}>
                  <BookAppointment />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile/:uid" 
            element={
              <ProtectedRoute>
                <Layout showFooter={false}>
                  <OwnerProfile />
                </Layout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/pet/:id" 
            element={
              <ProtectedRoute>
                <Layout showFooter={false}>
                  <PetProfile />
                </Layout>
              </ProtectedRoute>
            } 
          />

          {/* Redirect Legacy Admin/Lab/Pharmacy to CRM counterparts */}
          <Route path="/admin" element={<Navigate to="/crm/admin-dashboard" replace />} />
          <Route path="/lab" element={<Navigate to="/crm/lab-dashboard" replace />} />
          <Route path="/pharmacy" element={<Navigate to="/crm/pharmacist-dashboard" replace />} />

          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
