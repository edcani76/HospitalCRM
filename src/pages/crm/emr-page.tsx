import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Loader2, Mail, Phone, User, Stethoscope, Activity, Thermometer,
  Heart, Wind, Droplets, Clock, FileText, DollarSign, History,
  ClipboardList, Pill, FlaskConical, Upload, Printer, Eye, Bell, Check,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  AlertTriangle, FileCheck, Receipt, Calendar, X, ArrowRight, Box, Hash, Barcode
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../../components/ui/drawer';
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
  generateInvoiceFromEncounter, recordPayment, addAuditLog, createStockMovement, fetchStockMovements
} from '../../lib/firestore-helpers';
import { clearCache } from '../../lib/offline-cache';
import { collection, getDocs, getDoc, addDoc, updateDoc, doc, serverTimestamp, query, where, db, auth } from '../../firebase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { uploadToGoogleDrive, getGoogleDriveLink } from '../../lib/google-drive';
import { InvoicePDF } from '../../components/invoice-pdf';
import { pdf } from '@react-pdf/renderer';
import { OrderLabModal } from '../../components/crm/order-lab-modal';

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
    case 'medical-completed':
      return <Badge className="bg-purple-600 text-white">Medical Complete</Badge>;
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
  const taxAmount = invoice?.taxAmount || 0;

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
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">₱{(grandTotal - taxAmount).toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">VAT (12%)</span>
                    <span className="font-medium">₱{taxAmount.toFixed(2)}</span>
                  </div>
                )}
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
                      enc.status === 'medical-completed' ? "bg-purple-500" :
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
                      enc.status === 'medical-completed' ? "bg-purple-100 text-purple-700" :
                      enc.status === 'completed' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {enc.status === 'in-progress' ? 'In Progress' :
                       enc.status === 'medical-completed' ? 'Medical Complete' :
                       enc.status === 'completed' ? 'Completed' : enc.status}
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
  const [mode, setMode] = useState<'active' | 'view' | 'medical-completed'>('view');
  const [scheduledAppointment, setScheduledAppointment] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
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
      await addAuditLog({ action: 'appointment_created', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: 'Quick Start Visit' });
      const aptId = aptRef.id;
      
      // 2. Auto-confirm appointment
      await updateDoc(doc(db, 'appointments', aptId), {
        status: 'confirmed',
        updatedAt: serverTimestamp()
      });
      await addAuditLog({ action: 'appointment_confirmed', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: 'Quick Start Visit' });
      
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
      await addAuditLog({ action: 'encounter_created', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: encRef.id, patientId: patientId, details: 'Quick Start Visit started' });
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
        const svcRef2 = await addDoc(collection(db, 'appointment_services'), serviceData);
        await addAuditLog({ action: 'service_created', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: encounterId, patientId: patientId, details: 'Quick Start service' });
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
        let encounterData = await fetchEncounters(patientId);

        // Fetch ALL patient vitals for historical chart
        const allVitals = await fetchAllPatientVitals(patientId || '');
        setAllPatientVitals(allVitals);

        // Fetch service catalog
        const catalogData = await fetchServiceCatalog();
        setServiceCatalog(catalogData);

        // Fetch appointments for mode cross-reference and scheduled check
        const { fetchAppointments } = await import('../../lib/firestore-helpers');
        const appointmentsData = await fetchAppointments({ petId: patientId });

        // Check for active encounter (in-progress with startedAt)
        const activeEncounter = encounterData.find((e: any) => 
          e.status === 'in-progress' && e.startedAt
        );

        // Check for medical-completed encounter
        const medCompleteEncounter = encounterData.find((e: any) =>
          e.status === 'medical-completed'
        );

        // Cross-reference: if active encounter's appointment is medical-completed,
        // treat as medical-completed and update encounter data (handles legacy encounters)
        const isActiveReallyMedComplete = activeEncounter && !medCompleteEncounter
          ? appointmentsData.some((a: any) => a.id === (activeEncounter as any).appointmentId && a.status === 'medical-completed')
          : false;

        if (isActiveReallyMedComplete && activeEncounter) {
          encounterData = encounterData.map((e: any) =>
            e.id === activeEncounter.id ? { ...e, status: 'medical-completed' } : e
          );
        }
        setEncounters(encounterData);

        // Re-find after potential update above
        const resolvedActiveEncounter = encounterData.find((e: any) => 
          e.status === 'in-progress' && e.startedAt
        );
        const resolvedMedCompleteEncounter = encounterData.find((e: any) =>
          e.status === 'medical-completed'
        );

        // Set mode based on encounter + appointment status
        if (resolvedMedCompleteEncounter) {
          setMode('medical-completed');
        } else if (resolvedActiveEncounter) {
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
          } else if (resolvedActiveEncounter) {
            setSelectedEncounter(resolvedActiveEncounter);
          } else if (encounterData.length > 0) {
            setSelectedEncounter(encounterData[0]);
          }
        } else if (resolvedActiveEncounter) {
          setSelectedEncounter(resolvedActiveEncounter);
        } else if (encounterData.length > 0) {
          setSelectedEncounter(encounterData[0]);
        }

        // Check for scheduled appointments (unconfirmed/confirmed) that haven't started
        const scheduled = appointmentsData.find((apt: any) =>
          (apt.status === 'unconfirmed' || apt.status === 'confirmed') &&
          !encounterData.some((enc: any) => enc.appointmentId === apt.id)
        );
        setScheduledAppointment(scheduled || null);
        setAppointments(appointmentsData);

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

        // Clear cached data to ensure fresh reads
        await clearCache(`invoices_${encounterId}`).catch(() => {});
        await clearCache(`clinical_notes_${encounterId}`).catch(() => {});

        // Fetch latest encounter data for clinicalNotes fallback
        const encounterSnap = await getDoc(doc(db, 'encounters', encounterId));
        const freshEncounter = encounterSnap.data();

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
        if (invoiceId) {
          await clearCache(`invoice_items_${invoiceId}`).catch(() => {});
        }
        const [items, pays] = await Promise.all([
          fetchInvoiceItems(invoiceId),
          fetchPayments(invoiceId)
        ]);

        setAppointmentServices(services);
        setTriageVitals(vitals);
        const noteWithPlanItems = notes.find((n: any) => Array.isArray(n.planItems) && n.planItems.length > 0);
        const latestNote = noteWithPlanItems || (notes.length > 0 ? notes[notes.length - 1] : null);
        setClinicalNotes(latestNote);
        // Populate formData and chiefComplaint from saved clinical notes
        if (latestNote) {
          setFormData(p => ({
            ...p,
            chiefComplaint: latestNote.chiefComplaint || '',
            subjective: latestNote.subjective || '',
            objective: latestNote.objective || '',
            assessment: latestNote.assessment || '',
            plan: latestNote.plan || '',
            diagnosis: latestNote.diagnosis || '',
            diagnosisStatus: latestNote.diagnosisStatus || 'working',
            differentials: latestNote.differentials || '',
            severity: latestNote.severity || '',
            prognosis: latestNote.prognosis || '',
            clinicalImpression: latestNote.clinicalImpression || '',
            problemList: latestNote.problemList || '',
            appetite: latestNote.appetite || '',
            waterIntake: latestNote.waterIntake || '',
            urination: latestNote.urination || '',
            stool: latestNote.stool || '',
            vomiting: latestNote.vomiting || '',
            coughing: latestNote.coughing || '',
            activity: latestNote.activity || '',
            currentMeds: latestNote.currentMeds || '',
            pastHistory: latestNote.pastHistory || '',
            followUpInstructions: latestNote.followUpInstructions || '',
            followupType: latestNote.followupType || 'Recheck',
            followUpDate: latestNote.followUpDate || '',
            ownerInstructions: latestNote.ownerInstructions || '',
            dietInstructions: latestNote.dietInstructions || '',
            warningSigns: latestNote.warningSigns || '',
            doctorNotes: latestNote.doctorNotes || '',
            licenseNumber: latestNote.licenseNumber || '',
          }));
          setChiefComplaint(p => ({
            ...p,
            reason: latestNote.chiefComplaint || '',
            duration: latestNote.chiefComplaintDuration || '',
            urgency: latestNote.chiefComplaintUrgency || 'Routine',
            ownerStatement: latestNote.ownerStatement || '',
          }));
          if (Array.isArray(latestNote.planItems)) setPlanItems(latestNote.planItems);
          else if (freshEncounter?.clinicalNotes?.planItems) setPlanItems(freshEncounter.clinicalNotes.planItems);
        } else if (freshEncounter?.clinicalNotes?.planItems) {
          setPlanItems(freshEncounter.clinicalNotes.planItems);
        }
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

  const handleVitalsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { name: string; value: string } }) => {
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
      const vitalsRef = await addDoc(collection(db, 'triage_vitals'), vitalsData);
      await addAuditLog({ action: 'vitals_saved', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });

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
      await addAuditLog({ action: 'encounter_vitals_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });

      // Refresh vitals list
      const updatedVitals = await fetchTriageVitals(selectedEncounter.id);
      setTriageVitals(updatedVitals);

      // Refresh all patient vitals for chart
      const updatedAllVitals = await fetchAllPatientVitals(patientId || '');
      setAllPatientVitals(updatedAllVitals);

      setVitalsEditMode(false);
    } catch (error) {
      console.error('Error saving vitals:', error);
      alert('Error saving vitals. Please try again.');
    } finally {
      setSavingVitals(false);
    }
  };

  const persistPlanItems = async (items: any[]) => {
    if (!selectedEncounter?.id) return;
    try {
      await clearCache(`clinical_notes_${selectedEncounter.id}`).catch(() => {});
      const existingNotes = await fetchClinicalNotes(selectedEncounter.id);
      if (existingNotes.length > 0) {
        const latest = existingNotes[existingNotes.length - 1];
        await updateDoc(doc(db, 'clinical_notes', latest.id), { planItems: items, updatedAt: serverTimestamp() });
      }
      await updateDoc(doc(db, 'encounters', selectedEncounter.id), { 'clinicalNotes.planItems': items, updatedAt: serverTimestamp() });
      await clearCache(`clinical_notes_${selectedEncounter.id}`).catch(() => {});
    } catch (e) {
      console.error('Error persisting plan items:', e);
    }
  };

  const saveClinicalNotes = async (
    customFormData?: any,
    customChiefComplaint?: any,
    customPlanItems?: any[]
  ) => {
    if (!selectedEncounter?.id) return;
    if (isSavingNotesRef.current) return;
    isSavingNotesRef.current = true;
    setSavingNotes(true);
    try {
      const activeFormData = customFormData || formData;
      const activeChiefComplaint = customChiefComplaint || chiefComplaint;
      const activePlanItems = customPlanItems || planItems;

      const userName = auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown';
      const notesData = {
        encounterId: selectedEncounter.id,
        patientId: patientId,
        chiefComplaint: activeChiefComplaint.reason || activeFormData.chiefComplaint || '',
        chiefComplaintDuration: activeChiefComplaint.duration || '',
        chiefComplaintUrgency: activeChiefComplaint.urgency || 'Routine',
        ownerStatement: activeChiefComplaint.ownerStatement || '',
        subjective: activeFormData.subjective || '',
        objective: activeFormData.objective || '',
        assessment: activeFormData.assessment || '',
        plan: activeFormData.plan || '',
        diagnosis: activeFormData.diagnosis || '',
        diagnosisStatus: activeFormData.diagnosisStatus || 'working',
        differentials: activeFormData.differentials || '',
        severity: activeFormData.severity || '',
        prognosis: activeFormData.prognosis || '',
        clinicalImpression: activeFormData.clinicalImpression || '',
        problemList: activeFormData.problemList || '',
        appetite: activeFormData.appetite || '',
        waterIntake: activeFormData.waterIntake || '',
        urination: activeFormData.urination || '',
        stool: activeFormData.stool || '',
        vomiting: activeFormData.vomiting || '',
        coughing: activeFormData.coughing || '',
        activity: activeFormData.activity || '',
        currentMeds: activeFormData.currentMeds || '',
        pastHistory: activeFormData.pastHistory || '',
        followUpInstructions: activeFormData.followUpInstructions || followUpInstructions || '',
        followupType: activeFormData.followupType || 'Recheck',
        followUpDate: activeFormData.followUpDate || followUpDate || '',
        ownerInstructions: activeFormData.ownerInstructions || ownerInstructions || '',
        dietInstructions: activeFormData.dietInstructions || '',
        warningSigns: activeFormData.warningSigns || '',
        doctorNotes: formData.doctorNotes || '', // Maintain any existing doctorNotes field
        licenseNumber: activeFormData.licenseNumber || '',
        planItems: activePlanItems,
        createdBy: userName,
        updatedAt: serverTimestamp()
      };

      // Clear cache before checking to prevent stale cached query leading to duplicate record creation
      await clearCache(`clinical_notes_${selectedEncounter.id}`).catch(() => {});

      // Check if a notes document already exists for this encounter
      const existingNotes = await fetchClinicalNotes(selectedEncounter.id);
      if (existingNotes.length > 0) {
        // Update the latest notes document
        const latest = existingNotes[existingNotes.length - 1];
        await updateDoc(doc(db, 'clinical_notes', latest.id), notesData);
        await addAuditLog({ action: 'clinical_notes_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });
      } else {
        // Create new notes document
        await addDoc(collection(db, 'clinical_notes'), { ...notesData, createdAt: serverTimestamp() });
        await addAuditLog({ action: 'clinical_notes_created', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });
      }

      // Update encounter's clinicalNotes field
      const encounterRef = doc(db, 'encounters', selectedEncounter.id);
      await updateDoc(encounterRef, {
        clinicalNotes: {
          chiefComplaint: notesData.chiefComplaint,
          chiefComplaintDuration: notesData.chiefComplaintDuration,
          chiefComplaintUrgency: notesData.chiefComplaintUrgency,
          ownerStatement: notesData.ownerStatement,
          subjective: notesData.subjective,
          objective: notesData.objective,
          assessment: notesData.assessment,
          plan: notesData.plan,
          diagnosis: notesData.diagnosis,
          diagnosisStatus: notesData.diagnosisStatus,
          differentials: notesData.differentials,
          severity: notesData.severity,
          prognosis: notesData.prognosis,
          clinicalImpression: notesData.clinicalImpression,
          problemList: notesData.problemList,
          appetite: notesData.appetite,
          waterIntake: notesData.waterIntake,
          urination: notesData.urination,
          stool: notesData.stool,
          vomiting: notesData.vomiting,
          coughing: notesData.coughing,
          activity: notesData.activity,
          currentMeds: notesData.currentMeds,
          pastHistory: notesData.pastHistory,
          followUpInstructions: notesData.followUpInstructions,
          followupType: notesData.followupType,
          followUpDate: notesData.followUpDate,
          ownerInstructions: notesData.ownerInstructions,
          dietInstructions: notesData.dietInstructions,
          warningSigns: notesData.warningSigns,
          doctorNotes: notesData.doctorNotes,
          licenseNumber: notesData.licenseNumber,
          planItems: notesData.planItems,
        },
        updatedAt: serverTimestamp()
      });
      await addAuditLog({ action: 'encounter_notes_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });

      // Clear cache after writing so any immediate subsequent queries read the newly written data
      await clearCache(`clinical_notes_${selectedEncounter.id}`).catch(() => {});

      // Refresh clinical notes
      const updatedNotes = await fetchClinicalNotes(selectedEncounter.id);
      setClinicalNotes(updatedNotes.length > 0 ? updatedNotes[updatedNotes.length - 1] : null);
      setNotesEditMode(false);
    } catch (error) {
      console.error('Error saving clinical notes:', error);
      alert('Error saving clinical notes. Please try again.');
    } finally {
      setSavingNotes(false);
      isSavingNotesRef.current = false;
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
      await addAuditLog({ action: 'service_added', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: catalogItem.name });

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
        await addAuditLog({ action: 'lab_ordered', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: catalogItem.name });
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
        await addAuditLog({ action: 'medication_prescribed', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });
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
      await addAuditLog({ action: 'service_completed', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });

      const updatedServices = await fetchAppointmentServices(selectedEncounter.id);
      setAppointmentServices(updatedServices);

      const allComplete = updatedServices.every((s: any) => s.status === 'completed');
      const billableServices = updatedServices.filter((s: any) => s.billable !== false);
      if (billableServices.length === 0) return;

      if (allComplete && !invoice) {
        await generateInvoiceFromEncounter(
          selectedEncounter.id,
          billableServices,
          patientId || '',
          selectedEncounter.ownerId || patient?.ownerUid || ''
        );
        await clearCache(`invoices_${selectedEncounter.id}`).catch(() => {});
        const [inv, items, pays] = await Promise.all([
          fetchInvoicesByEncounter(selectedEncounter.id),
          fetchInvoiceItems(''),
          fetchPayments('')
        ]);
        if (inv.length > 0) {
          setInvoice(inv[0]);
          await clearCache(`invoice_items_${inv[0].id}`).catch(() => {});
          const [invItems, invPays] = await Promise.all([
            fetchInvoiceItems(inv[0].id),
            fetchPayments(inv[0].id)
          ]);
          setInvoiceItems(invItems);
          setPayments(invPays);
        }
        alert('All services completed. Draft invoice has been generated.');
      } else if (!invoice && updatedServices.some((s: any) => s.status === 'completed')) {
        // First service completed - generate draft invoice with completed services so far
        const completedServices = updatedServices.filter((s: any) => s.status === 'completed' && s.billable !== false);
        if (completedServices.length > 0) {
          await generateInvoiceFromEncounter(
            selectedEncounter.id,
            completedServices,
            patientId || '',
            selectedEncounter.ownerId || patient?.ownerUid || ''
          );
          await clearCache(`invoices_${selectedEncounter.id}`).catch(() => {});
          const [inv] = await Promise.all([
            fetchInvoicesByEncounter(selectedEncounter.id),
          ]);
          if (inv.length > 0) {
            setInvoice(inv[0]);
          }
        }
      } else if (invoice) {
        // Invoice already exists - check if this service already has an invoice item
        const existingItems = await fetchInvoiceItems(invoice.id);
        if (existingItems.some((i: any) => i.appointmentServiceId === service.id)) {
          // Already billed - just recalculate totals
          const newSubTotal = existingItems.reduce((sum: number, i: any) => sum + (i.lineTotal || 0), 0);
          const taxAmount = existingItems.reduce((sum: number, i: any) => sum + ((i.lineTotal || 0) * (i.taxRate || 0)), 0);
          await updateDoc(doc(db, 'invoices', invoice.id), {
            subTotal: newSubTotal,
            discountTotal: existingItems.reduce((sum: number, i: any) => sum + (i.discountAmount || 0), 0),
            taxAmount,
            grandTotal: newSubTotal + taxAmount,
            balanceDue: newSubTotal + taxAmount - (invoice.amountPaid || 0),
            updatedAt: serverTimestamp()
          });
          await addAuditLog({ action: 'invoice_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: 'Recalculated totals (item already existed)' });
        } else {
          // Add line item for this service
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
          await addAuditLog({ action: 'invoice_item_added', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });

          // Recalculate invoice totals
          const allItems = await fetchInvoiceItems(invoice.id);
          const newSubTotal = allItems.reduce((sum: number, i: any) => sum + (i.lineTotal || 0), 0);
          const taxAmount = allItems.reduce((sum: number, i: any) => sum + ((i.lineTotal || 0) * (i.taxRate || 0)), 0);
          await updateDoc(doc(db, 'invoices', invoice.id), {
            subTotal: newSubTotal,
            discountTotal: allItems.reduce((sum: number, i: any) => sum + (i.discountAmount || 0), 0),
            taxAmount,
            grandTotal: newSubTotal + taxAmount,
            balanceDue: newSubTotal + taxAmount - (invoice.amountPaid || 0),
            updatedAt: serverTimestamp()
          });
          await addAuditLog({ action: 'invoice_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });
        }

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
      await addAuditLog({ action: 'medication_prescribed', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });

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
      await addAuditLog({ action: 'medication_dispensed', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });

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
      await addAuditLog({ action: 'dispensing_recorded', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });

      // Update prescription status
      const rxRef = doc(db, 'prescriptions', prescriptionId);
      await updateDoc(rxRef, {
        status: 'dispensed',
        updatedAt: now
      });
      await addAuditLog({ action: 'prescription_dispensed', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: '' });

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
      await addAuditLog({ action: 'file_uploaded', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter?.id, patientId: patientId, details: file.name });

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

  const [activeStep, setActiveStep] = useState<string>('chief-complaint');
  const [chiefComplaint, setChiefComplaint] = useState({ reason: '', duration: '', urgency: 'Routine', ownerStatement: '' });
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [admissionForm, setAdmissionForm] = useState({ reason: '', type: 'Medical confinement', initialDiagnosis: '', monitoring: '', expectedDuration: '', isolationRequired: false, depositRequired: false, consentRequired: true, status: 'Recommended' });
  const [procedureForm, setProcedureForm] = useState({ name: '', indication: '', consentRequired: false, consentStatus: 'Pending', performedBy: '', anesthesia: 'None', supplies: '', notes: '', status: 'Recommended' });
  const [physicalExam, setPhysicalExam] = useState<Record<string, string>>({});
  const [examNotes, setExamNotes] = useState<Record<string, string>>({});
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [ownerInstructions, setOwnerInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [editingPlanItem, setEditingPlanItem] = useState<any | null>(null);
  const [cancelItemId, setCancelItemId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelType, setCancelType] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelTier, setCancelTier] = useState<'cancel' | 'void' | 'void-charge' | 'refund' | 'amendment'>('cancel');
  const [cancelLinkedData, setCancelLinkedData] = useState<any>(null);
  const [highlightedChargeId, setHighlightedChargeId] = useState<string | null>(null);
  const chargesRef = useRef<HTMLDivElement>(null);
  const [invMovementItem, setInvMovementItem] = useState<{ item: any; movement: any } | null>(null);
  const [showOrderLabModal, setShowOrderLabModal] = useState(false);
  const [showTreatmentDrawer, setShowTreatmentDrawer] = useState(false);
  const [showPrescriptionDrawer, setShowPrescriptionDrawer] = useState(false);
  const [showProcedureDrawer, setShowProcedureDrawer] = useState(false);
  const [showAdmissionDrawer, setShowAdmissionDrawer] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showOwnerInstructionsEditor, setShowOwnerInstructionsEditor] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const tabRefs = useRef<Record<string, boolean>>({});

  const latestStateRef = useRef({ formData, chiefComplaint, planItems });
  const isSavingNotesRef = useRef(false);
  const skipUnmountSaveRef = useRef(false);

  useEffect(() => {
    latestStateRef.current = { formData, chiefComplaint, planItems };
  }, [formData, chiefComplaint, planItems]);

  const steps = [
    { id: 'chief-complaint', label: 'Chief Complaint', icon: FileText },
    { id: 'subjective', label: 'Subjective', icon: ClipboardList },
    { id: 'vitals', label: 'Objective / Vitals', icon: Activity },
    { id: 'physical-exam', label: 'Physical Exam', icon: Stethoscope },
    { id: 'assessment', label: 'Assessment', icon: FileText },
    { id: 'plan', label: 'Plan Builder', icon: FileText },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'labs', label: 'Labs & Diagnostics', icon: FlaskConical },
    { id: 'procedures', label: 'Procedures', icon: ClipboardList },
    { id: 'admission', label: 'Admission', icon: Heart },
    { id: 'followup', label: 'Follow-Up', icon: Calendar },
    { id: 'instructions', label: 'Owner Instructions', icon: FileText },
    { id: 'summary', label: 'Visit Summary', icon: FileText },
    { id: 'checklist', label: 'Finish Checklist', icon: Check },
    { id: 'signature', label: 'Doctor Signature', icon: User },
  ];

  const checkStepComplete = (stepId: string): boolean => {
    if (stepId === 'chief-complaint') return !!chiefComplaint.reason;
    if (stepId === 'subjective') return !!formData.subjective;
    if (stepId === 'vitals') return triageVitals.length > 0;
    if (stepId === 'physical-exam') {
      const systems = ['general','skin','eyes','ears','oral','cardio','respiratory','gi','gu','msk','neuro','lymph'];
      return systems.some(s => physicalExam[s] === 'abnormal' || physicalExam[s] === 'normal');
    }
    if (stepId === 'assessment') return !!formData.assessment;
    if (stepId === 'plan') return !!(formData.plan || planItems.length > 0);
    if (stepId === 'prescriptions') return prescriptions.length > 0;
    if (stepId === 'labs') return labOrders.length > 0;
    if (stepId === 'procedures') return !!procedureForm.name;
    if (stepId === 'admission') return !!admissionForm.reason;
    if (stepId === 'followup') return !!followUpInstructions;
    if (stepId === 'instructions') return !!ownerInstructions;
    if (stepId === 'summary') return true;
    if (stepId === 'checklist') return false;
    if (stepId === 'signature') return false;
    return false;
  };

  const navigateToStep = (stepId: string, skipSave = false) => {
    if (!isReadOnly && selectedEncounter?.id && !skipSave) {
      saveClinicalNotes();
    }
    setActiveStep(stepId);
  };

  const handleStepSubmit = async (stepId: string) => {
    const stepOrder = steps.map(s => s.id);
    const currentIdx = stepOrder.indexOf(stepId);
    if (currentIdx < stepOrder.length - 1) setActiveStep(stepOrder[currentIdx + 1]);
  };

  const handleFinishConsultation = async () => {
    if (!selectedEncounter?.id) return;
    try {
      skipUnmountSaveRef.current = true;
      await saveClinicalNotes();
      await updateDoc(doc(db, 'encounters', selectedEncounter.id), { status: 'medical-completed', completedAt: serverTimestamp() });
      const billableServices = appointmentServices.filter((s: any) => s.billable !== false);
      if (billableServices.length > 0) {
        await generateInvoiceFromEncounter(selectedEncounter.id, billableServices, patientId || '', selectedEncounter.ownerId || patient?.ownerUid || '');
      }
      await addAuditLog({ action: 'consultation_completed', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', encounterId: selectedEncounter.id, patientId: patientId, details: 'Consultation finished via Doctor Signature step' });
      navigate(`/crm/emr`);
    } catch (err) {
      console.error('Error finishing consultation:', err);
    }
  };

  // Disable edit modes when encounter is medical-completed
  useEffect(() => {
    if (mode === 'medical-completed') {
      setVitalsEditMode(false);
      setNotesEditMode(false);
      setShowAddForm(false);
    }
  }, [mode]);

  // Auto-save on page leave
  const readOnlyMode = mode !== 'active';
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!readOnlyMode && selectedEncounter?.id && !skipUnmountSaveRef.current) {
        const { formData: f, chiefComplaint: c, planItems: p } = latestStateRef.current;
        saveClinicalNotes(f, c, p);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (!readOnlyMode && selectedEncounter?.id && !skipUnmountSaveRef.current) {
        const { formData: f, chiefComplaint: c, planItems: p } = latestStateRef.current;
        saveClinicalNotes(f, c, p);
      }
    };
  }, [readOnlyMode, selectedEncounter?.id]);

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
  const isReadOnly = mode !== 'active';

  return (
    <div>
      <PageHeader
        title="Electronic Medical Records (EMR)"
        subtitle={
          mode === 'active'
            ? `🟢 Active Visit in Progress - ${patient.name}${selectedEncounter?.startedAt?.toDate?.() ? ` (Started at ${format(selectedEncounter.startedAt.toDate(), 'hh:mm a')})` : ''}`
            : mode === 'medical-completed'
              ? `✅ Visit Complete - ${patient.name}`
              : `⚪ Viewing Medical Records for ${patient.name}`
        }
        backTo="/crm/emr"
        backText="Back to EMR Directory"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={mode === 'active' ? 'default' : mode === 'medical-completed' ? 'secondary' : 'outline'}>
              {mode === 'active' ? '🟢 Active Visit' : mode === 'medical-completed' ? '✅ Complete' : '⚪ Viewing'}
            </Badge>
            {mode === 'view' && !isReadOnly && (
              <Button variant="outline" size="sm" onClick={() => {}}>
                <Plus className="w-4 h-4 mr-2" /> Start New Visit
              </Button>
            )}
          </div>
        }
      />

      {(() => {
        if (selectedEncounter?.status !== 'in-progress' || mode !== 'active') return null;
        
        // Find the appointment linked to this encounter
        const linkedApt = selectedEncounter.appointmentId 
          ? appointments.find((apt: any) => apt.id === selectedEncounter.appointmentId)
          : null;
          
        // An encounter is orphaned if it has no linked appointment ID, OR 
        // if it has a linked appointment ID but the appointment cannot be found or is cancelled.
        const isOrphaned = selectedEncounter.appointmentId 
          ? (!linkedApt || linkedApt.status === 'cancelled')
          : true;

        if (!isOrphaned) return null;

        return (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            <p className="text-sm text-orange-800">
              This encounter may have been orphaned.
              {selectedEncounter?.startedAt?.toDate?.() && (
                <span className="block text-xs text-orange-600 mt-1">
                  Started {format(selectedEncounter.startedAt.toDate(), 'MMM d, yyyy h:mm a')}
                </span>
              )}
            </p>
          </div>
        );
      })()}

      {/* Sticky Encounter Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm mb-6 -mx-6 px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-white shadow bg-blue-50 flex items-center justify-center text-xl font-bold text-blue-600 shrink-0">
              {patient?.imageUrl || patient?.photo ? (
                <img src={patient.imageUrl || patient.photo} alt={patient.name} className="w-full h-full object-cover" />
              ) : (
                patient?.name?.[0] || 'P'
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900 truncate">{patient.name}</h2>
                <Badge variant={mode === 'active' ? 'default' : mode === 'medical-completed' ? 'secondary' : 'outline'} className="text-[10px] py-0 h-5">
                  {mode === 'active' ? '🟢 In Consultation' : mode === 'medical-completed' ? '✅ Complete' : '⚪ Viewing'}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 truncate">
                {patient.species || 'N/A'} · {patient.breed || 'N/A'}
                {patient.gender ? ` · ${patient.gender}` : ''}
                {patient.age ? ` · ${patient.age} yrs` : patient.dateOfBirth ? ` · ${Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 31536000000)} yrs` : ''}
                {patient.weight ? ` · ${patient.weight} kg` : ''}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Owner: {owner?.displayName || owner?.name || 'N/A'} · {owner?.phone || patient?.ownerPhone || ''}
                {selectedEncounter?.id ? ` · ENC: ${selectedEncounter.id.slice(-8)}` : ''}
                {selectedEncounter?.doctorName ? ` · Dr. ${selectedEncounter.doctorName.replace(/^Dr\.?\s*/i, '')}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap lg:ml-auto shrink-0">
            {(patient?.allergies?.length > 0 || patient?.aggressionWarning || patient?.chronicConditions?.length > 0) && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 border border-red-200 text-[10px] text-red-700 font-medium">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                {patient.allergies?.length > 0 && <span>Allergies: {patient.allergies.join(', ')}</span>}
                {patient.aggressionWarning && <span>{patient.allergies?.length > 0 ? '·' : ''} Aggressive</span>}
              </div>
            )}
            {invoice && (() => {
              const bal = invoice.balanceDue ?? invoice.grandTotal - (invoice.amountPaid||0);
              if (bal <= 0) return null;
              return <span className="px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-700 font-medium">₱{bal.toLocaleString()} unpaid</span>;
            })()}
            {labOrders.filter((l: any) => l.status !== 'completed').length > 0 && (
              <span className="px-2 py-1 rounded-md bg-purple-50 border border-purple-200 text-[10px] text-purple-700 font-medium">
                {labOrders.filter((l: any) => l.status !== 'completed').length} lab{labOrders.filter((l: any) => l.status !== 'completed').length > 1 ? 's' : ''} pending
              </span>
            )}
            {prescriptions.filter((r: any) => r.status === 'prescribed' || r.status === 'pending').length > 0 && (
              <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700 font-medium">
                {prescriptions.filter((r: any) => r.status === 'prescribed' || r.status === 'pending').length} rx pending
              </span>
            )}
            {mode === 'active' && (
              <Button variant="outline" size="sm" onClick={() => setShowFinishDialog(true)} className="border-emerald-300 text-emerald-700 h-7 text-xs">
                <Check className="w-3 h-3 mr-1" /> Finish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Clinical Alert Banner */}
      {(patient?.allergies?.length > 0 || patient?.aggressionWarning || patient?.chronicConditions?.length > 0 || invoice?.balanceDue > 0 || labOrders.filter((l: any) => l.status !== 'completed').length > 0) && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-semibold text-amber-800 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Clinical Alerts:</span>
          {patient?.allergies?.map((a: string, i: number) => (
            <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Allergy: {a}</span>
          ))}
          {patient?.aggressionWarning && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />Aggressive handling</span>
          )}
          {patient?.chronicConditions?.map((c: string, i: number) => (
            <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{c}</span>
          ))}
          {(() => {
            const bal = invoice?.balanceDue ?? (invoice?.grandTotal ?? 0) - (invoice?.amountPaid ?? 0);
            if (bal > 0) return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />₱{bal.toLocaleString()} unpaid</span>;
            return null;
          })()}
          {labOrders.filter((l: any) => l.status !== 'completed').length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" />{labOrders.filter((l: any) => l.status !== 'completed').length} pending lab{labOrders.filter((l: any) => l.status !== 'completed').length > 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {/* Three-Column Workspace */}
      <div className="flex gap-0 items-stretch">
        {/* Left Step Sidebar */}
        <div className="hidden lg:flex flex-col w-48 shrink-0 border border-gray-200 rounded-lg bg-white">
          <div className="p-3 border-b border-gray-100 bg-stone-50 rounded-t-lg">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Consultation</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isComp = checkStepComplete(step.id);
              const isAct = activeStep === step.id;
              return (
                <button key={step.id} onClick={() => navigateToStep(step.id)}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors text-sm',
                    isAct ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' : isComp ? 'text-emerald-700 hover:bg-stone-100' : 'text-stone-500 hover:bg-stone-100'
                  )}
                >
                  <span className={cn('flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0',
                    isComp ? 'bg-emerald-100 text-emerald-700' : isAct ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-400'
                  )}>
                    {isComp ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </span>
                  <StepIcon className={cn('w-3.5 h-3.5 shrink-0', isAct ? 'text-blue-600' : isComp ? 'text-emerald-500' : 'text-stone-400')} />
                  <span className="text-xs leading-tight whitespace-normal">{step.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center Workspace */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg shadow">
            {/* Mobile step indicator */}
            <div className="lg:hidden p-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-500 uppercase">Step:</span>
                <span className="text-sm font-medium text-blue-700">{steps.find(s => s.id === activeStep)?.label || activeStep}</span>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => { const i = steps.findIndex(s => s.id === activeStep); if (i > 0) navigateToStep(steps[i-1].id); }} disabled={activeStep === steps[0].id}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => { const i = steps.findIndex(s => s.id === activeStep); if (i < steps.length-1) navigateToStep(steps[i+1].id); }} disabled={activeStep === steps[steps.length-1].id}>Next</Button>
              </div>
            </div>

            {/* 1. Chief Complaint */}
            {activeStep === 'chief-complaint' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">Chief Complaint</h3>
                    <p className="text-sm text-stone-500">Main reason for this visit</p>
                  </div>
                  {scheduledAppointment?.reason && (
                    <Button variant="outline" size="sm" onClick={() => setChiefComplaint(p => ({ ...p, reason: scheduledAppointment.reason }))}>
                      <FileText className="w-3.5 h-3.5 mr-1.5" />Import from appt
                    </Button>
                  )}
                </div>
                <div className="max-w-2xl space-y-5">
                  <div><Label>Reason for Visit</Label><Input value={chiefComplaint.reason} onChange={e => setChiefComplaint(p => ({...p, reason: e.target.value}))} className="mt-1" placeholder="e.g., Vomiting, Limping" disabled={isReadOnly} /></div>
                  <div><Label>Duration</Label><Input value={chiefComplaint.duration} onChange={e => setChiefComplaint(p => ({...p, duration: e.target.value}))} className="mt-1" placeholder="e.g., 2 days" disabled={isReadOnly} /></div>
                  <div><Label>Urgency</Label>
                    <select value={chiefComplaint.urgency} onChange={e => setChiefComplaint(p => ({...p, urgency: e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm disabled:opacity-50" disabled={isReadOnly}>
                      <option value="Routine">Routine</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                  <div><Label>Owner Statement</Label><Textarea value={chiefComplaint.ownerStatement} onChange={e => setChiefComplaint(p => ({...p, ownerStatement: e.target.value}))} className="mt-1" rows={3} placeholder="Owner's exact statement..." disabled={isReadOnly} /></div>
                  {!isReadOnly && (
                    <div>
                      <p className="text-xs font-medium text-stone-500 mb-2">Quick symptom chips</p>
                      <div className="flex flex-wrap gap-1.5">
                        {['Vomiting','Diarrhea','Limping','Coughing','Sneezing','Lethargy','Skin issue','Eye problem','Ear infection','Weight loss','Appetite loss','Vaccination'].map(t => (
                          <button key={t} type="button" onClick={() => setChiefComplaint(p => ({...p, reason: p.reason ? p.reason + ', ' + t.toLowerCase() : t}))} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">{t}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {mode === 'active' && (
                  <div className="mt-6 pt-6 border-t flex gap-2">
                    <Button onClick={async () => {
                      const nextFormData = {
                        ...formData,
                        chiefComplaint: chiefComplaint.reason,
                        subjective: chiefComplaint.reason + (chiefComplaint.duration ? ' (' + chiefComplaint.duration + ')' : '') + '\n' + chiefComplaint.ownerStatement
                      };
                      setFormData(nextFormData);
                      await saveClinicalNotes(nextFormData, chiefComplaint);
                      navigateToStep('subjective', true);
                    }}>
                      <Check className="w-4 h-4 mr-1.5" />Save & Continue to Subjective
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 2. Subjective */}
            {activeStep === 'subjective' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-800">Subjective</h3>
                  <p className="text-sm text-stone-500">Patient history and owner's description</p>
                </div>
                <div className="max-w-2xl space-y-4">
                  {chiefComplaint.reason && <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800"><span className="font-medium">Chief Complaint:</span> {chiefComplaint.reason}{chiefComplaint.duration ? <span className="text-blue-600"> ({chiefComplaint.duration})</span> : ''}</div>}
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Appetite</Label><select value={formData.appetite||''} onChange={e=>setFormData(p=>({...p, appetite:e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="">Normal</option><option value="Poor">Poor</option><option value="Increased">Increased</option><option value="None">None</option></select></div>
                    <div><Label>Water Intake</Label><select value={formData.waterIntake||''} onChange={e=>setFormData(p=>({...p, waterIntake:e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="">Normal</option><option value="Reduced">Reduced</option><option value="Increased">Increased</option><option value="None">None</option></select></div>
                    <div><Label>Urination</Label><select value={formData.urination||''} onChange={e=>setFormData(p=>({...p, urination:e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="">Normal</option><option value="Frequent">Frequent</option><option value="Straining">Straining</option><option value="None">None</option></select></div>
                    <div><Label>Stool</Label><select value={formData.stool||''} onChange={e=>setFormData(p=>({...p, stool:e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="">Normal</option><option value="Soft">Soft</option><option value="Diarrhea">Diarrhea</option><option value="Constipation">Constipation</option></select></div>
                    <div><Label>Vomiting</Label><Input value={formData.vomiting||''} onChange={e=>setFormData(p=>({...p, vomiting: e.target.value}))} className="mt-1" placeholder="e.g., 3 episodes" disabled={isReadOnly} /></div>
                    <div><Label>Coughing</Label><select value={formData.coughing||''} onChange={e=>setFormData(p=>({...p, coughing:e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="">None</option><option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option></select></div>
                    <div><Label>Activity Level</Label><select value={formData.activity||''} onChange={e=>setFormData(p=>({...p, activity:e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="">Normal</option><option value="Lethargic">Lethargic</option><option value="Depressed">Depressed</option><option value="Hyperactive">Hyperactive</option></select></div>
                    <div><Label>Current Meds</Label><Input value={formData.currentMeds||''} onChange={e=>setFormData(p=>({...p, currentMeds: e.target.value}))} className="mt-1" placeholder="None" disabled={isReadOnly} /></div>
                  </div>
                  {!isReadOnly && (
                    <div>
                      <p className="text-xs font-medium text-stone-500 mb-2">Quick symptom chips</p>
                      <div className="flex flex-wrap gap-1.5">
                        {['Vomiting','Diarrhea','Lethargy','Poor Appetite','Coughing','Itching','Lameness','Ear Odor'].map(t => (
                          <button key={t} type="button" onClick={() => setFormData(p=>({...p, subjective: (p.subjective||'') ? p.subjective + ', ' + t : t}))} className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200">{t}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div><Label>History of Present Illness</Label><Textarea value={formData.subjective || clinicalNotes?.subjective || ''} onChange={e => setFormData(p => ({...p, subjective: e.target.value}))} className="mt-1" rows={3} placeholder="Onset, progression, associated symptoms..." disabled={isReadOnly} /></div>
                  <div><Label>Past Medical History</Label><Textarea value={formData.pastHistory || ''} onChange={e => setFormData(p => ({...p, pastHistory: e.target.value}))} className="mt-1" rows={2} placeholder="Previous illnesses, surgeries, medications..." disabled={isReadOnly} /></div>
                  {!isReadOnly && <div className="flex gap-2 pt-4 border-t"><Button onClick={async () => { await saveClinicalNotes(); navigateToStep('vitals', true); }}><Check className="w-4 h-4 mr-1.5" />Save & Continue to Vitals</Button></div>}
                </div>
              </div>
            )}

            {/* 3. Objective / Vitals */}
            {activeStep === 'vitals' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">Objective / Vitals</h3>
                    <p className="text-sm text-stone-500">Physical measurements and clinical observations</p>
                  </div>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (isReadOnly) return; if (vitalsEditMode) saveVitals(); else setVitalsEditMode(true); }} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label htmlFor="weightKg">Weight (kg)</Label><Input id="weightKg" name="weightKg" type="number" step="0.1" min="0" value={vitalsForm.weightKg || ''} onChange={handleVitalsChange} disabled={!vitalsEditMode} className="mt-1" placeholder="0.0" /></div>
                    <div><Label htmlFor="temperatureC">Temperature (°C)</Label><Input id="temperatureC" name="temperatureC" type="number" step="0.1" min="35" max="45" value={vitalsForm.temperatureC || ''} onChange={handleVitalsChange} disabled={!vitalsEditMode} className="mt-1" placeholder="38.5" /></div>
                    <div><Label htmlFor="heartRateBpm">Heart Rate (bpm)</Label><Input id="heartRateBpm" name="heartRateBpm" type="number" value={vitalsForm.heartRateBpm || ''} onChange={handleVitalsChange} disabled={!vitalsEditMode} className="mt-1" placeholder="120" /></div>
                    <div><Label htmlFor="respiratoryRateRpm">Respiratory Rate (rpm)</Label><Input id="respiratoryRateRpm" name="respiratoryRateRpm" type="number" value={vitalsForm.respiratoryRateRpm || ''} onChange={handleVitalsChange} disabled={!vitalsEditMode} className="mt-1" placeholder="20" /></div>
                    <div><Label htmlFor="mmColor">MM Color</Label><Input id="mmColor" name="mmColor" value={vitalsForm.mmColor || ''} onChange={handleVitalsChange} disabled={!vitalsEditMode} className="mt-1" placeholder="Pink" /></div>
                    <div><Label htmlFor="crtSeconds">CRT (seconds)</Label><Input id="crtSeconds" name="crtSeconds" type="number" step="0.1" value={vitalsForm.crtSeconds || ''} onChange={handleVitalsChange} disabled={!vitalsEditMode} className="mt-1" placeholder="2" /></div>
                    <div><Label>Hydration</Label><select value={vitalsForm.hydration||''} onChange={e=>handleVitalsChange({target:{name:'hydration',value:e.target.value}})} disabled={!vitalsEditMode} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="">Normal</option><option value="Mild dehydration">Mild dehydration</option><option value="Moderate dehydration">Moderate dehydration</option><option value="Severe dehydration">Severe dehydration</option></select></div>
                    <div><Label>Pain Score</Label><select value={vitalsForm.painScore||''} onChange={e=>handleVitalsChange({target:{name:'painScore',value:e.target.value}})} disabled={!vitalsEditMode} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="">None</option><option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option></select></div>
                    <div><Label>BCS</Label><select value={vitalsForm.bcs||''} onChange={e=>handleVitalsChange({target:{name:'bcs',value:e.target.value}})} disabled={!vitalsEditMode} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="">5/9</option><option value="1/9">1/9</option><option value="2/9">2/9</option><option value="3/9">3/9</option><option value="4/9">4/9</option><option value="5/9">5/9</option><option value="6/9">6/9</option><option value="7/9">7/9</option><option value="8/9">8/9</option><option value="9/9">9/9</option></select></div>
                    <div><Label>Mentation</Label><select value={vitalsForm.mentation||''} onChange={e=>handleVitalsChange({target:{name:'mentation',value:e.target.value}})} disabled={!vitalsEditMode} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="">Alert</option><option value="Depressed">Depressed</option><option value="Obtunded">Obtunded</option><option value="Stuporous">Stuporous</option><option value="Comatose">Comatose</option></select></div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={savingVitals}>
                      {savingVitals ? (<><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Saving...</>) : vitalsEditMode ? 'Save Vitals' : 'Edit Vitals'}
                    </Button>
                    {vitalsEditMode && (<Button type="button" variant="outline" onClick={() => { const latest = triageVitals[triageVitals.length - 1]; setVitalsForm(latest || {}); setVitalsEditMode(false); }}>Cancel</Button>)}
                  </div>
                </form>
                {!isReadOnly && <div className="mt-6 pt-4 border-t flex gap-2"><Button onClick={() => navigateToStep('physical-exam', true)}><Check className="w-4 h-4 mr-1.5" />Continue to Physical Exam</Button></div>}
              </div>
            )}

            {/* 4. Physical Exam */}
            {activeStep === 'physical-exam' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">Physical Exam</h3>
                    <p className="text-sm text-stone-500">Systematic body system evaluation</p>
                  </div>
                  {!isReadOnly && (
                    <Button variant="outline" size="sm" onClick={() => {
                      const updated = {}; const notes = {};
                      ['general','skin','eyes','ears','oral','cardio','respiratory','gi','gu','msk','neuro','lymph'].forEach(s => { updated[s] = 'normal'; notes[s] = ''; });
                      setPhysicalExam(updated); setExamNotes(notes);
                    }}>
                      <Check className="w-3.5 h-3.5 mr-1.5" />Mark All Normal
                    </Button>
                  )}
                </div>
                <div className="space-y-3 max-w-3xl">
                  {[
                    {id:'general', label:'General Appearance'},
                    {id:'skin', label:'Skin / Coat'},
                    {id:'eyes', label:'Eyes'},
                    {id:'ears', label:'Ears'},
                    {id:'oral', label:'Oral / Dental'},
                    {id:'cardio', label:'Cardiovascular'},
                    {id:'respiratory', label:'Respiratory'},
                    {id:'gi', label:'Gastrointestinal'},
                    {id:'gu', label:'Genitourinary'},
                    {id:'msk', label:'Musculoskeletal'},
                    {id:'neuro', label:'Neurologic'},
                    {id:'lymph', label:'Lymph Nodes'},
                  ].map(sys => (
                    <div key={sys.id} className="flex items-start gap-3 p-3 rounded-lg border border-stone-200">
                      <div className="flex items-center gap-2 w-44 shrink-0">
                        <button type="button" onClick={() => { if (isReadOnly) return; setPhysicalExam(p => ({...p, [sys.id]: physicalExam[sys.id] === 'normal' ? 'abnormal' : 'normal'})); }}
                          className={cn('px-3 py-1 rounded-md text-xs font-medium border transition-colors',
                            physicalExam[sys.id] === 'abnormal' ? 'bg-red-50 text-red-700 border-red-200' :
                            physicalExam[sys.id] === 'normal' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-stone-50 text-stone-400 border-stone-200'
                          )}
                        >
                          {physicalExam[sys.id] === 'abnormal' ? 'Abnormal' : physicalExam[sys.id] === 'normal' ? 'Normal' : 'Tap'}
                        </button>
                        <span className="text-sm font-medium text-stone-700">{sys.label}</span>
                      </div>
                      <div className="flex-1">
                        <Input value={examNotes[sys.id] || ''} onChange={e => setExamNotes(p => ({...p, [sys.id]: e.target.value}))} className="text-sm" placeholder="Notes if abnormal..." disabled={isReadOnly || physicalExam[sys.id] !== 'abnormal'} />
                      </div>
                    </div>
                  ))}
                </div>
                {!isReadOnly && (
                  <div className="mt-6 pt-4 border-t flex gap-2">
                    <Button onClick={async () => {
                      const systemTexts = ['general','skin','eyes','ears','oral','cardio','respiratory','gi','gu','msk','neuro','lymph']
                        .filter(s => physicalExam[s] === 'abnormal')
                        .map(s => `${s}: ${examNotes[s] || ''}`)
                        .join('\n');
                      const nextFormData = { ...formData, objective: systemTexts };
                      setFormData(nextFormData);
                      await saveClinicalNotes(nextFormData);
                      navigateToStep('assessment', true);
                    }}>
                      <Check className="w-4 h-4 mr-1.5" />Continue to Assessment
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 5. Assessment */}
            {activeStep === 'assessment' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-800">Assessment</h3>
                  <p className="text-sm text-stone-500">Clinical impression and diagnosis</p>
                </div>
                <div className="max-w-2xl space-y-4">
                  <div><Label>Primary Diagnosis</Label><Input value={formData.assessment || clinicalNotes?.assessment || ''} onChange={e => setFormData(p => ({...p, assessment: e.target.value}))} className="mt-1" placeholder="e.g., Acute gastritis" disabled={isReadOnly} /></div>
                  <div><Label>Diagnosis Status</Label><select value={formData.diagnosisStatus||'working'} onChange={e=>setFormData(p=>({...p, diagnosisStatus: e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="working">Working</option><option value="confirmed">Confirmed</option><option value="ruled-out">Ruled Out</option><option value="differential">Differential</option></select></div>
                  <div><Label>Differential Diagnoses</Label><Input value={formData.differentials || ''} onChange={e => setFormData(p => ({...p, differentials: e.target.value}))} className="mt-1" placeholder="e.g., Parasites, Dietary indiscretion, Pancreatitis" disabled={isReadOnly} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Severity</Label><select value={formData.severity||''} onChange={e=>setFormData(p=>({...p, severity:e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="">Select</option><option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option></select></div>
                    <div><Label>Prognosis</Label><select value={formData.prognosis||''} onChange={e=>setFormData(p=>({...p, prognosis:e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="">Select</option><option value="Good">Good</option><option value="Guarded">Guarded</option><option value="Poor">Poor</option></select></div>
                  </div>
                  <div><Label>Clinical Impression</Label><Textarea value={formData.clinicalImpression || ''} onChange={e => setFormData(p => ({...p, clinicalImpression: e.target.value}))} className="mt-1" rows={3} placeholder="Clinical findings are consistent with..." disabled={isReadOnly} /></div>
                  <div><Label>Problem List</Label><Textarea value={formData.problemList || ''} onChange={e => setFormData(p => ({...p, problemList: e.target.value}))} className="mt-1" rows={2} placeholder={'Line 1: Vomiting\nLine 2: Mild dehydration'} disabled={isReadOnly} /></div>
                  {!isReadOnly && <div className="flex gap-2 pt-4 border-t"><Button onClick={async () => { await saveClinicalNotes(); navigateToStep('plan', true); }}><Check className="w-4 h-4 mr-1.5" />Save & Continue to Plan</Button></div>}
                </div>
              </div>
            )}

            {/* 6. Plan Builder */}
            {activeStep === 'plan' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-800">Plan Builder</h3>
                  <p className="text-sm text-stone-500">Build your treatment and management plan</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Button variant="outline" size="sm" onClick={() => setShowTreatmentDrawer(true)} disabled={isReadOnly}><Activity className="w-3.5 h-3.5 mr-1.5" />Add Treatment</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowPrescriptionDrawer(true)} disabled={isReadOnly}><Pill className="w-3.5 h-3.5 mr-1.5" />Add Prescription</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowOrderLabModal(true)} disabled={isReadOnly}><FlaskConical className="w-3.5 h-3.5 mr-1.5" />Order Lab</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowProcedureDrawer(true)} disabled={isReadOnly}><ClipboardList className="w-3.5 h-3.5 mr-1.5" />Add Procedure</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAdmissionDrawer(true)} disabled={isReadOnly}><Heart className="w-3.5 h-3.5 mr-1.5" />Recommend Admission</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowFollowUpModal(true)} disabled={isReadOnly}><Calendar className="w-3.5 h-3.5 mr-1.5" />Add Follow-Up</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowOwnerInstructionsEditor(true)} disabled={isReadOnly}><FileText className="w-3.5 h-3.5 mr-1.5" />Add Owner Instructions</Button>
                </div>

                {/* Treatment Plan textarea */}
                <div className="mb-6">
                  <Label>Treatment Plan Notes</Label>
                  <Textarea value={formData.plan || clinicalNotes?.plan || ''} onChange={e => setFormData(p => ({...p, plan: e.target.value}))} className="mt-1" rows={3} placeholder={'e.g., Anti-emetic injection administered\nFluid therapy started\nDietary management'} disabled={isReadOnly} />
                </div>

                {/* Plan Items Cards */}
                {planItems.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <h4 className="text-sm font-bold text-stone-600 uppercase tracking-wider">Plan Items</h4>
                    {planItems.map((item, i) => {
                      const typeIcon: Record<string, any> = { treatment: Activity, prescription: Pill, lab: FlaskConical, procedure: ClipboardList, admission: Heart, followup: Calendar, 'owner-instructions': FileText };
                      const typeColors: Record<string, string> = { treatment: 'border-blue-200 bg-blue-50', prescription: 'border-purple-200 bg-purple-50', lab: 'border-amber-200 bg-amber-50', procedure: 'border-emerald-200 bg-emerald-50', admission: 'border-rose-200 bg-rose-50', followup: 'border-cyan-200 bg-cyan-50', 'owner-instructions': 'border-stone-200 bg-stone-50' };
                      const typeLabels: Record<string, string> = { treatment: 'Treatment', prescription: 'Prescription', lab: 'Lab Order', procedure: 'Procedure', admission: 'Admission', followup: 'Follow-Up', 'owner-instructions': 'Owner Instructions' };
                      const Icon = typeIcon[item.type] || FileText;
                      const statusBadge: Record<string, string> = { completed: 'bg-emerald-100 text-emerald-700', administered: 'bg-blue-100 text-blue-700', planned: 'bg-stone-100 text-stone-600', voided: 'bg-red-100 text-red-700', 'awaiting-sample': 'bg-amber-100 text-amber-700', recommended: 'bg-amber-100 text-amber-700', open: 'bg-cyan-100 text-cyan-700', 'for-dispensing': 'bg-purple-100 text-purple-700', queued: 'bg-stone-100 text-stone-500', 'pending-owner-consent': 'bg-rose-100 text-rose-700' };
                      return (
                        <div key={item.id || i} className={cn('p-4 rounded-lg border-2', typeColors[item.type] || 'border-stone-200')}>
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-white/80"><Icon className="w-4 h-4 text-stone-500" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{typeLabels[item.type] || item.type}</p>
                                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', statusBadge[item.status?.toLowerCase().replace(/\s+/g, '-')] || 'bg-stone-100 text-stone-600')}>{item.status}</span>
                              </div>
                              <p className="font-semibold text-stone-800 text-sm mt-0.5">{item.title}</p>
                              {item.type === 'treatment' && (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-stone-500">
                                  {item.details?.Dose && <span><span className="font-medium text-stone-400">Dose:</span> {item.details.Dose}</span>}
                                  {item.details?.Route && <span><span className="font-medium text-stone-400">Route:</span> {item.details.Route}</span>}
                                  <span><span className="font-medium text-stone-400">Status:</span> {item.status}</span>
                                  {item.status === 'Voided' ? (
                                    <><span><span className="font-medium text-stone-400">Billing:</span> Charge voided</span><span><span className="font-medium text-stone-400">Inventory:</span> Stock deduction reversed</span></>
                                  ) : (
                                    <><span><span className="font-medium text-stone-400">Billing:</span> {item.billingBehavior === 'queue' ? 'Queued' : 'Not charged'}</span><span><span className="font-medium text-stone-400">Inventory:</span> {item.inventoryDeduction ? 'Deducted' : 'Not deducted'}</span></>
                                  )}
                                  {item.status === 'Voided' && item.cancelReason && <span><span className="font-medium text-stone-400">Reason:</span> {item.cancelReason}</span>}
                                </div>
                              )}
                              {item.type === 'prescription' && (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-stone-500">
                                  {item.details?.Dose && <span><span className="font-medium text-stone-400">Dose:</span> {item.details.Dose}</span>}
                                  {item.details?.Route && <span><span className="font-medium text-stone-400">Route:</span> {item.details.Route}</span>}
                                  {item.details?.Frequency && <span><span className="font-medium text-stone-400">Frequency:</span> {item.details.Frequency}</span>}
                                  {item.details?.['Duration'] && <span><span className="font-medium text-stone-400">Duration:</span> {item.details['Duration']}</span>}
                                  {item.details?.Qty && <span><span className="font-medium text-stone-400">Qty:</span> {item.details.Qty}</span>}
                                  <span><span className="font-medium text-stone-400">Billing:</span> {item.billingBehavior === 'queue' ? 'Queued' : item.billingBehavior === 'create-invoice-line' ? 'Invoiced' : 'Not charged'}</span>
                                </div>
                              )}
                              {item.type === 'procedure' && (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-stone-500">
                                  {item.details?.Indication && <span><span className="font-medium text-stone-400">Indication:</span> {item.details.Indication}</span>}
                                  {item.details?.['Performed by'] && <span><span className="font-medium text-stone-400">Performed by:</span> {item.details['Performed by']}</span>}
                                  {item.details?.Supplies && <span><span className="font-medium text-stone-400">Supplies:</span> {item.details.Supplies}</span>}
                                  <span><span className="font-medium text-stone-400">Billing:</span> {item.billingBehavior === 'queue' ? 'Queued' : item.billingBehavior === 'create-invoice-line' ? 'Invoiced' : 'Not charged'}</span>
                                </div>
                              )}
                              {item.type === 'admission' && (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-stone-500">
                                  {item.details?.Reason && <span><span className="font-medium text-stone-400">Reason:</span> {item.details.Reason}</span>}
                                  {item.details?.['Initial Dx'] && <span><span className="font-medium text-stone-400">Initial Dx:</span> {item.details['Initial Dx']}</span>}
                                  {item.details?.Duration && <span><span className="font-medium text-stone-400">Duration:</span> {item.details.Duration}</span>}
                                  {item.details?.Isolation && <span><span className="font-medium text-stone-400">Isolation:</span> {item.details.Isolation}</span>}
                                </div>
                              )}
                              {item.type === 'lab' && (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-stone-500">
                                  {Object.entries(item.details || {}).map(([k, v]) => (
                                    <span key={k}><span className="font-medium text-stone-400">{k}:</span> {v as string}</span>
                                  ))}
                                  {item.billingBehavior && <span><span className="font-medium text-stone-400">Billing:</span> {item.billingBehavior === 'queue' ? 'Queued' : 'Invoiced'}</span>}
                                </div>
                              )}
                              {(item.type === 'followup' || item.type === 'owner-instructions') && item.subtitle && (
                                <p className="text-xs text-stone-500 mt-1">{item.subtitle}</p>
                              )}
                              {(item.type === 'followup' || item.type === 'owner-instructions') && (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-stone-500">
                                  {Object.entries(item.details || {}).map(([k, v]) => (
                                    <span key={k}><span className="font-medium text-stone-400">{k}:</span> {v as string}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {!isReadOnly && (
                            <div className="flex gap-2 mt-2 ml-9">
                              {item.type === 'treatment' && item.status !== 'Cancelled' && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setEditingPlanItem(item); setShowTreatmentDrawer(true); }}>Edit</Button>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setHighlightedChargeId(item.id); chargesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>View Charge</Button>
                                  {item.inventoryDeduction && item.status === 'Administered' && <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={async () => { try { const movements = await fetchStockMovements(); const mvm = movements.find((m: any) => m.encounterId === selectedEncounter?.id && m.medicationName === item.title); setInvMovementItem({ item, movement: mvm || null }); } catch { setInvMovementItem({ item, movement: null }); } }}>View Stock Deduction</Button>}
                                  {item.status === 'Planned' && <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={async () => { setPlanItems(prev => { const next = prev.map(p => p.id === item.id ? {...p, status: 'Administered'} : p); persistPlanItems(next); return next; }); if (item.inventoryDeduction) { try { await createStockMovement({ medicationName: item.title, type: 'dispensing', quantity: -1, reference: `ENC-${(selectedEncounter?.id || '').slice(-6)}`, notes: item.details?.Reason || 'Administered during consultation', userName: auth.currentUser?.displayName || '', encounterId: selectedEncounter?.id }); } catch {} } }}>Mark Administered</Button>}
                                </>
                              )}
                              {item.type === 'prescription' && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => alert('Edit prescription — coming soon')}>Edit</Button>
                                  {item.linkedRecordId && <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => navigateToStep('prescriptions')}>View in Pharmacy</Button>}
                                  {item.billingBehavior === 'create-invoice-line' && <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setHighlightedChargeId(item.id); chargesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>View Charge</Button>}
                                </>
                              )}
                              {item.type === 'lab' && item.linkedRecordId && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => navigateToStep('labs')}>View Lab</Button>
                              )}
                              {item.type === 'procedure' && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => alert('Edit procedure — coming soon')}>Edit</Button>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setHighlightedChargeId(item.id); chargesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>View Charge</Button>
                                </>
                              )}
                              {item.type === 'admission' && item.linkedRecordId && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => navigateToStep('admission')}>View Admission</Button>
                              )}
                              {item.type !== 'owner-instructions' && item.type !== 'followup' && item.status !== 'Cancelled' && item.status !== 'Voided' && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={async () => { const ci = planItems.find(p => p.id === item.id); if (!ci) return; setCancelItemId(item.id); setCancelReason(''); setCancelType(''); setCancelLoading(true); setCancelLinkedData(null); setCancelTier('cancel'); try { let data: any = {}; if (ci.linkedRecordId) { const svcSnap = await getDoc(doc(db, 'appointment_services', ci.linkedRecordId)); if (svcSnap.exists()) data.service = { id: svcSnap.id, ...svcSnap.data() }; } if (data.service?.status === 'active' || data.service?.status === 'voided') { const invItemsSnap = await getDocs(query(collection(db, 'invoice_items'), where('appointmentServiceId', '==', ci.linkedRecordId))); if (!invItemsSnap.empty) { data.invoiceItem = { id: invItemsSnap.docs[0].id, ...invItemsSnap.docs[0].data() }; if (data.invoiceItem.invoiceId) { const invSnap = await getDoc(doc(db, 'invoices', data.invoiceItem.invoiceId)); if (invSnap.exists()) { data.invoice = { id: invSnap.id, ...invSnap.data() }; if (data.invoice?.status === 'paid') { const paysSnap = await getDocs(query(collection(db, 'payments'), where('invoiceId', '==', data.invoice.id))); data.payments = paysSnap.docs.map(d => ({ id: d.id, ...d.data() })); } } } } } setCancelLinkedData(data); if (data.invoice?.status === 'paid') setCancelTier('refund'); else if (data.invoiceItem) setCancelTier('void-charge'); else if (ci.status === 'Administered') setCancelTier('void'); else setCancelTier('cancel'); } catch { setCancelTier(ci.status === 'Administered' ? 'void' : 'cancel'); } finally { setCancelLoading(false); } }}>{item.status === 'Administered' ? 'Void' : 'Cancel'}</Button>
                              )}
                              {item.status === 'Cancelled' && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-stone-500" onClick={() => navigateToStep('summary')}><FileText className="w-3 h-3 mr-1" />View Audit</Button>
                              )}
                              {item.status === 'Voided' && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-stone-500" onClick={() => navigateToStep('summary')}><FileText className="w-3 h-3 mr-1" />View Audit</Button>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setHighlightedChargeId(item.id); chargesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>View Voided Charge</Button>
                                  {item.inventoryDeduction && <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={async () => { try { const movements = await fetchStockMovements(); const mvm = movements.find((m: any) => m.encounterId === selectedEncounter?.id && m.medicationName === item.title); setInvMovementItem({ item, movement: mvm || null }); } catch { setInvMovementItem({ item, movement: null }); } }}>View Stock Reversal</Button>}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Encounter Charges */}
                {planItems.some(p => p.billingBehavior) && (
                  <div ref={chargesRef} className="mt-6 pt-4 border-t border-stone-200">
                    <h4 className="text-sm font-bold text-stone-600 uppercase tracking-wider mb-3">Encounter Charges</h4>
                    <div className="rounded-lg border border-stone-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-stone-50 text-left text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                            <th className="py-2.5 px-4">Item</th>
                            <th className="py-2.5 px-4 w-16 text-center">Qty</th>
                            <th className="py-2.5 px-4 w-24">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {planItems.filter(p => p.billingBehavior).map(charge => (
                            <tr key={charge.id} className={cn(
                              'transition-colors duration-300',
                              highlightedChargeId === charge.id ? 'bg-amber-50 ring-2 ring-amber-300 ring-inset' : 'hover:bg-stone-50'
                            )}>
                              <td className="py-2.5 px-4 font-medium text-stone-800">{charge.title}</td>
                              <td className="py-2.5 px-4 text-center text-stone-600">1</td>
                              <td className="py-2.5 px-4">
                                <span className={cn(
                                  'text-[11px] font-medium px-2 py-0.5 rounded',
                                  charge.billingBehavior === 'create-invoice-line'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                )}>
                                  {charge.billingBehavior === 'create-invoice-line' ? 'Invoiced' : 'Queued'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigateToStep('summary')}>
                        <Receipt className="w-3.5 h-3.5 mr-1.5" />Send to Billing
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => navigateToStep('summary')}>
                        View Full Invoice
                      </Button>
                    </div>
                  </div>
                )}

                {/* Save & Continue */}
                {!isReadOnly && <div className="flex gap-2 pt-4 border-t"><Button onClick={async () => { await saveClinicalNotes(); navigateToStep('prescriptions', true); }}><Check className="w-4 h-4 mr-1.5" />Save & Continue</Button></div>}
              </div>
            )}

            <TreatmentDrawer open={showTreatmentDrawer} onOpenChange={v => { setShowTreatmentDrawer(v); if (!v) setEditingPlanItem(null); }} onSave={item => { setPlanItems(prev => { const next = editingPlanItem ? prev.map(p => p.id === editingPlanItem.id ? {...item, id: p.id} : p) : [...prev, item]; persistPlanItems(next); return next; }); setEditingPlanItem(null); }} initialData={editingPlanItem} encounterId={selectedEncounter?.id || ''} patientId={patientId || ''} patientName={patient?.name || ''} ownerId={selectedEncounter?.ownerId || patient?.ownerUid || ''} ownerName={owner?.displayName || owner?.name || ''} />

            <PrescriptionDrawer open={showPrescriptionDrawer} onOpenChange={setShowPrescriptionDrawer} onSave={item => { setPlanItems(prev => { const next = [...prev, item]; persistPlanItems(next); return next; }); }} encounterId={selectedEncounter?.id || ''} patientId={patientId || ''} patientName={patient?.name || ''} ownerId={selectedEncounter?.ownerId || patient?.ownerUid || ''} ownerName={owner?.displayName || owner?.name || ''} />

            <ProcedureDrawer open={showProcedureDrawer} onOpenChange={setShowProcedureDrawer} onSave={item => { setPlanItems(prev => { const next = [...prev, item]; persistPlanItems(next); return next; }); }} encounterId={selectedEncounter?.id || ''} patientId={patientId || ''} patientName={patient?.name || ''} ownerId={selectedEncounter?.ownerId || patient?.ownerUid || ''} ownerName={owner?.displayName || owner?.name || ''} />

            <AdmissionDrawer open={showAdmissionDrawer} onOpenChange={setShowAdmissionDrawer} onSave={item => { setPlanItems(prev => { const next = [...prev, item]; persistPlanItems(next); return next; }); }} encounterId={selectedEncounter?.id || ''} patientId={patientId || ''} patientName={patient?.name || ''} ownerId={selectedEncounter?.ownerId || patient?.ownerUid || ''} ownerName={owner?.displayName || owner?.name || ''} />

            <FollowUpModal open={showFollowUpModal} onOpenChange={setShowFollowUpModal} onSave={item => { setPlanItems(prev => { const next = [...prev, item]; persistPlanItems(next); return next; }); }} encounterId={selectedEncounter?.id || ''} patientId={patientId || ''} patientName={patient?.name || ''} ownerId={selectedEncounter?.ownerId || patient?.ownerUid || ''} ownerName={owner?.displayName || owner?.name || ''} />

            <OwnerInstructionsEditor open={showOwnerInstructionsEditor} onOpenChange={setShowOwnerInstructionsEditor} onSave={item => { setPlanItems(prev => { const next = [...prev, item]; persistPlanItems(next); return next; }); }} onInstructionsChange={(combined, diet, warningSigns) => { setOwnerInstructions(combined); setFormData(p => ({...p, ownerInstructions: combined, dietInstructions: diet, warningSigns})); }} encounterId={selectedEncounter?.id || ''} patientId={patientId || ''} />

            <InventoryMovementDrawer data={invMovementItem} onClose={() => setInvMovementItem(null)} encounterId={selectedEncounter?.id || ''} />

            {/* 7. Prescriptions */}
            {activeStep === 'prescriptions' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">Prescriptions</h3>
                    <p className="text-sm text-stone-500">Medication orders for the patient</p>
                  </div>
                </div>
                {prescriptions.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <Pill className="w-10 h-10 mx-auto mb-2 text-stone-300" />
                    <p className="text-sm">No prescriptions yet</p>
                    <p className="text-xs mt-1">Click "Add Prescription" in the Plan section or use the action bar</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-2xl">
                    {prescriptions.map((rx, i) => (
                      <div key={rx.id || i} className="p-4 rounded-lg border border-stone-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-stone-800">{rx.medicationName || rx.name || rx.medication}</p>
                            <p className="text-sm text-stone-600">{rx.dosage || ''}{rx.dosage && rx.frequency ? ' \u00b7 ' : ''}{rx.frequency || ''}</p>
                            <p className="text-xs text-stone-500">Qty: {rx.quantity || 'N/A'} \u2022 Route: {rx.route || 'Oral'}</p>
                          </div>
                          <Badge variant={(rx.status === 'Dispensed' ? 'secondary' : rx.status === 'Prescribed' ? 'default' : 'outline')}>{rx.status || 'Prescribed'}</Badge>
                        </div>
                        {rx.instructions && <p className="text-xs text-stone-500 mt-2">{rx.instructions}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {!isReadOnly && <div className="mt-6 pt-4 border-t flex gap-2">
                  <Button onClick={async () => { await saveClinicalNotes(); navigateToStep('labs', true); }}><Check className="w-4 h-4 mr-1.5" />Continue to Labs</Button>
                </div>}
              </div>
            )}

            {/* 8. Labs & Diagnostics */}
            {activeStep === 'labs' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">Labs & Diagnostics</h3>
                    <p className="text-sm text-stone-500">Laboratory tests and diagnostic imaging</p>
                  </div>
                  {!isReadOnly && (
                    <Button variant="outline" size="sm" onClick={() => setShowOrderLabModal(true)}>
                      <FlaskConical className="w-4 h-4 mr-1.5" />Order Lab
                    </Button>
                  )}
                </div>
                {labOrders.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <FlaskConical className="w-10 h-10 mx-auto mb-2 text-stone-300" />
                    <p className="text-sm">No lab orders yet</p>
                    <p className="text-xs mt-1">Click "Order Lab" above or use the action bar</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-2xl">
                    {labOrders.map((lab, i) => {
                      const statusColor: Record<string, string> = {
                        'draft': 'bg-stone-100 text-stone-600 border-stone-300',
                        'ordered': 'bg-blue-100 text-blue-700 border-blue-300',
                        'awaiting-sample': 'bg-amber-100 text-amber-700 border-amber-300',
                        'sample-collected': 'bg-purple-100 text-purple-700 border-purple-300',
                        'in-progress': 'bg-indigo-100 text-indigo-700 border-indigo-300',
                        'ready-for-review': 'bg-cyan-100 text-cyan-700 border-cyan-300',
                        'completed': 'bg-emerald-100 text-emerald-700 border-emerald-300',
                        'cancelled': 'bg-red-100 text-red-700 border-red-300',
                        'rejected-sample': 'bg-rose-100 text-rose-700 border-rose-300',
                        'awaiting-external-lab': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                        'critical-result': 'bg-red-200 text-red-800 border-red-400',
                        'amended': 'bg-orange-100 text-orange-700 border-orange-300',
                      };
                      const statusLabel: Record<string, string> = {
                        'draft': 'Draft',
                        'ordered': 'Ordered',
                        'awaiting-sample': 'Awaiting Sample',
                        'sample-collected': 'Sample Collected',
                        'in-progress': 'In Progress',
                        'ready-for-review': 'Ready for Review',
                        'completed': 'Completed',
                        'cancelled': 'Cancelled',
                        'rejected-sample': 'Rejected Sample',
                        'awaiting-external-lab': 'Awaiting External Lab',
                        'critical-result': 'Critical Result',
                        'amended': 'Amended',
                      };
                      const st = (lab.status || 'ordered').toLowerCase();
                      return (
                        <div key={lab.id || i} className="p-4 rounded-lg border border-stone-200 hover:border-stone-300 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-stone-800">{lab.testName || lab.name || lab.type}</p>
                                {lab.externalLab && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">External Lab</Badge>}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-stone-500">
                                {lab.reason && <span><span className="font-medium text-stone-500">Reason:</span> {lab.reason}</span>}
                                <span><span className="font-medium text-stone-500">Priority:</span>
                                  <span className={cn('ml-1', lab.priority === 'STAT' ? 'text-red-600 font-semibold' : lab.priority === 'Urgent' ? 'text-amber-600 font-medium' : 'text-stone-500')}>{lab.priority || 'Routine'}</span>
                                </span>
                                {lab.sampleType && <span><span className="font-medium text-stone-500">Sample:</span> {lab.sampleType}</span>}
                                <span><span className="font-medium text-stone-500">Billing:</span> {lab.billingBehavior === 'create-invoice-line' ? 'Invoiced' : 'Queued'}</span>
                                {lab.orderedBy && <span><span className="font-medium text-stone-500">Ordered by:</span> {lab.orderedBy}</span>}
                              </div>
                            </div>
                            <Badge className={cn('border text-xs font-medium', statusColor[st] || 'bg-stone-100 text-stone-600')}>{statusLabel[st] || lab.status || 'Ordered'}</Badge>
                          </div>
                          {lab.notes && <p className="text-xs text-stone-400 mt-1 italic">{lab.notes}</p>}
                          {lab.ownerConsent && lab.ownerConsent !== 'pending' && (
                            <p className="text-[10px] text-stone-400 mt-1">Consent: {lab.ownerConsent}</p>
                          )}
                          {lab.ownerConsent === 'pending' && (
                            <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 bg-amber-50 mt-1">Consent pending</Badge>
                          )}
                          {!isReadOnly && (['ordered', 'awaiting-sample', 'draft'].includes(st)) && (
                            <div className="flex gap-2 mt-2">
                              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={async () => {
                                if (!confirm('Cancel this lab order?')) return;
                                try {
                                  const { updateLabOrder } = await import('../../lib/firestore-helpers');
                                  const eid = selectedEncounter?.id || patientId;
                                  await updateLabOrder(lab.id, { status: 'cancelled' });
                                  if (eid) {
                                    const updated = await fetchLabOrders(eid);
                                    setLabOrders(updated);
                                  }
                                } catch (e) { console.error(e); }
                              }}><X className="w-3 h-3 mr-1" />Cancel Order</Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {!isReadOnly && <div className="mt-6 pt-4 border-t flex gap-2">
                  <Button onClick={async () => { await saveClinicalNotes(); navigateToStep('procedures', true); }}><Check className="w-4 h-4 mr-1.5" />Continue to Procedures</Button>
                </div>}
              </div>
            )}

            {/* 9. Procedures */}
            {activeStep === 'procedures' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-800">Procedures</h3>
                  <p className="text-sm text-stone-500">Procedures performed or recommended</p>
                </div>
                <div className="max-w-2xl space-y-4">
                  <div><Label>Procedure Name</Label><Input value={procedureForm.name} onChange={e => setProcedureForm(p => ({...p, name: e.target.value}))} className="mt-1" placeholder="e.g., Wound Cleaning" disabled={isReadOnly} /></div>
                  <div><Label>Indication</Label><Input value={procedureForm.indication} onChange={e => setProcedureForm(p => ({...p, indication: e.target.value}))} className="mt-1" placeholder="Reason for procedure" disabled={isReadOnly} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Consent Required</Label><select value={procedureForm.consentRequired ? 'yes' : 'no'} onChange={e => setProcedureForm(p => ({...p, consentRequired: e.target.value === 'yes'}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="no">No</option><option value="yes">Yes</option></select></div>
                    <div><Label>Anesthesia / Sedation</Label><select value={procedureForm.anesthesia} onChange={e => setProcedureForm(p => ({...p, anesthesia: e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="None">None</option><option value="Local">Local</option><option value="General">General</option></select></div>
                  </div>
                  <div><Label>Supplies Used</Label><Input value={procedureForm.supplies} onChange={e => setProcedureForm(p => ({...p, supplies: e.target.value}))} className="mt-1" placeholder="Bandage, antiseptic..." disabled={isReadOnly} /></div>
                  <div><Label>Notes</Label><Textarea value={procedureForm.notes} onChange={e => setProcedureForm(p => ({...p, notes: e.target.value}))} className="mt-1" rows={2} disabled={isReadOnly} /></div>
                  {!isReadOnly && <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={async () => { await saveClinicalNotes(); navigateToStep('admission', true); }}><Check className="w-4 h-4 mr-1.5" />Continue to Admission</Button>
                  </div>}
                </div>
              </div>
            )}

            {/* 10. Admission Recommendation */}
            {activeStep === 'admission' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-800">Admission Recommendation</h3>
                  <p className="text-sm text-stone-500">If the pet needs confinement or hospitalization</p>
                </div>
                <div className="max-w-2xl space-y-4">
                  <div><Label>Reason for Admission</Label><Textarea value={admissionForm.reason} onChange={e => setAdmissionForm(p => ({...p, reason: e.target.value}))} className="mt-1" rows={2} placeholder="Persistent vomiting and dehydration..." disabled={isReadOnly} /></div>
                  <div><Label>Admission Type</Label><select value={admissionForm.type} onChange={e => setAdmissionForm(p => ({...p, type: e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="Medical confinement">Medical confinement</option><option value="Surgical">Surgical</option><option value="ICU">ICU</option><option value="Isolation">Isolation</option></select></div>
                  <div><Label>Initial Diagnosis</Label><Input value={admissionForm.initialDiagnosis} onChange={e => setAdmissionForm(p => ({...p, initialDiagnosis: e.target.value}))} className="mt-1" placeholder="Suspected acute gastritis" disabled={isReadOnly} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Monitoring Level</Label><select value={admissionForm.monitoring} onChange={e => setAdmissionForm(p => ({...p, monitoring: e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="">Select</option><option value="Every 2 hours">Every 2 hours</option><option value="Every 4 hours">Every 4 hours</option><option value="Every 6 hours">Every 6 hours</option><option value="Every 8 hours">Every 8 hours</option><option value="ICU continuous">ICU continuous</option></select></div>
                    <div><Label>Expected Duration</Label><Input value={admissionForm.expectedDuration} onChange={e => setAdmissionForm(p => ({...p, expectedDuration: e.target.value}))} className="mt-1" placeholder="24-48 hours" disabled={isReadOnly} /></div>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={admissionForm.isolationRequired} onChange={e => setAdmissionForm(p => ({...p, isolationRequired: e.target.checked}))} disabled={isReadOnly} />Isolation Required</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={admissionForm.depositRequired} onChange={e => setAdmissionForm(p => ({...p, depositRequired: e.target.checked}))} disabled={isReadOnly} />Deposit Required</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={admissionForm.consentRequired} onChange={e => setAdmissionForm(p => ({...p, consentRequired: e.target.checked}))} disabled={isReadOnly} />Consent Required</label>
                  </div>
                  {!isReadOnly && <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={async () => { await saveClinicalNotes(); navigateToStep('followup', true); }}><Check className="w-4 h-4 mr-1.5" />Continue to Follow-Up</Button>
                  </div>}
                </div>
              </div>
            )}

            {/* 11. Follow-Up */}
            {activeStep === 'followup' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-800">Follow-Up Plan</h3>
                  <p className="text-sm text-stone-500">Schedule follow-up and recheck</p>
                </div>
                <div className="max-w-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Follow-Up Type</Label><select value={formData.followupType||'Recheck'} onChange={e=>setFormData(p=>({...p, followupType: e.target.value}))} className="mt-1 flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" disabled={isReadOnly}><option value="Recheck">Recheck</option><option value="Surgery Follow-up">Surgery Follow-up</option><option value="Lab Result Review">Lab Result Review</option><option value="Vaccination">Vaccination</option></select></div>
                    <div><Label>Due Date</Label><Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="mt-1" disabled={isReadOnly} /></div>
                  </div>
                  <div><Label>Instructions</Label><Textarea value={followUpInstructions} onChange={e => setFollowUpInstructions(e.target.value)} className="mt-1" rows={2} disabled={isReadOnly} /></div>
                  {!isReadOnly && <div className="flex gap-2 pt-4 border-t"><Button onClick={async () => { await saveClinicalNotes(); navigateToStep('instructions', true); }}><Check className="w-4 h-4 mr-1.5" />Continue to Owner Instructions</Button></div>}
                </div>
              </div>
            )}

            {/* 12. Owner Instructions */}
            {activeStep === 'instructions' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-800">Owner Instructions</h3>
                  <p className="text-sm text-stone-500">Home care instructions in owner-friendly language</p>
                </div>
                <div className="max-w-2xl space-y-4">
                  <div><Label>Medication Instructions</Label><Textarea value={ownerInstructions} onChange={e => setOwnerInstructions(e.target.value)} className="mt-1" rows={2} placeholder="Give medication after meals..." disabled={isReadOnly} /></div>
                  <div><Label>Diet & Activity</Label><Textarea value={formData.dietInstructions || ''} onChange={e => setFormData(p => ({...p, dietInstructions: e.target.value}))} className="mt-1" rows={2} placeholder="Offer small frequent meals. Rest." disabled={isReadOnly} /></div>
                  <div><Label>Warning Signs</Label><Textarea value={formData.warningSigns || ''} onChange={e => setFormData(p => ({...p, warningSigns: e.target.value}))} className="mt-1" rows={2} placeholder="Return immediately if vomiting continues, becomes weak, or refuses water." disabled={isReadOnly} /></div>
                  {!isReadOnly && <div className="flex gap-2 pt-4 border-t"><Button onClick={async () => { await saveClinicalNotes(); navigateToStep('summary', true); }}><Check className="w-4 h-4 mr-1.5" />Continue to Visit Summary</Button></div>}
                </div>
              </div>
            )}

            {/* 13. Visit Summary */}
            {activeStep === 'summary' && (
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

            {/* 14. Finish Checklist */}
            {activeStep === 'checklist' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-800">Finish Consultation Checklist</h3>
                  <p className="text-sm text-stone-500">Review all items before finishing</p>
                </div>
                <div className="max-w-2xl space-y-3">
                  {[
                    { id: 'chief-complaint', label: 'Chief complaint entered' },
                    { id: 'subjective', label: 'Subjective completed' },
                    { id: 'vitals', label: 'Vitals recorded' },
                    { id: 'physical-exam', label: 'Physical exam completed' },
                    { id: 'assessment', label: 'Assessment / diagnosis entered' },
                    { id: 'plan', label: 'Treatment plan added' },
                    { id: 'prescriptions', label: 'Prescriptions reviewed' },
                    { id: 'labs', label: 'Lab orders reviewed' },
                    { id: 'followup', label: 'Follow-up added' },
                    { id: 'instructions', label: 'Owner instructions completed' },
                  ].map(item => {
                    const done = checkStepComplete(item.id);
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: done ? '#bbf7d0' : '#fecaca', backgroundColor: done ? '#f0fdf4' : '#fef2f2' }}>
                        <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', done ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                          {done ? <Check className="w-3.5 h-3.5" /> : '!'}
                        </span>
                        <span className={cn('text-sm', done ? 'text-emerald-800' : 'text-red-800')}>{item.label}</span>
                        {!done && <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigateToStep(item.id, true)}>Go to {item.id}</Button>}
                      </div>
                    );
                  })}
                </div>
                {mode === 'active' && (
                  <div className="mt-6 pt-6 border-t flex gap-2">
                    <Button variant="outline" onClick={async () => { await saveClinicalNotes(); navigateToStep('signature', true); }}>Continue to Signing</Button>
                    <Button onClick={() => setShowFinishDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Check className="w-4 h-4 mr-1.5" />Finish with Missing Items
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 15. Doctor Signature */}
            {activeStep === 'signature' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-800">Doctor Signature</h3>
                  <p className="text-sm text-stone-500">Sign and lock the clinical record</p>
                </div>
                <div className="max-w-xl space-y-4">
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Record Signing</p>
                        <p className="text-xs text-amber-700 mt-1">Signing the record will lock it from casual editing. Amendments after signing require a reason and will be tracked in the audit log.</p>
                      </div>
                    </div>
                  </div>
                  <div><Label>Attending Veterinarian</Label><Input value={auth.currentUser?.displayName || ''} className="mt-1" disabled /></div>
                  <div><Label>License Number</Label><Input value={formData.licenseNumber || ''} onChange={e => setFormData(p => ({...p, licenseNumber: e.target.value}))} className="mt-1" placeholder="PRC license number" disabled={isReadOnly} /></div>
                  <div><Label>Signature (Type full name)</Label><Input value={formData.signature || ''} onChange={e => setFormData(p => ({...p, signature: e.target.value}))} className="mt-1" placeholder="Dr. [Full Name]" disabled={isReadOnly} /></div>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.confirmSign || false} onChange={e => setFormData(p => ({...p, confirmSign: e.target.checked}))} disabled={isReadOnly} />I confirm that the above information is accurate and complete</label>
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => navigateToStep('checklist', true)}><ChevronLeft className="w-4 h-4 mr-1.5" />Back to Checklist</Button>
                      <Button disabled={!formData.confirmSign || !formData.signature} onClick={() => { if (!formData.confirmSign || !formData.signature) return; handleFinishConsultation(); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Check className="w-4 h-4 mr-1.5" />Sign & Complete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Clinical Context Panel */}
        {showRightPanel && (
          <div className="hidden lg:flex flex-col w-64 shrink-0 border border-gray-200 rounded-lg bg-white">
            <div className="p-3 border-b border-gray-100 bg-stone-50 rounded-t-lg flex items-center justify-between">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Context</p>
              <button onClick={() => setShowRightPanel(false)} className="text-stone-400 hover:text-stone-600"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4 text-sm">
              {(patient?.allergies?.length > 0 || patient?.aggressionWarning || patient?.chronicConditions?.length > 0) && (
                <div>
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-500" /> Medical Alerts</h4>
                  <div className="space-y-1.5">
                    {patient.allergies?.map((a, i) => (<div key={i} className="flex items-center gap-2 p-1.5 rounded bg-red-50 text-red-700 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /><span>Allergy: {a}</span></div>))}
                    {patient.aggressionWarning && (<div className="flex items-center gap-2 p-1.5 rounded bg-orange-50 text-orange-700 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" /><span>Aggressive - handle with caution</span></div>)}
                    {patient.chronicConditions?.map((c, i) => (<div key={i} className="flex items-center gap-2 p-1.5 rounded bg-amber-50 text-amber-700 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /><span>{c}</span></div>))}
                  </div>
                </div>
              )}
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><History className="w-3 h-3" /> Previous Visits</h4>
                <div className="space-y-1.5">
                  {encounters.filter(e => e.id !== selectedEncounter?.id).sort((a, b) => { const aTs = typeof (a.startedAt||a.createdAt)?.toDate === 'function' ? (a.startedAt||a.createdAt).toDate() : (a.startedAt||a.createdAt); const bTs = typeof (b.startedAt||b.createdAt)?.toDate === 'function' ? (b.startedAt||b.createdAt).toDate() : (b.startedAt||b.createdAt); return (bTs?new Date(bTs).getTime():0) - (aTs?new Date(aTs).getTime():0); }).slice(0, 3).map(enc => (
                    <div key={enc.id} className="p-2 rounded bg-stone-50 border border-stone-100">
                      <p className="text-xs font-medium text-stone-700">{enc.startedAt?.toDate?.()?.toLocaleDateString?.() || 'N/A'}</p>
                      <p className="text-[10px] text-stone-500">{enc.doctorName || 'N/A'} &middot; {enc.diagnosis || enc.status || 'N/A'}</p>
                    </div>
                  ))}
                  {encounters.filter(e => e.id !== selectedEncounter?.id).length === 0 && <p className="text-xs text-stone-400 italic">No previous visits</p>}
                </div>
              </div>
              {prescriptions.length > 0 && (<div><h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Pill className="w-3 h-3" /> Active Medications</h4>
                  <div className="space-y-1.5">{prescriptions.slice(0, 3).map((rx, i) => (<div key={rx.id||i} className="p-2 rounded bg-blue-50 border border-blue-100"><p className="text-xs font-medium text-blue-800">{rx.medicationName||rx.name||rx.medication}</p><p className="text-[10px] text-blue-600">{rx.dosage||''}{rx.dosage&&rx.frequency?' · ':''}{rx.frequency||''}</p></div>))}</div></div>)}
              {labOrders.length > 0 && (<div><h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><FlaskConical className="w-3 h-3" /> Recent Labs</h4>
                  <div className="space-y-1.5">{labOrders.slice(0, 3).map((lab, i) => (<div key={lab.id||i} className="p-2 rounded bg-purple-50 border border-purple-100"><p className="text-xs font-medium text-purple-800">{lab.testName||lab.name||lab.type}</p><p className="text-[10px] text-purple-600">{lab.status||'Pending'}</p></div>))}</div></div>)}
              {triageVitals.length > 0 && (<div><h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Latest Vitals</h4>
                  <div className="grid grid-cols-2 gap-1.5">{(() => { const v = triageVitals[triageVitals.length - 1]; return [{label:'Weight',value:v.weight? v.weight+' kg':null},{label:'Temp',value:v.temperature? v.temperature+'°C':null},{label:'HR',value:v.heartRate? v.heartRate+' bpm':null},{label:'RR',value:v.respRate? v.respRate+' /min':null}].filter(i=>i.value!==null).map((item,i) => (<div key={i} className="p-1.5 rounded bg-stone-50 text-center"><p className="text-[10px] text-stone-500">{item.label}</p><p className="text-xs font-semibold text-stone-800">{item.value}</p></div>)) })()}</div></div>)}
              {invoice && (() => { const balance = invoice.balanceDue ?? invoice.grandTotal - (invoice.amountPaid||0); if (balance <= 0) return null; return (<div><h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><DollarSign className="w-3 h-3 text-amber-500" /> Billing</h4><div className="p-2 rounded bg-amber-50 border border-amber-200"><p className="text-xs font-semibold text-amber-800">Outstanding: ₱{(balance||0).toLocaleString()}</p><p className="text-[10px] text-amber-600">Due: {invoice.dueDate?.toDate?.()?.toLocaleDateString?.()||'N/A'}</p></div></div>); })()}
              {triageVitals.length > 1 && (() => {
                const current = triageVitals[triageVitals.length - 1];
                const previous = triageVitals[triageVitals.length - 2];
                if (!current?.weight) return null;
                const diff = previous?.weight ? current.weight - previous.weight : 0;
                const diffText = diff !== 0 ? (diff > 0 ? `+${diff.toFixed(1)} kg` : `${diff.toFixed(1)} kg`) : null;
                return (
                  <div>
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Weight Trend</h4>
                    <div className="p-2 rounded bg-stone-50 border border-stone-200">
                      <p className="text-xs font-semibold text-stone-800">{current.weight} kg <span className="text-xs font-normal text-stone-500">(current)</span></p>
                      {previous?.weight && <p className="text-[10px] text-stone-500">Previous: {previous.weight} kg</p>}
                      {diffText && <p className={cn('text-[10px] font-medium', diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-stone-400')}>{diffText} from last visit</p>}
                    </div>
                  </div>
                );
              })()}
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Preventive Care</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-700">Deworming</span>
                    <span className="text-[10px] font-medium text-emerald-600">Due soon</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-blue-50 border border-blue-100">
                    <span className="text-[10px] text-blue-700">Rabies Vaccine</span>
                    <span className="text-[10px] font-medium text-blue-600">Due Jun 2026</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-purple-50 border border-purple-100">
                    <span className="text-[10px] text-purple-700">Heartworm Test</span>
                    <span className="text-[10px] font-medium text-purple-600">Up to date</span>
                  </div>
                  <p className="text-[9px] text-stone-400 italic mt-1">Configure in Pet Details</p>
                </div>
              </div>
              {selectedEncounter?.admissionId && (
                <div>
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Heart className="w-3 h-3" /> Active Admission</h4>
                  <div className="p-2 rounded bg-rose-50 border border-rose-200">
                    <p className="text-xs font-medium text-rose-800">Pet is currently confined</p>
                    <p className="text-[10px] text-rose-600">Admission: {selectedEncounter.admissionId.slice(-8)}</p>
                  </div>
                </div>
              )}
              {owner?.notes && (
                <div>
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Owner Notes</h4>
                  <div className="p-2 rounded bg-stone-50 border border-stone-200">
                    <p className="text-[10px] text-stone-600">{owner.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!showRightPanel && (
          <button onClick={() => setShowRightPanel(true)} className="hidden lg:flex items-center justify-center w-6 border border-gray-200 rounded-r-lg bg-white hover:bg-stone-50 text-stone-400 hover:text-stone-600 cursor-pointer" title="Show context panel">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-6 py-3 flex items-center gap-3 mt-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 text-xs text-stone-500 mr-2">
          <span className="font-medium">{patient.name}</span>
          <span className="text-stone-300">|</span>
          <span className={cn('font-medium', mode === 'active' ? 'text-emerald-600' : mode === 'medical-completed' ? 'text-purple-600' : 'text-stone-500')}>{mode === 'active' ? 'Active' : mode === 'medical-completed' ? 'Complete' : 'Viewing'}</span>
          <span className="text-stone-300">|</span>
          <span className="text-xs text-stone-500">Step {steps.findIndex(s=>s.id===activeStep)+1}/{steps.length}</span>
        </div>
        <div className="flex-1" />
        {!isReadOnly && (
          <>
            <Button variant="outline" size="sm" onClick={() => { if (formData.subjective||formData.objective||formData.assessment||formData.plan) saveClinicalNotes(); alert('Draft saved.'); }}><FileText className="w-3.5 h-3.5 mr-1.5" />Save Draft</Button>
            <Button variant="outline" size="sm" onClick={() => navigateToStep('prescriptions')}><Pill className="w-3.5 h-3.5 mr-1.5" />Add Prescription</Button>
            <Button variant="outline" size="sm" onClick={() => setShowOrderLabModal(true)}><FlaskConical className="w-3.5 h-3.5 mr-1.5" />Order Lab</Button>
            <Button variant="outline" size="sm" onClick={() => navigateToStep('admission')}><Heart className="w-3.5 h-3.5 mr-1.5" />Recommend Admission</Button>
            <Button variant="outline" size="sm" onClick={() => navigateToStep('summary')}><FileText className="w-3.5 h-3.5 mr-1.5" />Generate Visit Summary</Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-3.5 h-3.5 mr-1.5" />Print</Button>
        <Button variant="outline" size="sm" onClick={() => setShowRightPanel(!showRightPanel)} className="hidden lg:inline-flex">{showRightPanel ? <ChevronRight className="w-3.5 h-3.5 mr-1.5" /> : <ChevronLeft className="w-3.5 h-3.5 mr-1.5" />}{showRightPanel ? 'Hide Panel' : 'Show Panel'}</Button>
        {mode === 'active' && (
          <>
            <Button variant="outline" size="sm" onClick={() => navigateToStep('checklist')} className="border-amber-300 text-amber-700 hover:bg-amber-50">
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />Checklist
            </Button>
            <Button size="sm" onClick={() => setShowFinishDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Check className="w-3.5 h-3.5 mr-1.5" />Finish Consultation
            </Button>
          </>
        )}
      </div>

      {/* Order Lab Modal */}
      <OrderLabModal
        open={showOrderLabModal}
        onOpenChange={setShowOrderLabModal}
        encounter={selectedEncounter}
        patient={patient}
        owner={owner}
        doctorName={auth.currentUser?.displayName || selectedEncounter?.assignedDoctorName || ''}
        serviceCatalog={serviceCatalog}
        onCreated={async () => {
          if (selectedEncounter?.id) {
            const updatedLabs = await fetchLabOrders(selectedEncounter.id);
            setLabOrders(updatedLabs);
            const updatedServices = await fetchAppointmentServices(selectedEncounter.id);
            setAppointmentServices(updatedServices);
          }
        }}
      />

      {/* Cancel / Void / Refund Dialog */}
      <Dialog open={!!cancelItemId} onOpenChange={v => { if (!v) setCancelItemId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            {cancelTier === 'amendment' ? (
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-stone-500" />Amendment Required</DialogTitle>
            ) : cancelTier === 'refund' ? (
              <DialogTitle className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-orange-500" />Refund / Credit Required</DialogTitle>
            ) : (
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className={cn('w-4 h-4', cancelTier === 'void' || cancelTier === 'void-charge' ? 'text-red-600' : 'text-amber-500')} />{cancelTier === 'void' || cancelTier === 'void-charge' ? 'Void Treatment' : 'Cancel Treatment'}</DialogTitle>
            )}
            <DialogDescription>
              {cancelTier === 'amendment' ? 'The medical record is locked. Submit an amendment instead.' :
               cancelTier === 'refund' ? 'This item has been paid. A refund or credit note must be issued.' :
               cancelTier === 'void-charge' ? 'This treatment was administered and billed. Voiding will reverse the charge.' :
               cancelTier === 'void' ? 'This treatment was administered. Voiding reverses all linked effects.' :
               'Planned treatment — mark as cancelled, no side effects.'}
            </DialogDescription>
          </DialogHeader>
          {cancelItemId && (() => {
            const ci = planItems.find(p => p.id === cancelItemId);
            if (!ci) return null;
            return (
              <div className="space-y-3 py-1">
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">Treatment</span>
                    <span className="text-sm font-semibold text-stone-800">{ci.title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">Current Status</span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded', ci.status === 'Administered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{ci.status}</span>
                  </div>
                  {(cancelTier === 'void' || cancelTier === 'void-charge') && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-500">Billing</span>
                        <span className="text-xs text-stone-600">{cancelLinkedData?.invoiceItem ? `Invoiced (${cancelLinkedData?.invoice?.status || 'unknown'})` : ci.billingBehavior ? 'Queued' : 'None'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-500">Inventory</span>
                        <span className="text-xs text-stone-600">{ci.inventoryDeduction ? 'Deducted' : 'None'}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Tier-specific impact section */}
                {cancelTier === 'cancel' && (
                  <div className="text-xs text-stone-500 space-y-1">
                    <p className="font-medium text-stone-700 mb-1">Behavior</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Plan Builder: Mark as Cancelled</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Billing Preview: No change needed</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Inventory: No movement</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Medical History: Skip event</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-stone-400" />Activity Log: Record cancellation</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Visit Summary: Do not show</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Finish Checklist: Remove from active</span>
                    </div>
                  </div>
                )}

                {(cancelTier === 'void' || cancelTier === 'void-charge') && (
                  <div className="text-xs text-stone-500 space-y-1">
                    <p className="font-medium text-stone-700 mb-1">This will:</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-amber-500" />Mark item as Voided in Plan Builder</span>
                      {cancelLinkedData?.invoiceItem ? (
                        <span className="flex items-center gap-1"><Check className="w-3 h-3 text-amber-500" />Void invoice line ({cancelLinkedData.invoiceItem.description || 'line item'})</span>
                      ) : ci.billingBehavior ? (
                        <span className="flex items-center gap-1"><Check className="w-3 h-3 text-amber-500" />Void queued charge</span>
                      ) : null}
                      {ci.inventoryDeduction && <span className="flex items-center gap-1"><Check className="w-3 h-3 text-amber-500" />Create stock reversal movement</span>}
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-amber-500" />Mark treatment event as voided</span>
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-amber-500" />Record in Activity Log</span>
                    </div>
                  </div>
                )}

                {cancelTier === 'refund' && (
                  <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 space-y-1.5">
                    <p className="text-xs font-medium text-orange-700">This item was paid (₱{cancelLinkedData?.invoice?.grandTotal || 0}). Cancelling requires:</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-orange-600">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />Issue a refund or credit note</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />Void original invoice line</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />Record refund in payment history</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />Notify accounting</span>
                    </div>
                    {cancelLinkedData?.payments?.length > 0 && (
                      <p className="text-xs text-orange-500 mt-1">{cancelLinkedData.payments.length} payment(s) on record — refund required before voiding</p>
                    )}
                  </div>
                )}

                {cancelTier === 'amendment' && (
                  <div className="p-3 rounded-lg border border-stone-300 bg-stone-100 space-y-1.5">
                    <p className="text-xs font-medium text-stone-700">The medical record is locked. You must submit an amendment request to modify this entry. This will be reviewed by a supervisor.</p>
                  </div>
                )}

                {cancelTier !== 'amendment' && (
                  <>
                    <div>
                      <Label>Reason for cancellation</Label>
                      <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2} placeholder="Enter reason..." />
                    </div>

                    <div>
                      <Label>Cancellation Type</Label>
                      <div className="space-y-1.5 mt-1">
                        {['Entered by mistake', 'Treatment not performed', 'Duplicate entry', 'Owner declined', 'Changed treatment plan', 'Other'].map(t => (
                          <label key={t} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-stone-50 px-2 py-1 rounded">
                            <input type="radio" name="cancelType" value={t} checked={cancelType === t} onChange={e => setCancelType(e.target.value)} className="accent-red-500" />
                            {t}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <DialogFooter className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCancelItemId(null)}>Back</Button>
                  {cancelTier === 'amendment' ? (
                    <Button onClick={() => { alert('Amendment workflow — coming soon. Please contact a supervisor to modify this record.'); setCancelItemId(null); }} className="bg-stone-600 hover:bg-stone-700 text-white">Request Amendment</Button>
                  ) : cancelTier === 'refund' ? (
                    <Button onClick={() => { alert('Refund workflow — coming soon. Please process the refund in the Billing module first.'); setCancelItemId(null); }} className="bg-orange-600 hover:bg-orange-700 text-white">Continue to Refund</Button>
                  ) : (
                    <Button variant="destructive" onClick={async () => {
                      if (!cancelItemId) return;
                      const ci = planItems.find(p => p.id === cancelItemId);
                      setCancelLoading(true);
                      try {
                        // Void billing appointment_services if administered
                        if (ci?.linkedRecordId && (cancelTier === 'void' || cancelTier === 'void-charge')) {
                          await updateDoc(doc(db, 'appointment_services', ci.linkedRecordId), { status: 'voided', voidedAt: serverTimestamp(), voidReason: cancelReason, voidType: cancelType });
                        }
                        // Void invoice item if billed
                        if (cancelTier === 'void-charge' && cancelLinkedData?.invoiceItem?.id) {
                          await updateDoc(doc(db, 'invoice_items', cancelLinkedData.invoiceItem.id), { voided: true, voidedAt: serverTimestamp(), voidReason: cancelReason });
                        }
                        // Reverse inventory if deducted
                        if (ci?.inventoryDeduction && cancelTier !== 'cancel') {
                          await createStockMovement({
                            medicationName: ci.title,
                            type: 'return',
                            quantity: 1,
                            reference: `CANCEL-${(selectedEncounter?.id || '').slice(-6)}`,
                            notes: `Reversal: ${cancelReason || 'Treatment cancelled'} (${cancelType})`,
                            userId: auth.currentUser?.uid || '',
                            userName: auth.currentUser?.displayName || '',
                            encounterId: selectedEncounter?.id
                          });
                        }
                        const newStatus = cancelTier === 'cancel' ? 'Cancelled' : 'Voided';
                        await addAuditLog({ action: cancelTier === 'cancel' ? 'treatment_cancelled' : 'treatment_voided', userId: auth.currentUser?.uid || '', userName: auth.currentUser?.displayName || '', encounterId: selectedEncounter?.id, patientId, details: `${ci?.title} — ${cancelReason || 'No reason'} (${cancelType})` });
                        setPlanItems(prev => {
                          const next = prev.map(p => p.id === cancelItemId ? { ...p, status: newStatus, cancelReason: cancelReason || 'No reason provided', cancelType } : p);
                          persistPlanItems(next);
                          return next;
                        });
                      } catch (e) {
                        console.error('Error during cancellation:', e);
                      } finally {
                        setCancelLoading(false);
                        setCancelItemId(null);
                      }
                    }} disabled={!cancelReason.trim() || !cancelType || cancelLoading}>
                      {cancelLoading ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Processing...</> : cancelTier === 'cancel' ? 'Confirm Cancel' : 'Confirm Void'}
                    </Button>
                  )}
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ── Inline Drawer/Modal Components for Plan Builder ──────────────────────

function TreatmentDrawer({ open, onOpenChange, onSave, encounterId, patientId, patientName, ownerId, ownerName, onCreated, initialData }: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (item: any) => void; encounterId: string; patientId: string; patientName: string; ownerId: string; ownerName: string; onCreated?: () => Promise<void>; initialData?: any }) {
  const [tf, setTf] = React.useState({ name: '', reason: '', dose: '', route: 'Subcutaneous', performedBy: auth.currentUser?.displayName || '', status: 'administered', chargeToBilling: true, inventoryDeduction: true, notes: '' });
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (initialData) {
      setTf({
        name: initialData.title || '',
        reason: initialData.details?.Reason || '',
        dose: initialData.dose || '',
        route: initialData.route || 'Subcutaneous',
        performedBy: initialData.details?.['Performed by'] || auth.currentUser?.displayName || '',
        status: initialData.status?.toLowerCase() === 'administered' ? 'administered' : 'planned',
        chargeToBilling: initialData.billingBehavior === 'queue',
        inventoryDeduction: initialData.inventoryDeduction ?? true,
        notes: initialData.details?.Notes || '',
      });
    } else {
      setTf({ name: '', reason: '', dose: '', route: 'Subcutaneous', performedBy: auth.currentUser?.displayName || '', status: 'administered', chargeToBilling: true, inventoryDeduction: true, notes: '' });
    }
  }, [initialData]);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg">
        <DrawerHeader><DrawerTitle className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600" />{initialData ? 'Edit Treatment' : 'Add Treatment'}</DrawerTitle><DrawerDescription>{initialData ? 'Modify treatment details' : 'Record an in-clinic treatment or procedure'}</DrawerDescription></DrawerHeader>
        <div className="space-y-3 py-2">
          <div><Label>Treatment</Label><Input value={tf.name} onChange={e => setTf(p => ({...p, name: e.target.value}))} placeholder="e.g., Cerenia injection" /></div>
          <div><Label>Reason</Label><Input value={tf.reason} onChange={e => setTf(p => ({...p, reason: e.target.value}))} placeholder="e.g., Vomiting" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Dose</Label><Input value={tf.dose} onChange={e => setTf(p => ({...p, dose: e.target.value}))} placeholder="e.g., 0.5 ml" /></div>
            <div><Label>Route</Label><select value={tf.route} onChange={e => setTf(p => ({...p, route: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option>Subcutaneous</option><option>Intramuscular</option><option>Intravenous</option><option>Oral</option><option>Topical</option><option>Intraosseous</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Performed by</Label><Input value={tf.performedBy} onChange={e => setTf(p => ({...p, performedBy: e.target.value}))} /></div>
            <div><Label>Status</Label><select value={tf.status} onChange={e => setTf(p => ({...p, status: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="administered">Administered</option><option value="planned">Planned</option></select></div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={tf.chargeToBilling} onChange={e => setTf(p => ({...p, chargeToBilling: e.target.checked}))} />Charge to billing</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={tf.inventoryDeduction} onChange={e => setTf(p => ({...p, inventoryDeduction: e.target.checked}))} />Inventory deduction</label>
          </div>
          <div><Label>Notes</Label><Textarea value={tf.notes} onChange={e => setTf(p => ({...p, notes: e.target.value}))} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setSaving(false); onOpenChange(false); }} disabled={saving}>Cancel</Button>
            <Button onClick={async () => {
              if (!tf.name) return; setSaving(true);
                try {
                const item: any = { id: `treat_${Date.now()}`, type: 'treatment', title: tf.name, dose: tf.dose, route: tf.route, subtitle: `${tf.dose} \u00b7 ${tf.route} \u00b7 ${tf.status}`, status: tf.status === 'administered' ? 'Administered' : 'Planned', details: { Reason: tf.reason, 'Performed by': tf.performedBy, Notes: tf.notes }, billingBehavior: tf.chargeToBilling ? 'queue' : undefined, inventoryDeduction: tf.inventoryDeduction };
                const svcRef = await addDoc(collection(db, 'appointment_services'), {
                  appointmentId: encounterId, encounterId, petId: patientId, petName: patientName, ownerId, ownerName,
                  serviceName: tf.name, serviceType: 'treatment', billable: tf.chargeToBilling, status: 'active',
                  quantity: 1, price: 0, dose: tf.dose, route: tf.route, notes: tf.notes,
                  performedBy: tf.performedBy, createdBy: auth.currentUser?.displayName || '', createdAt: serverTimestamp()
                });
                item.linkedRecordId = svcRef.id;
                if (tf.inventoryDeduction) {
                  const movement = await createStockMovement({
                    medicationName: tf.name,
                    type: 'dispensing',
                    quantity: -1,
                    reference: `ENC-${encounterId.slice(-6)}`,
                    notes: tf.reason || 'Administered during consultation',
                    userId: auth.currentUser?.uid || '',
                    userName: auth.currentUser?.displayName || tf.performedBy,
                    encounterId
                  });
                  item.movementId = movement.id;
                }
                await addAuditLog({ action: 'treatment_added', userId: auth.currentUser?.uid || '', userName: auth.currentUser?.displayName || '', encounterId, patientId, details: tf.name });
                onSave(item);
                onOpenChange(false);
                if (onCreated) await onCreated();
              } finally { setSaving(false); }
            }} disabled={!tf.name || saving} className="bg-blue-600 hover:bg-blue-700 text-white">{saving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Saving...</> : 'Save Treatment'}</Button>
          </div>
        </div>
              </DrawerContent>
    </Drawer>
  );
}

function PrescriptionDrawer({ open, onOpenChange, onSave, encounterId, patientId, patientName, ownerId, ownerName, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (item: any) => void; encounterId: string; patientId: string; patientName: string; ownerId: string; ownerName: string; onCreated?: () => Promise<void> }) {
  const [pf, setPf] = React.useState({ medication: '', strength: '', dose: '', route: 'Oral', frequency: 'Once daily', duration: '', quantity: '', instructions: '', linkedDiagnosis: '', substitutionAllowed: false, billingBehavior: 'queue' });
  const [saving, setSaving] = React.useState(false);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg">
        <DrawerHeader><DrawerTitle className="flex items-center gap-2"><Pill className="w-4 h-4 text-purple-600" />Add Prescription</DrawerTitle><DrawerDescription>Order take-home medication</DrawerDescription></DrawerHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Medication</Label><Input value={pf.medication} onChange={e => setPf(p => ({...p, medication: e.target.value}))} placeholder="Search medicine..." /></div>
            <div><Label>Strength</Label><Input value={pf.strength} onChange={e => setPf(p => ({...p, strength: e.target.value}))} placeholder="e.g., 10 mg" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Dose</Label><Input value={pf.dose} onChange={e => setPf(p => ({...p, dose: e.target.value}))} placeholder="e.g., 1 tablet" /></div>
            <div><Label>Route</Label><select value={pf.route} onChange={e => setPf(p => ({...p, route: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option>Oral</option><option>Subcutaneous</option><option>Intramuscular</option><option>Intravenous</option><option>Topical</option></select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Frequency</Label><select value={pf.frequency} onChange={e => setPf(p => ({...p, frequency: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option>Once daily</option><option>Twice daily</option><option>Three times daily</option><option>Every other day</option><option>As needed</option></select></div>
            <div><Label>Duration</Label><Input value={pf.duration} onChange={e => setPf(p => ({...p, duration: e.target.value}))} placeholder="e.g., 5 days" /></div>
            <div><Label>Quantity</Label><Input value={pf.quantity} onChange={e => setPf(p => ({...p, quantity: e.target.value}))} placeholder="e.g., 5" /></div>
          </div>
          <div><Label>Instructions</Label><Textarea value={pf.instructions} onChange={e => setPf(p => ({...p, instructions: e.target.value}))} rows={2} placeholder="Give before meals" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Linked Diagnosis</Label><Input value={pf.linkedDiagnosis} onChange={e => setPf(p => ({...p, linkedDiagnosis: e.target.value}))} placeholder="e.g., Acute gastritis" /></div>
            <div><Label>Billing</Label><select value={pf.billingBehavior} onChange={e => setPf(p => ({...p, billingBehavior: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="queue">Queue charge</option><option value="create-invoice-line">Create invoice line</option></select></div>
          </div>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={pf.substitutionAllowed} onChange={e => setPf(p => ({...p, substitutionAllowed: e.target.checked}))} />Substitution allowed</label>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setSaving(false); onOpenChange(false); }} disabled={saving}>Cancel</Button>
            <Button onClick={async () => {
              if (!pf.medication) return; setSaving(true);
              try {
                const subtitle = `${pf.dose} ${pf.route} ${pf.frequency} for ${pf.duration}`;
                const item: any = { id: `rx_${Date.now()}`, type: 'prescription', title: `${pf.medication}${pf.strength ? ' ' + pf.strength : ''}`, subtitle, status: 'For Dispensing', details: { Dose: pf.dose, Route: pf.route, Frequency: pf.frequency, Duration: pf.duration, Qty: pf.quantity, Instructions: pf.instructions, 'Linked Dx': pf.linkedDiagnosis }, billingBehavior: pf.billingBehavior };
                const rxRef = await addDoc(collection(db, 'prescriptions'), {
                  encounterId, petId: patientId, petName: patientName, doctorName: auth.currentUser?.displayName || '',
                  medicationName: pf.medication, strength: pf.strength, dosage: pf.dose, route: pf.route,
                  frequency: pf.frequency, duration: pf.duration, quantity: parseFloat(pf.quantity) || 0,
                  instructions: pf.instructions, linkedDiagnosis: pf.linkedDiagnosis, substitutionAllowed: pf.substitutionAllowed,
                  status: 'pending', billingBehavior: pf.billingBehavior, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
                });
                item.linkedRecordId = rxRef.id;
                await addAuditLog({ action: 'prescription_created', userId: auth.currentUser?.uid || '', userName: auth.currentUser?.displayName || '', encounterId, patientId, details: pf.medication });
                if (pf.billingBehavior === 'create-invoice-line') {
                  const invoices = await fetchInvoicesByEncounter(encounterId);
                  if (invoices.length > 0) {
                    const inv = invoices[0];
                    await addDoc(collection(db, 'invoice_items'), {
                      invoiceId: inv.id, encounterId, petId: patientId, description: `Prescription: ${pf.medication} ${pf.strength}`,
                      quantity: parseFloat(pf.quantity) || 1, unitPrice: 0, total: 0, type: 'prescription', createdAt: serverTimestamp()
                    });
                    const items = await fetchInvoiceItems(inv.id);
                    const subtotal = items.reduce((s: number, i: any) => s + (i.total || i.unitPrice * i.quantity || 0), 0);
                    await updateDoc(doc(db, 'invoices', inv.id), { subtotal, grandTotal: subtotal, updatedAt: serverTimestamp() });
                  }
                }
                onSave(item);
                onOpenChange(false);
                if (onCreated) await onCreated();
              } finally { setSaving(false); }
            }} disabled={!pf.medication || saving} className="bg-purple-600 hover:bg-purple-700 text-white">{saving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Saving...</> : 'Save Prescription'}</Button>
          </div>
        </div>
              </DrawerContent>
    </Drawer>
  );
}

function ProcedureDrawer({ open, onOpenChange, onSave, encounterId, patientId, patientName, ownerId, ownerName, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (item: any) => void; encounterId: string; patientId: string; patientName: string; ownerId: string; ownerName: string; onCreated?: () => Promise<void> }) {
  const [prf, setPrf] = React.useState({ name: '', indication: '', consentRequired: false, status: 'Completed', performedBy: auth.currentUser?.displayName || '', supplies: '', notes: '', billingBehavior: 'queue' });
  const [saving, setSaving] = React.useState(false);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg">
        <DrawerHeader><DrawerTitle className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-emerald-600" />Add Procedure</DrawerTitle><DrawerDescription>Record an in-clinic or recommended procedure</DrawerDescription></DrawerHeader>
        <div className="space-y-3 py-2">
          <div><Label>Procedure</Label><Input value={prf.name} onChange={e => setPrf(p => ({...p, name: e.target.value}))} placeholder="e.g., Wound cleaning" /></div>
          <div><Label>Indication</Label><Input value={prf.indication} onChange={e => setPrf(p => ({...p, indication: e.target.value}))} placeholder="e.g., Infected wound" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><select value={prf.status} onChange={e => setPrf(p => ({...p, status: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="Completed">Completed</option><option value="Recommended">Recommended</option><option value="Scheduled">Scheduled</option></select></div>
            <div><Label>Performed by</Label><Input value={prf.performedBy} onChange={e => setPrf(p => ({...p, performedBy: e.target.value}))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Supplies Used</Label><Input value={prf.supplies} onChange={e => setPrf(p => ({...p, supplies: e.target.value}))} placeholder="Bandage, antiseptic" /></div>
            <div><Label>Billing</Label><select value={prf.billingBehavior} onChange={e => setPrf(p => ({...p, billingBehavior: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="queue">Queue charge</option><option value="create-invoice-line">Create invoice line</option></select></div>
          </div>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={prf.consentRequired} onChange={e => setPrf(p => ({...p, consentRequired: e.target.checked}))} />Consent required</label>
          <div><Label>Notes</Label><Textarea value={prf.notes} onChange={e => setPrf(p => ({...p, notes: e.target.value}))} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setSaving(false); onOpenChange(false); }} disabled={saving}>Cancel</Button>
            <Button onClick={async () => {
              if (!prf.name) return; setSaving(true);
              try {
                const item: any = { id: `proc_${Date.now()}`, type: 'procedure', title: prf.name, subtitle: `Status: ${prf.status}`, status: prf.status, details: { Indication: prf.indication, 'Performed by': prf.performedBy, 'Supplies': prf.supplies, 'Consent': prf.consentRequired ? 'Required' : 'Not required', Notes: prf.notes }, billingBehavior: prf.billingBehavior };
                const svcRef = await addDoc(collection(db, 'appointment_services'), {
                  appointmentId: encounterId, encounterId, petId: patientId, petName: patientName, ownerId, ownerName,
                  serviceName: prf.name, serviceType: 'procedure', billable: prf.billingBehavior !== 'queue',
                  status: 'active', quantity: 1, price: 0, supplies: prf.supplies, notes: prf.notes,
                  consentRequired: prf.consentRequired, performedBy: prf.performedBy,
                  createdBy: auth.currentUser?.displayName || '', createdAt: serverTimestamp()
                });
                item.linkedRecordId = svcRef.id;
                await addAuditLog({ action: 'procedure_added', userId: auth.currentUser?.uid || '', userName: auth.currentUser?.displayName || '', encounterId, patientId, details: prf.name });
                onSave(item);
                onOpenChange(false);
                if (onCreated) await onCreated();
              } finally { setSaving(false); }
            }} disabled={!prf.name || saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Saving...</> : 'Save Procedure'}</Button>
          </div>
        </div>
              </DrawerContent>
    </Drawer>
  );
}

function AdmissionDrawer({ open, onOpenChange, onSave, encounterId, patientId, patientName, ownerId, ownerName, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (item: any) => void; encounterId: string; patientId: string; patientName: string; ownerId: string; ownerName: string; onCreated?: () => Promise<void> }) {
  const [af, setAf] = React.useState({ type: 'Medical confinement', reason: '', initialDiagnosis: '', monitoring: 'Every 4 hours', expectedDuration: '24-48 hours', isolationRequired: false, consentRequired: true, depositRequired: true, notes: '' });
  const [saving, setSaving] = React.useState(false);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg">
        <DrawerHeader><DrawerTitle className="flex items-center gap-2"><Heart className="w-4 h-4 text-rose-600" />Recommend Admission</DrawerTitle><DrawerDescription>Recommend hospitalization or confinement</DrawerDescription></DrawerHeader>
        <div className="space-y-3 py-2">
          <div><Label>Admission Type</Label><select value={af.type} onChange={e => setAf(p => ({...p, type: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option>Medical confinement</option><option>Surgical admission</option><option>Isolation</option><option>ICU monitoring</option></select></div>
          <div><Label>Reason</Label><Textarea value={af.reason} onChange={e => setAf(p => ({...p, reason: e.target.value}))} rows={2} placeholder="Persistent vomiting and dehydration" /></div>
          <div><Label>Initial Diagnosis</Label><Input value={af.initialDiagnosis} onChange={e => setAf(p => ({...p, initialDiagnosis: e.target.value}))} placeholder="Suspected acute gastritis" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Monitoring Level</Label><select value={af.monitoring} onChange={e => setAf(p => ({...p, monitoring: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option>Every 2 hours</option><option>Every 4 hours</option><option>Every 6 hours</option><option>Continuous</option></select></div>
            <div><Label>Expected Duration</Label><Input value={af.expectedDuration} onChange={e => setAf(p => ({...p, expectedDuration: e.target.value}))} placeholder="24-48 hours" /></div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={af.isolationRequired} onChange={e => setAf(p => ({...p, isolationRequired: e.target.checked}))} />Isolation required</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={af.consentRequired} onChange={e => setAf(p => ({...p, consentRequired: e.target.checked}))} />Consent required</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={af.depositRequired} onChange={e => setAf(p => ({...p, depositRequired: e.target.checked}))} />Deposit required</label>
          </div>
          <div><Label>Notes</Label><Textarea value={af.notes} onChange={e => setAf(p => ({...p, notes: e.target.value}))} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setSaving(false); onOpenChange(false); }} disabled={saving}>Cancel</Button>
            <Button onClick={async () => {
              if (!af.reason) return; setSaving(true);
              try {
                const item: any = { id: `adm_${Date.now()}`, type: 'admission', title: af.type, subtitle: `Monitoring: ${af.monitoring}`, status: 'Pending Owner Consent', details: { Reason: af.reason, 'Initial Dx': af.initialDiagnosis, Duration: af.expectedDuration, Isolation: af.isolationRequired ? 'Yes' : 'No', Consent: af.consentRequired ? 'Required' : 'Not required', Deposit: af.depositRequired ? 'Required' : 'Not required' } };
                const admRef = await addDoc(collection(db, 'admissions'), {
                  petId: patientId, petName: patientName, ownerId, ownerName,
                  encounterId, admissionType: af.type, reason: af.reason, initialDiagnosis: af.initialDiagnosis,
                  monitoring: af.monitoring, expectedDuration: af.expectedDuration,
                  isolationRequired: af.isolationRequired, consentRequired: af.consentRequired, depositRequired: af.depositRequired,
                  notes: af.notes, status: 'admitted',
                  checkInDate: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp()
                });
                item.linkedRecordId = admRef.id;
                await addAuditLog({ action: 'admission_recommended', userId: auth.currentUser?.uid || '', userName: auth.currentUser?.displayName || '', encounterId, patientId, details: af.type });
                onSave(item);
                onOpenChange(false);
                if (onCreated) await onCreated();
              } finally { setSaving(false); }
            }} disabled={!af.reason || saving} className="bg-rose-600 hover:bg-rose-700 text-white">{saving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Saving...</> : 'Save Recommendation'}</Button>
          </div>
        </div>
              </DrawerContent>
    </Drawer>
  );
}

function FollowUpModal({ open, onOpenChange, onSave, encounterId, patientId, patientName, ownerId, ownerName, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (item: any) => void; encounterId: string; patientId: string; patientName: string; ownerId: string; ownerName: string; onCreated?: () => Promise<void> }) {
  const [ff, setFf] = React.useState({ type: 'Recheck', dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], assignedTo: 'Reception', reminderMethod: 'SMS', createAppointment: false, ownerMessage: '', status: 'Open' });
  const [saving, setSaving] = React.useState(false);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-md">
        <DrawerHeader><DrawerTitle className="flex items-center gap-2"><Calendar className="w-4 h-4 text-cyan-600" />Add Follow-Up</DrawerTitle><DrawerDescription>Schedule a follow-up or recheck</DrawerDescription></DrawerHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><select value={ff.type} onChange={e => setFf(p => ({...p, type: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option>Recheck</option><option>Surgery follow-up</option><option>Lab result review</option><option>Vaccination</option><option>Post-op check</option></select></div>
            <div><Label>Due Date</Label><Input type="date" value={ff.dueDate} onChange={e => setFf(p => ({...p, dueDate: e.target.value}))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Assigned to</Label><select value={ff.assignedTo} onChange={e => setFf(p => ({...p, assignedTo: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option>Reception</option><option>Doctor</option><option>Lab</option><option>Pharmacy</option><option>Nurse</option></select></div>
            <div><Label>Reminder Method</Label><select value={ff.reminderMethod} onChange={e => setFf(p => ({...p, reminderMethod: e.target.value}))} className="flex h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option>SMS</option><option>Call</option><option>Email</option><option>None</option></select></div>
          </div>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={ff.createAppointment} onChange={e => setFf(p => ({...p, createAppointment: e.target.checked}))} />Create appointment now</label>
          <div><Label>Owner Message</Label><Textarea value={ff.ownerMessage} onChange={e => setFf(p => ({...p, ownerMessage: e.target.value}))} rows={2} placeholder="Return if vomiting persists" /></div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setSaving(false); onOpenChange(false); }} disabled={saving}>Cancel</Button>
            <Button onClick={async () => {
              setSaving(true);
              try {
                const item: any = { id: `fu_${Date.now()}`, type: 'followup', title: `${ff.type} in 3 days`, subtitle: `Due: ${ff.dueDate}`, status: ff.status, details: { Type: ff.type, Due: ff.dueDate, 'Assigned to': ff.assignedTo, Reminder: ff.reminderMethod, 'Create Apt': ff.createAppointment ? 'Yes' : 'No', Message: ff.ownerMessage } };
                const fuRef = await addDoc(collection(db, 'follow_ups'), {
                  encounterId, petId: patientId, petName: patientName, ownerId, ownerName,
                  type: ff.type, dueDate: ff.dueDate, assignedTo: ff.assignedTo,
                  reminderMethod: ff.reminderMethod, createAppointment: ff.createAppointment,
                  ownerMessage: ff.ownerMessage, status: ff.status,
                  createdBy: auth.currentUser?.displayName || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
                });
                item.linkedRecordId = fuRef.id;
                await addAuditLog({ action: 'followup_scheduled', userId: auth.currentUser?.uid || '', userName: auth.currentUser?.displayName || '', encounterId, patientId, details: `${ff.type} on ${ff.dueDate}` });
                onSave(item);
                onOpenChange(false);
                if (onCreated) await onCreated();
              } finally { setSaving(false); }
            }} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white">{saving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Saving...</> : 'Save Follow-Up'}</Button>
          </div>
        </div>
              </DrawerContent>
    </Drawer>
  );
}

function OwnerInstructionsEditor({ open, onOpenChange, onSave, onInstructionsChange, encounterId, patientId }: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (item: any) => void; onInstructionsChange: (combined: string, diet: string, warningSigns: string) => void; encounterId: string; patientId: string }) {
  const [oi, setOi] = React.useState({ medicationInstructions: '', diet: '', activity: '', warningSigns: '', followUp: '', labExpectations: '' });
  const [saving, setSaving] = React.useState(false);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg">
        <DrawerHeader><DrawerTitle className="flex items-center gap-2"><FileText className="w-4 h-4 text-stone-600" />Owner Instructions</DrawerTitle><DrawerDescription>Home care and follow-up instructions for the owner</DrawerDescription></DrawerHeader>
        <div className="space-y-3 py-2">
          <div><Label>Medication Instructions</Label><Textarea value={oi.medicationInstructions} onChange={e => setOi(p => ({...p, medicationInstructions: e.target.value}))} rows={1} placeholder="Give medicine before meals" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Diet</Label><Textarea value={oi.diet} onChange={e => setOi(p => ({...p, diet: e.target.value}))} rows={1} placeholder="Small frequent meals" /></div>
            <div><Label>Activity</Label><Textarea value={oi.activity} onChange={e => setOi(p => ({...p, activity: e.target.value}))} rows={1} placeholder="Rest for 24 hours" /></div>
          </div>
          <div><Label>Warning Signs</Label><Textarea value={oi.warningSigns} onChange={e => setOi(p => ({...p, warningSigns: e.target.value}))} rows={1} placeholder="Return if vomiting continues" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Follow-Up</Label><Textarea value={oi.followUp} onChange={e => setOi(p => ({...p, followUp: e.target.value}))} rows={1} placeholder="Recheck in 3 days" /></div>
            <div><Label>Lab Expectations</Label><Textarea value={oi.labExpectations} onChange={e => setOi(p => ({...p, labExpectations: e.target.value}))} rows={1} placeholder="CBC result will be reviewed today" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setSaving(false); onOpenChange(false); }} disabled={saving}>Cancel</Button>
            <Button onClick={async () => {
              setSaving(true);
              try {
                const combined = [oi.medicationInstructions, oi.diet, oi.activity, oi.warningSigns, oi.followUp, oi.labExpectations].filter(Boolean).join(' · ');
                const item = { id: `oi_${Date.now()}`, type: 'owner-instructions', title: 'Home Care Instructions', subtitle: combined.slice(0, 80) + (combined.length > 80 ? '...' : ''), status: 'Completed', details: { 'In Visit Summary': 'Yes', 'Owner visible': 'Yes' } };
                await addAuditLog({ action: 'owner_instructions_updated', userId: auth.currentUser?.uid || '', userName: auth.currentUser?.displayName || '', encounterId, patientId, details: '' });
                onSave(item);
                onInstructionsChange(combined, oi.diet, oi.warningSigns);
                onOpenChange(false);
              } finally { setSaving(false); }
            }} disabled={saving} className="bg-stone-700 hover:bg-stone-800 text-white">{saving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Saving...</> : 'Save Instructions'}</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function InventoryMovementDrawer({ data, onClose, encounterId }: { data: { item: any; movement: any } | null; onClose: () => void; encounterId: string }) {
  const navigate = useNavigate();
  const open = !!data;
  if (!data) return null;
  const { item, movement } = data;
  return (
    <Drawer open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DrawerContent className="max-w-lg">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Box className="w-4 h-4 text-amber-600" />Inventory Movement
          </DrawerTitle>
          <DrawerDescription>Stock deduction record from this encounter</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 py-2">
          <div className="p-4 rounded-lg border border-stone-200 bg-amber-50/40">
            <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded">Stock Out</span>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-stone-500">Item</span>
              <span className="text-sm font-medium text-stone-800">{movement?.medicationName || item.title}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-stone-500">Quantity Deducted</span>
              <span className="text-sm font-medium text-stone-800">{Math.abs(movement?.quantity || 1)} {item.dose ? `(${item.dose})` : ''}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-stone-500">Batch / Lot</span>
              <span className="text-sm font-mono text-stone-600">{movement?.batchNo || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-stone-500">Expiry Date</span>
              <span className="text-sm text-stone-600">{movement?.expiryDate || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-stone-500">Source</span>
              <span className="text-sm font-medium text-stone-600">EMR Encounter ENC-{encounterId.slice(-6).toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-stone-500">Reason</span>
              <span className="text-sm text-stone-600">{movement?.notes || item.details?.Reason || 'Administered during consultation'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-stone-500">Performed By</span>
              <span className="text-sm font-medium text-stone-800">{movement?.userName || item.details?.['Performed by'] || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-stone-500">Date / Time</span>
              <span className="text-sm text-stone-600">{movement?.createdAt ? new Date(movement.createdAt.toDate?.() || movement.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Recorded during this session'}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => { onClose(); navigate('/crm/pharmacy'); }}>
              <FileText className="w-3.5 h-3.5 mr-1.5" />Open in Inventory
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

