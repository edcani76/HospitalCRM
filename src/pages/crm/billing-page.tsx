import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { SearchBar } from '../../components/ui/search-bar';
import { Plus, Eye, FileText, X, Loader2, Search, Printer, MoreHorizontal, DollarSign, Download, Send, Ban, RotateCcw } from 'lucide-react';
import { fetchInvoices, fetchPets, fetchUsers, fetchInvoiceItems, fetchPayments, recordPayment } from '../../lib/firestore-helpers';
import { collection, addDoc, serverTimestamp, updateDoc, doc, db } from '../../firebase';
import { format, isPast, parseISO } from 'date-fns';

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

  // Add invoice form
  const [formData, setFormData] = useState({
    petId: '', clientUid: '', description: '', amount: 0, status: 'active', dueDate: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [invoicesData, petsData, usersData] = await Promise.all([
          fetchInvoices(),
          fetchPets(),
          fetchUsers()
        ]);
        setBills(invoicesData);
        setPets(petsData);
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
    const pet = pets.find(p => p.id === bill.petId);
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
    const due = b.dueDate;
    if (due && isPast(parseISO(due)) && bal > 0) return 'overdue';
    if (bal >= getTotal(b)) return 'unpaid';
    return s;
  };
  const getSource = (b: any) => b.source || b.encounterId ? 'Consultation' : 'Manual';
  const getInvoiceNo = (b: any) => b.invoiceNo || `INV-${b.id?.slice(0, 8)?.toUpperCase() || 'NEW'}`;
  const getDueDate = (b: any) => b.dueDate || '—';
  const getInvoiceDate = (b: any) => {
    if (b.createdAt?.toDate) {
      try { return format(b.createdAt.toDate(), 'MMM dd, yyyy'); } catch {}
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
      list = list.filter(b => {
        const d = b.date || today;
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
      const aDate = a.createdAt?.toDate?.()?.getTime() || (a.date ? new Date(a.date).getTime() : 0);
      const bDate = b.createdAt?.toDate?.()?.getTime() || (b.date ? new Date(b.date).getTime() : 0);
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
      const pet = pets.find(p => p.id === formData.petId);
      const newInvoice = {
        petId: formData.petId,
        petName: pet ? pet.name : 'Unknown',
        ownerName: pet?.ownerUid ? getOwnerName({ petId: formData.petId }) : formData.clientUid,
        clientUid: formData.clientUid,
        amount: parseFloat(formData.amount.toString()) || 0,
        status: formData.status,
        date: new Date().toISOString().split('T')[0],
        dueDate: formData.dueDate,
        description: formData.description,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'invoices'), newInvoice);
      setBills(prev => [...prev, { ...newInvoice, id: docRef.id }]);
      setIsAddDialogOpen(false);
      setFormData({ petId: '', clientUid: '', description: '', amount: 0, status: 'active', dueDate: '' });
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Billing & Payments</h1>
              <p className="text-muted-foreground">Manage invoices, payments, outstanding balances, refunds, and owner billing history.</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create Invoice
                </Button>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Create New Invoice</DialogTitle><DialogDescription className="sr-only">Fill in the invoice details</DialogDescription></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Pet</Label>
                      <Select value={formData.petId} onValueChange={(v) => {
                        const pet = pets.find(p => p.id === v);
                        setFormData({ ...formData, petId: v, clientUid: pet?.ownerUid || '' });
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select pet" /></SelectTrigger>
                        <SelectContent>
                          {pets.map(pet => (
                            <SelectItem key={pet.id} value={pet.id}>{pet.name} ({pet.species})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Invoice description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Amount (₱)</Label>
                        <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
                      </div>
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
                </DialogContent>
              </Dialog>
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
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
                          <TableCell className="font-medium">{bill.petName || '—'}</TableCell>
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
                                <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handlePay(bill)} title="Receive Payment">
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => window.print()}>
                                    <Printer className="w-4 h-4 mr-2" /> Print
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="w-4 h-4 mr-2" /> Download PDF
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
          <Dialog open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Invoice {selectedBill ? getInvoiceNo(selectedBill) : ''}
                </DialogTitle>
                <DialogDescription className="sr-only">Invoice details and actions</DialogDescription>
              </DialogHeader>
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
                  {invoiceItems.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Charges</p>
                      <div className="space-y-1">
                        {invoiceItems.map((item: any, i: number) => (
                          <div key={item.id || i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                            <span>{item.description || item.itemType} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                            <span className="font-medium">₱{item.lineTotal?.toLocaleString() || (item.unitPrice * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                        <DollarSign className="w-4 h-4 mr-2" /> Receive Payment
                      </Button>
                    )}
                    <Button variant="outline"><Printer className="w-4 h-4 mr-2" /> Print</Button>
                    <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Download PDF</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Pay Dialog */}
          <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Receive Payment</DialogTitle>
                <DialogDescription>
                  {selectedBill && `Invoice ${getInvoiceNo(selectedBill)} — ${selectedBill.petName}`}
                </DialogDescription>
              </DialogHeader>
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
                    {paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><DollarSign className="w-4 h-4 mr-2" /> Record Payment</>}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
