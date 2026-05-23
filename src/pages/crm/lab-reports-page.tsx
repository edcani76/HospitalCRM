import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../../components/ui/drawer';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { SearchBar } from '../../components/ui/search-bar';
import {
  Plus, Eye, Loader2, MoreHorizontal, FlaskConical, Clock, CheckCircle, AlertTriangle,
  Syringe, FileText, X, Ban, Upload, Beaker, ScanLine,
  Stethoscope, PhilippinePeso, AlertCircle, User
} from 'lucide-react';
import {
  fetchAllLabOrders, createLabOrder, updateLabOrderStatus,
  fetchPets, fetchUsers,
  addAuditLog, appendPetMedicalHistory
} from '../../lib/firestore-helpers';
import { clearCache } from '../../lib/offline-cache';
import { auth } from '../../firebase';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { LabReportPDF } from '../../components/lab-report-pdf';

type TabType = 'orders' | 'sample-collection' | 'in-progress' | 'results' | 'critical' | 'external' | 'analytics';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  'ordered': { label: 'Ordered', color: 'bg-blue-100 text-blue-800', icon: Clock },
  'awaiting-sample': { label: 'Awaiting Sample', color: 'bg-amber-100 text-amber-800', icon: Clock },
  'sample-collected': { label: 'Sample Collected', color: 'bg-indigo-100 text-indigo-800', icon: Syringe },
  'in-progress': { label: 'In Progress', color: 'bg-cyan-100 text-cyan-800', icon: Loader2 },
  'ready-for-review': { label: 'Ready for Review', color: 'bg-purple-100 text-purple-800', icon: FileText },
  'completed': { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: Ban },
  'rejected-sample': { label: 'Sample Rejected', color: 'bg-red-100 text-red-800', icon: X },
  'awaiting-external-lab': { label: 'External Lab Pending', color: 'bg-orange-100 text-orange-800', icon: Upload },
  'critical-result': { label: 'Critical Result', color: 'bg-rose-600 text-white', icon: AlertTriangle },
  'amended': { label: 'Amended', color: 'bg-stone-200 text-stone-800', icon: FileText },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  'Routine': { label: 'Routine', color: 'bg-slate-100 text-slate-700' },
  'Urgent': { label: 'Urgent', color: 'bg-orange-100 text-orange-700' },
  'STAT': { label: 'STAT', color: 'bg-red-100 text-red-700' },
};

const RESULT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  'pending': { label: 'Pending', color: 'bg-slate-100 text-slate-600' },
  'normal': { label: 'Normal', color: 'bg-green-100 text-green-700' },
  'abnormal': { label: 'Abnormal', color: 'bg-orange-100 text-orange-700' },
  'critical': { label: 'Critical', color: 'bg-rose-100 text-rose-700' },
  'inconclusive': { label: 'Inconclusive', color: 'bg-stone-100 text-stone-700' },
};

const BILLING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  'not-billed': { label: 'Not Billed', color: 'bg-slate-100 text-slate-600' },
  'queued': { label: 'Queued', color: 'bg-blue-100 text-blue-700' },
  'sent-to-billing': { label: 'Sent to Billing', color: 'bg-indigo-100 text-indigo-700' },
  'paid': { label: 'Paid', color: 'bg-green-100 text-green-700' },
  'voided': { label: 'Voided', color: 'bg-red-100 text-red-700' },
  'refunded': { label: 'Refunded', color: 'bg-purple-100 text-purple-700' },
  'included-in-package': { label: 'Included', color: 'bg-teal-100 text-teal-700' },
};

function getStatusBadge(status: string) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-slate-700', icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function getPriorityBadge(priority: string) {
  const cfg = PRIORITY_CONFIG[priority] || { label: priority, color: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function getResultBadge(resultStatus?: string) {
  const rs = resultStatus || 'pending';
  const cfg = RESULT_STATUS_CONFIG[rs] || { label: rs, color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function getBillingBadge(billingStatus?: string) {
  const bs = billingStatus || 'not-billed';
  const cfg = BILLING_STATUS_CONFIG[bs] || { label: bs, color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function getTestCategoryIcon(category?: string) {
  switch (category) {
    case 'Laboratory': return <Beaker className="w-4 h-4" />;
    case 'Imaging': return <ScanLine className="w-4 h-4" />;
    case 'External Lab': return <Upload className="w-4 h-4" />;
    default: return <FlaskConical className="w-4 h-4" />;
  }
}

function formatDate(d: any) {
  if (!d) return '—';
  if (d.toDate) return format(d.toDate(), 'MMM dd, yyyy');
  if (d._seconds) return format(new Date(d._seconds * 1000), 'MMM dd, yyyy');
  if (typeof d === 'string') return format(parseISO(d), 'MMM dd, yyyy');
  return '—';
}

function formatDateTime(d: any) {
  if (!d) return '—';
  if (d.toDate) return format(d.toDate(), 'MMM dd, yyyy hh:mm a');
  if (d._seconds) return format(new Date(d._seconds * 1000), 'MMM dd, yyyy hh:mm a');
  if (typeof d === 'string') return format(parseISO(d), 'MMM dd, yyyy hh:mm a');
  return '—';
}

export default function LabReportsPage() {
  const navigate = useNavigate();

  // Data
  const [orders, setOrders] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [statusFilter, setStatusFilter] = useState('all');
  const [testTypeFilter, setTestTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [billingFilter, setBillingFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Detail drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // New Lab Order dialog
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    patientId: '', ownerId: '', testName: '', testCategory: 'Laboratory' as 'Laboratory' | 'Imaging' | 'External Lab',
    priority: 'Routine' as 'Routine' | 'Urgent' | 'STAT', reason: '', sampleType: '',
    billingBehavior: 'queue' as 'queue' | 'create-invoice-line', externalLab: false, notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Sample Collection dialog
  const [isSampleDialogOpen, setIsSampleDialogOpen] = useState(false);
  const [sampleForm, setSampleForm] = useState({ sampleType: '', collectedBy: '', condition: 'good', notes: '' });

  // Result Entry dialog
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [resultForm, setResultForm] = useState({
    resultStatus: 'normal' as 'normal' | 'abnormal' | 'critical' | 'inconclusive',
    findings: '', interpretation: ''
  });
  const [savingResult, setSavingResult] = useState(false);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        await clearCache('lab_orders_all').catch(() => {});
        const [ordersData, petsData, usersData] = await Promise.all([
          fetchAllLabOrders(),
          fetchPets(),
          fetchUsers()
        ]);
        setOrders(ordersData);
        setPets((petsData || []).filter(Boolean));
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading lab data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Pet & owner lookup maps
  const petMap = useMemo(() => {
    const map = new Map<string, any>();
    pets.forEach(p => map.set(p.id, p));
    return map;
  }, [pets]);

  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    users.forEach(u => map.set(u.id, u));
    return map;
  }, [users]);

  // KPI calculations
  const kpis = useMemo(() => {
    const pendingOrders = orders.filter(o => o.status === 'ordered');
    const awaitingSample = orders.filter(o => o.status === 'awaiting-sample');
    const samplesCollected = orders.filter(o => o.status === 'sample-collected');
    const inProgress = orders.filter(o => o.status === 'in-progress');
    const readyForReview = orders.filter(o => o.status === 'ready-for-review');
    const completed = orders.filter(o => o.status === 'completed');
    const criticalResults = orders.filter(o => o.status === 'critical-result');
    const externalLab = orders.filter(o => o.status === 'awaiting-external-lab');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const notBilled = orders.filter(o => !o.billingStatus || o.billingStatus === 'not-billed' || o.billingStatus === 'queued');
    const totalTests = orders.length;

    return {
      pendingOrders: pendingOrders.length,
      awaitingSample: awaitingSample.length,
      samplesCollected: samplesCollected.length,
      inProgress: inProgress.length,
      readyForReview: readyForReview.length,
      completed: completed.length,
      criticalResults: criticalResults.length,
      externalLab: externalLab.length,
      cancelled: cancelled.length,
      notBilled: notBilled.length,
      totalTests,
    };
  }, [orders]);

  // Filtered orders based on search + filters + active tab
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Tab filter
    switch (activeTab) {
      case 'orders': break; // All orders
      case 'sample-collection': filtered = filtered.filter(o => o.status === 'awaiting-sample' || o.status === 'ordered'); break;
      case 'in-progress': filtered = filtered.filter(o => o.status === 'in-progress' || o.status === 'sample-collected'); break;
      case 'results': filtered = filtered.filter(o => o.status === 'ready-for-review' || o.status === 'completed' || o.status === 'amended' || o.status === 'critical-result'); break;
      case 'critical': filtered = filtered.filter(o => o.status === 'critical-result'); break;
      case 'external': filtered = filtered.filter(o => o.status === 'awaiting-external-lab'); break;
      case 'analytics': break; // Show all for analytics
    }

    // Status filter
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);

    // Test type filter
    if (testTypeFilter !== 'all') filtered = filtered.filter(o => o.testCategory === testTypeFilter);

    // Priority filter
    if (priorityFilter !== 'all') filtered = filtered.filter(o => o.priority === priorityFilter);

    // Billing filter
    if (billingFilter !== 'all') {
      if (billingFilter === 'not-billed') filtered = filtered.filter(o => !o.billingStatus || o.billingStatus === 'not-billed');
      else if (billingFilter === 'sent') filtered = filtered.filter(o => o.billingStatus === 'sent-to-billing' || o.billingStatus === 'queued');
      else if (billingFilter === 'paid') filtered = filtered.filter(o => o.billingStatus === 'paid');
    }

    // Date filter
    if (dateFilter === 'today') {
      const today = format(new Date(), 'yyyy-MM-dd');
      filtered = filtered.filter(o => {
        const d = o.orderedAt;
        if (!d) return false;
        if (d.toDate) return format(d.toDate(), 'yyyy-MM-dd') === today;
        if (d._seconds) return format(new Date(d._seconds * 1000), 'yyyy-MM-dd') === today;
        return true;
      });
    } else if (dateFilter === 'week') {
      const weekAgo = addDays(new Date(), -7);
      filtered = filtered.filter(o => {
        if (!o.orderedAt) return false;
        const d = o.orderedAt.toDate ? o.orderedAt.toDate() : o.orderedAt._seconds ? new Date(o.orderedAt._seconds * 1000) : null;
        return d && isAfter(d, weekAgo);
      });
    }

    // Search
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter(o => {
        const pet = o.petName?.toLowerCase() || petMap.get(o.patientId)?.name?.toLowerCase() || '';
        const owner = o.ownerName?.toLowerCase() || userMap.get(o.ownerId)?.displayName?.toLowerCase() || '';
        const test = o.testName?.toLowerCase() || '';
        const reason = o.reason?.toLowerCase() || '';
        const notes = o.notes?.toLowerCase() || '';
        return pet.includes(term) || owner.includes(term) || test.includes(term) ||
          reason.includes(term) || notes.includes(term) || o.id?.toLowerCase().includes(term);
      });
    }

    return filtered;
  }, [orders, activeTab, statusFilter, testTypeFilter, priorityFilter, billingFilter, dateFilter, searchQuery, petMap, userMap]);

  // Alert banner items
  const alerts = useMemo(() => {
    const items: { label: string; count: number; color: string; tab?: TabType; filter?: string }[] = [];
    if (kpis.readyForReview > 0) items.push({ label: 'ready for review', count: kpis.readyForReview, color: 'text-purple-600', tab: 'results', filter: 'ready-for-review' });
    if (kpis.awaitingSample > 0) items.push({ label: 'awaiting sample collection', count: kpis.awaitingSample, color: 'text-amber-600', tab: 'sample-collection' });
    if (kpis.criticalResults > 0) items.push({ label: 'critical result', count: kpis.criticalResults, color: 'text-rose-600', tab: 'critical' });
    if (kpis.notBilled > 0) items.push({ label: 'not yet billed', count: kpis.notBilled, color: 'text-sky-600' });
    if (kpis.externalLab > 0) items.push({ label: 'external lab pending', count: kpis.externalLab, color: 'text-orange-600', tab: 'external' });
    return items;
  }, [kpis]);

  // Open detail drawer
  const handleView = (order: any) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  // Open sample collection
  const handleCollectSample = (order: any) => {
    setSelectedOrder(order);
    setSampleForm({ sampleType: order.sampleType || 'Blood', collectedBy: auth.currentUser?.displayName || '', condition: 'good', notes: '' });
    setIsSampleDialogOpen(true);
  };

  // Submit sample collection
  const submitSampleCollection = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      await updateLabOrderStatus(selectedOrder.id, 'sample-collected', {
        sampleType: sampleForm.sampleType,
        collectedBy: sampleForm.collectedBy,
        collectedAt: new Date().toISOString(),
        sampleCondition: sampleForm.condition,
        sampleNotes: sampleForm.notes,
      });
      await addAuditLog({
        action: 'lab_sample_collected',
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown',
        patientId: selectedOrder.patientId,
        details: `Sample collected for ${selectedOrder.testName} (${selectedOrder.petName}) - ${sampleForm.sampleType}`
      });
      await clearCache('lab_orders_all').catch(() => {});
      const fresh = await fetchAllLabOrders();
      setOrders(fresh);
      setIsSampleDialogOpen(false);
    } catch (error) {
      console.error('Error recording sample collection:', error);
    } finally {
      setSaving(false);
    }
  };

  // Open result entry
  const handleEnterResult = (order: any) => {
    setSelectedOrder(order);
    setResultForm({ resultStatus: 'normal', findings: '', interpretation: '' });
    setIsResultDialogOpen(true);
  };

  // Submit result entry
  const submitResult = async () => {
    if (!selectedOrder) return;
    setSavingResult(true);
    try {
      const newStatus = resultForm.resultStatus === 'critical' ? 'critical-result' : 'ready-for-review';
      await updateLabOrderStatus(selectedOrder.id, newStatus, {
        resultStatus: resultForm.resultStatus,
        findings: resultForm.findings,
        interpretation: resultForm.interpretation,
        resultEnteredBy: auth.currentUser?.displayName || 'Unknown',
        resultEnteredAt: new Date().toISOString(),
      });
      await addAuditLog({
        action: `lab_result_entered_${resultForm.resultStatus}`,
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown',
        patientId: selectedOrder.patientId,
        details: `Result entered for ${selectedOrder.testName} (${selectedOrder.petName}): ${resultForm.resultStatus}`
      });
      await clearCache('lab_orders_all').catch(() => {});
      const fresh = await fetchAllLabOrders();
      setOrders(fresh);
      setIsResultDialogOpen(false);
    } catch (error) {
      console.error('Error saving result:', error);
    } finally {
      setSavingResult(false);
    }
  };

  // Mark ready for review
  const handleMarkReady = async (order: any) => {
    try {
      await updateLabOrderStatus(order.id, 'ready-for-review');
      await addAuditLog({
        action: 'lab_ready_for_review',
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown',
        patientId: order.patientId,
        details: `Lab result ready for review: ${order.testName} (${order.petName})`
      });
      await clearCache('lab_orders_all').catch(() => {});
      const fresh = await fetchAllLabOrders();
      setOrders(fresh);
    } catch (error) {
      console.error('Error marking ready for review:', error);
    }
  };

  // Approve report
  const handleApprove = async (order: any) => {
    try {
      await updateLabOrderStatus(order.id, 'completed', {
        reviewedBy: auth.currentUser?.displayName || 'Unknown',
        reviewedAt: new Date().toISOString(),
      });
      await addAuditLog({
        action: 'lab_report_approved',
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown',
        patientId: order.patientId,
        details: `Lab report approved: ${order.testName} (${order.petName})`
      });
      // Append to pet medical history
      await appendPetMedicalHistory(order.patientId,
        `Lab completed: ${order.testName} - ${resultForm.findings || 'See report'}`);
      await clearCache('lab_orders_all').catch(() => {});
      const fresh = await fetchAllLabOrders();
      setOrders(fresh);
    } catch (error) {
      console.error('Error approving report:', error);
    }
  };

  // Cancel order
  const handleCancel = async (order: any) => {
    if (!window.confirm(`Cancel lab order for ${order.petName} - ${order.testName}?`)) return;
    try {
      await updateLabOrderStatus(order.id, 'cancelled', { cancelReason: 'Cancelled by user' });
      await addAuditLog({
        action: 'lab_order_cancelled',
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown',
        patientId: order.patientId,
        details: `Lab order cancelled: ${order.testName} (${order.petName})`
      });
      await clearCache('lab_orders_all').catch(() => {});
      const fresh = await fetchAllLabOrders();
      setOrders(fresh);
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  // Create new lab order
  const createNewOrder = async () => {
    if (!newOrderForm.patientId || !newOrderForm.testName) return;
    setSaving(true);
    try {
      const pet = petMap.get(newOrderForm.patientId);
      const owner = userMap.get(pet?.ownerUid);
      const orderData = {
        patientId: newOrderForm.patientId,
        petName: pet?.name || '',
        ownerId: pet?.ownerUid || '',
        ownerName: owner?.displayName || '',
        testName: newOrderForm.testName,
        testCategory: newOrderForm.testCategory,
        priority: newOrderForm.priority,
        reason: newOrderForm.reason,
        sampleType: newOrderForm.sampleType,
        billingBehavior: newOrderForm.billingBehavior,
        externalLab: newOrderForm.externalLab,
        notes: newOrderForm.notes,
        orderedBy: auth.currentUser?.displayName || 'Unknown',
        orderedByUid: auth.currentUser?.uid || '',
        status: newOrderForm.externalLab ? 'awaiting-external-lab' : 'ordered',
        billingStatus: newOrderForm.billingBehavior === 'create-invoice-line' ? 'sent-to-billing' : 'not-billed',
      };
      await createLabOrder(orderData);
      await addAuditLog({
        action: 'lab_order_created',
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown',
        patientId: newOrderForm.patientId,
        details: `Lab order created: ${newOrderForm.testName} (${pet?.name || ''})`
      });
      await appendPetMedicalHistory(newOrderForm.patientId,
        `Lab ordered: ${newOrderForm.testName} (${newOrderForm.priority})`);
      await clearCache('lab_orders_all').catch(() => {});
      const fresh = await fetchAllLabOrders();
      setOrders(fresh);
      setIsNewOrderOpen(false);
      setNewOrderForm({
        patientId: '', ownerId: '', testName: '', testCategory: 'Laboratory',
        priority: 'Routine', reason: '', sampleType: '',
        billingBehavior: 'queue', externalLab: false, notes: ''
      });
    } catch (error) {
      console.error('Error creating lab order:', error);
    } finally {
      setSaving(false);
    }
  };

  // Navigate to related pages
  const goToPatient = (patientId: string) => navigate(`/crm/patients/${patientId}`);
  const goToBilling = () => navigate('/crm/billing');
  const goToEMR = (encounterId?: string) => {
    if (encounterId) navigate(`/crm/emr/${selectedOrder?.patientId}`, { state: { encounterId } });
    else navigate(`/crm/emr/${selectedOrder?.patientId}`);
  };

  // Render empty state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabCounts = {
    orders: orders.length,
    'sample-collection': orders.filter(o => o.status === 'awaiting-sample' || o.status === 'ordered').length,
    'in-progress': orders.filter(o => o.status === 'in-progress' || o.status === 'sample-collected').length,
    results: orders.filter(o => o.status === 'ready-for-review' || o.status === 'completed' || o.status === 'amended' || o.status === 'critical-result').length,
    critical: kpis.criticalResults,
    external: kpis.externalLab,
    analytics: orders.length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-4 pb-4 -mt-4 px-4 -mx-4 md:pt-6 md:-mt-6 md:px-6 md:-mx-6 lg:pt-8 lg:-mt-8 lg:px-8 lg:-mx-8 border-b border-gray-200/50 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">Lab & Diagnostics</h1>
            <p className="text-muted-foreground">Manage lab orders, samples, diagnostic results, reports, and billing</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsNewOrderOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-6 h-12 rounded-xl font-bold"
            >
              <Plus className="w-5 h-5 mr-2" /> New Lab Order
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><Upload className="w-4 h-4 mr-2" /> Upload</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {}}>Upload Result File</DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}>Upload External Report</DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}>Bulk Upload</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 mb-4 bg-gradient-to-r from-stone-50 to-amber-50 border border-amber-200 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            {alerts.map((alert, i) => (
              <button
                key={i}
                onClick={() => { if (alert.tab) setActiveTab(alert.tab); if (alert.filter) setStatusFilter(alert.filter); }}
                className={`font-medium ${alert.color} hover:underline cursor-pointer`}
              >
                {alert.count} {alert.label}
              </button>
            ))}
            {alerts.length > 1 && <span className="text-muted-foreground">— click to view</span>}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          {[
            { label: 'Pending Orders', value: kpis.pendingOrders, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'orders' as TabType },
            { label: 'Awaiting Sample', value: kpis.awaitingSample, icon: Syringe, color: 'text-amber-600', bg: 'bg-amber-50', tab: 'sample-collection' as TabType },
            { label: 'In Progress', value: kpis.inProgress, icon: Loader2, color: 'text-cyan-600', bg: 'bg-cyan-50', tab: 'in-progress' as TabType },
            { label: 'Ready for Review', value: kpis.readyForReview, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', tab: 'results' as TabType },
            { label: 'Completed', value: kpis.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', tab: 'results' as TabType },
            { label: 'Critical Results', value: kpis.criticalResults, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', tab: 'critical' as TabType },
            { label: 'Unbilled', value: kpis.notBilled, icon: PhilippinePeso, color: 'text-sky-600', bg: 'bg-sky-50' },
          ].map((kpi, i) => (
            <button
              key={i}
              onClick={() => { if (kpi.tab) setActiveTab(kpi.tab); }}
              className="text-left"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                    <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by pet, owner, test name, order ID..."
              color="indigo"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={testTypeFilter} onValueChange={setTestTypeFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Test Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Laboratory">Laboratory</SelectItem>
                <SelectItem value="Imaging">Imaging</SelectItem>
                <SelectItem value="External Lab">External Lab</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="Routine">Routine</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
                <SelectItem value="STAT">STAT</SelectItem>
              </SelectContent>
            </Select>
            <Select value={billingFilter} onValueChange={setBillingFilter}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Billing" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Billing</SelectItem>
                <SelectItem value="not-billed">Not Billed</SelectItem>
                <SelectItem value="sent">Sent to Billing</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Date" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-stone-200">
          {[
            { key: 'orders' as TabType, label: 'Orders', count: tabCounts.orders },
          { key: 'sample-collection' as TabType, label: 'Sample Collection', count: tabCounts['sample-collection'] },
          { key: 'in-progress' as TabType, label: 'In Progress', count: tabCounts['in-progress'] },
          { key: 'results' as TabType, label: 'Results & Reports', count: tabCounts.results },
          { key: 'critical' as TabType, label: 'Critical Results', count: tabCounts.critical },
          { key: 'external' as TabType, label: 'External Labs', count: tabCounts.external },
          { key: 'analytics' as TabType, label: 'Analytics', count: tabCounts.analytics },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content - Orders Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {activeTab === 'analytics' ? (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Tests by Category</CardTitle></CardHeader>
                  <CardContent>
                    {(['Laboratory', 'Imaging', 'External Lab'] as const).map(cat => {
                      const count = orders.filter(o => o.testCategory === cat).length;
                      const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                      return (
                        <div key={cat} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="flex items-center gap-2">
                            {getTestCategoryIcon(cat)}
                            {cat}
                          </span>
                          <span className="font-medium">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Tests by Status</CardTitle></CardHeader>
                  <CardContent>
                    {['ordered', 'in-progress', 'ready-for-review', 'completed', 'cancelled'].map(st => {
                      const count = orders.filter(o => o.status === st).length;
                      const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                      const cfg = STATUS_CONFIG[st];
                      if (!cfg) return null;
                      return (
                        <div key={st} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="flex items-center gap-2">
                            <cfg.icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </span>
                          <span className="font-medium">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setIsNewOrderOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> New Lab Order
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={goToBilling}>
                      <PhilippinePeso className="w-4 h-4 mr-2" /> View Unbilled Diagnostics
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('critical')}>
                      <AlertTriangle className="w-4 h-4 mr-2" /> View Critical Results
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Total Diagnostics: <strong>{orders.length}</strong></p>
                <p>Patients with diagnostics: <strong>{new Set(orders.filter(o => o.patientId).map(o => o.patientId)).size}</strong></p>
                <p>Average turnaround: <strong>—</strong> (track when completedAt data is available)</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-base font-medium">No lab orders found</p>
                      <p className="text-sm mt-1">Create a new lab order from a consultation, admission, or walk-in request.</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsNewOrderOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> New Lab Order
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const pet = petMap.get(order.patientId);
                    const owner = userMap.get(order.ownerId || pet?.ownerUid);
                    return (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleView(order)}>
                        <TableCell className="font-mono text-xs">{order.orderNo || order.id?.slice(0, 8) || '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(order.orderedAt)}</TableCell>
                        <TableCell className="font-medium">
                          <button onClick={(e) => { e.stopPropagation(); goToPatient(order.patientId); }} className="hover:underline text-primary">
                            {order.petName || pet?.name || '—'}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm">{order.ownerName || owner?.displayName || '—'}</TableCell>
                        <TableCell className="text-sm max-w-[160px] truncate" title={order.testName}>{order.testName}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            {getTestCategoryIcon(order.testCategory)}
                            {order.testCategory || '—'}
                          </span>
                        </TableCell>
                        <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{getResultBadge(order.resultStatus)}</TableCell>
                        <TableCell>{getBillingBadge(order.billingStatus)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleView(order)} title="View">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {order.status === 'ordered' && (
                              <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => handleCollectSample(order)} title="Collect Sample">
                                <Syringe className="w-4 h-4" />
                              </Button>
                            )}
                            {order.status === 'sample-collected' && (
                              <Button variant="ghost" size="sm" className="text-cyan-600" onClick={() => handleEnterResult(order)} title="Enter Result">
                                <FileText className="w-4 h-4" />
                              </Button>
                            )}
                            {order.status === 'in-progress' && (
                              <Button variant="ghost" size="sm" className="text-purple-600" onClick={() => handleEnterResult(order)} title="Enter Result">
                                <FileText className="w-4 h-4" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(order)}>
                                  <Eye className="w-4 h-4 mr-2" /> View Details
                                </DropdownMenuItem>
                                {order.status === 'ordered' && (
                                  <DropdownMenuItem onClick={() => handleCollectSample(order)}>
                                    <Syringe className="w-4 h-4 mr-2" /> Collect Sample
                                  </DropdownMenuItem>
                                )}
                                {(order.status === 'sample-collected' || order.status === 'in-progress') && (
                                  <DropdownMenuItem onClick={() => handleEnterResult(order)}>
                                    <FileText className="w-4 h-4 mr-2" /> Enter Result
                                  </DropdownMenuItem>
                                )}
                                {order.status === 'ready-for-review' && (
                                  <DropdownMenuItem onClick={() => handleApprove(order)}>
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Approve Report
                                  </DropdownMenuItem>
                                )}
                                {order.status === 'completed' && (
                                  <DropdownMenuItem asChild>
                                    <PDFDownloadLink
                                      document={<LabReportPDF order={order} patient={petMap.get(order.patientId)} owner={userMap.get(order.ownerId || petMap.get(order.patientId)?.ownerUid)} />}
                                      fileName={`LabReport_${order.petName || 'Patient'}_${order.testCode || 'Test'}.pdf`}
                                      className="flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full"
                                    >
                                      {/* @ts-ignore */}
                                      {({ loading }) => (
                                        <>
                                          <FileText className="w-4 h-4 mr-2" />
                                          {loading ? 'Generating PDF...' : 'Download PDF'}
                                        </>
                                      )}
                                    </PDFDownloadLink>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => goToEMR(order.encounterId)}>
                                  <Stethoscope className="w-4 h-4 mr-2" /> View in EMR
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={goToBilling}>
                                  <PhilippinePeso className="w-4 h-4 mr-2" /> Go to Billing
                                </DropdownMenuItem>
                                {order.status !== 'completed' && order.status !== 'cancelled' && (
                                  <DropdownMenuItem onClick={() => handleCancel(order)} className="text-red-600">
                                    <Ban className="w-4 h-4 mr-2" /> Cancel Order
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="">
          <DrawerHeader>
            <DrawerTitle>
              {selectedOrder?.testName || 'Lab Order Details'}
            </DrawerTitle>
            <DrawerDescription className="sr-only">Lab order details and actions</DrawerDescription>
          </DrawerHeader>
          {selectedOrder && (
            <div className="space-y-5 pr-2 overflow-y-auto max-h-[calc(100vh-120px)]">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-stone-50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Pet</p>
                  <p className="font-medium">{selectedOrder.petName || petMap.get(selectedOrder.patientId)?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="font-medium">{selectedOrder.ownerName || userMap.get(selectedOrder.ownerId || petMap.get(selectedOrder.patientId)?.ownerUid)?.displayName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Test</p>
                  <p className="font-medium">{selectedOrder.testName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="flex items-center gap-1 text-sm">
                    {getTestCategoryIcon(selectedOrder.testCategory)}
                    {selectedOrder.testCategory || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <div className="mt-0.5">{getPriorityBadge(selectedOrder.priority)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-0.5">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ordered By</p>
                  <p className="text-sm">{selectedOrder.orderedBy || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ordered At</p>
                  <p className="text-sm">{formatDateTime(selectedOrder.orderedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Result Status</p>
                  <div className="mt-0.5">{getResultBadge(selectedOrder.resultStatus)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Billing</p>
                  <div className="mt-0.5">{getBillingBadge(selectedOrder.billingStatus)}</div>
                </div>
              </div>

              {/* Reason / Notes */}
              {selectedOrder.reason && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Reason / Indication</p>
                  <p className="text-sm bg-stone-50 p-3 rounded-lg">{selectedOrder.reason}</p>
                </div>
              )}
              {selectedOrder.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Additional Notes</p>
                  <p className="text-sm bg-stone-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Sample Info */}
              {selectedOrder.sampleType && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Sample Information</p>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">{selectedOrder.sampleType}</p>
                    </div>
                    {selectedOrder.collectedBy && (
                      <div>
                        <p className="text-xs text-muted-foreground">Collected By</p>
                        <p className="text-sm">{selectedOrder.collectedBy}</p>
                      </div>
                    )}
                    {selectedOrder.collectedAt && (
                      <div>
                        <p className="text-xs text-muted-foreground">Collected At</p>
                        <p className="text-sm">{formatDateTime(selectedOrder.collectedAt)}</p>
                      </div>
                    )}
                    {selectedOrder.sampleCondition && (
                      <div>
                        <p className="text-xs text-muted-foreground">Condition</p>
                        <p className="text-sm capitalize">{selectedOrder.sampleCondition}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Result Summary */}
              {selectedOrder.findings && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Results & Findings</p>
                  <div className="p-3 bg-stone-50 rounded-lg space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{selectedOrder.findings}</p>
                    {selectedOrder.interpretation && (
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs text-muted-foreground">Interpretation</p>
                        <p className="text-sm">{selectedOrder.interpretation}</p>
                      </div>
                    )}
                    {selectedOrder.resultEnteredBy && (
                      <p className="text-xs text-muted-foreground pt-1">
                        Entered by: {selectedOrder.resultEnteredBy} on {formatDateTime(selectedOrder.resultEnteredAt)}
                      </p>
                    )}
                    {selectedOrder.reviewedBy && (
                      <p className="text-xs text-green-600 font-medium">
                        Reviewed & approved by: {selectedOrder.reviewedBy} on {formatDateTime(selectedOrder.reviewedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* External Lab Info */}
              {selectedOrder.externalLab && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">External Lab</p>
                  <div className="p-3 bg-stone-50 rounded-lg">
                    <p className="text-sm">Sent to external lab for processing</p>
                    {selectedOrder.externalLabName && <p className="text-sm">Lab: {selectedOrder.externalLabName}</p>}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedOrder.resultFileUrls?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Attachments</p>
                  <div className="space-y-1">
                    {selectedOrder.resultFileUrls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline p-2 bg-stone-50 rounded-lg">
                        <FileText className="w-4 h-4" />
                        Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 pb-4">
                {selectedOrder.status === 'ordered' && (
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setIsDrawerOpen(false); handleCollectSample(selectedOrder); }}>
                    <Syringe className="w-4 h-4 mr-2" /> Collect Sample
                  </Button>
                )}
                {(selectedOrder.status === 'sample-collected' || selectedOrder.status === 'in-progress') && (
                  <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => { setIsDrawerOpen(false); handleEnterResult(selectedOrder); }}>
                    <FileText className="w-4 h-4 mr-2" /> Enter Result
                  </Button>
                )}
                {selectedOrder.status === 'ready-for-review' && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setIsDrawerOpen(false); handleApprove(selectedOrder); }}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve Report
                  </Button>
                )}
                {selectedOrder.status === 'completed' && (
                  <PDFDownloadLink
                    document={<LabReportPDF order={selectedOrder} patient={petMap.get(selectedOrder.patientId)} owner={userMap.get(selectedOrder.ownerId || petMap.get(selectedOrder.patientId)?.ownerUid)} />}
                    fileName={`LabReport_${selectedOrder.petName || 'Patient'}_${selectedOrder.testCode || 'Test'}.pdf`}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    {/* @ts-ignore */}
                    {({ loading }) => (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        {loading ? 'Generating PDF...' : 'Download PDF Report'}
                      </>
                    )}
                  </PDFDownloadLink>
                )}
                <Button variant="outline" size="sm" onClick={() => goToPatient(selectedOrder.patientId)}>
                  <User className="w-4 h-4 mr-2" /> View Patient
                </Button>
                <Button variant="outline" size="sm" onClick={goToBilling}>
                  <PhilippinePeso className="w-4 h-4 mr-2" /> Billing
                </Button>
                {selectedOrder.encounterId && (
                  <Button variant="outline" size="sm" onClick={() => goToEMR(selectedOrder.encounterId)}>
                    <Stethoscope className="w-4 h-4 mr-2" /> EMR
                  </Button>
                )}
                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setIsDrawerOpen(false); handleCancel(selectedOrder); }}>
                    <Ban className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* New Lab Order Dialog */}
      <Drawer open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <DrawerContent className="overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>New Lab Order</DrawerTitle>
            <DrawerDescription>Create a new diagnostic test order</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Patient *</Label>
              <Select value={newOrderForm.patientId} onValueChange={(v) => {
                const pet = petMap.get(v);
                setNewOrderForm({ ...newOrderForm, patientId: v, ownerId: pet?.ownerUid || '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Select pet" /></SelectTrigger>
                <SelectContent>
                  {pets.filter(Boolean).map(pet => (
                    <SelectItem key={pet.id} value={pet.id}>{pet.name} ({pet.species}) — {userMap.get(pet.ownerUid)?.displayName || 'Unknown'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Test Name *</Label>
              <Input value={newOrderForm.testName} onChange={(e) => setNewOrderForm({ ...newOrderForm, testName: e.target.value })} placeholder="e.g. CBC, X-Ray Hip, Fecal Exam" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Test Category</Label>
                <Select value={newOrderForm.testCategory} onValueChange={(v: any) => setNewOrderForm({ ...newOrderForm, testCategory: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laboratory">Laboratory</SelectItem>
                    <SelectItem value="Imaging">Imaging</SelectItem>
                    <SelectItem value="External Lab">External Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newOrderForm.priority} onValueChange={(v: any) => setNewOrderForm({ ...newOrderForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Routine">Routine</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="STAT">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reason / Indication</Label>
              <Textarea value={newOrderForm.reason} onChange={(e) => setNewOrderForm({ ...newOrderForm, reason: e.target.value })} placeholder="Why is this test being ordered?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sample Type</Label>
                <Select value={newOrderForm.sampleType} onValueChange={(v) => setNewOrderForm({ ...newOrderForm, sampleType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Blood">Blood</SelectItem>
                    <SelectItem value="Urine">Urine</SelectItem>
                    <SelectItem value="Fecal">Fecal</SelectItem>
                    <SelectItem value="Swab">Swab</SelectItem>
                    <SelectItem value="Tissue">Tissue</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Behavior</Label>
                <Select value={newOrderForm.billingBehavior} onValueChange={(v: any) => setNewOrderForm({ ...newOrderForm, billingBehavior: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="queue">Queue for Billing</SelectItem>
                    <SelectItem value="create-invoice-line">Create Invoice Line</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Additional Notes</Label>
              <Textarea value={newOrderForm.notes} onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsNewOrderOpen(false)}>Cancel</Button>
            <Button onClick={createNewOrder} disabled={saving || !newOrderForm.patientId || !newOrderForm.testName}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4 mr-2" /> Create Order</>}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Sample Collection Dialog */}
      <Drawer open={isSampleDialogOpen} onOpenChange={setIsSampleDialogOpen}>
        <DrawerContent className="">
          <DrawerHeader>
            <DrawerTitle>Record Sample Collection</DrawerTitle>
            <DrawerDescription>
              {selectedOrder?.petName} — {selectedOrder?.testName}
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Sample Type</Label>
              <Select value={sampleForm.sampleType} onValueChange={(v) => setSampleForm({ ...sampleForm, sampleType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Blood">Blood</SelectItem>
                  <SelectItem value="Urine">Urine</SelectItem>
                  <SelectItem value="Fecal">Fecal</SelectItem>
                  <SelectItem value="Swab">Swab</SelectItem>
                  <SelectItem value="Tissue">Tissue</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Collected By</Label>
              <Input value={sampleForm.collectedBy} onChange={(e) => setSampleForm({ ...sampleForm, collectedBy: e.target.value })} />
            </div>
            <div>
              <Label>Sample Condition</Label>
              <Select value={sampleForm.condition} onValueChange={(v) => setSampleForm({ ...sampleForm, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="insufficient">Insufficient</SelectItem>
                  <SelectItem value="contaminated">Contaminated</SelectItem>
                  <SelectItem value="mislabeled">Mislabeled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={sampleForm.notes} onChange={(e) => setSampleForm({ ...sampleForm, notes: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsSampleDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitSampleCollection} disabled={saving || !sampleForm.sampleType}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Syringe className="w-4 h-4 mr-2" /> Record Collection</>}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Result Entry Dialog */}
      <Drawer open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DrawerContent className="">
          <DrawerHeader>
            <DrawerTitle>Enter Test Result</DrawerTitle>
            <DrawerDescription>
              {selectedOrder?.petName} — {selectedOrder?.testName}
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Result Status</Label>
              <Select value={resultForm.resultStatus} onValueChange={(v: any) => setResultForm({ ...resultForm, resultStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="abnormal">Abnormal</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="inconclusive">Inconclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Findings</Label>
              <Textarea value={resultForm.findings} onChange={(e) => setResultForm({ ...resultForm, findings: e.target.value })} placeholder="Detailed findings and observed values" rows={4} />
            </div>
            <div>
              <Label>Interpretation</Label>
              <Textarea value={resultForm.interpretation} onChange={(e) => setResultForm({ ...resultForm, interpretation: e.target.value })} placeholder="Clinical interpretation of results" rows={3} />
            </div>
            {resultForm.resultStatus === 'critical' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Critical result will trigger an alert and require doctor acknowledgment.</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitResult} disabled={savingResult}>
              {savingResult ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><FileText className="w-4 h-4 mr-2" /> Submit Result</>}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
