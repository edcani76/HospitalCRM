import React, { useState, useEffect, useMemo } from 'react';
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
import { Plus, Eye, Loader2, MoreHorizontal, Pill, AlertTriangle, Package, TrendingUp, ClipboardList, ArrowDown, ArrowUp, Calendar, PhilippinePeso, FileText, Edit, Trash2 } from 'lucide-react';
import {
  fetchMedications, fetchInventoryBatches, fetchStockMovements, fetchAllPrescriptions,
  createMedication, updateMedication, deleteMedication,
  createInventoryBatch, updateInventoryBatch,
  createStockMovement,
  updatePrescription,
  addAuditLog
} from '../../lib/firestore-helpers';
import { clearCache } from '../../lib/offline-cache';
import { auth } from '../../firebase';
import { format, parseISO, isAfter, isBefore, addDays, startOfToday, isFuture } from 'date-fns';

type TabType = 'all' | 'prescriptions' | 'movements' | 'purchase-orders' | 'reports';

const MEDICATION_CATEGORIES = [
  'Antibiotic', 'Anti-inflammatory', 'Pain Relief', 'Vaccine', 'Dewormer',
  'Flea/Tick', 'Vitamin', 'Supplement', 'Antifungal', 'Antiparasitic',
  'Sedative', 'Eye/Ear', 'Skin/Topical', 'Dental', 'Other'
];

function getStockStatus(med: any): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (!med.stock || med.stock <= 0) return 'out_of_stock';
  if (med.stock <= (med.minStock || 0)) return 'low_stock';
  return 'in_stock';
}

function getExpiryStatus(batch: any): 'expired' | 'expiring_soon' | 'active' {
  if (!batch.expiryDate) return 'active';
  const expiry = parseISO(batch.expiryDate);
  const today = startOfToday();
  if (isBefore(expiry, today)) return 'expired';
  if (isBefore(expiry, addDays(today, 30))) return 'expiring_soon';
  return 'active';
}

export default function PharmacyPage() {
  const [medications, setMedications] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');

  // Detail drawer
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [selectedBatches, setSelectedBatches] = useState<any[]>([]);
  const [selectedMovements, setSelectedMovements] = useState<any[]>([]);

  // Add/Edit Medication dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [medForm, setMedForm] = useState({
    name: '', category: '', description: '', unit: 'pieces', price: 0, costPrice: 0, minStock: 0, reorderPoint: 0
  });
  const [saving, setSaving] = useState(false);

  // Stock Receiving dialog
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    batchNo: '', quantity: 1, costPrice: 0, sellingPrice: 0, expiryDate: '', manufacturingDate: '', receivedDate: format(new Date(), 'yyyy-MM-dd'), notes: ''
  });
  const [receiving, setReceiving] = useState(false);

  // Stock Adjustment dialog
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ type: 'adjustment' as 'adjustment' | 'dispensing' | 'return', quantity: 1, notes: '' });
  const [adjusting, setAdjusting] = useState(false);

  // Dispense dialog (from prescription queue)
  const [isDispenseDialogOpen, setIsDispenseDialogOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        await clearCache('medications').catch(() => {});
        await clearCache('inventory_batches').catch(() => {});
        await clearCache('stock_movements').catch(() => {});
        const [meds, batchData, moveData, rxData] = await Promise.all([
          fetchMedications(),
          fetchInventoryBatches(),
          fetchStockMovements(),
          fetchAllPrescriptions().catch(() => [])
        ]);
        setMedications(meds);
        setBatches(batchData);
        setMovements(moveData);
        setPrescriptions(rxData);
      } catch (error) {
        console.error('Error loading pharmacy data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // === Computed values ===

  const medicationMap = useMemo(() => {
    const map = new Map<string, any>();
    medications.forEach(m => map.set(m.id, m));
    return map;
  }, [medications]);

  const getStockStatusLabel = (med: any) => {
    const s = getStockStatus(med);
    switch (s) {
      case 'in_stock': return { label: 'In Stock', className: 'bg-green-100 text-green-700 border-green-200' };
      case 'low_stock': return { label: 'Low Stock', className: 'bg-orange-100 text-orange-700 border-orange-200' };
      case 'out_of_stock': return { label: 'Out of Stock', className: 'bg-red-100 text-red-700 border-red-200' };
    }
  };

  const getNearestExpiry = (medId: string) => {
    const medBatches = batches.filter(b => b.medicationId === medId);
    if (medBatches.length === 0) return null;
    const activeBatches = medBatches.filter(b => b.quantity > 0 && b.expiryDate);
    if (activeBatches.length === 0) return null;
    activeBatches.sort((a, b) => parseISO(a.expiryDate).getTime() - parseISO(b.expiryDate).getTime());
    return activeBatches[0];
  };

  const hasExpiredBatches = (medId: string) => {
    return batches.some(b => b.medicationId === medId && b.quantity > 0 && getExpiryStatus(b) === 'expired');
  };

  const getTotalStockValue = () => {
    return medications.reduce((sum, m) => sum + (m.stock || 0) * (m.costPrice || 0), 0);
  };

  const getTodayDispensed = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return movements
      .filter(m => {
        if (m.type !== 'dispensing') return false;
        const d = m.createdAt?.toDate ? format(m.createdAt.toDate(), 'yyyy-MM-dd') : m.createdAt?.split?.('T')?.[0] || '';
        return d === today;
      })
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
  };

  const getExpiringSoonCount = () => {
    const today = startOfToday();
    const thirtyDays = addDays(today, 30);
    const seen = new Set<string>();
    batches.forEach(b => {
      if (!b.expiryDate || b.quantity <= 0) return;
      const expiry = parseISO(b.expiryDate);
      if (isAfter(expiry, today) && isBefore(expiry, thirtyDays)) {
        seen.add(b.medicationId);
      }
    });
    return seen.size;
  };

  const pendingPrescriptions = prescriptions.filter(rx => rx.status === 'pending');

  // === Filtered data ===

  const filteredMedications = useMemo(() => {
    let list = medications;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      list = list.filter(m => m.category === categoryFilter);
    }

    if (stockFilter !== 'all') {
      if (stockFilter === 'in_stock') list = list.filter(m => getStockStatus(m) === 'in_stock');
      else if (stockFilter === 'low_stock') list = list.filter(m => getStockStatus(m) === 'low_stock');
      else if (stockFilter === 'out_of_stock') list = list.filter(m => getStockStatus(m) === 'out_of_stock');
      else if (stockFilter === 'expired') list = list.filter(m => hasExpiredBatches(m.id));
    }

    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [medications, searchQuery, categoryFilter, stockFilter]);

  const filteredMovements = useMemo(() => {
    let list = movements;
    if (movementTypeFilter !== 'all') {
      list = list.filter(m => m.type === movementTypeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.medicationName?.toLowerCase().includes(q) ||
        m.batchNo?.toLowerCase().includes(q) ||
        m.reference?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [movements, movementTypeFilter, searchQuery]);

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All Medications', count: medications.length },
    { key: 'prescriptions', label: 'Prescription Queue', count: pendingPrescriptions.length },
    { key: 'movements', label: 'Stock Movements', count: movements.length },
    { key: 'purchase-orders', label: 'Purchase Orders', count: 0 },
    { key: 'reports', label: 'Inventory Reports', count: 0 },
  ];

  const lowStockCount = medications.filter(m => getStockStatus(m) === 'low_stock').length;
  const outOfStockCount = medications.filter(m => getStockStatus(m) === 'out_of_stock').length;

  // === Event handlers ===

  const handleView = async (med: any) => {
    setSelectedMedication(med);
    const medBatches = batches.filter(b => b.medicationId === med.id);
    const medMovements = movements.filter(m => m.medicationId === med.id);
    setSelectedBatches(medBatches);
    setSelectedMovements(medMovements);
    setIsViewDrawerOpen(true);
  };

  const resetMedForm = () => {
    setMedForm({ name: '', category: '', description: '', unit: 'pieces', price: 0, costPrice: 0, minStock: 0, reorderPoint: 0 });
  };

  const handleAddMedication = async () => {
    if (!medForm.name.trim()) { alert('Medication name is required.'); return; }
    setSaving(true);
    try {
      const newMed = await createMedication({
        ...medForm,
        category: medForm.category || 'Other',
      });
      setMedications(prev => [...prev, { ...newMed, stock: 0 }]);
      addAuditLog({ action: 'medication_added', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || undefined, details: `Added medication: ${medForm.name}` });
      setIsAddDialogOpen(false);
      resetMedForm();
    } catch (err) {
      console.error('Error adding medication:', err);
      alert('Failed to add medication.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditMedication = async () => {
    if (!selectedMedication || !medForm.name.trim()) { alert('Medication name is required.'); return; }
    setSaving(true);
    try {
      await updateMedication(selectedMedication.id, medForm);
      setMedications(prev => prev.map(m => m.id === selectedMedication.id ? { ...m, ...medForm } : m));
      setSelectedMedication({ ...selectedMedication, ...medForm });
      addAuditLog({ action: 'medication_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || undefined, details: `Updated medication: ${medForm.name}` });
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Error updating medication:', err);
      alert('Failed to update medication.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedication = async (med: any) => {
    if (!window.confirm(`Delete "${med.name}"? This cannot be undone.`)) return;
    try {
      await deleteMedication(med.id);
      setMedications(prev => prev.filter(m => m.id !== med.id));
      addAuditLog({ action: 'medication_deleted', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || undefined, details: `Deleted medication: ${med.name}` });
      if (selectedMedication?.id === med.id) {
        setIsViewDrawerOpen(false);
        setSelectedMedication(null);
      }
    } catch (err) {
      console.error('Error deleting medication:', err);
      alert('Failed to delete medication.');
    }
  };

  const openEdit = (med: any) => {
    setMedForm({
      name: med.name || '',
      category: med.category || '',
      description: med.description || '',
      unit: med.unit || 'pieces',
      price: med.price || 0,
      costPrice: med.costPrice || 0,
      minStock: med.minStock || 0,
      reorderPoint: med.reorderPoint || 0
    });
    setSelectedMedication(med);
    setIsEditDialogOpen(true);
  };

  const openReceive = (med: any) => {
    setSelectedMedication(med);
    setReceiveForm({
      batchNo: `BATCH-${Date.now().toString(36).toUpperCase()}`,
      quantity: 1,
      costPrice: med.costPrice || 0,
      sellingPrice: med.price || 0,
      expiryDate: '',
      manufacturingDate: '',
      receivedDate: format(new Date(), 'yyyy-MM-dd'),
      notes: ''
    });
    setIsReceiveDialogOpen(true);
  };

  const handleReceiveStock = async () => {
    if (!selectedMedication || !receiveForm.batchNo.trim() || !receiveForm.expiryDate) {
      alert('Batch number and expiry date are required.');
      return;
    }
    if (receiveForm.quantity <= 0) { alert('Quantity must be positive.'); return; }
    setReceiving(true);
    try {
      const batch = await createInventoryBatch({
        medicationId: selectedMedication.id,
        batchNo: receiveForm.batchNo,
        quantity: receiveForm.quantity,
        originalQuantity: receiveForm.quantity,
        costPrice: receiveForm.costPrice,
        sellingPrice: receiveForm.sellingPrice || selectedMedication.price || 0,
        expiryDate: receiveForm.expiryDate,
        manufacturingDate: receiveForm.manufacturingDate || '',
        receivedDate: receiveForm.receivedDate,
        status: 'active'
      });
      setBatches(prev => [...prev, batch]);

      const newStock = (selectedMedication.stock || 0) + receiveForm.quantity;
      await updateMedication(selectedMedication.id, { stock: newStock, price: receiveForm.sellingPrice || selectedMedication.price, costPrice: receiveForm.costPrice });
      setMedications(prev => prev.map(m => m.id === selectedMedication.id ? { ...m, stock: newStock, price: receiveForm.sellingPrice || m.price, costPrice: receiveForm.costPrice } : m));

      const movement = await createStockMovement({
        medicationId: selectedMedication.id,
        medicationName: selectedMedication.name,
        batchId: batch.id,
        batchNo: receiveForm.batchNo,
        type: 'receiving',
        quantity: receiveForm.quantity,
        runningBalance: newStock,
        reference: `REC-${receiveForm.batchNo}`,
        notes: receiveForm.notes || `Received ${receiveForm.quantity} units`,
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown'
      });
      setMovements(prev => [movement, ...prev]);

      addAuditLog({ action: 'stock_received', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || undefined, details: `Received ${receiveForm.quantity} x ${selectedMedication.name} (Batch: ${receiveForm.batchNo})` });
      setIsReceiveDialogOpen(false);
      setSelectedMedication(null);
    } catch (err) {
      console.error('Error receiving stock:', err);
      alert('Failed to receive stock.');
    } finally {
      setReceiving(false);
    }
  };

  const openAdjust = (med: any) => {
    setSelectedMedication(med);
    setAdjustForm({ type: 'adjustment', quantity: 1, notes: '' });
    setIsAdjustDialogOpen(true);
  };

  const handleAdjustStock = async () => {
    if (!selectedMedication) return;
    if (adjustForm.quantity === 0) { alert('Quantity cannot be zero.'); return; }
    if (adjustForm.type === 'dispensing' && adjustForm.quantity > (selectedMedication.stock || 0)) {
      alert('Cannot dispense more than current stock.');
      return;
    }
    setAdjusting(true);
    try {
      const qty = adjustForm.type === 'dispensing' ? -Math.abs(adjustForm.quantity) : (adjustForm.type === 'return' ? Math.abs(adjustForm.quantity) : adjustForm.quantity);
      const newStock = (selectedMedication.stock || 0) + qty;
      await updateMedication(selectedMedication.id, { stock: Math.max(0, newStock) });
      setMedications(prev => prev.map(m => m.id === selectedMedication.id ? { ...m, stock: Math.max(0, newStock) } : m));

      const movement = await createStockMovement({
        medicationId: selectedMedication.id,
        medicationName: selectedMedication.name,
        type: adjustForm.type,
        quantity: qty,
        runningBalance: Math.max(0, newStock),
        reference: `${adjustForm.type.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
        notes: adjustForm.notes,
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown'
      });
      setMovements(prev => [movement, ...prev]);

      addAuditLog({ action: adjustForm.type === 'dispensing' ? 'medication_dispensed' : 'stock_adjusted', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || undefined, details: `${adjustForm.type}: ${qty > 0 ? '+' : ''}${qty} x ${selectedMedication.name} — ${adjustForm.notes || 'No notes'}` });
      setIsAdjustDialogOpen(false);
      setSelectedMedication(null);
    } catch (err) {
      console.error('Error adjusting stock:', err);
      alert('Failed to adjust stock.');
    } finally {
      setAdjusting(false);
    }
  };

  const handleDispensePrescription = (rx: any) => {
    setSelectedPrescription(rx);
    setAdjustForm({ type: 'dispensing', quantity: 1, notes: '' });
    setIsDispenseDialogOpen(true);
  };

  const submitDispense = async () => {
    if (!selectedPrescription) return;
    const med = medications.find(m => m.name === selectedPrescription.items?.[0]?.medicationName);
    if (!med) { alert('Medication not found in inventory.'); return; }
    setSelectedMedication(med);
    setIsDispenseDialogOpen(false);
    openAdjust(med);
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'receiving': return <ArrowDown className="w-4 h-4 text-green-600" />;
      case 'dispensing': return <ArrowUp className="w-4 h-4 text-blue-600" />;
      case 'adjustment': return <Edit className="w-4 h-4 text-orange-600" />;
      case 'return': return <ArrowDown className="w-4 h-4 text-purple-600" />;
      case 'expired': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'receiving': return <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">Received</Badge>;
      case 'dispensing': return <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">Dispensed</Badge>;
      case 'adjustment': return <Badge variant="outline" className="text-orange-700 border-orange-200 bg-orange-50">Adjusted</Badge>;
      case 'return': return <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">Returned</Badge>;
      case 'expired': return <Badge variant="destructive">Expired</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getMovementDate = (m: any) => {
    if (m.createdAt?.toDate) return format(m.createdAt.toDate(), 'MMM dd, yyyy hh:mm a');
    if (typeof m.createdAt === 'string') return format(parseISO(m.createdAt), 'MMM dd, yyyy hh:mm a');
    return '—';
  };

  const getMedicationBatches = (medId: string) => {
    return batches.filter(b => b.medicationId === medId && b.quantity > 0);
  };

  const getFormattedDate = (d: any) => {
    if (!d) return '—';
    if (d.toDate) return format(d.toDate(), 'MMM dd, yyyy');
    if (typeof d === 'string') return format(parseISO(d), 'MMM dd, yyyy');
    return '—';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Sticky Header Section */}
          <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-4 pb-4 -mt-4 px-4 -mx-4 md:pt-6 md:-mt-6 md:px-6 md:-mx-6 lg:pt-8 lg:-mt-8 lg:px-8 lg:-mx-8 border-b border-gray-200/50 mb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold">Pharmacy</h1>
                <p className="text-muted-foreground">Manage medications, inventory batches, prescriptions, and dispensing.</p>
              </div>
              <div className="flex gap-2">
                <Drawer open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <Button 
                    onClick={() => { resetMedForm(); setIsAddDialogOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-6 h-12 rounded-xl font-bold"
                  >
                    <Plus className="w-5 h-5 mr-2" /> Add Medication
                  </Button>
                  <DrawerContent className="">
                    <DrawerHeader><DrawerTitle>Add New Medication</DrawerTitle><DrawerDescription className="sr-only">Fill in medication details</DrawerDescription></DrawerHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label>Medication Name *</Label>
                          <Input value={medForm.name} onChange={e => setMedForm({ ...medForm, name: e.target.value })} placeholder="e.g. Amoxicillin 500mg" />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Select value={medForm.category} onValueChange={v => setMedForm({ ...medForm, category: v })}>
                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>
                              {MEDICATION_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Unit</Label>
                          <Select value={medForm.unit} onValueChange={v => setMedForm({ ...medForm, unit: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pieces">Pieces</SelectItem>
                              <SelectItem value="tablets">Tablets</SelectItem>
                              <SelectItem value="capsules">Capsules</SelectItem>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="mg">mg</SelectItem>
                              <SelectItem value="vial">Vial</SelectItem>
                              <SelectItem value="tube">Tube</SelectItem>
                              <SelectItem value="bottle">Bottle</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Selling Price (₱)</Label>
                          <Input type="number" value={medForm.price || ''} onChange={e => setMedForm({ ...medForm, price: parseFloat(e.target.value) || 0 })} min={0} />
                        </div>
                        <div>
                          <Label>Cost Price (₱)</Label>
                          <Input type="number" value={medForm.costPrice || ''} onChange={e => setMedForm({ ...medForm, costPrice: parseFloat(e.target.value) || 0 })} min={0} />
                        </div>
                        <div>
                          <Label>Low Stock Alert (Min Stock)</Label>
                          <Input type="number" value={medForm.minStock || ''} onChange={e => setMedForm({ ...medForm, minStock: parseInt(e.target.value) || 0 })} min={0} />
                        </div>
                        <div>
                          <Label>Reorder Point</Label>
                          <Input type="number" value={medForm.reorderPoint || ''} onChange={e => setMedForm({ ...medForm, reorderPoint: parseInt(e.target.value) || 0 })} min={0} />
                        </div>
                        <div className="col-span-2">
                          <Label>Description</Label>
                          <Textarea value={medForm.description} onChange={e => setMedForm({ ...medForm, description: e.target.value })} placeholder="Optional description, usage notes..." />
                        </div>
                      </div>
                      <Button onClick={handleAddMedication} className="w-full" disabled={saving}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : 'Add Medication'}
                      </Button>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('all')}>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Products</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{medications.length}</p>
                  <p className="text-xs text-muted-foreground">{filteredMedications.length} active items</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setActiveTab('all'); setStockFilter('low_stock'); }}>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Low Stock Items</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-orange-600">{lowStockCount}</p>
                  <p className="text-xs text-muted-foreground">{outOfStockCount} out of stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Expiring Soon</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-red-600">{getExpiringSoonCount()}</p>
                  <p className="text-xs text-muted-foreground">Items expiring in 30 days</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('prescriptions')}>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Prescriptions Pending</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-blue-600">{pendingPrescriptions.length}</p>
                  <p className="text-xs text-muted-foreground">Awaiting dispensing</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Today's Dispensed</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-emerald-600">{getTodayDispensed()}</p>
                  <p className="text-xs text-muted-foreground">Units dispensed today</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Inventory Value</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">₱{getTotalStockValue().toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">At cost price</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-2 border-b overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSearchQuery(''); setCategoryFilter('all'); setStockFilter('all'); }}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'all' && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="flex-1">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search medications by name, category..."
                    color="emerald"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {MEDICATION_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Stock Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="expired">Has Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* ==================== ALL MEDICATIONS TAB ==================== */}
          {activeTab === 'all' && (
            <>
              {/* Medication Table */}
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMedications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <Pill className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No medications found</p>
                            <p className="text-sm">Add a medication or adjust your filters.</p>
                            <Button variant="outline" size="sm" className="mt-3" onClick={() => { resetMedForm(); setIsAddDialogOpen(true); }}>
                              <Plus className="w-4 h-4 mr-2" /> Add Medication
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMedications.map((med) => {
                          const status = getStockStatus(med);
                          const statusInfo = getStockStatusLabel(med);
                          const nearestBatch = getNearestExpiry(med.id);
                          const expiryStatus = nearestBatch ? getExpiryStatus(nearestBatch) : null;
                          return (
                            <TableRow key={med.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleView(med)}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{med.name}</p>
                                  <p className="text-xs text-muted-foreground">{med.unit || 'pieces'}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{med.category || '—'}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                <span className={status === 'low_stock' ? 'text-orange-600' : status === 'out_of_stock' ? 'text-red-600' : ''}>
                                  {med.stock || 0}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-mono text-sm">₱{(med.price || 0).toLocaleString()}</span>
                              </TableCell>
                              <TableCell>
                                {nearestBatch ? (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span className={`text-xs ${expiryStatus === 'expired' ? 'text-red-600' : expiryStatus === 'expiring_soon' ? 'text-orange-600' : ''}`}>
                                      {nearestBatch.expiryDate ? format(parseISO(nearestBatch.expiryDate), 'MMM dd, yyyy') : '—'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {hasExpiredBatches(med.id) ? (
                                  <Badge variant="destructive" className="text-xs">Has Expired</Badge>
                                ) : (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}>
                                    {statusInfo.label}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handleView(med)} title="View">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openReceive(med)}>
                                        <Package className="w-4 h-4 mr-2" /> Receive Stock
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openAdjust(med)}>
                                        <Edit className="w-4 h-4 mr-2" /> Adjust Stock
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEdit(med)}>
                                        <Edit className="w-4 h-4 mr-2" /> Edit Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDeleteMedication(med)} className="text-red-600">
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                      </DropdownMenuItem>
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
                </CardContent>
              </Card>
            </>
          )}

          {/* ==================== PRESCRIPTION QUEUE TAB ==================== */}
          {activeTab === 'prescriptions' && (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Pet</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No prescriptions yet</p>
                          <p className="text-sm">Prescriptions from encounters will appear here.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      prescriptions.map((rx: any) => (
                        <TableRow key={rx.id}>
                          <TableCell className="text-xs">{getFormattedDate(rx.createdAt)}</TableCell>
                          <TableCell className="font-medium">{rx.petName || '—'}</TableCell>
                          <TableCell className="text-sm">{rx.doctorName || '—'}</TableCell>
                          <TableCell>
                            {rx.items?.map((item: any, i: number) => (
                              <div key={i} className="text-sm">{item.medicationName}</div>
                            )) || '—'}
                          </TableCell>
                          <TableCell>
                            {rx.items?.map((item: any, i: number) => (
                              <div key={i} className="text-xs text-muted-foreground">{item.dosage} {item.frequency}</div>
                            )) || '—'}
                          </TableCell>
                          <TableCell>
                            {rx.status === 'pending' ? (
                              <Badge className="bg-yellow-500 text-white">Pending</Badge>
                            ) : rx.status === 'dispensed' ? (
                              <Badge variant="success">Dispensed</Badge>
                            ) : (
                              <Badge variant="secondary">Cancelled</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {rx.status === 'pending' && (
                              <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleDispensePrescription(rx)}>
                                <Package className="w-3 h-3 mr-1" /> Dispense
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ==================== STOCK MOVEMENTS TAB ==================== */}
          {activeTab === 'movements' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search movements..."
                    color="emerald"
                  />
                </div>
                <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="receiving">Received</SelectItem>
                    <SelectItem value="dispensing">Dispensed</SelectItem>
                    <SelectItem value="adjustment">Adjusted</SelectItem>
                    <SelectItem value="return">Returned</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Medication</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No stock movements recorded</p>
                            <p className="text-sm">Movements will appear when stock is received or dispensed.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMovements.map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs">{getMovementDate(m)}</TableCell>
                            <TableCell>{getMovementLabel(m.type)}</TableCell>
                            <TableCell className="font-medium text-sm">{m.medicationName || medicationMap.get(m.medicationId)?.name || '—'}</TableCell>
                            <TableCell className="text-xs font-mono">{m.batchNo || '—'}</TableCell>
                            <TableCell className={`text-right font-mono font-medium ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {m.quantity > 0 ? '+' : ''}{m.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{m.runningBalance ?? '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{m.reference || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{m.userName || '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ==================== PURCHASE ORDERS TAB (placeholder) ==================== */}
          {activeTab === 'purchase-orders' && (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <h3 className="text-lg font-medium mb-1">Purchase Orders</h3>
                <p className="text-sm">Purchase order management coming soon.</p>
              </CardContent>
            </Card>
          )}

          {/* ==================== REPORTS TAB (placeholder) ==================== */}
          {activeTab === 'reports' && (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <h3 className="text-lg font-medium mb-1">Inventory Reports</h3>
                <p className="text-sm">Reports and analytics coming soon.</p>
              </CardContent>
            </Card>
          )}

          {/* ==================== DETAIL SIDE DRAWER ==================== */}
          <Drawer open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
            <DrawerContent className="overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>
                  {selectedMedication ? selectedMedication.name : ''}
                </DrawerTitle>
                <DrawerDescription className="sr-only">Medication details and inventory information</DrawerDescription>
              </DrawerHeader>
              {selectedMedication && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="font-medium">{selectedMedication.category || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unit</p>
                      <p className="font-medium">{selectedMedication.unit || 'pieces'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Stock</p>
                      <p className={`font-bold text-lg ${getStockStatus(selectedMedication) === 'low_stock' ? 'text-orange-600' : getStockStatus(selectedMedication) === 'out_of_stock' ? 'text-red-600' : ''}`}>
                        {selectedMedication.stock || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <div>{(() => {
                        const info = getStockStatusLabel(selectedMedication);
                        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${info.className}`}>{info.label}</span>;
                      })()}</div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Selling Price</p>
                      <p className="font-medium">₱{(selectedMedication.price || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cost Price</p>
                      <p className="font-medium">₱{(selectedMedication.costPrice || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Min Stock</p>
                      <p className="font-medium">{selectedMedication.minStock || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reorder Point</p>
                      <p className="font-medium">{selectedMedication.reorderPoint || 0}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedMedication.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{selectedMedication.description}</p>
                    </div>
                  )}

                  {/* Batches */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">Inventory Batches</p>
                      <Button variant="outline" size="sm" onClick={() => { setIsViewDrawerOpen(false); openReceive(selectedMedication); }}>
                        <Plus className="w-3 h-3 mr-1" /> Add Batch
                      </Button>
                    </div>
                    {selectedBatches.filter(b => b.quantity > 0).length > 0 ? (
                      <div className="space-y-2">
                        {selectedBatches.filter(b => b.quantity > 0).map((batch: any) => {
                          const expiryStatus = getExpiryStatus(batch);
                          return (
                            <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                              <div className="space-y-1">
                                <p className="font-mono text-xs font-medium">{batch.batchNo}</p>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span>Qty: <strong>{batch.quantity}</strong></span>
                                  <span>Cost: <strong>₱{(batch.costPrice || 0).toLocaleString()}</strong></span>
                                  <span>Sell: <strong>₱{(batch.sellingPrice || 0).toLocaleString()}</strong></span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-xs">
                                  <Calendar className="w-3 h-3" />
                                  <span className={
                                    expiryStatus === 'expired' ? 'text-red-600 font-medium' :
                                    expiryStatus === 'expiring_soon' ? 'text-orange-600 font-medium' : ''
                                  }>
                                    {batch.expiryDate ? format(parseISO(batch.expiryDate), 'MMM dd, yyyy') : '—'}
                                  </span>
                                </div>
                                {expiryStatus === 'expired' && <Badge variant="destructive" className="text-xs mt-1">Expired</Badge>}
                                {expiryStatus === 'expiring_soon' && <Badge variant="warning" className="text-xs mt-1">Expiring Soon</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg">
                        <Package className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <p>No active batches</p>
                        <p className="text-xs">Receive stock to create batches.</p>
                      </div>
                    )}
                  </div>

                  {/* Stock Movement Timeline */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Recent Movements</p>
                    {selectedMovements.length > 0 ? (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {selectedMovements.slice(0, 10).map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-2">
                              {getMovementIcon(m.type)}
                              <span className="font-medium">{medicationMap.get(m.medicationId)?.name || m.medicationName || '—'}</span>
                              <span className={m.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                {m.quantity > 0 ? '+' : ''}{m.quantity}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span>{m.reference || '—'}</span>
                              <span>{getMovementDate(m)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No movements recorded.</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => { setIsViewDrawerOpen(false); openReceive(selectedMedication); }}>
                      <Package className="w-4 h-4 mr-2" /> Receive Stock
                    </Button>
                    <Button variant="outline" onClick={() => { setIsViewDrawerOpen(false); openAdjust(selectedMedication); }}>
                      <Edit className="w-4 h-4 mr-2" /> Adjust Stock
                    </Button>
                    <Button variant="outline" onClick={() => { setIsViewDrawerOpen(false); openEdit(selectedMedication); }}>
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                  </div>
                </div>
              )}
            </DrawerContent>
          </Drawer>

          {/* ==================== EDIT MEDICATION DIALOG ==================== */}
          <Drawer open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DrawerContent className="">
              <DrawerHeader><DrawerTitle>Edit Medication</DrawerTitle><DrawerDescription className="sr-only">Edit medication details</DrawerDescription></DrawerHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Medication Name</Label>
                    <Input value={medForm.name} onChange={e => setMedForm({ ...medForm, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={medForm.category} onValueChange={v => setMedForm({ ...medForm, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MEDICATION_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={medForm.unit} onValueChange={v => setMedForm({ ...medForm, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pieces">Pieces</SelectItem>
                        <SelectItem value="tablets">Tablets</SelectItem>
                        <SelectItem value="capsules">Capsules</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="mg">mg</SelectItem>
                        <SelectItem value="vial">Vial</SelectItem>
                        <SelectItem value="tube">Tube</SelectItem>
                        <SelectItem value="bottle">Bottle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Selling Price (₱)</Label>
                    <Input type="number" value={medForm.price || ''} onChange={e => setMedForm({ ...medForm, price: parseFloat(e.target.value) || 0 })} min={0} />
                  </div>
                  <div>
                    <Label>Cost Price (₱)</Label>
                    <Input type="number" value={medForm.costPrice || ''} onChange={e => setMedForm({ ...medForm, costPrice: parseFloat(e.target.value) || 0 })} min={0} />
                  </div>
                  <div>
                    <Label>Min Stock</Label>
                    <Input type="number" value={medForm.minStock || ''} onChange={e => setMedForm({ ...medForm, minStock: parseInt(e.target.value) || 0 })} min={0} />
                  </div>
                  <div>
                    <Label>Reorder Point</Label>
                    <Input type="number" value={medForm.reorderPoint || ''} onChange={e => setMedForm({ ...medForm, reorderPoint: parseInt(e.target.value) || 0 })} min={0} />
                  </div>
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Textarea value={medForm.description} onChange={e => setMedForm({ ...medForm, description: e.target.value })} />
                  </div>
                </div>
                <Button onClick={handleEditMedication} className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
                </Button>
              </div>
            </DrawerContent>
          </Drawer>

          {/* ==================== STOCK RECEIVING DIALOG ==================== */}
          <Drawer open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
            <DrawerContent className="">
              <DrawerHeader>
                <DrawerTitle>Receive Stock</DrawerTitle>
                <DrawerDescription>
                  {selectedMedication ? `Adding inventory for ${selectedMedication.name}` : ''}
                </DrawerDescription>
              </DrawerHeader>
              {selectedMedication && (
                <div className="space-y-4 py-2">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Current Stock</span>
                      <span className="font-bold">{selectedMedication.stock || 0} {selectedMedication.unit || 'units'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>New Total</span>
                      <span className="font-bold text-green-600">{(selectedMedication.stock || 0) + receiveForm.quantity} {selectedMedication.unit || 'units'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Batch Number *</Label>
                      <Input value={receiveForm.batchNo} onChange={e => setReceiveForm({ ...receiveForm, batchNo: e.target.value })} />
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input type="number" value={receiveForm.quantity} onChange={e => setReceiveForm({ ...receiveForm, quantity: parseInt(e.target.value) || 0 })} min={1} />
                    </div>
                    <div>
                      <Label>Received Date</Label>
                      <Input type="date" value={receiveForm.receivedDate} onChange={e => setReceiveForm({ ...receiveForm, receivedDate: e.target.value })} />
                    </div>
                    <div>
                      <Label>Expiry Date *</Label>
                      <Input type="date" value={receiveForm.expiryDate} onChange={e => setReceiveForm({ ...receiveForm, expiryDate: e.target.value })} />
                    </div>
                    <div>
                      <Label>Manufacturing Date</Label>
                      <Input type="date" value={receiveForm.manufacturingDate} onChange={e => setReceiveForm({ ...receiveForm, manufacturingDate: e.target.value })} />
                    </div>
                    <div>
                      <Label>Cost Price (per unit)</Label>
                      <Input type="number" value={receiveForm.costPrice || ''} onChange={e => setReceiveForm({ ...receiveForm, costPrice: parseFloat(e.target.value) || 0 })} min={0} />
                    </div>
                    <div>
                      <Label>Selling Price (per unit)</Label>
                      <Input type="number" value={receiveForm.sellingPrice || ''} onChange={e => setReceiveForm({ ...receiveForm, sellingPrice: parseFloat(e.target.value) || 0 })} min={0} />
                    </div>
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea value={receiveForm.notes} onChange={e => setReceiveForm({ ...receiveForm, notes: e.target.value })} placeholder="Supplier, invoice reference, etc." />
                  </div>
                  <Button onClick={handleReceiveStock} className="w-full" disabled={receiving || !receiveForm.expiryDate || !receiveForm.batchNo}>
                    {receiving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Receive Stock'}
                  </Button>
                </div>
              )}
            </DrawerContent>
          </Drawer>

          {/* ==================== STOCK ADJUSTMENT DIALOG ==================== */}
          <Drawer open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
            <DrawerContent className="">
              <DrawerHeader>
                <DrawerTitle>Adjust Stock</DrawerTitle>
                <DrawerDescription>
                  {selectedMedication ? `Adjusting inventory for ${selectedMedication.name}` : ''}
                </DrawerDescription>
              </DrawerHeader>
              {selectedMedication && (
                <div className="space-y-4 py-2">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Current Stock</span>
                      <span className="font-bold">{selectedMedication.stock || 0} {selectedMedication.unit || 'units'}</span>
                    </div>
                  </div>

                  <div>
                    <Label>Type</Label>
                    <Select value={adjustForm.type} onValueChange={v => setAdjustForm({ ...adjustForm, type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adjustment">Adjustment (+/-)</SelectItem>
                        <SelectItem value="dispensing">Dispensing (-)</SelectItem>
                        <SelectItem value="return">Return (+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" value={adjustForm.quantity || ''} onChange={e => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value) || 0 })} min={0} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {adjustForm.type === 'dispensing' ? 'Quantity will be subtracted from stock' :
                       adjustForm.type === 'return' ? 'Quantity will be added to stock' :
                       'Use positive to add, negative to subtract'}
                    </p>
                  </div>
                  <div>
                    <Label>Notes / Reason</Label>
                    <Textarea value={adjustForm.notes} onChange={e => setAdjustForm({ ...adjustForm, notes: e.target.value })} placeholder="Reason for adjustment..." />
                  </div>
                  <Button onClick={handleAdjustStock} className="w-full" disabled={adjusting || adjustForm.quantity === 0}>
                    {adjusting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Apply Adjustment'}
                  </Button>
                </div>
              )}
            </DrawerContent>
          </Drawer>

          {/* ==================== DISPENSE FROM PRESCRIPTION DIALOG ==================== */}
          <Drawer open={isDispenseDialogOpen} onOpenChange={setIsDispenseDialogOpen}>
            <DrawerContent className="">
              <DrawerHeader>
                <DrawerTitle>Dispense Prescription</DrawerTitle>
                <DrawerDescription>
                  {selectedPrescription?.petName ? `For: ${selectedPrescription.petName}` : ''}
                </DrawerDescription>
              </DrawerHeader>
              {selectedPrescription && (
                <div className="space-y-4 py-2">
                  <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                    {selectedPrescription.items?.map((item: any, i: number) => {
                      const med = medications.find(m => m.name === item.medicationName);
                      return (
                        <div key={i} className="flex justify-between text-sm">
                          <div>
                            <p className="font-medium">{item.medicationName}</p>
                            <p className="text-xs text-muted-foreground">{item.dosage} — {item.frequency} — {item.duration}</p>
                            {item.instructions && <p className="text-xs text-muted-foreground italic">{item.instructions}</p>}
                          </div>
                          <div className="text-right">
                            <p>Qty: {item.quantity}</p>
                            <p className={`text-xs ${!med || med.stock < item.quantity ? 'text-red-600' : 'text-green-600'}`}>
                              {med ? `Stock: ${med.stock}` : 'Not in inventory'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea value={adjustForm.notes} onChange={e => setAdjustForm({ ...adjustForm, notes: e.target.value })} placeholder="Dispensing notes..." />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={submitDispense}
                    >
                      <Package className="w-4 h-4 mr-2" /> Proceed to Dispense
                    </Button>
                    <Button variant="outline" onClick={() => setIsDispenseDialogOpen(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </DrawerContent>
          </Drawer>
        </>
      )}
    </div>
  );
}