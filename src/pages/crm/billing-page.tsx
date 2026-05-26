import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { AddButton } from '../../components/ui/AddButton';
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
import { Plus, Eye, FileText, X, Loader2, Search, Printer, MoreHorizontal, PhilippinePeso, Download, Send, Ban, RotateCcw } from 'lucide-react';
import { fetchInvoices, fetchPets, fetchUsers, fetchInvoiceItems, fetchPayments, fetchEncounterById, recordPayment, addAuditLog } from '../../lib/firestore-helpers';
import { clearCache } from '../../lib/offline-cache';
import { sendEmail } from '../../lib/email-service';
import { invoiceReceipt } from '../../lib/email-templates';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc, db, auth } from '../../firebase';
import { format, isPast, parseISO } from 'date-fns';
import { InvoicePDF } from '../../components/invoice-pdf';
import { pdf } from '@react-pdf/renderer';

type TabType = 'all' | 'unpaid' | 'partial' | 'paid' | 'overdue' | 'pending';

export default function BillingPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);

  // Pay form
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Add invoice form
  const [formData, setFormData] = useState({
    petId: '', clientUid: '', description: '', amount: 0, status: 'active', dueDate: '',
  });
  const [formItems, setFormItems] = useState<{ name: string; qty: number; price: number }[]>([
    { name: '', qty: 1, price: 0 }
  ]);

  const addFormItem = () => setFormItems([...formItems, { name: '', qty: 1, price: 0 }]);
  const removeFormItem = (idx: number) => setFormItems(formItems.filter((_, i) => i !== idx));
  const updateFormItem = (idx: number, field: string, value: any) => {
    const next = [...formItems];
    (next[idx] as any)[field] = field === 'name' ? value : parseFloat(value) || 0;
    setFormItems(next);
  };
  const formTotal = formItems.reduce((s, i) => s + i.qty * i.price, 0);

  useEffect(() => {
    async function loadData() {
      try {
        await clearCache('invoices').catch(() => {});
        const [invoicesData, petsData, usersData] = await Promise.all([
          fetchInvoices(),
          fetchPets(),
          fetchUsers()
        ]);
        setBills(invoicesData);
        setPets((petsData || []).filter(Boolean));
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Resolve owner name from pet
  const getOwnerName = (bill: any) => {
    if (bill.ownerName) return bill.ownerName;
    const pet = pets.find(p => p.id === bill.petId || p.id === bill.patientId);
    if (!pet?.ownerUid) return bill.clientUid || '—';
    const user = users.find(u => u.uid === pet.ownerUid || u.id === pet.ownerUid);
    return user?.displayName || user?.name || pet.ownerUid;
  };

  // Get computed amounts (handle both old and new invoice formats)
  const getTotal = (b: any) => b.grandTotal ?? b.amount ?? 0;
  const getPaid = (b: any) => b.amountPaid ?? 0;
  const getBalance = (b: any) => b.balanceDue ?? (getTotal(b) - getPaid(b));
  const getStatus = (b: any) => {
    const s = b.status?.toLowerCase() || 'active';
    if (s === 'draft') return 'draft';
    if (s === 'paid') return 'paid';
    if (s === 'partially-paid' || s === 'partial') return 'partial';
    const bal = getBalance(b);
    if (bal <= 0) return 'paid';
    if (b.amountPaid && b.amountPaid > 0) return 'partial';
    const due = b.dueDate?.toDate ? b.dueDate.toDate().toISOString() : b.dueDate;
    if (due && typeof due === 'string' && isPast(parseISO(due)) && bal > 0) return 'overdue';
    if (bal >= getTotal(b)) return 'unpaid';
    return s;
  };
  const getSource = (b: any) => b.source || b.encounterId ? 'Consultation' : 'Manual';
  const getInvoiceNo = (b: any) => b.invoiceNo || `INV-${b.id?.slice(-6)?.toUpperCase() || '000000'}`;
  const getDueDate = (b: any) => {
    if (b.dueDate?.toDate) {
      try { return format(b.dueDate.toDate(), 'MMM dd, yyyy'); } catch {}
    }
    if (typeof b.dueDate === 'string' && b.dueDate) {
      try { return format(parseISO(b.dueDate), 'MMM dd, yyyy'); } catch {}
    }
    return '—';
  };
  const getInvoiceDate = (b: any) => {
    if (b.createdAt?.toDate) {
      try { return format(b.createdAt.toDate(), 'MMM dd, yyyy'); } catch {}
    }
    if (typeof b.createdAt === 'string') {
      try { return format(parseISO(b.createdAt), 'MMM dd, yyyy'); } catch {}
    }
    if (b.issueDate?.toDate) {
      try { return format(b.issueDate.toDate(), 'MMM dd, yyyy'); } catch {}
    }
    if (typeof b.issueDate === 'string') {
      try { return format(parseISO(b.issueDate), 'MMM dd, yyyy'); } catch {}
    }
    if (b.date) {
      try { return format(parseISO(b.date), 'MMM dd, yyyy'); } catch {}
    }
    return '—';
  };

  // Filtered and computed
  const filteredBills = useMemo(() => {
    let list = bills;

    // Tab filter
    if (activeTab === 'unpaid') list = list.filter(b => getStatus(b) === 'unpaid' || getStatus(b) === 'active');
    else if (activeTab === 'partial') list = list.filter(b => getStatus(b) === 'partial' || getStatus(b) === 'partially-paid');
    else if (activeTab === 'paid') list = list.filter(b => getStatus(b) === 'paid');
    else if (activeTab === 'overdue') list = list.filter(b => getStatus(b) === 'overdue');
    else if (activeTab === 'pending') list = list.filter(b => getStatus(b) === 'draft');

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b =>
        b.petName?.toLowerCase().includes(q) ||
        getOwnerName(b).toLowerCase().includes(q) ||
        getInvoiceNo(b).toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') list = list.filter(b => getStatus(b) === statusFilter);

    // Source filter
    if (sourceFilter !== 'all') list = list.filter(b => getSource(b).toLowerCase() === sourceFilter.toLowerCase());

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const getDateStr = (b: any) => {
        if (typeof b.date === 'string') return b.date;
        if (b.issueDate?.toDate) {
          try { return b.issueDate.toDate().toISOString().split('T')[0]; } catch {}
        }
        if (typeof b.issueDate === 'string') return b.issueDate.split('T')[0];
        if (b.createdAt?.toDate) {
          try { return b.createdAt.toDate().toISOString().split('T')[0]; } catch {}
        }
        if (typeof b.createdAt === 'string') return b.createdAt.split('T')[0];
        return '';
      };
      list = list.filter(b => {
        const d = getDateStr(b);
        if (!d) return false;
        if (dateFilter === 'today') return d === today;
        if (dateFilter === 'week') {
          const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
          return d >= weekAgo.toISOString().split('T')[0];
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
          return d >= monthAgo.toISOString().split('T')[0];
        }
        return true;
      });
    }

    // Sort newest first
    list = [...list].sort((a, b) => {
      const parseDate = (x: any) => {
        if (x?.toDate?.()) return x.toDate().getTime();
        if (typeof x === 'string') return new Date(x).getTime();
        return 0;
      };
      const aDate = parseDate(a.createdAt) || parseDate(a.issueDate) || (a.date ? new Date(a.date).getTime() : 0);
      const bDate = parseDate(b.createdAt) || parseDate(b.issueDate) || (b.date ? new Date(b.date).getTime() : 0);
      return bDate - aDate;
    });

    return list;
  }, [bills, activeTab, searchQuery, statusFilter, sourceFilter, dateFilter]);

  const totalBilled = filteredBills.reduce((s, b) => s + getTotal(b), 0);
  const totalCollected = filteredBills.reduce((s, b) => s + getPaid(b), 0);
  const totalOutstanding = filteredBills.reduce((s, b) => s + getBalance(b), 0);
  const overdueBills = filteredBills.filter(b => getStatus(b) === 'overdue');
  const totalOverdue = overdueBills.reduce((s, b) => s + getBalance(b), 0);
  const pendingBills = filteredBills.filter(b => getStatus(b) === 'draft');
  const paidCount = filteredBills.filter(b => getStatus(b) === 'paid').length;
  const unpaidCount = filteredBills.filter(b => getStatus(b) === 'unpaid' || getStatus(b) === 'active').length;
  const partialCount = filteredBills.filter(b => getStatus(b) === 'partial' || getStatus(b) === 'partially-paid').length;

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All Invoices', count: bills.length },
    { key: 'unpaid', label: 'Unpaid', count: unpaidCount },
    { key: 'partial', label: 'Partially Paid', count: partialCount },
    { key: 'paid', label: 'Paid', count: paidCount },
    { key: 'overdue', label: 'Overdue', count: overdueBills.length },
    { key: 'pending', label: 'Pending Billing', count: pendingBills.length },
  ];

  const renderInvoicePdf = async () => {
    if (!selectedBill) return null;
    const pet = pets.find(p => p.id === selectedBill.petId);
    const owner = pet ? users.find(u => u.uid === pet.ownerUid || u.id === pet.ownerUid) : null;
    let encounter = null;
    if (selectedBill.encounterId) {
      try { encounter = await fetchEncounterById(selectedBill.encounterId); } catch {}
    }
    const docPdf = await pdf(<InvoicePDF invoice={selectedBill} invoiceItems={invoiceItems} payments={invoicePayments} patient={pet} owner={owner} encounter={encounter} />).toBlob();
    return { blob: docPdf, pet, owner, encounter };
  };

  const handlePrintInvoice = async () => {
    if (!selectedBill) return;
    try {
      const result = await renderInvoicePdf();
      if (!result) return;
      const url = URL.createObjectURL(result.blob);
      const printWindow = window.open(url);
      if (!printWindow) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.click();
        return;
      }
      printWindow.onload = () => { printWindow.focus(); };
    } catch (err) {
      console.error('Print error:', err);
      alert('Failed to print invoice.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedBill) return;
    setGeneratingPdf(true);
    try {
      const result = await renderInvoicePdf();
      if (!result) { setGeneratingPdf(false); return; }
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${selectedBill.invoiceNo || selectedBill.id?.slice(-6) || '000000'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Failed to generate PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleView = async (bill: any) => {
    setSelectedBill(bill);
    try {
      const [items, pays] = await Promise.all([
        fetchInvoiceItems(bill.id),
        fetchPayments(bill.id)
      ]);
      setInvoiceItems(items);
      setInvoicePayments(pays);
    } catch {
      setInvoiceItems([]);
      setInvoicePayments([]);
    }
    setIsViewDrawerOpen(true);
  };

  const handlePay = (bill: any) => {
    setSelectedBill(bill);
    setPayAmount(getBalance(bill));
    setPayMethod('cash');
    setPayRef('');
    setIsPayDialogOpen(true);
  };

  const submitPayment = async () => {
    if (!selectedBill || payAmount <= 0) return;
    setPaying(true);
    try {
      await recordPayment(selectedBill.id, payAmount, payMethod, payRef);
      const updated = await fetchInvoices();
      setBills(updated);
      addAuditLog({
        action: 'payment_recorded',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || undefined,
        details: `₱${payAmount} via ${payMethod}${payRef ? ' ref:' + payRef : ''}`,
      });
      // Send receipt email
      if (selectedBill.clientUid) {
        const ownerSnap = await getDoc(doc(db, 'users', selectedBill.clientUid));
        const ownerEmail = ownerSnap.exists() ? ownerSnap.data().email : null;
        if (ownerEmail) {
          sendEmail({
            to: ownerEmail,
            subject: `Payment Receipt - ${selectedBill.invoiceNo || 'Invoice'}`,
            html: invoiceReceipt(
              ownerSnap.data().displayName || 'Valued Client',
              selectedBill.petName || '',
              selectedBill.invoiceNo || '',
              selectedBill.grandTotal || selectedBill.amount || 0,
              'paid',
              payAmount
            ),
          });
        }
      }
      setIsPayDialogOpen(false);
      setSelectedBill(null);
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const validItems = formItems.filter(i => i.name.trim() && i.price > 0);
      if (validItems.length === 0) {
        alert('Please add at least one line item with a name and price.');
        return;
      }
      const pet = pets.find(p => p.id === formData.petId);
      const invoiceNo = `INV-${Date.now().toString(36).toUpperCase().slice(-4)}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      const subTotal = validItems.reduce((s, i) => s + i.qty * i.price, 0);
      const taxAmount = 0;
      const grandTotal = subTotal;
      const newInvoice = {
        invoiceNo,
        petId: formData.petId,
        petName: pet ? pet.name : 'Unknown',
        ownerName: pet?.ownerUid ? getOwnerName({ petId: formData.petId }) : formData.clientUid,
        clientUid: formData.clientUid,
        amount: grandTotal,
        grandTotal,
        balanceDue: grandTotal,
        amountPaid: 0,
        subTotal,
        discountTotal: 0,
        taxAmount,
        status: formData.status,
        date: new Date().toISOString().split('T')[0],
        dueDate: formData.dueDate,
        description: formData.description,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'invoices'), newInvoice);
      for (const item of validItems) {
        await addDoc(collection(db, 'invoice_items'), {
          invoiceId: docRef.id,
          description: item.name,
          quantity: item.qty,
          unitPrice: item.price,
          lineTotal: item.qty * item.price,
          createdAt: serverTimestamp(),
        });
      }
      setBills(prev => [...prev, { ...newInvoice, id: docRef.id }]);
      addAuditLog({
        action: 'invoice_created',
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || undefined,
        details: `Invoice created for ${formData.petId}`,
      });
      setIsAddDialogOpen(false);
      setFormData({ petId: '', clientUid: '', description: '', amount: 0, status: 'active', dueDate: '' });
      setFormItems([{ name: '', qty: 1, price: 0 }]);
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="outline">Draft</Badge>;
      case 'unpaid':
      case 'active': return <Badge className="bg-red-500 text-white">Unpaid</Badge>;
      case 'partial':
      case 'partially-paid': return <Badge className="bg-orange-500 text-white">Partial</Badge>;
      case 'paid': return <Badge variant="success">Paid</Badge>;
      case 'overdue': return <Badge className="bg-red-700 text-white">Overdue</Badge>;
      case 'void': return <Badge variant="secondary">Void</Badge>;
      case 'refunded': return <Badge className="bg-purple-600 text-white">Refunded</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

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
                <h1 className="text-3xl font-bold">Billing & Payments</h1>
                <p className="text-muted-foreground">Manage invoices, payments, outstanding balances, refunds, and owner billing history.</p>
              </div>
              <div className="flex gap-2">
                <Drawer open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-6 h-12 rounded-xl font-bold"
                  >
                    <Plus className="w-5 h-5 mr-2" /> Create Invoice
                  </Button>
                  <DrawerContent className="">
                    <DrawerHeader><DrawerTitle>Create New Invoice</DrawerTitle><DrawerDescription className="sr-only">Fill in the invoice details</DrawerDescription></DrawerHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Pet</Label>
                        <Select value={formData.petId} onValueChange={(v) => {
                          const pet = pets.find(p => p.id === v);
                          setFormData({ ...formData, petId: v, clientUid: pet?.ownerUid || '' });
                        }}>
                          <SelectTrigger><SelectValue placeholder="Select pet" /></SelectTrigger>
                          <SelectContent>
                            {pets.filter(Boolean).map(pet => (
                              <SelectItem key={pet.id} value={pet.id}>{pet.name} ({pet.species})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Invoice description (optional)" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Line Items</Label>
                          <AddButton text="Add Item" onClick={addFormItem} />
                        </div>
                        <div className="space-y-2">
                          {formItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                              <Input
                                placeholder="Service name"
                                value={item.name}
                                onChange={(e) => updateFormItem(idx, 'name', e.target.value)}
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                placeholder="Qty"
                                value={item.qty || ''}
                                onChange={(e) => updateFormItem(idx, 'qty', e.target.value)}
                                className="w-16"
                                min="1"
                              />
                              <Input
                                type="number"
                                placeholder="Price"
                                value={item.price || ''}
                                onChange={(e) => updateFormItem(idx, 'price', e.target.value)}
                                className="w-24"
                                min="0"
                              />
                              <span className="text-sm font-medium pt-2 w-20 text-right">₱{(item.qty * item.price).toLocaleString()}</span>
                              {formItems.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeFormItem(idx)} className="text-red-500">
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end mt-2 text-sm font-bold">
                          Total: ₱{formTotal.toLocaleString()}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Due Date</Label>
                          <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleSubmit} className="w-full">Create Invoice</Button>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('all')}>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Billed</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">₱{totalBilled.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{filteredBills.length} invoices</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('paid')}>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Collected</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-green-600">₱{totalCollected.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{paidCount} fully paid</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('unpaid')}>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Outstanding</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-orange-600">₱{totalOutstanding.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{unpaidCount + partialCount} unpaid or partial</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('overdue')}>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Overdue</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-red-700">₱{totalOverdue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{overdueBills.length} past due</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Today's Collections</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-emerald-600">₱{invoicePayments.filter(p => {
                    const d = p.paidAt?.toDate?.() || p.createdAt?.toDate?.();
                    return d && format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  }).reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Payments today</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('pending')}>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pending Billing</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-blue-600">{pendingBills.length}</p>
                  <p className="text-xs text-muted-foreground">Draft invoices</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
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

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-2">
              <div className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search invoice, owner, pet, OR number..."
                  color="emerald"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="admission">Admission</SelectItem>
                  <SelectItem value="grooming">Grooming</SelectItem>
                  <SelectItem value="laboratory">Laboratory</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Date" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Invoice Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No invoices found</p>
                        <p className="text-sm">Create an invoice or finalize billing from a visit, admission, lab, or grooming record.</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsAddDialogOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" /> Create Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill) => {
                      const status = getStatus(bill);
                      const balance = getBalance(bill);
                      return (
                        <TableRow key={bill.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleView(bill)}>
                          <TableCell className="font-mono text-xs">{getInvoiceNo(bill)}</TableCell>
                          <TableCell className="text-xs">{getInvoiceDate(bill)}</TableCell>
                          <TableCell className="text-sm">{getOwnerName(bill)}</TableCell>
                          <TableCell className="font-medium">{bill.petName || pets.find(p => p.id === (bill.petId || bill.patientId))?.name || '—'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{getSource(bill)}</Badge></TableCell>
                          <TableCell className="text-right font-medium">₱{getTotal(bill).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-600">₱{getPaid(bill).toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            ₱{balance.toLocaleString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(status)}</TableCell>
                          <TableCell className="text-xs">{getDueDate(bill)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleView(bill)} title="View">
                                <Eye className="w-4 h-4" />
                              </Button>
                              {status !== 'paid' && (
                                <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handlePay(bill)} title="Record Payment">
                                  <PhilippinePeso className="w-4 h-4" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={handlePrintInvoice}>
                                    <Printer className="w-4 h-4 mr-2" /> Print
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={handleDownloadPdf}>
                                    {generatingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} {generatingPdf ? 'Generating...' : 'Download PDF'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Send className="w-4 h-4 mr-2" /> Send to Owner
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Ban className="w-4 h-4 mr-2" /> Void Invoice
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

          {/* View Drawer */}
          <Drawer open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
            <DrawerContent className="overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>
                  Invoice {selectedBill ? getInvoiceNo(selectedBill) : ''}
                </DrawerTitle>
                <DrawerDescription className="sr-only">Invoice details and actions</DrawerDescription>
              </DrawerHeader>
              {selectedBill && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Owner</p>
                      <p className="font-medium">{getOwnerName(selectedBill)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pet</p>
                      <p className="font-medium">{selectedBill.petName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Source</p>
                      <p>{getSource(selectedBill)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p>{getInvoiceDate(selectedBill)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <div>{getStatusBadge(getStatus(selectedBill))}</div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Due Date</p>
                      <p>{getDueDate(selectedBill)}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedBill.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{selectedBill.description}</p>
                    </div>
                  )}

                  {/* Invoice Items */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Charges</p>
                    {invoiceItems.length > 0 ? (
                      <div className="space-y-1">
                        {invoiceItems.map((item: any, i: number) => (
                          <div key={item.id || i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                            <span>
                              {item.serviceCode && <span className="font-mono text-xs text-gray-500 mr-1">[{item.serviceCode}]</span>}
                              {item.description || item.itemType} {item.quantity > 1 ? `x${item.quantity}` : ''}
                            </span>
                            <span className="font-medium">₱{item.lineTotal?.toLocaleString() || (item.unitPrice * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        {(selectedBill.taxAmount || 0) > 0 && (
                          <div className="flex justify-between text-sm py-1 border-b border-gray-100 text-gray-500">
                            <span>VAT (12%)</span>
                            <span className="font-medium">₱{selectedBill.taxAmount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    ) : selectedBill.amount ? (
                      <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                        <span>{selectedBill.description || 'Service'} x1</span>
                        <span className="font-medium">₱{selectedBill.amount.toLocaleString()}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No charges recorded for this invoice.</p>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₱{(selectedBill.subTotal || getTotal(selectedBill)).toLocaleString()}</span>
                    </div>
                    {selectedBill.discountTotal > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Discount</span>
                        <span>-₱{selectedBill.discountTotal.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-1">
                      <span>Total</span>
                      <span>₱{getTotal(selectedBill).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Paid</span>
                      <span>₱{getPaid(selectedBill).toLocaleString()}</span>
                    </div>
                    <div className={`flex justify-between font-bold text-base ${getBalance(selectedBill) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      <span>Balance</span>
                      <span>₱{getBalance(selectedBill).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment History */}
                  {invoicePayments.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Payment History</p>
                      <div className="space-y-2">
                        {invoicePayments.map((p: any, i: number) => (
                          <div key={p.id || i} className="flex justify-between text-sm p-2 bg-green-50 rounded">
                            <div>
                              <span className="font-medium">₱{p.amount?.toLocaleString()}</span>
                              <span className="text-muted-foreground ml-2">via {p.paymentMethod}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {p.paidAt?.toDate?.() ? format(p.paidAt.toDate(), 'MMM dd, yyyy hh:mm a') : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {getStatus(selectedBill) !== 'paid' && (
                      <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setIsViewDrawerOpen(false); handlePay(selectedBill); }}>
                        <PhilippinePeso className="w-4 h-4 mr-2" /> Record Payment
                      </Button>
                    )}
                    <Button variant="outline" onClick={handlePrintInvoice}><Printer className="w-4 h-4 mr-2" /> Print</Button>
                    <Button variant="outline" onClick={handleDownloadPdf} disabled={generatingPdf}>
                      {generatingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                      {generatingPdf ? 'Generating...' : 'Download PDF'}
                    </Button>
                  </div>
                </div>
              )}
            </DrawerContent>
          </Drawer>

          {/* Pay Dialog */}
          <Drawer open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
            <DrawerContent className="">
              <DrawerHeader>
                <DrawerTitle>Record Payment</DrawerTitle>
                <DrawerDescription>
                  {selectedBill && `Invoice ${getInvoiceNo(selectedBill)} — ${selectedBill.petName}`}
                </DrawerDescription>
              </DrawerHeader>
              {selectedBill && (
                <div className="space-y-4 py-2">
                  <div className="flex justify-between text-sm">
                    <span>Total</span>
                    <span className="font-bold">₱{getTotal(selectedBill).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Already Paid</span>
                    <span>₱{getPaid(selectedBill).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Balance Due</span>
                    <span className="text-orange-600">₱{getBalance(selectedBill).toLocaleString()}</span>
                  </div>
                  <div>
                    <Label>Amount to Pay</Label>
                    <Input type="number" value={payAmount} onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} min={0} max={getBalance(selectedBill)} />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="gcash">GCash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reference No. (optional)</Label>
                    <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="OR number, transaction ID..." />
                  </div>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={submitPayment} disabled={paying || payAmount <= 0}>
                    {paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><PhilippinePeso className="w-4 h-4 mr-2" /> Record Payment</>}
                  </Button>
                </div>
              )}
            </DrawerContent>
          </Drawer>
        </>
      )}
    </div>
  );
}
