import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Plus, FileText, Clock, RefreshCw, User, Calendar, History, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { patients as allPatients } from '../../data/crm-data';

const initialMedications = [
  {
    prescribedId: "RX24014",
    medication: "Carprofen",
    start: "22/04/2026",
    end: "29/04/2026",
    instructions: "Give 1 tablet daily with food",
  },
  {
    prescribedId: "RX24015",
    medication: "Heartgard Plus",
    start: "01/04/2026",
    end: "01/05/2026",
    instructions: "Give 1 chewable tablet monthly",
  },
];

const initialMedicalHistory = [
  {
    date: "12/03/2024",
    diagnosis: "Hip Dysplasia",
    doctor: "Dr. Sarah Johnson",
    notes: "X-rays confirm mild hip dysplasia, manage with NSAIDs",
  },
  {
    date: "14/10/2025",
    diagnosis: "Arthritis",
    doctor: "Dr. Michael Chen",
    notes: "Mild arthritis in senior joints, supplements recommended",
  },
];

const initialDentalHistory = [
  {
    date: "02/06/2024",
    procedure: "Dental Cleaning",
    doctor: "Dr. Michael Chen",
    notes: "Routine dental cleaning, 1 tooth extracted",
  },
];

const initialFamilyHistory = [
  {
    relation: "Mother",
    condition: "Hip Dysplasia",
    ageDiagnosed: "5",
  },
];

const initialSocialHistory = [
  {
    habit: "Diet",
    status: "Premium kibble",
    details: "Feeding premium hip & joint formula",
  },
];

const initialEMRData = (patient: any) => ({
  patient: `${patient.name} (${patient.species})`,
  dob: patient.dateOfBirth,
  gender: patient.gender,
  id: patient.patientId,
  age: new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear(),
  bloodType: patient.bloodType,
  species: patient.species,
  breed: patient.breed,
  allergies: ["Flea collars", "Penicillin"],
  chronic: patient.medicalHistory ? patient.medicalHistory.split(', ') : [],
  owner: patient.owner,
  contact: patient.contact,
  email: patient.email,
  address: patient.address,
  emergencyContact: patient.emergencyContact,
  recent: patient.recentVisits || [
    {
      doctor: "Dr. Sarah Johnson",
      date: "2026-04-15",
      diagnosis: "Annual checkup with vaccinations",
      notes: "Healthy, all vaccines updated",
      department: "General",
    },
  ],
});

export default function EMRPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<
    "medications" | "medical" | "dental" | "family" | "social" | "audit"
  >("medications");

  // Find the selected patient or default to the first one
  const [selectedPatient, setSelectedPatient] = useState(() => 
    allPatients.find(p => p.patientId === patientId) || allPatients[0]
  );

  const getAuditStats = () => {
    const stats: { [key: string]: number } = {};
    (selectedPatient.auditTrail || []).forEach(item => {
      stats[item.staff] = (stats[item.staff] || 0) + 1;
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  };

  const auditStats = getAuditStats();
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

  const emr = [initialEMRData(selectedPatient)];
  const [medications, setMedications] = useState(initialMedications);
  const [medicalHistory, setMedicalHistory] = useState(initialMedicalHistory);
  const [dentalHistory, setDentalHistory] = useState(initialDentalHistory);
  const [familyHistory, setFamilyHistory] = useState(initialFamilyHistory);
  const [socialHistory, setSocialHistory] = useState(initialSocialHistory);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleAddRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let actionType = "Record Added";
    if (tab === "medications") {
      setMedications((prev) => [...prev, formData]);
      actionType = `Medication Added: ${formData.medication}`;
    } else if (tab === "medical") {
      setMedicalHistory((prev) => [...prev, formData]);
      actionType = `Medical History Added: ${formData.diagnosis}`;
    } else if (tab === "dental") {
      setDentalHistory((prev) => [...prev, formData]);
      actionType = `Dental History Added: ${formData.procedure}`;
    } else if (tab === "family") {
      setFamilyHistory((prev) => [...prev, formData]);
      actionType = `Family History Added: ${formData.relation}`;
    } else if (tab === "social") {
      setSocialHistory((prev) => [...prev, formData]);
      actionType = `Social History Added: ${formData.habit}`;
    }

    // Update patient audit trail
    const updatedPatient = {
      ...selectedPatient,
      auditTrail: [
        ...(selectedPatient.auditTrail || []),
        {
          id: Date.now().toString(),
          event: actionType,
          staff: 'Dr. Sarah Johnson', // Mocking current user
          timestamp: new Date().toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          })
        }
      ]
    };
    setSelectedPatient(updatedPatient);

    setFormData({});
    setShowAddForm(false);
  };

  const handlePrint = (tab: string) => {
    const renderPrintTable = (tab: string) => {
      let data: any[] = [];
      let headers: string[] = [];
      let rowsHtml = "";

      switch (tab) {
        case "medications":
          data = medications;
          headers = ["Prescribed ID", "Medication", "Period", "Instructions"];
          rowsHtml = data
            .map(
              (item: any) => `
          <tr>
            <td>${item.prescribedId}</td>
            <td>${item.medication}</td>
            <td>${item.start} - ${item.end}</td>
            <td>${item.instructions}</td>
          </tr>
        `
            )
            .join("");
          break;
        case "medical":
          data = medicalHistory;
          headers = ["Date", "Diagnosis", "Doctor", "Notes"];
          rowsHtml = data
            .map(
              (item: any) => `
          <tr>
            <td>${item.date}</td>
            <td>${item.diagnosis}</td>
            <td>${item.doctor}</td>
            <td>${item.notes}</td>
          </tr>
        `
            )
            .join("");
          break;
        case "dental":
          data = dentalHistory;
          headers = ["Date", "Procedure", "Doctor", "Notes"];
          rowsHtml = data
            .map(
              (item: any) => `
          <tr>
            <td>${item.date}</td>
            <td>${item.procedure}</td>
            <td>${item.doctor}</td>
            <td>${item.notes}</td>
          </tr>
        `
            )
            .join("");
          break;
        case "family":
          data = familyHistory;
          headers = ["Relation", "Condition", "Age Diagnosed"];
          rowsHtml = data
            .map(
              (item: any) => `
          <tr>
            <td>${item.relation}</td>
            <td>${item.condition}</td>
            <td>${item.ageDiagnosed}</td>
          </tr>
        `
            )
            .join("");
          break;
        case "social":
          data = socialHistory;
          headers = ["Habit", "Status", "Details"];
          rowsHtml = data
            .map(
              (item: any) => `
          <tr>
            <td>${item.habit}</td>
            <td>${item.status}</td>
            <td>${item.details}</td>
          </tr>
        `
            )
            .join("");
          break;
      }

      return `
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f0f0f0;">${headers.map((h: string) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
    };

    const printableContent = `
      <html>
        <head>
          <title>Pet Medical Record - Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1, h2, h3 { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .header { display: flex; gap: 20px; align-items: center; margin-bottom: 20px; }
            .avatar { 
              width: 60px; height: 60px; background-color: #3b82f6; color: white; 
              font-size: 28px; font-weight: bold; border-radius: 50%; 
              display: grid; place-items: center; flex-shrink: 0; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="avatar">${emr[0].patient[0]}</div>
            <div>
              <h1>${emr[0].patient}</h1>
              <p>DOB: ${emr[0].dob}</p>
              <p>Gender: ${emr[0].gender}</p>
              <p>Patient ID: ${emr[0].id}</p>
              <p>Age: ${emr[0].age} years</p>
              <div style="margin-top: 8px;">
                <span style="display: inline-block; padding: 4px 8px; margin-right: 4px; background: #dbeafe; border-radius: 4px;">Blood: ${emr[0].bloodType}</span>
                <span style="display: inline-block; padding: 4px 8px; margin-right: 4px; background: #fee2e2; border-radius: 4px;">Allergies: ${emr[0].allergies.join(", ")}</span>
                <span style="display: inline-block; padding: 4px 8px; background: #fef3c7; border-radius: 4px;">Chronic: ${emr[0].chronic.join(", ")}</span>
              </div>
            </div>
          </div>
          <h2>Recent Visits</h2>
          ${emr[0].recent
            .map(
              (visit: any) => `
            <div style="margin-bottom: 15px; padding: 10px; background: #f9fafb; border-radius: 8px;">
              <strong>${visit.doctor}</strong> (${visit.department}) — ${visit.date}<br/>
              <strong>Diagnosis:</strong> ${visit.diagnosis}<br/>
              <strong>Notes:</strong> ${visit.notes}
            </div>
          `
            )
            .join("")}
          <h2>${tab.charAt(0).toUpperCase() + tab.slice(1)} Records</h2>
          ${renderPrintTable(tab)}
        </body>
      </html>
    `;

    const printWindow = window.open("", "", "width=900,height=650");
    if (printWindow) {
      printWindow.document.write(printableContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const renderFormFields = () => {
    switch (tab) {
      case "medications":
        return (
          <>
            <Label className="block mb-2">
              Prescribed ID:
              <Input type="text" name="prescribedId" value={formData.prescribedId || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              Medication:
              <Input type="text" name="medication" value={formData.medication || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              Start Date:
              <Input type="date" name="start" value={formData.start || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              End Date:
              <Input type="date" name="end" value={formData.end || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              Instructions:
              <Textarea name="instructions" value={formData.instructions || ""} onChange={handleInputChange} className="mt-1" />
            </Label>
          </>
        );
      case "medical":
      case "dental":
        return (
          <>
            <Label className="block mb-2">
              Date:
              <Input type="date" name="date" value={formData.date || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              {tab === "medical" ? "Diagnosis:" : "Procedure:"}
              <Input type="text" name={tab === "medical" ? "diagnosis" : "procedure"} value={formData.diagnosis || formData.procedure || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              Doctor:
              <Input type="text" name="doctor" value={formData.doctor || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              Notes:
              <Textarea name="notes" value={formData.notes || ""} onChange={handleInputChange} className="mt-1" />
            </Label>
          </>
        );
      case "family":
        return (
          <>
            <Label className="block mb-2">
              Relation:
              <Input type="text" name="relation" value={formData.relation || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              Condition:
              <Input type="text" name="condition" value={formData.condition || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              Age Diagnosed:
              <Input type="number" name="ageDiagnosed" value={formData.ageDiagnosed || ""} onChange={handleInputChange} className="mt-1" />
            </Label>
          </>
        );
      case "social":
        return (
          <>
            <Label className="block mb-2">
              Habit:
              <Input type="text" name="habit" value={formData.habit || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              Status:
              <Input type="text" name="status" value={formData.status || ""} onChange={handleInputChange} className="mt-1" required />
            </Label>
            <Label className="block mb-2">
              Details:
              <Textarea name="details" value={formData.details || ""} onChange={handleInputChange} className="mt-1" />
            </Label>
          </>
        );
      default:
        return null;
    }
  };



  return (
    <div>
      <PageHeader 
        title="Electronic Medical Records (EMR)" 
        subtitle={`Viewing full clinical history for ${selectedPatient.name}`}
        onBack={() => navigate(location.state?.from || '/crm/emr')}
      />

      <div className="bg-white rounded-lg p-6 shadow mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-blue-50 flex items-center justify-center text-3xl font-bold text-blue-600">
                {selectedPatient?.photo ? (
                  <img src={selectedPatient.photo} alt={selectedPatient.name} className="w-full h-full object-cover" />
                ) : (
                  selectedPatient?.name?.[0] || 'P'
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-gray-900">{selectedPatient?.name || "Patient Record"}</h2>
              </div>
              <p className="text-sm text-gray-600"><span className="font-medium">DOB:</span> {emr[0].dob}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Gender:</span> {emr[0].gender}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Patient ID:</span> {emr[0].id}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Age:</span> {emr[0].age} years | {emr[0].species} - {emr[0].breed}</p>
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 min-w-[320px]">
            <h4 className="font-bold text-blue-900 mb-3 text-sm uppercase tracking-wider">Owner Information</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700/70 font-medium">Full Name:</span>
                <span className="text-blue-900 font-semibold">{emr[0].owner}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700/70 font-medium">Contact:</span>
                <span className="text-blue-900">{emr[0].contact}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700/70 font-medium">Email:</span>
                <span className="text-blue-900 underline decoration-blue-200">{emr[0].email}</span>
              </div>
              <div className="flex justify-between text-sm gap-4">
                <span className="text-blue-700/70 font-medium shrink-0">Address:</span>
                <span className="text-blue-900 text-right">{emr[0].address}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-100 flex justify-between text-sm">
                <span className="text-red-600 font-medium">Emergency:</span>
                <span className="text-red-700 font-bold">{emr[0].emergencyContact}</span>
              </div>
            </div>
          </div>
        </div>

        <section className="flex items-center gap-4 mb-6 flex-wrap">
          <Badge className="uppercase">Blood Type: {emr[0].bloodType}</Badge>
          <Badge variant="destructive" className="uppercase">
            Allergies: {emr[0].allergies.join(", ")}
          </Badge>
          <Badge variant="secondary" className="uppercase">
            Chronic: {emr[0].chronic.join(", ")}
          </Badge>
        </section>

        <section>
          <h4 className="mb-2 font-semibold">Recent Visits</h4>
          {emr[0].recent.map((visit, i) => (
            <div key={i} className="p-3 mb-3 rounded-lg bg-blue-50 border border-blue-200">
              <p>
                <span className="font-semibold">{visit.doctor}</span> ({visit.department}) — {visit.date}
              </p>
              <p><strong>Diagnosis:</strong> {visit.diagnosis}</p>
              <p><strong>Notes:</strong> {visit.notes}</p>
            </div>
          ))}
        </section>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <Button 
          variant={tab === "medications" ? "default" : "outline"} 
          onClick={() => setTab("medications")}
          className={cn(tab === "medications" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-blue-600 border-blue-200 hover:bg-blue-50")}
        >
          Medications
        </Button>
        <Button 
          variant={tab === "medical" ? "default" : "outline"} 
          onClick={() => setTab("medical")}
          className={cn(tab === "medical" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-blue-600 border-blue-200 hover:bg-blue-50")}
        >
          Medical History
        </Button>
        <Button 
          variant={tab === "dental" ? "default" : "outline"} 
          onClick={() => setTab("dental")}
          className={cn(tab === "dental" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-blue-600 border-blue-200 hover:bg-blue-50")}
        >
          Dental History
        </Button>
        <Button 
          variant={tab === "family" ? "default" : "outline"} 
          onClick={() => setTab("family")}
          className={cn(tab === "family" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-blue-600 border-blue-200 hover:bg-blue-50")}
        >
          Family History
        </Button>
        <Button 
          variant={tab === "social" ? "default" : "outline"} 
          onClick={() => setTab("social")}
          className={cn(tab === "social" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-blue-600 border-blue-200 hover:bg-blue-50")}
        >
          Social History
        </Button>
        <Button 
          variant={tab === "audit" ? "default" : "outline"} 
          onClick={() => setTab("audit")}
          className={cn(tab === "audit" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "text-indigo-600 border-indigo-200 hover:bg-indigo-50")}
        >
          <Clock className="w-4 h-4 mr-2" />
          Audit Trail
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Record
        </Button>
        <Button onClick={() => handlePrint(tab)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <FileText className="w-4 h-4 mr-2" />
          Print {tab}
        </Button>
      </div>

      {/* Add Record Form */}
      {showAddForm && (
        <form onSubmit={handleAddRecordSubmit} className="mb-8 border p-4 rounded bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Add New {tab}</h3>
          {renderFormFields()}
          <div className="mt-4 flex gap-3">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
            <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="text-gray-600 border-gray-200 hover:bg-gray-50">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Tab Content Display */}
      <div className="bg-white rounded-lg shadow">
        {tab === "medications" && (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3">Prescribed ID</th>
                <th className="text-left p-3">Medication</th>
                <th className="text-left p-3">Period</th>
                <th className="text-left p-3">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((item, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-3">{item.prescribedId}</td>
                  <td className="p-3">{item.medication}</td>
                  <td className="p-3">{item.start} - {item.end}</td>
                  <td className="p-3">{item.instructions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "medical" && (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Diagnosis</th>
                <th className="text-left p-3">Doctor</th>
                <th className="text-left p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {medicalHistory.map((item, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-3">{item.date}</td>
                  <td className="p-3">{item.diagnosis}</td>
                  <td className="p-3">{item.doctor}</td>
                  <td className="p-3">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "dental" && (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Procedure</th>
                <th className="text-left p-3">Doctor</th>
                <th className="text-left p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {dentalHistory.map((item, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-3">{item.date}</td>
                  <td className="p-3">{item.procedure}</td>
                  <td className="p-3">{item.doctor}</td>
                  <td className="p-3">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "family" && (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3">Relation</th>
                <th className="text-left p-3">Condition</th>
                <th className="text-left p-3">Age Diagnosed</th>
              </tr>
            </thead>
            <tbody>
              {familyHistory.map((item, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-3">{item.relation}</td>
                  <td className="p-3">{item.condition}</td>
                  <td className="p-3">{item.ageDiagnosed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "social" && (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3">Habit</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {socialHistory.map((item, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-semibold">{item.habit}</td>
                  <td className="p-3">{item.status}</td>
                  <td className="p-3 text-gray-600">{item.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "audit" && (
          <div className="p-6 bg-slate-50/50">
            {/* Activity Histogram */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-500" />
                    Staff Activity Distribution
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Breakdown of record updates by staff member</p>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-bold">
                  {(selectedPatient.auditTrail || []).length} Total Actions
                </Badge>
              </div>
              
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={auditStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '8px 12px'
                      }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[6, 6, 0, 0]} 
                      barSize={40}
                    >
                      {auditStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Event ID</th>
                    <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Modification Type</th>
                    <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Performing Staff</th>
                    <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPatient.auditTrail || []).slice().reverse().map((log: any) => (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                      <td className="p-4 text-xs font-mono text-slate-400">#{log.id}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            log.event.includes('Created') ? "bg-green-500" : "bg-indigo-500"
                          )} />
                          <span className="font-bold text-slate-900">{log.event}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <span className="font-medium text-slate-700">{log.staff}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{log.timestamp.split(',')[0]}</span>
                          <span className="text-xs text-slate-400">{log.timestamp.includes(',') ? log.timestamp.split(',')[1].trim() : log.timestamp}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              <span>Real-time Audit Log Synchronization Active</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
