import React from "react";
import PageHeader from "@/components/ui/PageHeader";
import BranchMachineSettings from "@/components/machines/BranchMachineSettings";
import AutomatedTriggers from "@/components/machines/AutomatedTriggers";
import UsageTracking from "@/components/machines/UsageTracking";
import MaintenanceMonitoring from "@/components/machines/MaintenanceMonitoring";
import CustomerAnalytics from "@/components/machines/CustomerAnalytics";
import { withAuth } from "@/contexts/AuthContext";

const MachineManagement: React.FC = () => {
  // Mock data for charts
  const machineUsageData = [
    { name: "Mon", active: 4, idle: 1, maintenance: 0.5 },
    { name: "Tue", active: 5, idle: 1.5, maintenance: 0 },
    { name: "Wed", active: 3, idle: 2, maintenance: 1 },
    { name: "Thu", active: 6, idle: 1, maintenance: 0 },
    { name: "Fri", active: 4.5, idle: 2, maintenance: 0.5 },
    { name: "Sat", active: 3, idle: 1, maintenance: 0 },
    { name: "Sun", active: 2, idle: 0.5, maintenance: 3.5 },
  ];

  const maintenanceData = [
    { name: "MRI Scanner", events: 3, hours: 8.5, downtime: 5.3 },
    { name: "CT Scanner", events: 2, hours: 5, downtime: 3.1 },
    { name: "X-Ray Machine", events: 4, hours: 10, downtime: 6.2 },
    { name: "Ultrasound", events: 1, hours: 3, downtime: 1.9 },
  ];

  const customerUsageData = [
    { name: "MRI Scanner", value: 145, color: "#0088FE" },
    { name: "CT Scanner", value: 210, color: "#00C49F" },
    { name: "X-Ray Machine", value: 320, color: "#FFBB28" },
    { name: "Ultrasound", value: 240, color: "#FF8042" },
  ];

  return (
    <>
      <PageHeader
        title="Machine Management"
        subtitle="Monitor and manage hospital equipment"
      />

      <div className="space-y-6">
        {/* Branch Machine Settings Section */}
        <BranchMachineSettings />

        {/* Automated Machine On/Off System */}
        <AutomatedTriggers />

        {/* Machine Usage & Performance Tracking */}
        <UsageTracking machineUsageData={machineUsageData} />

        {/* Maintenance Monitoring */}
        <MaintenanceMonitoring maintenanceData={maintenanceData} />

        {/* Customer Usage Analytics */}
        <CustomerAnalytics customerUsageData={customerUsageData} />
      </div>
    </>
  );
};

export default withAuth(MachineManagement, ['admin']);
