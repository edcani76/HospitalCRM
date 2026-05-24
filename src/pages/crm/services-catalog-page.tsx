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
import { Plus, Eye, Loader2, MoreHorizontal, Edit, Trash2, Tags, Layers, Package, MapPin, History, Activity, Info, CreditCard } from 'lucide-react';
import { fetchServiceCatalog, updateServiceCatalog, addServiceToCatalog } from '../../lib/firestore-helpers';
import { auth } from '../../firebase';
import { format } from 'date-fns';

type TabType = 'all' | 'categories' | 'packages' | 'branch-pricing' | 'audit';

export default function ServicesCatalogPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Detail drawer
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);

  // Add/Edit Service drawer
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: '',
    service_code: '',
    service_name: '',
    invoice_label: '',
    category_id: 'Consultation',
    department: 'Medical',
    description: '',
    base_price: 0,
    unit: 'Per visit',
    tax_type: 'Non-VAT',
    tax_mode: 'Exclusive',
    billing_behavior: 'manual',
    status: 'active',
    module_availability: [] as string[]
  });

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchServiceCatalog();
        setServices(data);
      } catch (error) {
        console.error('Error loading services catalog:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const categories = Array.from(new Set(services.map(s => s.category_id || s.category).filter(Boolean)));

  const filteredServices = useMemo(() => {
    let list = services;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        (s.service_name || s.name || '').toLowerCase().includes(q) ||
        (s.service_code || s.code || '').toLowerCase().includes(q) ||
        (s.invoice_label || '').toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter(s => (s.category_id || s.category) === categoryFilter);
    }
    return list.sort((a, b) => (a.service_name || a.name || '').localeCompare(b.service_name || b.name || ''));
  }, [services, searchQuery, categoryFilter]);

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'all', label: 'All Services', icon: <Tags className="w-4 h-4 mr-2" />, count: services.length },
    { key: 'categories', label: 'Categories', icon: <Layers className="w-4 h-4 mr-2" />, count: categories.length },
    { key: 'packages', label: 'Packages', icon: <Package className="w-4 h-4 mr-2" />, count: 0 },
    { key: 'branch-pricing', label: 'Branch Pricing', icon: <MapPin className="w-4 h-4 mr-2" /> },
    { key: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4 mr-2" /> },
  ];

  const handleView = (service: any) => {
    setSelectedService(service);
    setIsViewDrawerOpen(true);
  };

  const generateServiceCode = (categoryId: string, currentServices: any[]) => {
    const prefixMap: Record<string, string> = {
      'Consultation': 'CONS',
      'Diagnostics': 'DIAG',
      'Laboratory': 'LAB',
      'Procedure': 'PROC',
      'Vaccination': 'VACC',
      'Grooming': 'GROO',
      'Admissions': 'ADMI',
      'Other': 'OTHR'
    };
    
    const prefix = prefixMap[categoryId] || categoryId.substring(0, 4).toUpperCase();
    
    // Find all existing services with this prefix
    const existingCodes = currentServices
      .map(s => s.service_code || s.code || '')
      .filter(code => code.startsWith(`${prefix}-`));
      
    let maxNumber = 0;
    existingCodes.forEach(code => {
      const parts = code.split('-');
      if (parts.length > 1) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    const nextNumber = maxNumber + 1;
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };

  const openAdd = () => {
    const defaultCategory = 'Consultation';
    setForm({
      id: '',
      service_code: generateServiceCode(defaultCategory, services),
      service_name: '',
      invoice_label: '',
      category_id: defaultCategory,
      department: 'Medical',
      description: '',
      base_price: 0,
      unit: 'Per visit',
      tax_type: 'Non-VAT',
      tax_mode: 'Exclusive',
      billing_behavior: 'manual',
      status: 'active',
      module_availability: ['Appointments', 'EMR', 'Billing']
    });
    setIsAddEditDialogOpen(true);
  };

  const openEdit = (service: any) => {
    setForm({
      id: service.id || '',
      service_code: service.service_code || service.code || '',
      service_name: service.service_name || service.name || '',
      invoice_label: service.invoice_label || service.name || '',
      category_id: service.category_id || service.category || 'Consultation',
      department: service.department || 'Medical',
      description: service.description || '',
      base_price: service.base_price || service.defaultPrice || 0,
      unit: service.unit || 'Per visit',
      tax_type: service.tax_type || 'Non-VAT',
      tax_mode: service.tax_mode || 'Exclusive',
      billing_behavior: service.billing_behavior || 'manual',
      status: service.status || (service.active ? 'active' : 'inactive'),
      module_availability: service.module_availability || ['Appointments', 'EMR', 'Billing']
    });
    setIsAddEditDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!form.service_name || !form.service_code) {
      alert('Service Code and Name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        updatedAt: new Date(),
        updated_by: auth.currentUser?.uid || 'unknown'
      };

      if (form.id) {
        await updateServiceCatalog(form.id, payload);
        setServices(prev => prev.map(s => s.id === form.id ? { ...s, ...payload } : s));
      } else {
        const newService = await addServiceToCatalog({
          ...payload,
          createdAt: new Date(),
          created_by: auth.currentUser?.uid || 'unknown',
          active: form.status === 'active'
        });
        setServices(prev => [...prev, newService]);
      }
      setIsAddEditDialogOpen(false);
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (service: any) => {
    if (!window.confirm(`Archive service "${service.service_name || service.name}"? It will no longer be available for new workflows.`)) return;
    try {
      await updateServiceCatalog(service.id, { status: 'archived', active: false, updatedAt: new Date() });
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: 'archived', active: false } : s));
      if (selectedService?.id === service.id) setIsViewDrawerOpen(false);
    } catch (err) {
      console.error('Error archiving service:', err);
      alert('Failed to archive service.');
    }
  };

  const toggleModule = (module: string) => {
    const current = [...form.module_availability];
    if (current.includes(module)) {
      setForm({ ...form, module_availability: current.filter(m => m !== module) });
    } else {
      setForm({ ...form, module_availability: [...current, module] });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeServicesCount = services.filter(s => s.status === 'active' || s.active === true).length;
  const draftServicesCount = services.filter(s => s.status === 'draft').length;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-4 pb-4 -mt-4 px-4 -mx-4 md:pt-6 md:-mt-6 md:px-6 md:-mx-6 lg:pt-8 lg:-mt-8 lg:px-8 lg:-mx-8 border-b border-gray-200/50 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Services Catalog</h1>
            <p className="text-slate-500 mt-1">Manage billable services, packages, pricing rules, and categories.</p>
          </div>
          <Button 
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-6 h-12 rounded-xl font-bold"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Service
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Services</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{services.length}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Tags className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Services</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{activeServicesCount}</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Categories</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{categories.length}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Drafts</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{draftServicesCount}</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                  <Edit className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-2 border-b overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchQuery(''); setCategoryFilter('all'); }}
              className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-100' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
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
                placeholder="Search by code, name, or invoice label..."
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat as string} value={cat as string}>{cat as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ==================== ALL SERVICES TAB ==================== */}
      {activeTab === 'all' && (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Code</TableHead>
                  <TableHead className="font-semibold text-slate-600">Service Name</TableHead>
                  <TableHead className="font-semibold text-slate-600">Category</TableHead>
                  <TableHead className="font-semibold text-slate-600">Price & Unit</TableHead>
                  <TableHead className="font-semibold text-slate-600">Modules</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Tags className="w-12 h-12 mb-4 text-slate-300" />
                        <p className="text-lg font-medium text-slate-900">No services found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map(service => {
                    const isActive = service.status === 'active' || service.active === true;
                    return (
                      <TableRow key={service.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleView(service)}>
                        <TableCell className="font-mono text-xs text-slate-600">{service.service_code || service.code}</TableCell>
                        <TableCell>
                          <p className="font-medium text-slate-900">{service.service_name || service.name}</p>
                          <p className="text-xs text-slate-500 line-clamp-1 max-w-[250px]">{service.invoice_label || service.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-white">{service.category_id || service.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-slate-900">₱{(service.base_price || service.defaultPrice || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{service.unit || 'per visit'}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {(service.module_availability || []).slice(0, 2).map((m: string) => (
                              <Badge key={m} variant="secondary" className="text-[10px] py-0">{m}</Badge>
                            ))}
                            {(service.module_availability || []).length > 2 && (
                              <Badge variant="secondary" className="text-[10px] py-0">+{(service.module_availability || []).length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isActive ? 'success' : 'secondary'} className={isActive ? 'bg-emerald-100 text-emerald-800' : ''}>
                            {isActive ? 'Active' : (service.status || 'Inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={() => handleView(service)} title="View Details">
                              <Eye className="w-4 h-4 text-slate-500 hover:text-slate-900" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4 text-slate-500" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(service)}>
                                  <Edit className="w-4 h-4 mr-2" /> Edit Service
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchive(service)} className="text-orange-600 focus:text-orange-700">
                                  <Activity className="w-4 h-4 mr-2" /> Archive
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
          </div>
        </Card>
      )}

      {/* ==================== OTHER TABS PLACEHOLDERS ==================== */}
      {activeTab !== 'all' && (
        <Card className="border-slate-200 border-dashed bg-slate-50">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            {activeTab === 'categories' && <Layers className="w-12 h-12 text-slate-300 mb-4" />}
            {activeTab === 'packages' && <Package className="w-12 h-12 text-slate-300 mb-4" />}
            {activeTab === 'branch-pricing' && <MapPin className="w-12 h-12 text-slate-300 mb-4" />}
            {activeTab === 'audit' && <History className="w-12 h-12 text-slate-300 mb-4" />}
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              {tabs.find(t => t.key === activeTab)?.label}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              This module is planned for a future phase. It will allow you to manage {activeTab.replace('-', ' ')} settings specifically.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ==================== ADD/EDIT DRAWER ==================== */}
      <Drawer open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DrawerContent className="h-full flex flex-col max-w-3xl ml-auto rounded-l-2xl">
          <DrawerHeader className="border-b px-6 py-4 flex-shrink-0 bg-slate-50/50">
            <DrawerTitle className="text-xl">{form.id ? 'Edit Service' : 'Add New Service'}</DrawerTitle>
            <DrawerDescription>Configure pricing, billing behavior, and availability.</DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            <div className="space-y-8">
              
              {/* Section 1: Basic Info */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2 border-b pb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-slate-800">Basic Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700">Service Code *</Label>
                    <Input value={form.service_code} onChange={e => setForm({...form, service_code: e.target.value})} disabled placeholder="e.g. CONS-GEN" className="font-mono bg-slate-50 cursor-not-allowed" />
                  </div>
                  <div>
                    <Label className="text-slate-700">Service Name *</Label>
                    <Input value={form.service_name} onChange={e => setForm({...form, service_name: e.target.value})} placeholder="e.g. General Consultation" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-700">Invoice Label (Displayed to Client)</Label>
                    <Input value={form.invoice_label} onChange={e => setForm({...form, invoice_label: e.target.value})} placeholder="e.g. Consultation Fee" />
                  </div>
                  <div>
                    <Label className="text-slate-700">Category</Label>
                    <Select value={form.category_id} onValueChange={v => {
                      const updates = { category_id: v };
                      if (!form.id) {
                        // Only auto-update code for new services
                        updates['service_code'] = generateServiceCode(v, services);
                      }
                      setForm({...form, ...updates});
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consultation">Consultation</SelectItem>
                        <SelectItem value="Diagnostics">Diagnostics</SelectItem>
                        <SelectItem value="Laboratory">Laboratory</SelectItem>
                        <SelectItem value="Procedure">Procedure</SelectItem>
                        <SelectItem value="Vaccination">Vaccination</SelectItem>
                        <SelectItem value="Grooming">Grooming</SelectItem>
                        <SelectItem value="Admissions">Admissions</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-700">Department</Label>
                    <Select value={form.department} onValueChange={v => setForm({...form, department: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="Diagnostics">Diagnostics</SelectItem>
                        <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                        <SelectItem value="Admissions">Admissions</SelectItem>
                        <SelectItem value="Grooming">Grooming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-700">Description</Label>
                    <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Internal notes or description..." rows={3} />
                  </div>
                </div>
              </section>

              {/* Section 2: Pricing */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2 border-b pb-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-slate-800">Pricing & Billing</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700">Base Price (₱) *</Label>
                    <Input type="number" value={form.base_price || ''} onChange={e => setForm({...form, base_price: parseFloat(e.target.value) || 0})} min={0} className="font-mono text-lg font-medium" />
                  </div>
                  <div>
                    <Label className="text-slate-700">Unit Basis</Label>
                    <Select value={form.unit} onValueChange={v => setForm({...form, unit: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Per visit">Per visit</SelectItem>
                        <SelectItem value="Per day">Per day</SelectItem>
                        <SelectItem value="Per hour">Per hour</SelectItem>
                        <SelectItem value="Per test">Per test</SelectItem>
                        <SelectItem value="Per dose">Per dose</SelectItem>
                        <SelectItem value="Flat rate">Flat rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-700">Tax Type</Label>
                    <Select value={form.tax_type} onValueChange={v => setForm({...form, tax_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VAT">VAT</SelectItem>
                        <SelectItem value="Non-VAT">Non-VAT</SelectItem>
                        <SelectItem value="Exempt">Exempt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-700">Billing Behavior</Label>
                    <Select value={form.billing_behavior} onValueChange={v => setForm({...form, billing_behavior: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Entry (Staff adds manually)</SelectItem>
                        <SelectItem value="auto-add">Auto-Add (Triggered by workflow)</SelectItem>
                        <SelectItem value="package">Package Included</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Section 3: Availability */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2 border-b pb-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <h3 className="font-semibold text-slate-800">Module Availability</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['Appointments', 'EMR', 'Billing', 'Lab', 'Admissions', 'Grooming', 'Packages'].map(mod => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModule(mod)}
                      className={`flex items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${
                        form.module_availability.includes(mod)
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4 pt-4 border-t">
                <div>
                  <Label className="text-slate-700">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                    <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Available)</SelectItem>
                      <SelectItem value="draft">Draft (Not Available)</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

            </div>
          </div>

          <div className="border-t p-6 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
            <Button variant="outline" onClick={() => setIsAddEditDialogOpen(false)} className="rounded-xl px-6">Cancel</Button>
            <Button onClick={handleSaveService} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-md">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Service'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ==================== VIEW DETAILS DRAWER ==================== */}
      <Drawer open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
        <DrawerContent className="h-full flex flex-col max-w-xl ml-auto rounded-l-2xl">
          {selectedService && (
            <>
              <DrawerHeader className="border-b px-6 py-6 flex-shrink-0 bg-slate-50/50">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-white font-mono text-[10px]">{selectedService.service_code || selectedService.code}</Badge>
                      <Badge variant={selectedService.status === 'active' || selectedService.active ? 'success' : 'secondary'} className={selectedService.status === 'active' || selectedService.active ? 'bg-emerald-100 text-emerald-800' : ''}>
                        {selectedService.status === 'active' || selectedService.active ? 'Active' : (selectedService.status || 'Inactive')}
                      </Badge>
                    </div>
                    <DrawerTitle className="text-2xl font-bold text-slate-900">{selectedService.service_name || selectedService.name}</DrawerTitle>
                    <DrawerDescription className="mt-1 text-slate-500">
                      Invoice Label: <span className="font-medium text-slate-700">{selectedService.invoice_label || selectedService.name}</span>
                    </DrawerDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">₱{(selectedService.base_price || selectedService.defaultPrice || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{selectedService.unit || 'Per visit'}</p>
                  </div>
                </div>
              </DrawerHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Classification</h4>
                  <div className="bg-white border rounded-xl p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Category</p>
                      <p className="font-medium text-slate-900">{selectedService.category_id || selectedService.category || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Department</p>
                      <p className="font-medium text-slate-900">{selectedService.department || '—'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Billing Rules</h4>
                  <div className="bg-white border rounded-xl p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Tax Type</p>
                      <p className="font-medium text-slate-900">{selectedService.tax_type || (selectedService.taxable ? 'VAT' : 'Non-VAT')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Billing Behavior</p>
                      <p className="font-medium text-slate-900 capitalize">{selectedService.billing_behavior || 'Manual'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Module Availability</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedService.module_availability || ['Appointments', 'EMR', 'Billing']).map((mod: string) => (
                      <Badge key={mod} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 px-3 py-1">
                        {mod}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedService.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Description</h4>
                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                      {selectedService.description}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t p-6 bg-slate-50 flex justify-between flex-shrink-0">
                <Button variant="outline" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200" onClick={() => handleArchive(selectedService)}>
                  Archive Service
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsViewDrawerOpen(false)}>Close</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => { setIsViewDrawerOpen(false); openEdit(selectedService); }}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Details
                  </Button>
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
