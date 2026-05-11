import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Loader2, Mail, Phone, User, Stethoscope, Activity, Thermometer,
  Heart, Wind, Droplets, Clock, FileText, DollarSign, History,
  ClipboardList, Pill, FlaskConical, Upload, Printer, Eye, Bell, Check,
  ChevronDown, ChevronUp, AlertTriangle, FileCheck, Receipt, Calendar
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { PageHeader } from '../../components/ui/page-header';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  fetchPetById, fetchEncounters, fetchEncounterById, fetchServiceCatalog,
  fetchAppointmentServices,   fetchTriageVitals,
  fetchAllPatientVitals,
  fetchClinicalNotes,
  fetchLabOrders, fetchPrescriptions, fetchDispensingRecords,
  fetchInvoicesByEncounter, fetchInvoiceItems, fetchPayments,
  fetchAttachments, fetchAuditLogs, fetchUsers,
  generateInvoiceFromEncounter, recordPayment
} from '../../lib/firestore-helpers';
import { collection, getDocs, getDoc, addDoc, updateDoc, doc, serverTimestamp, query, where, db, auth } from '../../firebase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { uploadToGoogleDrive, getGoogleDriveLink } from '../../lib/google-drive';
import { InvoicePDF } from '../../components/invoice-pdf';
import { pdf } from '@react-pdf/renderer';

// Helper to get file type from file name
function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const typeMap: { [key: string]: string } = {
    'pdf': 'pdf', 'jpg': 'image', 'jpeg': 'image', 'png': 'image',
    'gif': 'image', 'bmp': 'image', 'doc': 'document', 'docx': 'document',
    'xls': 'document', 'xlsx': 'document', 'txt': 'document', 'csv': 'document'
  };
  return typeMap[ext || ''] || 'other';
}

// Helper to parse Firestore timestamps or ISO strings into millisecond timestamps
function parseDate(val: any): number {
  if (!val) return 0;
  // Firestore Timestamp object
  if (typeof val?.toDate === 'function') return val.toDate().getTime();
  // Cached serialized Timestamp {_seconds, _nanoseconds}
  if (val?._seconds !== undefined) return val._seconds * 1000;
  // ISO string or date string
  if (typeof val === 'string') {
    const ts = Date.parse(val);
    return isNaN(ts) ? 0 : ts;
  }
  // JS Date
  if (val instanceof Date) return val.getTime();
  // Millisecond timestamp
  if (typeof val === 'number') return val > 1e12 ? val : val * 1000;
  return 0;
}

type TabType =
  | 'visit-summary'
  | 'triage-vitals'
  | 'clinical-notes'
  | 'orders-services'
  | 'medications-pharmacy'
  | 'diagnostics-files'
  | 'billing'
  | 'history'
  | 'audit-trail';

function getStatusBadge(status: string) {
  switch (status) {
    case 'in-progress':
      return <Badge className="bg-blue-600 text-white">In Progress</Badge>;
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'confirmed':
      return <Badge variant="success">Confirmed</Badge>;
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>;
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'paid':
      return <Badge className="bg-green-600 text-white">Paid</Badge>;
    case 'partially-paid':
      return <Badge className="bg-yellow-600 text-white">Partially Paid</Badge>;
    case 'ordered':
      return <Badge className="bg-purple-600 text-white">Ordered</Badge>;
    case 'prescribed':
      return <Badge className="bg-indigo-600 text-white">Prescribed</Badge>;
    case 'dispensed':
      return <Badge className="bg-teal-600 text-white">Dispensed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Collapsible summary section
function SummarySection({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 border-t">{children}</div>}
    </div>
  );
}

function VisitSummaryTab({ patient, owner, encounter, encounters, vitals, services, clinicalNotes, labOrders, prescriptions, invoice, invoiceItems, payments, attachments }: {
  patient: any;
  owner: any;
  encounter: any;
  encounters: any[];
  vitals: any[];
  services: any[];
  clinicalNotes: any;
  labOrders: any[];
  prescriptions: any[];
  invoice: any;
  invoiceItems: any[];
  payments: any[];
  attachments: any[];
}) {
  if (!encounter) {
    return (
      <div className="p-6 text-center text-gray-500">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No encounter selected. Please select or start a new appointment.</p>
      </div>
    );
  }

  const latestVitals = vitals.length > 0 ? vitals[vitals.length - 1] : null;
  const completedLabs = labOrders.filter((l: any) => l.status === 'completed' || l.resultSummary);
  const pendingLabs = labOrders.filter((l: any) => l.status !== 'completed' && !l.resultSummary);
  const activeRx = prescriptions.filter((r: any) => r.status === 'prescribed' || r.status === 'dispensed');
  const totalDue = invoice?.balanceDue || 0;
  const totalPaid = invoice?.amountPaid || 0;
  const grandTotal = invoice?.grandTotal || 0;

  const encounterTime = encounter.startedAt?.toDate?.() || encounter.createdAt?.toDate?.();
  const encounterDateStr = encounterTime ? format(encounterTime, 'MMM dd, yyyy hh:mm a') : 'N/A';

  // Build timeline from encounters
  const timeline = [...encounters]
    .sort((a: any, b: any) => {
      const aTime = a.startedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
      const bTime = b.startedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    })
    .slice(0, 10);

  return (
    <div className="p-6">
      {/* Header: Patient, Doctor, Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 border-2 border-blue-200">
              {patient?.name?.[0] || 'P'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{patient?.name}</h3>
              <p className="text-sm text-gray-600">{patient?.species} • {patient?.breed} • Age: {patient?.age || '?'}y</p>
              {owner && <p className="text-xs text-gray-500">Owner: {owner?.displayName || owner?.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700">{encounter.doctorName || 'N/A'}</p>
              <p className="text-xs text-gray-500">{encounterDateStr}</p>
            </div>
            {getStatusBadge(encounter.status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {/* Chief Complaint */}
          <SummarySection title="Chief Complaint" icon={AlertTriangle}>
            {clinicalNotes?.subjective ? (
              <p className="text-sm text-gray-700 mt-2">{clinicalNotes.subjective}</p>
            ) : (
              <p className="text-sm text-gray-400 mt-2">No chief complaint recorded.</p>
            )}
          </SummarySection>

          {/* Triage Snapshot */}
          <SummarySection title="Triage Snapshot" icon={Thermometer}>
            {latestVitals ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Weight</p>
                  <p className="text-lg font-bold text-blue-800">{latestVitals.weightKg || 0} kg</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600 font-medium">Temp</p>
                  <p className="text-lg font-bold text-red-800">{parseFloat(String(latestVitals.temperatureC || 0)).toFixed(1)}°C</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-rose-600 font-medium">Heart Rate</p>
                  <p className="text-lg font-bold text-rose-800">{latestVitals.heartRateBpm || 0} bpm</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">Resp Rate</p>
                  <p className="text-lg font-bold text-green-800">{latestVitals.respiratoryRateRpm || 0} rpm</p>
                </div>
                {latestVitals.mmColor && (
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-600 font-medium">MM Color</p>
                    <p className="text-lg font-bold text-purple-800">{latestVitals.mmColor}</p>
                  </div>
                )}
                {latestVitals.crtSeconds && (
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-amber-600 font-medium">CRT</p>
                    <p className="text-lg font-bold text-amber-800">{latestVitals.crtSeconds}s</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-2">No vitals recorded for this visit.</p>
            )}
          </SummarySection>

          {/* Services Overview */}
          <SummarySection title="Services" icon={Activity}>
            {services.length > 0 ? (
              <div className="mt-3 space-y-2">
                {services.map((srv: any) => (
                  <div key={srv.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium">{srv.serviceName}</p>
                      <p className="text-xs text-gray-500">{srv.serviceType} • Qty: {srv.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">₱{(srv.unitPrice || 0) * (srv.quantity || 1)}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${srv.status === 'completed' ? 'bg-green-100 text-green-700' : srv.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {srv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-2">No services added yet.</p>
            )}
          </SummarySection>

          {/* Clinical Summary (SOAP) */}
          <SummarySection title="Clinical Notes" icon={Stethoscope} defaultOpen={false}>
            {clinicalNotes && (clinicalNotes.subjective || clinicalNotes.objective || clinicalNotes.assessment || clinicalNotes.plan) ? (
              <div className="mt-3 space-y-3">
                {clinicalNotes.subjective && (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase">Subjective</p>
                    <p className="text-sm text-gray-700">{clinicalNotes.subjective}</p>
                  </div>
                )}
                {clinicalNotes.objective && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase">Objective</p>
                    <p className="text-sm text-gray-700">{clinicalNotes.objective}</p>
                  </div>
                )}
                {clinicalNotes.assessment && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase">Assessment</p>
                    <p className="text-sm text-gray-700">{clinicalNotes.assessment}</p>
                  </div>
                )}
                {clinicalNotes.plan && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase">Plan</p>
                    <p className="text-sm text-gray-700">{clinicalNotes.plan}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-2">No clinical notes recorded.</p>
            )}
          </SummarySection>

          {/* Lab Summary */}
          <SummarySection title="Lab Orders" icon={FlaskConical}>
            {labOrders.length > 0 ? (
              <div className="mt-3 space-y-2">
                {pendingLabs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 mb-1">Pending ({pendingLabs.length})</p>
                    {pendingLabs.map((lab: any) => (
                      <div key={lab.id} className="flex justify-between items-center p-2 bg-amber-50 rounded-md mb-1">
                        <p className="text-sm font-medium">{lab.testName}</p>
                        <Badge className="bg-amber-100 text-amber-700 text-xs">{lab.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {completedLabs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 mb-1">Completed ({completedLabs.length})</p>
                    {completedLabs.map((lab: any) => (
                      <div key={lab.id} className="flex justify-between items-center p-2 bg-green-50 rounded-md mb-1">
                        <div>
                          <p className="text-sm font-medium">{lab.testName}</p>
                          {lab.resultSummary && <p className="text-xs text-gray-500">{lab.resultSummary}</p>}
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-xs">{lab.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-2">No lab orders for this visit.</p>
            )}
          </SummarySection>

          {/* Medication Summary */}
          <SummarySection title="Medications" icon={Pill}>
            {activeRx.length > 0 ? (
              <div className="mt-3 space-y-2">
                {activeRx.map((rx: any) => (
                  <div key={rx.id} className="flex justify-between items-start p-2 bg-gray-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium">{rx.medicationName}</p>
                      <p className="text-xs text-gray-500">{rx.dosage} • {rx.frequency} • {rx.duration}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${rx.status === 'dispensed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {rx.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-2">No medications prescribed.</p>
            )}
          </SummarySection>
        </div>

        {/* Right Column: Billing + Timeline */}
        <div className="space-y-3">
          {/* Billing Snapshot */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 text-gray-600" />
              <h4 className="font-semibold text-sm">Billing Snapshot</h4>
            </div>
            {invoice ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Invoice #</span>
                  <span className="font-medium">{invoice.invoiceNo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Grand Total</span>
                  <span className="font-bold">₱{grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Paid</span>
                  <span className="font-medium text-green-600">₱{totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-700 font-medium">Balance</span>
                  <span className={cn("font-bold", totalDue > 0 ? "text-red-600" : "text-green-600")}>₱{totalDue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Items</span>
                  <span className="font-medium">{invoiceItems.length}</span>
                </div>
                {payments.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Payments</p>
                    {payments.map((p: any) => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span>₱{p.amount?.toFixed(2)} ({p.paymentMethod})</span>
                        <span className="text-gray-400">{p.paidAt?.toDate?.()?.toLocaleDateString?.() || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No invoice generated.</p>
            )}
          </div>

          {/* Visit Timeline */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-gray-600" />
              <h4 className="font-semibold text-sm">Visit Timeline</h4>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {timeline.map((enc: any, idx: number) => {
                const encTime = enc.startedAt?.toDate?.() || enc.createdAt?.toDate?.();
                const isCurrent = enc.id === encounter.id;
                return (
                  <div key={enc.id} className={cn(
                    "flex items-start gap-2 text-xs p-2 rounded-md",
                    isCurrent ? "bg-blue-100 border border-blue-200" : ""
                  )}>
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1 shrink-0",
                      enc.status === 'in-progress' ? "bg-blue-500 animate-pulse" :
                      enc.status === 'completed' ? "bg-green-500" : "bg-gray-400"
                    )} />
                    <div className="min-w-0">
                      <p className={cn("font-medium truncate", isCurrent ? "text-blue-700" : "text-gray-700")}>
                        {encTime ? format(encTime, 'MMM dd, yyyy') : 'New'}
                      </p>
                      <p className="text-gray-500 truncate">{enc.doctorName || 'N/A'}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] px-1 py-0.5 rounded shrink-0 ml-auto",
                      enc.status === 'in-progress' ? "bg-blue-100 text-blue-700" :
                      enc.status === 'completed' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {enc.status}
                    </span>
                  </div>
                );
              })}
              {timeline.length === 0 && <p className="text-sm text-gray-400">No visit history.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EMRPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('visit-summary');

  const [patient, setPatient] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null);
  const [mode, setMode] = useState<'active' | 'view'>('view');
  const [scheduledAppointment, setScheduledAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Service catalog
  const [serviceCatalog, setServiceCatalog] = useState<any[]>([]);

  // Current encounter data
  const [appointmentServices, setAppointmentServices] = useState<any[]>([]);
  const [triageVitals, setTriageVitals] = useState<any[]>([]);
  const [allPatientVitals, setAllPatientVitals] = useState<any[]>([]);
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  const [clinicalNotes, setClinicalNotes] = useState<any>(null);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [dispensingRecords, setDispensingRecords] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showAllAudit, setShowAllAudit] = useState(false);
  const [showAllEncounters, setShowAllEncounters] = useState(false);

  // Form states
  const [formData, setFormData] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsForm, setVitalsForm] = useState<any>({});
  const [vitalsEditMode, setVitalsEditMode] = useState<boolean>(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesEditMode, setNotesEditMode] = useState<boolean>(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: 0, method: 'cash', referenceNo: '' });
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Doctor selector for Quick Start
  const [showDoctorDialog, setShowDoctorDialog] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<Array<{ id: string; name: string; specialization?: string }>>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDoctorName, setSelectedDoctorName] = useState('');

  const fetchAvailableDoctors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'doctors'));
      const doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Show ALL doctors for Quick Start (emergency/walk-in visits)
      setAvailableDoctors(doctors);
      
      // Pre-select current user if they're a doctor
      const userUid = auth.currentUser?.uid;
      const currentDoctor = doctors.find(d => d.uid === userUid);
      if (currentDoctor) {
        setSelectedDoctorId(currentDoctor.id);
        setSelectedDoctorName(currentDoctor.name);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleQuickStartVisit = async () => {
    if (!patientId || !patient) return;
    try {
      // Fetch ALL doctors for Quick Start (emergency/walk-in visits)
      const snapshot = await getDocs(collection(db, 'doctors'));
      const doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      setAvailableDoctors(doctors);
      
      // Pre-select current user if they're a doctor
      const userUid = auth.currentUser?.uid;
      const currentDoctor = doctors.find(d => d.uid === userUid);
      if (currentDoctor) {
        setSelectedDoctorId(currentDoctor.id);
        setSelectedDoctorName(currentDoctor.name);
      }
      
      // Show doctor selector dialog
      setShowDoctorDialog(true);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      alert('Error loading doctors. Please try again.');
    }
  };

  const confirmQuickStart = async () => {
    if (!patientId || !patient) return;
    try {
      setLoading(true);
      const userUid = auth.currentUser?.uid || 'unknown';
      const now = new Date();
      const dateStr = format(now, 'yyyy-MM-dd');
      const timeStr = format(now, 'hh:mm a');
      
      // 1. Create appointment
      const aptData = {
        clientUid: patient.ownerUid || '',
        petId: patientId,
        petName: patient.name,
        doctorId: selectedDoctorId,
        doctorName: selectedDoctorName,
        date: dateStr,
        time: timeStr,
        status: 'unconfirmed',
        notes: `Services: consultation
Mode: Walk-in`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const aptRef = await addDoc(collection(db, 'appointments'), aptData);
      const aptId = aptRef.id;
      
      // 2. Auto-confirm appointment
      await updateDoc(doc(db, 'appointments', aptId), {
        status: 'confirmed',
        updatedAt: serverTimestamp()
      });
      
      // 3. Create encounter (Quick Start)
      const encounterData = {
        appointmentId: aptId,
        petId: patientId,
        petName: patient.name,
        clientUid: patient.ownerUid || '',
        doctorId: selectedDoctorId,
        doctorName: selectedDoctorName,
        startedAt: serverTimestamp(),
        status: 'in-progress',
        vitals: { weightKg: 0, temperatureC: 0, heartRateBpm: 0, respiratoryRateRpm: 0, mmColor: '', crtSeconds: 0, notes: '' },
        clinicalNotes: { subjective: '', objective: '', assessment: '', plan: '', diagnosis: '', doctorNotes: '', followUpInstructions: '' },
        createdBy: userUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const encRef = await addDoc(collection(db, 'encounters'), encounterData);
      const encounterId = encRef.id;
      
      // 4. Create service records for ALL services
      const serviceTypes = ['consultation']; // Default for Quick Start
      
      for (const svcType of serviceTypes) {
        const serviceFee = svcType === 'consultation' ? 500 : svcType === 'grooming' ? 800 : svcType === 'vaccination' ? 300 : 1000;
        const serviceData = {
          appointmentId: aptId,
          encounterId: encounterId,
          petId: patientId,
          ownerId: patient.ownerUid || '',
          serviceCatalogId: '',
          serviceCode: svcType.toUpperCase().slice(0, 3),
          serviceName: svcType.charAt(0).toUpperCase() + svcType.slice(1),
          serviceType: svcType,
          status: 'in-progress',
          source: 'walk-in',
          billable: true,
          quantity: 1,
          unitPrice: serviceFee,
          discountAmount: 0,
          taxRate: 0,
          performedBy: selectedDoctorName || auth.currentUser?.displayName || userUid,
          completedAt: null,
          createdBy: userUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await addDoc(collection(db, 'appointment_services'), serviceData);
      }
      
      // 5. Navigate directly to EMR with encounterId
      setShowDoctorDialog(false);
      navigate(`/crm/emr/${patientId}`, {
        state: { encounterId }
      });
    } catch (error) {
      console.error('Error quick starting visit:', error);
      alert('Error starting visit. Please try again.');
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    if (!scheduledAppointment) return;
    
    try {
      const { notifyClient } = await import('../../lib/notifications');
      await notifyClient(
        scheduledAppointment.clientUid,
        'appointment_reminder',
        'Appointment Reminder',
        `Reminder: You have an upcoming appointment for ${patient?.name} on ${scheduledAppointment.date} at ${scheduledAppointment.time}.`
      );
      alert('Reminder sent successfully!');
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Error sending reminder. Please try again.');
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const petData = await fetchPetById(patientId || '');
        setPatient(petData);

        // Fetch owner data if pet has ownerUid
        if (petData?.ownerUid) {
          const { fetchOwnerByUid } = await import('../../lib/firestore-helpers');
          const ownerData = await fetchOwnerByUid(petData.ownerUid);
          setOwner(ownerData);
        }

        // Fetch encounters for this patient
        const encounterData = await fetchEncounters(patientId);
        setEncounters(encounterData);

        // Fetch all users for name resolution
        const allUsers = await fetchUsers();
        setUsers(allUsers);

        // Fetch ALL patient vitals for historical chart
        const allVitals = await fetchAllPatientVitals(patientId || '');
        setAllPatientVitals(allVitals);

        // Check for active encounter (in-progress with startedAt)
        const activeEncounter = encounterData.find((e: any) => 
          e.status === 'in-progress' && e.startedAt
        );
        const hasActiveEncounter = !!activeEncounter;

        // Set mode based on active encounter
        if (hasActiveEncounter) {
          setMode('active');
        } else {
          setMode('view');
        }

        // Select encounter from navigation state, active encounter, or default to first
        const stateEncounterId = (location.state as any)?.encounterId;
        if (stateEncounterId) {
          const enc = encounterData.find((e: any) => e.id === stateEncounterId);
          if (enc) {
            setSelectedEncounter(enc);
          } else if (activeEncounter) {
            setSelectedEncounter(activeEncounter);
          } else if (encounterData.length > 0) {
            setSelectedEncounter(encounterData[0]);
          }
        } else if (activeEncounter) {
          setSelectedEncounter(activeEncounter);
        } else if (encounterData.length > 0) {
          setSelectedEncounter(encounterData[0]);
        }

        // Fetch service catalog
        const catalogData = await fetchServiceCatalog();
        setServiceCatalog(catalogData);

        // Check for scheduled appointments (unconfirmed/confirmed) that haven't started
        const { fetchAppointments } = await import('../../lib/firestore-helpers');
        const appointmentsData = await fetchAppointments({ petId: patientId });
        const scheduled = appointmentsData.find((apt: any) =>
          (apt.status === 'unconfirmed' || apt.status === 'confirmed') &&
          !encounterData.some((enc: any) => enc.appointmentId === apt.id)
        );
        setScheduledAppointment(scheduled || null);

      } catch (error) {
        console.error('Error loading EMR data:', error);
      } finally {
        setLoading(false);
      }
    }
    if (patientId) loadData();
  }, [patientId]);

  // Load encounter-specific data when selectedEncounter changes
  useEffect(() => {
    if (!selectedEncounter?.id) return;

    async function loadEncounterData() {
      try {
        const encounterId = selectedEncounter.id;

        const [
          services, vitals, notes, labs, rxs, dispensing,
          inv, atts, logs
        ] = await Promise.all([
          fetchAppointmentServices(encounterId),
          fetchTriageVitals(encounterId),
          fetchClinicalNotes(encounterId),
          fetchLabOrders(encounterId),
          fetchPrescriptions(encounterId),
          fetchDispensingRecords(encounterId),
          fetchInvoicesByEncounter(encounterId),
          fetchAttachments(encounterId),
          fetchAuditLogs({ encounterId })
        ]);

        // Fetch invoice items and payments based on invoice
        const invoiceId = inv?.[0]?.id || '';
        const [items, pays] = await Promise.all([
          fetchInvoiceItems(invoiceId),
          fetchPayments(invoiceId)
        ]);

        setAppointmentServices(services);
        setTriageVitals(vitals);
        setClinicalNotes(notes.length > 0 ? notes[notes.length - 1] : null);
        setLabOrders(labs);
        setPrescriptions(rxs);
        setDispensingRecords(dispensing);
        setInvoice(inv?.[0] || null);
        setInvoiceItems(items);
        setPayments(pays);
        setAttachments(atts);
        setAuditLogs(logs);
      } catch (error) {
        console.error('Error loading encounter data:', error);
      }
    }

    loadEncounterData();
  }, [selectedEncounter?.id]);

  // Populate vitals form when triage vitals are loaded
  useEffect(() => {
    if (triageVitals.length > 0) {
      const latest = triageVitals[triageVitals.length - 1];
      setVitalsForm(latest);
      setVitalsEditMode(false);
    } else {
      setVitalsForm({});
      setVitalsEditMode(true);
    }
  }, [triageVitals]);

  // Populate notes edit mode based on existing clinical notes
  useEffect(() => {
    if (clinicalNotes && (clinicalNotes.subjective || clinicalNotes.objective || clinicalNotes.assessment || clinicalNotes.plan)) {
      setNotesEditMode(false);
    } else {
      setNotesEditMode(true);
    }
  }, [clinicalNotes]);

  const handleLegendClick = (dataKey: string) => {
    setHiddenLines(prev => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  const generateVitalsAnalysis = () => {
    if (allPatientVitals.length < 2) return null;
    const sorted = allPatientVitals.slice().sort((a: any, b: any) => parseDate(a.createdAt) - parseDate(b.createdAt));
    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    const first = sorted[0];
    const insights: string[] = [];

    const wtLatest = parseFloat(String(latest.weightKg || 0));
    const wtPrev = parseFloat(String(previous.weightKg || 0));
    const wtFirst = parseFloat(String(first.weightKg || 0));
    if (wtLatest > 0 && wtPrev > 0) {
      const wtChange = wtLatest - wtPrev;
      const wtPct = ((wtLatest - wtFirst) / wtFirst * 100).toFixed(1);
      if (Math.abs(wtChange) < 0.3) insights.push(`Weight stable at ${wtLatest.toFixed(1)} kg — well-maintained body condition.`);
      else if (wtChange > 0) insights.push(`Weight increased by ${Math.abs(wtChange).toFixed(1)} kg from previous visit (+${wtPct}% overall). Monitor for obesity risk.`);
      else insights.push(`Weight decreased by ${Math.abs(wtChange).toFixed(1)} kg from previous visit (${wtPct}% from baseline). Assess if intentional weight management.`);
    }

    const tempLatest = parseFloat(String(latest.temperatureC || 0));
    const tempPrev = parseFloat(String(previous.temperatureC || 0));
    if (tempLatest > 0) {
      if (tempLatest > 39.2) insights.push(`Temperature elevated at ${tempLatest.toFixed(1)}°C — pyrexia detected. Consider infectious or inflammatory process.`);
      else if (tempLatest > 38.9) insights.push(`Temperature mildly elevated at ${tempLatest.toFixed(1)}°C — monitor for trending fever.`);
      else if (tempLatest < 37.8) insights.push(`Temperature below normal range at ${tempLatest.toFixed(1)}°C — hypothermia concern. Assess perfusion status.`);
      else if (tempPrev > 39.0 && tempLatest <= 38.9) insights.push(`Temperature normalized to ${tempLatest.toFixed(1)}°C from previous pyrexia — treatment response favorable.`);
      else insights.push(`Temperature within normal range at ${tempLatest.toFixed(1)}°C — thermoregulation stable.`);
    }

    const hrLatest = latest.heartRateBpm || 0;
    const hrPrev = previous.heartRateBpm || 0;
    const hrFirst = first.heartRateBpm || 0;
    if (hrLatest > 0) {
      const species = patient?.species?.toLowerCase() || '';
      const isCat = species === 'cat';
      const normalLow = isCat ? 140 : 60;
      const normalHigh = isCat ? 220 : 140;
      if (hrLatest > normalHigh) insights.push(`Heart rate elevated at ${hrLatest} bpm (tachycardia). Evaluate for pain, anxiety, or cardiovascular compromise.`);
      else if (hrLatest < normalLow) insights.push(`Heart rate below normal at ${hrLatest} bpm (bradycardia). Assess cardiac conduction and metabolic status.`);
      else if (hrPrev > normalHigh && hrLatest <= normalHigh) insights.push(`Heart rate normalized to ${hrLatest} bpm from previous tachycardia — clinical improvement noted.`);
      else insights.push(`Heart rate within normal parameters at ${hrLatest} bpm — cardiovascular status stable.`);
    }

    const rrLatest = latest.respiratoryRateRpm || 0;
    const rrPrev = previous.respiratoryRateRpm || 0;
    if (rrLatest > 0) {
      const species = patient?.species?.toLowerCase() || '';
      const isCat = species === 'cat';
      const normalLow = isCat ? 20 : 10;
      const normalHigh = isCat ? 42 : 30;
      if (rrLatest > normalHigh) insights.push(`Respiratory rate elevated at ${rrLatest} rpm (tachypnea). Assess for respiratory distress, pain, or metabolic acidosis.`);
      else if (rrLatest < normalLow) insights.push(`Respiratory rate below normal at ${rrLatest} rpm. Monitor for respiratory depression.`);
      else if (rrPrev > normalHigh && rrLatest <= normalHigh) insights.push(`Respiratory rate normalized to ${rrLatest} rpm from previous tachypnea — respiratory status improving.`);
      else insights.push(`Respiratory rate within normal limits at ${rrLatest} rpm — pulmonary function adequate.`);
    }

    const mmLatest = latest.mmColor || '';
    if (mmLatest && mmLatest.toLowerCase() !== 'pink') insights.push(`Mucous membrane color: ${mmLatest} — warrants further assessment of perfusion and oxygenation status.`);

    const crtLatest = parseFloat(String(latest.crtSeconds || 0));
    if (crtLatest > 0 && crtLatest > 2.0) insights.push(`Capillary refill time prolonged at ${crtLatest}s — possible peripheral perfusion deficit or dehydration.`);

    const trend = wtLatest > wtFirst ? 'upward' : wtLatest < wtFirst ? 'downward' : 'stable';
    if (sorted.length >= 3) insights.push(`Overall trend: ${sorted.length} recorded visits with ${trend === 'stable' ? 'stable' : trend + '-trending'} weight trajectory. Continue monitoring at each visit.`);

    return insights;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (mode === 'view') return; // Ignore changes in view mode
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleVitalsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVitalsForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const saveVitals = async () => {
    if (!selectedEncounter?.id) return;
    setSavingVitals(true);
    try {
      const vitalsData = {
        encounterId: selectedEncounter.id,
        patientId: patientId,
        appointmentId: selectedEncounter.appointmentId || '',
        weightKg: parseFloat(vitalsForm.weightKg) || 0,
        temperatureC: parseFloat(vitalsForm.temperatureC) || 0,
        heartRateBpm: parseInt(vitalsForm.heartRateBpm) || 0,
        respiratoryRateRpm: parseInt(vitalsForm.respiratoryRateRpm) || 0,
        mmColor: vitalsForm.mmColor || '',
        crtSeconds: parseFloat(vitalsForm.crtSeconds) || 0,
        notes: vitalsForm.notes || '',
        createdBy: 'current-user', // Replace with actual user ID
        createdAt: serverTimestamp()
      };

      // Save to triage_vitals collection
      await addDoc(collection(db, 'triage_vitals'), vitalsData);

      // Update encounter's vitals field
      const encounterRef = doc(db, 'encounters', selectedEncounter.id);
      await updateDoc(encounterRef, {
        vitals: {
          weightKg: vitalsData.weightKg,
          temperatureC: vitalsData.temperatureC,
          heartRateBpm: vitalsData.heartRateBpm,
          respiratoryRateRpm: vitalsData.respiratoryRateRpm,
          mmColor: vitalsData.mmColor,
          crtSeconds: vitalsData.crtSeconds,
          notes: vitalsData.notes
        },
        updatedAt: serverTimestamp()
      });

      // Refresh vitals list
      const updatedVitals = await fetchTriageVitals(selectedEncounter.id);
      setTriageVitals(updatedVitals);

      // Refresh all patient vitals for chart
      const updatedAllVitals = await fetchAllPatientVitals(patientId || '');
      setAllPatientVitals(updatedAllVitals);

      setVitalsEditMode(false);
      alert('Vitals saved successfully!');
    } catch (error) {
      console.error('Error saving vitals:', error);
      alert('Error saving vitals. Please try again.');
    } finally {
      setSavingVitals(false);
    }
  };

  const saveClinicalNotes = async () => {
    if (!selectedEncounter?.id) return;
    setSavingNotes(true);
    try {
      const userName = auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown';
      const notesData = {
        encounterId: selectedEncounter.id,
        patientId: patientId,
        subjective: formData.subjective || '',
        objective: formData.objective || '',
        assessment: formData.assessment || '',
        plan: formData.plan || '',
        diagnosis: formData.diagnosis || '',
        doctorNotes: formData.doctorNotes || '',
        followUpInstructions: formData.followUpInstructions || '',
        createdBy: userName,
        updatedAt: serverTimestamp()
      };

      // Check if a notes document already exists for this encounter
      const existingNotes = await fetchClinicalNotes(selectedEncounter.id);
      if (existingNotes.length > 0) {
        // Update the latest notes document
        const latest = existingNotes[existingNotes.length - 1];
        await updateDoc(doc(db, 'clinical_notes', latest.id), notesData);
      } else {
        // Create new notes document
        await addDoc(collection(db, 'clinical_notes'), { ...notesData, createdAt: serverTimestamp() });
      }

      // Update encounter's clinicalNotes field
      const encounterRef = doc(db, 'encounters', selectedEncounter.id);
      await updateDoc(encounterRef, {
        clinicalNotes: {
          subjective: notesData.subjective,
          objective: notesData.objective,
          assessment: notesData.assessment,
          plan: notesData.plan,
          diagnosis: notesData.diagnosis,
          doctorNotes: notesData.doctorNotes,
          followUpInstructions: notesData.followUpInstructions
        },
        updatedAt: serverTimestamp()
      });

      // Refresh clinical notes
      const updatedNotes = await fetchClinicalNotes(selectedEncounter.id);
      setClinicalNotes(updatedNotes.length > 0 ? updatedNotes[updatedNotes.length - 1] : null);
      setNotesEditMode(false);
      alert('Clinical notes saved successfully!');
    } catch (error) {
      console.error('Error saving clinical notes:', error);
      alert('Error saving clinical notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const addService = async () => {
    if (!selectedEncounter?.id || !formData.serviceCatalogId) return;

    try {
      // Get service details from catalog
      const catalogItem = serviceCatalog.find((s: any) => s.id === formData.serviceCatalogId);
      if (!catalogItem) {
        alert('Please select a valid service');
        return;
      }

      const qty = parseInt(formData.quantity) || 1;
      const now = serverTimestamp();

      // Create appointment_service record
      const serviceData = {
        appointmentId: selectedEncounter.appointmentId || '',
        encounterId: selectedEncounter.id,
        petId: patientId,
        ownerId: selectedEncounter.ownerId || '',
        serviceCatalogId: catalogItem.id,
        serviceCode: catalogItem.code,
        serviceName: catalogItem.name,
        serviceType: catalogItem.category,
        status: 'in-progress',
        source: 'doctor-added',
        billable: true,
        quantity: qty,
        unitPrice: catalogItem.defaultPrice,
        discountAmount: 0,
        taxRate: catalogItem.taxable ? 0.12 : 0,
        performedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown',
        completedAt: null,
        createdBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown',
        createdAt: now,
        updatedAt: now
      };

      const serviceRef = await addDoc(collection(db, 'appointment_services'), serviceData);

      // If lab test, create lab_order
      if (catalogItem.category === 'lab') {
        await addDoc(collection(db, 'lab_orders'), {
          encounterId: selectedEncounter.id,
          appointmentServiceId: serviceRef.id,
          patientId: patientId,
          testName: catalogItem.name,
          testCode: catalogItem.code,
          status: 'ordered',
          orderedBy: 'current-user', // Replace with actual user ID
          orderedAt: now
        });
      }

      // If medication, create prescription
      if (catalogItem.category === 'medication') {
        await addDoc(collection(db, 'prescriptions'), {
          encounterId: selectedEncounter.id,
          patientId: patientId,
          appointmentServiceId: serviceRef.id,
          medicationName: catalogItem.name,
          medicationCatalogId: catalogItem.id,
          dosage: '',
          frequency: '',
          duration: '',
          quantityPrescribed: qty,
          instructions: '',
          status: 'prescribed',
          prescribedBy: 'current-user', // Replace with actual user ID
          prescribedAt: now
        });
      }

      // Refresh services list
      const updatedServices = await fetchAppointmentServices(selectedEncounter.id);
      setAppointmentServices(updatedServices);

      // Refresh other related data
      if (catalogItem.category === 'lab') {
        const updatedLabs = await fetchLabOrders(selectedEncounter.id);
        setLabOrders(updatedLabs);
      }
      if (catalogItem.category === 'medication') {
        const updatedRx = await fetchPrescriptions(selectedEncounter.id);
        setPrescriptions(updatedRx);
      }

      setShowAddForm(false);
      setFormData({});
      alert('Service added successfully!');
    } catch (error) {
      console.error('Error adding service:', error);
      alert('Error adding service. Please try again.');
    }
  };

  const completeService = async (service: any) => {
    if (!service?.id) return;
    try {
      await updateDoc(doc(db, 'appointment_services', service.id), {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const updatedServices = await fetchAppointmentServices(selectedEncounter.id);
      setAppointmentServices(updatedServices);

      const allComplete = updatedServices.every((s: any) => s.status === 'completed');
      const billableServices = updatedServices.filter((s: any) => s.billable !== false);
      if (billableServices.length === 0) return;

      if (allComplete && !invoice) {
        // No invoice yet - create one
        await generateInvoiceFromEncounter(
          selectedEncounter.id,
          billableServices,
          patientId || '',
          selectedEncounter.ownerId || patient?.ownerUid || ''
        );
        const [inv, items, pays] = await Promise.all([
          fetchInvoicesByEncounter(selectedEncounter.id),
          fetchInvoiceItems(''),
          fetchPayments('')
        ]);
        if (inv.length > 0) {
          setInvoice(inv[0]);
          const [invItems, invPays] = await Promise.all([
            fetchInvoiceItems(inv[0].id),
            fetchPayments(inv[0].id)
          ]);
          setInvoiceItems(invItems);
          setPayments(invPays);
        }
        alert('All services completed. Draft invoice has been generated.');
      } else if (invoice) {
        // Invoice already exists - add line item for this service
        const lineTotal = (service.unitPrice || 0) * (service.quantity || 1);
        const discount = service.discountAmount || 0;
        const newItem = {
          invoiceId: invoice.id,
          encounterId: selectedEncounter.id,
          appointmentServiceId: service.id,
          itemType: service.serviceType || 'service',
          description: service.serviceName,
          quantity: service.quantity || 1,
          unitPrice: service.unitPrice || 0,
          discountAmount: discount,
          taxRate: service.taxRate || 0,
          lineTotal: lineTotal - discount,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'invoice_items'), newItem);

        // Recalculate invoice totals
        const allItems = await fetchInvoiceItems(invoice.id);
        const newSubTotal = allItems.reduce((sum: number, i: any) => sum + (i.lineTotal || 0), 0);
        await updateDoc(doc(db, 'invoices', invoice.id), {
          subTotal: newSubTotal,
          discountTotal: allItems.reduce((sum: number, i: any) => sum + (i.discountAmount || 0), 0),
          grandTotal: newSubTotal,
          balanceDue: newSubTotal - (invoice.amountPaid || 0),
          updatedAt: serverTimestamp()
        });

        // Refresh invoice data
        const [inv, invItems, invPays] = await Promise.all([
          fetchInvoicesByEncounter(selectedEncounter.id),
          fetchInvoiceItems(invoice.id),
          fetchPayments(invoice.id)
        ]);
        if (inv.length > 0) setInvoice(inv[0]);
        setInvoiceItems(invItems);
        setPayments(invPays);

        if (allComplete) {
          alert('Service completed. Invoice has been updated.');
        }
      }
    } catch (error) {
      console.error('Error completing service:', error);
      alert('Error completing service. Please try again.');
    }
  };

  const prescribeMedication = async () => {
    if (!selectedEncounter?.id || !formData.serviceCatalogId) return;

    try {
      const catalogItem = serviceCatalog.find((s: any) => s.id === formData.serviceCatalogId);
      if (!catalogItem) {
        alert('Please select a valid medication');
        return;
      }

      const now = serverTimestamp();
      const rxData = {
        encounterId: selectedEncounter.id,
        patientId: patientId,
        appointmentServiceId: '',
        medicationName: catalogItem.name,
        medicationCatalogId: catalogItem.id,
        dosage: formData.dosage || '',
        frequency: formData.frequency || '',
        duration: formData.duration || '',
        quantityPrescribed: parseInt(formData.quantity) || 1,
        instructions: formData.instructions || '',
        status: 'prescribed',
        prescribedBy: 'current-user', // Replace with actual user ID
        prescribedAt: now
      };

      await addDoc(collection(db, 'prescriptions'), rxData);

      // Refresh prescriptions
      const updatedRx = await fetchPrescriptions(selectedEncounter.id);
      setPrescriptions(updatedRx);

      setFormData({});
      alert('Medication prescribed successfully!');
    } catch (error) {
      console.error('Error prescribing medication:', error);
      alert('Error prescribing medication. Please try again.');
    }
  };

  const dispenseMedication = async (prescriptionId: string) => {
    if (!selectedEncounter?.id) return;

    try {
      const prescription = prescriptions.find((rx: any) => rx.id === prescriptionId);
      if (!prescription) {
        alert('Prescription not found');
        return;
      }

      const catalogItem = serviceCatalog.find((s: any) => s.id === prescription.medicationCatalogId);
      const now = serverTimestamp();

      // Create appointment_service for dispensing
      const serviceData = {
        appointmentId: selectedEncounter.appointmentId || '',
        encounterId: selectedEncounter.id,
        petId: patientId,
        ownerId: selectedEncounter.ownerId || '',
        serviceCatalogId: prescription.medicationCatalogId || '',
        serviceCode: 'DISP',
        serviceName: `Dispense: ${prescription.medicationName}`,
        serviceType: 'medication',
        status: 'completed',
        source: 'pharmacy-dispensed',
        billable: true,
        quantity: prescription.quantityPrescribed || 1,
        unitPrice: catalogItem?.defaultPrice || 0,
        discountAmount: 0,
        taxRate: catalogItem?.taxable ? 0.12 : 0,
        performedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown',
        completedAt: now,
        createdBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown',
        createdAt: now,
        updatedAt: now
      };

      const serviceRef = await addDoc(collection(db, 'appointment_services'), serviceData);

      // Create dispensing record
      const dispenseData = {
        prescriptionId: prescriptionId,
        encounterId: selectedEncounter.id,
        patientId: patientId,
        appointmentServiceId: serviceRef.id,
        inventoryItemId: catalogItem?.inventoryItemId || '',
        medicationName: prescription.medicationName,
        quantityDispensed: prescription.quantityPrescribed || 1,
        unitPrice: catalogItem?.defaultPrice || 0,
        totalPrice: (catalogItem?.defaultPrice || 0) * (prescription.quantityPrescribed || 1),
        dispensedBy: 'current-user', // Replace with actual user ID
        dispensedAt: now
      };

      await addDoc(collection(db, 'dispensing_records'), dispenseData);

      // Update prescription status
      const rxRef = doc(db, 'prescriptions', prescriptionId);
      await updateDoc(rxRef, {
        status: 'dispensed',
        updatedAt: now
      });

      // Update inventory (reduce stock)
      if (catalogItem?.inventoryItemId) {
        console.log('Deduct inventory:', catalogItem.inventoryItemId);
        // TODO: Implement inventory deduction
      }

      // Refresh data
      const [updatedServices, updatedRx, updatedDispensing] = await Promise.all([
        fetchAppointmentServices(selectedEncounter.id),
        fetchPrescriptions(selectedEncounter.id),
        fetchDispensingRecords(selectedEncounter.id)
      ]);

      setAppointmentServices(updatedServices);
      setPrescriptions(updatedRx);
      setDispensingRecords(updatedDispensing);

      alert('Medication dispensed successfully!');
    } catch (error) {
      console.error('Error dispensing medication:', error);
      alert('Error dispensing medication. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEncounter?.id) return;

    setUploadingFile(true);
    try {
      const ownerName = owner?.displayName || owner?.name || 'Unknown';
      const petName = patient?.name || 'Unknown';

      const { fileId, webViewLink, downloadUrl } = await uploadToGoogleDrive(file, {
        ownerName,
        petName,
        fileType: 'emr',
      });

      // Save attachment record to Firestore
      const attachmentData = {
        encounterId: selectedEncounter.id,
        patientId: patientId,
        appointmentId: selectedEncounter.appointmentId || '',
        fileUrl: webViewLink || downloadUrl,
        storagePath: fileId, // Store Google Drive file ID
        fileName: file.name,
        fileType: getFileType(file.name),
        uploadedBy: 'current-user', // Replace with actual user ID
        uploadedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'attachments'), attachmentData);

      // Refresh attachments list
      const updatedAttachments = await fetchAttachments(selectedEncounter.id);
      setAttachments(updatedAttachments);

      // Reset file input
      e.target.value = '';
      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const generateDraftInvoice = async () => {
    if (!selectedEncounter?.id || !patient) return;

    setGeneratingInvoice(true);
    try {
      if (invoice) {
        alert('Invoice already exists for this encounter');
        return;
      }

      const billableServices = appointmentServices.filter(s => s.billable !== false);

      if (billableServices.length === 0) {
        alert('No billable services found for this encounter');
        return;
      }

      const newInvoice = await generateInvoiceFromEncounter(
        selectedEncounter.id,
        billableServices,
        patientId || '',
        selectedEncounter.ownerId || patient?.ownerUid || ''
      );

      const [inv, items, pays] = await Promise.all([
        fetchInvoicesByEncounter(selectedEncounter.id),
        fetchInvoiceItems(newInvoice.id),
        fetchPayments(newInvoice.id)
      ]);

      setInvoice(inv[0] || null);
      setInvoiceItems(items);
      setPayments(pays);

      alert('Draft invoice generated successfully!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice. Please try again.');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!invoice?.id) return;

    setRecordingPayment(true);
    try {
      await recordPayment(
        invoice.id,
        paymentData.amount || invoice.balanceDue,
        paymentData.method,
        paymentData.referenceNo
      );

      const [inv, items, pays] = await Promise.all([
        fetchInvoicesByEncounter(selectedEncounter.id),
        fetchInvoiceItems(invoice.id),
        fetchPayments(invoice.id)
      ]);

      setInvoice(inv[0] || null);
      setInvoiceItems(items);
      setPayments(pays);
      setShowPaymentDialog(false);
      setPaymentData({ amount: 0, method: 'cash', referenceNo: '' });

      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment. Please try again.');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleDownloadInvoicePDF = async () => {
    if (!invoice || !patient || !owner || !selectedEncounter) return;

    try {
      const blob = await pdf(
        <InvoicePDF
          invoice={invoice}
          invoiceItems={invoiceItems}
          payments={payments}
          patient={patient}
          owner={owner}
          encounter={selectedEncounter}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoice.invoiceNo}_${patient.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  function getFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const typeMap: { [key: string]: string } = {
      'pdf': 'pdf',
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'bmp': 'image',
      'doc': 'document', 'docx': 'document',
      'xls': 'document', 'xlsx': 'document',
      'txt': 'document', 'csv': 'document'
    };
    return typeMap[ext || ''] || 'other';
  }

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

  const tabs = [
    { id: 'visit-summary' as TabType, label: 'Visit Summary', icon: ClipboardList },
    { id: 'triage-vitals' as TabType, label: 'Triage & Vitals', icon: Thermometer },
    { id: 'clinical-notes' as TabType, label: 'Clinical Notes', icon: Stethoscope },
    { id: 'orders-services' as TabType, label: 'Orders & Services', icon: Activity },
    { id: 'medications-pharmacy' as TabType, label: 'Medications', icon: Pill },
    { id: 'diagnostics-files' as TabType, label: 'Diagnostics', icon: FlaskConical },
    { id: 'billing' as TabType, label: 'Billing', icon: FileText },
    { id: 'history' as TabType, label: 'History', icon: History },
  ];

  const resolveName = (id: string) => {
    if (!id) return 'Unknown';
    const user = users.find((u: any) => u.uid === id || u.id === id);
    if (user?.displayName) return user.displayName;
    if (user?.name) return user.name;
    const enc = encounters.find((e: any) => e.doctorId === id);
    if (enc?.doctorName) return enc.doctorName;
    if (owner && (owner.uid === id || owner.name === id)) return owner.name;
    if (id.includes(' ') || id.length > 28) return id;
    return id;
  };

  return (
    <div>
      <PageHeader
        title="Electronic Medical Records (EMR)"
        subtitle={
          mode === 'active'
            ? `🟢 Active Visit in Progress - ${patient.name}${selectedEncounter?.startedAt?.toDate?.() ? ` (Started at ${format(selectedEncounter.startedAt.toDate(), 'hh:mm a')})` : ''}`
            : `⚪ No Active Visit - ${patient.name}`
        }
        backText={location.state?.backText || 'Back'}
      />

      {mode === 'view' && (
        <div className="flex gap-2 mb-4">
          {scheduledAppointment ? (
            <Button
              onClick={handleSendReminder}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Reminder
            </Button>
          ) : (
            <Button
              onClick={handleQuickStartVisit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting Visit...
                </span>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Quick Start Visit
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setActiveTab('history')}
          >
            <History className="w-4 h-4 mr-2" />
            View Past Visits
          </Button>
        </div>
      )}

      {/* Patient Info Header */}
      <div className="bg-white rounded-lg p-6 shadow mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-white shadow-xl bg-blue-50 flex items-center justify-center text-3xl font-bold text-blue-600">
              {patient?.imageUrl || patient?.photo ? (
                <img src={patient.imageUrl || patient.photo} alt={patient.name} className="w-full h-full object-cover" />
              ) : (
                patient?.name?.[0] || 'P'
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{patient.name}</h2>
              <p className="text-sm text-gray-600"><span className="font-medium">Pet ID:</span> {patient.id}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Species:</span> {patient.species || 'N/A'}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Breed:</span> {patient.breed || 'N/A'}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Age:</span> {patient.age ? `${patient.age} years` : 'N/A'}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Status:</span> {patient.currentStatus || patient.status || 'N/A'}</p>
            </div>
          </div>

          {owner && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 min-w-[320px]">
              <h4 className="font-bold text-blue-900 mb-3 text-sm uppercase tracking-wider">Owner Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700/70 font-medium">Name:</span>
                  <span className="text-blue-900 font-semibold">{owner?.displayName || owner?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700/70 font-medium">Email:</span>
                  <span className="text-blue-900 underline decoration-blue-200">{owner?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700/70 font-medium">Phone:</span>
                  <span className="text-blue-900">{owner?.phone || patient?.ownerPhone || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Encounter Selector */}
        {encounters.length > 0 && (
          <div className="border-t pt-4">
            <Label className="text-sm font-medium text-gray-600">Select Encounter:</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {encounters
                .sort((a: any, b: any) => {
                  const aRaw = a.startedAt || a.createdAt;
                  const bRaw = b.startedAt || b.createdAt;
                  const aTs = typeof aRaw?.toDate === 'function' ? aRaw.toDate() : aRaw;
                  const bTs = typeof bRaw?.toDate === 'function' ? bRaw.toDate() : bRaw;
                  return (bTs ? new Date(bTs).getTime() : 0) - (aTs ? new Date(aTs).getTime() : 0);
                })
                .slice(0, showAllEncounters ? undefined : 5)
                .map((enc: any) => (
                  <Button
                    key={enc.id}
                    variant={selectedEncounter?.id === enc.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedEncounter(enc)}
                    className={cn(
                      selectedEncounter?.id === enc.id
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                    )}
                  >
                    {(() => {
                      const raw = enc.startedAt || enc.createdAt;
                      const ts = typeof raw?.toDate === 'function' ? raw.toDate() : raw;
                      if (!ts) return 'New';
                      const d = new Date(ts);
                      if (isNaN(d.getTime())) return 'New';
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    })()}
                    {enc.status === 'in-progress' && (
                      <span className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </Button>
                ))}
            </div>
            {encounters.length > 5 && (
              <button
                onClick={() => setShowAllEncounters(!showAllEncounters)}
                className="mt-2 w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showAllEncounters ? 'Show Less' : `See More (${encounters.length - 5} more)`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-3 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2',
                activeTab === tab.id
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'text-blue-600 border-blue-200 hover:bg-blue-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'visit-summary' && (
          <VisitSummaryTab
            patient={patient}
            owner={owner}
            encounter={selectedEncounter}
            encounters={encounters}
            vitals={triageVitals}
            services={appointmentServices}
            clinicalNotes={clinicalNotes}
            labOrders={labOrders}
            prescriptions={prescriptions}
            invoice={invoice}
            invoiceItems={invoiceItems}
            payments={payments}
            attachments={attachments}
          />
        )}

        {activeTab === 'triage-vitals' && (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Triage & Vitals</h3>

            {/* Current Vitals Form */}
            <div className="mb-8">
              <h4 className="font-semibold mb-3">Current Vitals</h4>
              <form onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                if (vitalsEditMode) {
                  saveVitals();
                } else {
                  setVitalsEditMode(true);
                }
              }} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="weightKg">Weight (kg)</Label>
                    <Input
                      id="weightKg"
                      name="weightKg"
                      type="number"
                      step="0.1"
                      min="0"
                      value={vitalsForm.weightKg || ''}
                      onChange={handleVitalsChange}
                      disabled={!vitalsEditMode}
                      className="mt-1"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="temperatureC">Temperature (°C)</Label>
                    <Input
                      id="temperatureC"
                      name="temperatureC"
                      type="number"
                      step="0.1"
                      min="35"
                      max="45"
                      value={vitalsForm.temperatureC || ''}
                      onChange={handleVitalsChange}
                      disabled={!vitalsEditMode}
                      className="mt-1"
                      placeholder="38.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="heartRateBpm">Heart Rate (bpm)</Label>
                    <Input
                      id="heartRateBpm"
                      name="heartRateBpm"
                      type="number"
                      value={vitalsForm.heartRateBpm || ''}
                      onChange={handleVitalsChange}
                      disabled={!vitalsEditMode}
                      className="mt-1"
                      placeholder="120"
                    />
                  </div>
                  <div>
                    <Label htmlFor="respiratoryRateRpm">Respiratory Rate (rpm)</Label>
                    <Input
                      id="respiratoryRateRpm"
                      name="respiratoryRateRpm"
                      type="number"
                      value={vitalsForm.respiratoryRateRpm || ''}
                      onChange={handleVitalsChange}
                      disabled={!vitalsEditMode}
                      className="mt-1"
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mmColor">MM Color</Label>
                    <Input
                      id="mmColor"
                      name="mmColor"
                      value={vitalsForm.mmColor || ''}
                      onChange={handleVitalsChange}
                      disabled={!vitalsEditMode}
                      className="mt-1"
                      placeholder="Pink"
                    />
                  </div>
                  <div>
                    <Label htmlFor="crtSeconds">CRT (seconds)</Label>
                    <Input
                      id="crtSeconds"
                      name="crtSeconds"
                      type="number"
                      step="0.1"
                      value={vitalsForm.crtSeconds || ''}
                      onChange={handleVitalsChange}
                      disabled={!vitalsEditMode}
                      className="mt-1"
                      placeholder="2"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={savingVitals}
                  >
                    {savingVitals ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </span>
                    ) : vitalsEditMode ? (
                      'Save Vitals'
                    ) : (
                      'Edit Vitals'
                    )}
                  </Button>
                  {vitalsEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const latest = triageVitals[triageVitals.length - 1];
                        setVitalsForm(latest || {});
                        setVitalsEditMode(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Historical Vitals Chart */}
            {allPatientVitals.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Historical Vitals Trends</h4>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart
                      data={allPatientVitals
                        .slice()
                        .sort((a: any, b: any) => {
                          const da = parseDate(a.createdAt);
                          const db = parseDate(b.createdAt);
                          return da - db;
                        })
                        .map((v: any) => {
                          const ts = parseDate(v.createdAt);
                          const dateObj = new Date(ts);
                          return {
                            date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
                            fullDate: dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                            weight: parseFloat(String(v.weightKg || 0)),
                            temp: parseFloat((v.temperatureC || 0).toFixed(1)),
                            hr: v.heartRateBpm || 0,
                            rr: v.respiratoryRateRpm || 0,
                          };
                        })}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(label: string) => {
                          return label;
                        }}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          if (name === 'weight') return [`${value} kg`, 'Weight'];
                          if (name === 'temp') return [`${value}°C`, 'Temperature'];
                          if (name === 'hr') return [`${value} bpm`, 'Heart Rate'];
                          if (name === 'rr') return [`${value} rpm`, 'Resp Rate'];
                          return [value, name];
                        }}
                        labelFormatter={(date: string, payload: any) => {
                          if (payload && payload[0]?.payload?.fullDate) {
                            return payload[0].payload.fullDate;
                          }
                          return date;
                        }}
                      />
                      <div className="flex gap-4 justify-center pt-2">
                        {[
                          { key: 'weight', label: 'Weight', color: '#3b82f6' },
                          { key: 'temp', label: 'Temperature', color: '#ef4444' },
                          { key: 'hr', label: 'Heart Rate', color: '#10b981' },
                          { key: 'rr', label: 'Resp Rate', color: '#f59e0b' },
                        ].map(item => (
                          <button
                            key={item.key}
                            onClick={() => handleLegendClick(item.key)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-medium transition-opacity",
                              hiddenLines.has(item.key) && "opacity-40 line-through"
                            )}
                          >
                            <span
                              className="w-3 h-0.5 rounded"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <Line type="monotone" dataKey="weight" stroke="#3b82f6" activeDot={{ r: 8 }} name="Weight" hide={hiddenLines.has('weight')} />
                      <Line type="monotone" dataKey="temp" stroke="#ef4444" activeDot={{ r: 8 }} name="Temperature" hide={hiddenLines.has('temp')} />
                      <Line type="monotone" dataKey="hr" stroke="#10b981" activeDot={{ r: 8 }} name="Heart Rate" hide={hiddenLines.has('hr')} />
                      <Line type="monotone" dataKey="rr" stroke="#f59e0b" activeDot={{ r: 8 }} name="Resp Rate" hide={hiddenLines.has('rr')} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Intelligent Vitals Trend Analysis */}
                {(() => {
                  const analysis = generateVitalsAnalysis();
                  if (!analysis || analysis.length === 0) return null;

  return (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="flex items-start gap-2 mb-2">
                        <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <h5 className="font-semibold text-blue-900 text-sm">Clinical Vitals Analysis</h5>
                      </div>
                      <ul className="space-y-1.5">
                        {analysis.map((insight: string, i: number) => (
                          <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'clinical-notes' && (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Clinical Notes (SOAP)</h3>
            <form onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              saveClinicalNotes();
            }} className="space-y-4">
              <div>
                <Label htmlFor="subjective">Subjective</Label>
                  <Textarea
                    id="subjective"
                    name="subjective"
                    value={formData.subjective || clinicalNotes?.subjective || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                    rows={3}
                    placeholder="Patient history, owner's complaints..."
                    disabled={!notesEditMode}
                  />
              </div>
              <div>
                <Label htmlFor="objective">Objective</Label>
                  <Textarea
                    id="objective"
                    name="objective"
                    value={formData.objective || clinicalNotes?.objective || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                    rows={3}
                    placeholder="Physical examination findings, vitals..."
                    disabled={!notesEditMode}
                  />
              </div>
              <div>
                <Label htmlFor="assessment">Assessment</Label>
                  <Textarea
                    id="assessment"
                    name="assessment"
                    value={formData.assessment || clinicalNotes?.assessment || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                    rows={3}
                    placeholder="Diagnosis, differential diagnosis..."
                    disabled={!notesEditMode}
                  />
              </div>
              <div>
                <Label htmlFor="plan">Plan</Label>
                  <Textarea
                    id="plan"
                    name="plan"
                    value={formData.plan || clinicalNotes?.plan || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                    rows={3}
                    placeholder="Treatment plan, medications..."
                    disabled={!notesEditMode}
                  />
              </div>
              {notesEditMode ? (
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={savingNotes}
                  >
                    {savingNotes ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Save Clinical Notes'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, subjective: '', objective: '', assessment: '', plan: '' }));
                      setNotesEditMode(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNotesEditMode(true)}
                >
                  Edit Notes
                </Button>
              )}
            </form>
          </div>
        )}

        {activeTab === 'orders-services' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Orders & Services</h3>
              <Button onClick={() => setShowAddForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </div>

            {showAddForm && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold mb-3">Add New Service</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Service</Label>
                    <select
                      name="serviceCatalogId"
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2 border rounded-lg bg-white"
                    >
                      <option value="">Select service...</option>
                      {serviceCatalog.map((srv: any) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name} (₱{srv.defaultPrice})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      name="quantity"
                      type="number"
                      min="1"
                      defaultValue="1"
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => addService()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {appointmentServices.map((srv: any) => (
                <div key={srv.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{srv.serviceName}</p>
                      <p className="text-sm text-gray-500">
                        {srv.serviceType} • {srv.source} • Qty: {srv.quantity}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p className="font-bold">₱{srv.unitPrice * srv.quantity}</p>
                      {getStatusBadge(srv.status)}
                      {srv.status === 'in-progress' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => completeService(srv)}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'medications-pharmacy' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Medications / Pharmacy</h3>
              <Button onClick={() => setShowAddForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Prescribe
              </Button>
            </div>

            {showAddForm && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold mb-3">Prescribe Medication</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Medication</Label>
                    <select
                      name="serviceCatalogId"
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2 border rounded-lg bg-white"
                    >
                      <option value="">Select medication...</option>
                      {serviceCatalog
                        .filter((s: any) => s.category === 'medication')
                        .map((srv: any) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.name} (₱{srv.defaultPrice})
                          </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Dosage</Label>
                    <Input
                      name="dosage"
                      value={formData.dosage || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="e.g., 1 tablet twice daily"
                    />
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Input
                      name="frequency"
                      value={formData.frequency || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="e.g., for 7 days"
                    />
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input
                      name="duration"
                      value={formData.duration || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="e.g., 7 days"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => prescribeMedication()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Prescribe
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Prescriptions */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Prescriptions</h4>
              <div className="space-y-2">
                {prescriptions.map((rx: any) => (
                  <div key={rx.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{rx.medicationName}</p>
                        <p className="text-sm text-gray-500">
                          {rx.dosage} • {rx.frequency} • {rx.duration}
                        </p>
                        <p className="text-xs text-gray-400">Prescribed by: {rx.prescribedBy}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {rx.status === 'prescribed' && (
                          <Button
                            size="sm"
                            onClick={() => dispenseMedication(rx.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Dispense
                          </Button>
                        )}
                        {getStatusBadge(rx.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispensing Records */}
            <div>
              <h4 className="font-semibold mb-3">Dispensing Records</h4>
              <div className="space-y-2">
                {dispensingRecords.map((disp: any) => (
                  <div key={disp.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{disp.medicationName}</p>
                        <p className="text-sm text-gray-500">
                          Qty Dispensed: {disp.quantityDispensed} • ₱{disp.totalPrice}
                        </p>
                        <p className="text-xs text-gray-400">Dispensed by: {disp.dispensedBy}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Dispensed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diagnostics-files' && (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Diagnostics & Files</h3>

            {/* Lab Orders */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Lab Orders</h4>
              <div className="space-y-2">
                {labOrders.map((lab: any) => (
                  <div key={lab.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{lab.testName}</p>
                        <p className="text-sm text-gray-500">{lab.testCode}</p>
                        {lab.resultSummary && (
                          <p className="text-sm mt-1">{lab.resultSummary}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {getStatusBadge(lab.status)}
                        {lab.resultFileUrl && (
                          <a
                            href={lab.resultFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm mt-1 block"
                          >
                            <Eye className="w-4 h-4 inline mr-1" />
                            View Result
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Files & Attachments</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileUpload(e)}
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <Button
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {attachments.map((att: any) => (
                  <div key={att.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{att.fileName}</p>
                      <p className="text-sm text-gray-500">{att.fileType}</p>
                      <p className="text-xs text-gray-400">Uploaded by: {att.uploadedBy}</p>
                    </div>
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Billing</h3>
              <div className="flex gap-2">
                {invoice && (
                  <Button
                    onClick={handleDownloadInvoicePDF}
                    variant="outline"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                {invoice && invoice.status !== 'paid' && (
                  <Button
                    onClick={() => setShowPaymentDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                )}
              </div>
            </div>

            {invoice ? (
              <div>
                {/* Invoice Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold">Invoice #{invoice.invoiceNo}</h4>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Subtotal</p>
                      <p className="font-bold text-lg">₱{invoice.subTotal?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Discount</p>
                      <p className="font-bold text-lg">₱{invoice.discountTotal?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Grand Total</p>
                      <p className="font-bold text-lg text-blue-600">₱{invoice.grandTotal?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Paid</p>
                      <p className="font-bold text-lg text-green-600">₱{invoice.amountPaid?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Balance Due</p>
                      <p className="font-bold text-lg text-red-600">₱{invoice.balanceDue?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">Invoice Items</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Qty</th>
                        <th className="text-right p-3">Unit Price</th>
                        <th className="text-right p-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item: any) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{item.description}</td>
                          <td className="p-3">{item.itemType}</td>
                          <td className="p-3">{item.quantity}</td>
                          <td className="p-3 text-right">₱{item.unitPrice?.toFixed(2)}</td>
                          <td className="p-3 text-right font-medium">₱{item.lineTotal?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Payments */}
                {payments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Payments</h4>
                    <div className="space-y-2">
                      {payments.map((pay: any) => (
                        <div key={pay.id} className="p-3 bg-green-50 rounded-lg flex justify-between">
                          <div>
                            <p className="font-medium">₱{pay.amount?.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">{pay.paymentMethod} • {pay.referenceNo}</p>
                          </div>
                          <p className="text-sm text-gray-400">
                            {pay.paidAt?.toDate?.()?.toLocaleDateString?.()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No invoice generated yet.</p>
                <Button
                  onClick={generateDraftInvoice}
                  disabled={generatingInvoice}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {generatingInvoice ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    'Generate Draft Invoice'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Visit History</h3>
            <div className="space-y-3">
              {encounters.map((enc: any) => (
                <div
                  key={enc.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors ${
                    selectedEncounter?.id === enc.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedEncounter(enc)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {enc.startedAt?.toDate?.()?.toLocaleDateString?.() || 'New Visit'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {enc.appointmentId ? 'Appointment' : 'Walk-in'} • {enc.doctorName || 'N/A'}
                      </p>
                    </div>
                    {getStatusBadge(enc.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Compact Audit Trail Card */}
      {auditLogs.length > 0 && (
        <div className="mt-6 mx-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs
                  .sort((a: any, b: any) => {
                    const aRaw = a.timestamp || a.createdAt;
                    const bRaw = b.timestamp || b.createdAt;
                    const aTs = typeof aRaw?.toDate === 'function' ? aRaw.toDate() : aRaw;
                    const bTs = typeof bRaw?.toDate === 'function' ? bRaw.toDate() : bRaw;
                    return (bTs ? new Date(bTs).getTime() : 0) - (aTs ? new Date(aTs).getTime() : 0);
                  })
                  .slice(0, showAllAudit ? undefined : 5)
                  .map((log: any, idx: number) => (
                    <div key={log.id || idx} className="text-sm flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span className="font-medium capitalize">{log.action || log.event}</span>
                        {log.details && <span className="text-gray-600 ml-2 text-xs">{log.details}</span>}
                        <span className="text-gray-500 ml-2 text-xs">by {resolveName(log.userId || log.staff)}</span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {(() => {
                          const raw = log.timestamp || log.createdAt;
                          const ts = typeof raw?.toDate === 'function' ? raw.toDate() : raw;
                          if (!ts) return 'N/A';
                          const d = new Date(ts);
                          if (isNaN(d.getTime())) return 'N/A';
                          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
                            ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        })()}
                      </span>
                    </div>
                  ))}
              </div>
              {auditLogs.length > 5 && (
                <button
                  onClick={() => setShowAllAudit(!showAllAudit)}
                  className="mt-3 w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showAllAudit ? 'Show Less' : `See More (${auditLogs.length - 5} more)`}
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount (₱)</Label>
              <Input
                type="number"
                value={paymentData.amount || invoice?.balanceDue || 0}
                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Balance due: ₱{invoice?.balanceDue?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <Label>Payment Method</Label>
              <select
                value={paymentData.method}
                onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                className="w-full mt-1 p-2 border rounded-lg bg-white"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="gcash">GCash</option>
                <option value="bank-transfer">Bank Transfer</option>
                <option value="check">Check</option>
              </select>
            </div>
            <div>
              <Label>Reference No. (Optional)</Label>
              <Input
                value={paymentData.referenceNo}
                onChange={(e) => setPaymentData({ ...paymentData, referenceNo: e.target.value })}
                placeholder="Transaction reference"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button
              onClick={handleRecordPayment}
              disabled={recordingPayment}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {recordingPayment ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </span>
              ) : (
                'Record Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Doctor Selector Dialog for Quick Start Visit */}
      <Dialog open={showDoctorDialog} onOpenChange={setShowDoctorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Doctor for Quick Start</DialogTitle>
            <DialogDescription>
              Choose a doctor who is scheduled to be on-duty at this time. 
              Quick Start is for walk-in/emergency visits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableDoctors.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No doctors available at this time.</p>
              ) : (
                availableDoctors.map(doc => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedDoctorId === doc.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedDoctorId(doc.id);
                      setSelectedDoctorName(doc.name);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.specialization || 'General'}</p>
                      </div>
                      {selectedDoctorId === doc.id && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDoctorDialog(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!selectedDoctorId || loading}
              onClick={confirmQuickStart}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting Visit...
                </span>
              ) : (
                'Confirm Quick Start'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
