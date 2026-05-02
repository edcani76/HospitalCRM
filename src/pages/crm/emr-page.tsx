import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart2, Plus, Loader2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { fetchPetById, fetchEmrRecords } from '../../lib/firestore-helpers';
import { collection, addDoc, serverTimestamp, db } from '../../firebase';

export default function EMRPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<"medications" | "medical" | "dental" | "family" | "social" | "audit">("medications");
  
  const [patient, setPatient] = useState<any>(null);
  const [emrRecords, setEmrRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    async function loadData() {
      try {
        const [petData, emrData] = await Promise.all([
          fetchPetById(patientId || ''),
          fetchEmrRecords(patientId)
        ]);
        setPatient(petData);
        setEmrRecords(emrData);
      } catch (error) {
        console.error('Error loading EMR data:', error);
      } finally {
        setLoading(false);
      }
    }
    if (patientId) loadData();
  }, [patientId]);

  const getMedications = () => emrRecords.flatMap(r => r.medications || []);
  const getMedicalHistory = () => emrRecords.flatMap(r => r.medicalHistory || []);
  const getDentalHistory = () => emrRecords.flatMap(r => r.dentalHistory || []);
  const getFamilyHistory = () => emrRecords.flatMap(r => r.familyHistory || []);
  const getSocialHistory = () => emrRecords.flatMap(r => r.socialHistory || []);

  const getAuditStats = () => {
    const stats: { [key: string]: number } = {};
    (patient?.auditTrail || []).forEach((item: any) => {
      stats[item.staff] = (stats[item.staff] || 0) + 1;
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  };

  const auditStats = getAuditStats();
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleAddRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newRecord = {
        petId: patientId,
        [tab]: [formData],
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'emrRecords'), newRecord);
      const updated = await fetchEmrRecords(patientId || '');
      setEmrRecords(updated);
      setFormData({});
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding record:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Patient not found</p>
        <Button onClick={() => navigate('/crm/emr')} className="mt-4">Back to Directory</Button>
      </div>
    );
  }

  const age = patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 'N/A';

  return (
    <div>
      <PageHeader 
        title="Electronic Medical Records (EMR)" 
        subtitle={`Viewing full clinical history for ${patient.name}`}
        backTo={location.state?.from || '/crm/emr'}
        backText="Back to Previous Page"
      />

      <div className="bg-white rounded-lg p-6 shadow mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-blue-50 flex items-center justify-center text-3xl font-bold text-blue-600">
              {patient.name?.[0] || 'P'}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{patient.name}</h2>
              <p className="text-sm text-gray-600"><span className="font-medium">DOB:</span> {patient.dateOfBirth || 'N/A'}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Gender:</span> {patient.gender || 'N/A'}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Patient ID:</span> {patient.id}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Age:</span> {age} years | {patient.species} - {patient.breed}</p>
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 min-w-[320px]">
            <h4 className="font-bold text-blue-900 mb-3 text-sm uppercase tracking-wider">Owner Information</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700/70 font-medium">Name:</span>
                <span className="text-blue-900 font-semibold">{patient.ownerName || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700/70 font-medium">Contact:</span>
                <span className="text-blue-900">{patient.contact || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700/70 font-medium">Email:</span>
                <span className="text-blue-900 underline decoration-blue-200">{patient.email || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <section className="flex items-center gap-4 mb-6 flex-wrap">
          <Badge className="uppercase">Blood Type: {patient.bloodType || 'N/A'}</Badge>
          {patient.allergies && <Badge variant="destructive" className="uppercase">Allergies: {patient.allergies.join(", ")}</Badge>}
        </section>
      </div>

      <div className="mb-4 flex gap-3 flex-wrap">
        {["medications", "medical", "dental", "family", "social", "audit"].map((t) => (
          <Button 
            key={t}
            variant={tab === t ? "default" : "outline"} 
            onClick={() => setTab(t as any)}
            className={cn(tab === t ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-blue-600 border-blue-200 hover:bg-blue-50")}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)} History
          </Button>
        ))}
      </div>

      <div className="mb-6 flex gap-4">
        <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Record
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddRecordSubmit} className="mb-8 border p-4 rounded bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Add New {tab}</h3>
          {tab === "medications" && (
            <>
              <Label className="block mb-2">Prescribed ID:<Input type="text" name="prescribedId" value={formData.prescribedId || ""} onChange={handleInputChange} className="mt-1" required /></Label>
              <Label className="block mb-2">Medication:<Input type="text" name="medication" value={formData.medication || ""} onChange={handleInputChange} className="mt-1" required /></Label>
              <Label className="block mb-2">Start Date:<Input type="date" name="start" value={formData.start || ""} onChange={handleInputChange} className="mt-1" required /></Label>
              <Label className="block mb-2">End Date:<Input type="date" name="end" value={formData.end || ""} onChange={handleInputChange} className="mt-1" required /></Label>
              <Label className="block mb-2">Instructions:<Textarea name="instructions" value={formData.instructions || ""} onChange={handleInputChange} className="mt-1" /></Label>
            </>
          )}
          {tab === "medical" && (
            <>
              <Label className="block mb-2">Date:<Input type="date" name="date" value={formData.date || ""} onChange={handleInputChange} className="mt-1" required /></Label>
              <Label className="block mb-2">Diagnosis:<Input type="text" name="diagnosis" value={formData.diagnosis || ""} onChange={handleInputChange} className="mt-1" required /></Label>
              <Label className="block mb-2">Doctor:<Input type="text" name="doctor" value={formData.doctor || ""} onChange={handleInputChange} className="mt-1" required /></Label>
              <Label className="block mb-2">Notes:<Textarea name="notes" value={formData.notes || ""} onChange={handleInputChange} className="mt-1" /></Label>
            </>
          )}
          <div className="mt-4 flex gap-3">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
            <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

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
              {getMedications().map((item: any, i: number) => (
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
              {getMedicalHistory().map((item: any, i: number) => (
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
              {getDentalHistory().map((item: any, i: number) => (
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
              {getFamilyHistory().map((item: any, i: number) => (
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
              {getSocialHistory().map((item: any, i: number) => (
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
          <div className="p-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-500" />
                    Staff Activity Distribution
                  </h4>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-bold">
                  {(patient.auditTrail || []).length} Total Actions
                </Badge>
              </div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={auditStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '8px 12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                      {auditStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Event</th>
                  <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Staff</th>
                  <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {(patient.auditTrail || []).slice().reverse().map((log: any) => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-indigo-50/30">
                    <td className="p-4 font-bold text-slate-900">{log.event}</td>
                    <td className="p-4">{log.staff}</td>
                    <td className="p-4 text-sm">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
