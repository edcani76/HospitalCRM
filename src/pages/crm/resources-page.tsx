import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../../components/ui/drawer';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { SearchBar } from '../../components/ui/search-bar';
import { Plus, Eye, Loader2, MoreHorizontal, Edit, Trash2, Box, CalendarRange, Wrench, BarChart3, Clock, DollarSign, List, Filter, ArrowRight, Save, LayoutDashboard, Calendar, ClipboardList, Download } from 'lucide-react';
import { 
  fetchResources, 
  fetchResourcePricingRules, 
  fetchResourceReservations,
  addResource,
  updateResource,
  deactivateResource,
  fetchServiceCatalog
} from '../../lib/firestore-helpers';
import { Resource, ResourcePricingRule, ResourceReservation } from '../../types';
import { auth } from '../../firebase';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay, startOfMonth, endOfMonth } from 'date-fns';

type TabType = 'all' | 'rooms-cages' | 'equipment' | 'reservations' | 'pricing' | 'maintenance' | 'utilization' | 'audit';

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [pricingRules, setPricingRules] = useState<ResourcePricingRule[]>([]);
  const [reservations, setReservations] = useState<ResourceReservation[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  // Drawers state
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isReserveDrawerOpen, setIsReserveDrawerOpen] = useState(false);
  
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  
  // Form State
  const [form, setForm] = useState<Partial<Resource>>({
    resource_type: 'Cage',
    department: 'Admissions',
    branch_id: 'Main Branch',
    status: 'Available',
    schedulable: true,
    billable: true,
    active: true,
    capacity: 1,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [resData, rulesData, resvData, catData] = await Promise.all([
          fetchResources(),
          fetchResourcePricingRules(),
          fetchResourceReservations(),
          fetchServiceCatalog()
        ]);
        setResources(resData);
        setPricingRules(rulesData);
        setReservations(resvData);
        setServicesCatalog(catData);
      } catch (err) {
        console.error('Error loading resources:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const generateResourceCode = (typeId: string, currentResources: Resource[]) => {
    const prefixMap: Record<string, string> = {
      'Cage': 'CAGE',
      'Exam Room': 'EXAM',
      'Surgery Room': 'SURG',
      'Equipment': 'EQP',
      'Vehicle': 'VEH',
      'Grooming Station': 'GROO',
      'Other': 'RES'
    };
    
    const prefix = prefixMap[typeId] || typeId.substring(0, 4).toUpperCase();
    
    const existingCodes = currentResources
      .map(r => r.resource_code || '')
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

  const handleOpenAdd = () => {
    const defaultType = 'Cage';
    setForm({
      resource_code: generateResourceCode(defaultType, resources),
      resource_type: defaultType,
      department: 'Admissions',
      branch_id: 'Main Branch',
      status: 'Available',
      schedulable: true,
      billable: true,
      active: true,
      capacity: 1,
    });
    setIsAddDrawerOpen(true);
  };

  const handleOpenEdit = (resource: Resource) => {
    setForm(resource);
    setIsAddDrawerOpen(true);
  };

  const handleOpenView = (resource: Resource) => {
    setSelectedResource(resource);
    setIsViewDrawerOpen(true);
  };

  const handleSaveResource = async () => {
    if (!form.name || !form.resource_code || !form.resource_type) {
      alert("Name, Code, and Type are required");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await updateResource(form.id, form);
        setResources(prev => prev.map(r => r.id === form.id ? { ...r, ...form } as Resource : r));
      } else {
        const newRes = await addResource(form as any);
        setResources(prev => [...prev, newRes]);
      }
      setIsAddDrawerOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this resource?')) return;
    try {
      await deactivateResource(id);
      setResources(prev => prev.map(r => r.id === id ? { ...r, status: 'Inactive', active: false } : r));
      setIsViewDrawerOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to deactivate');
    }
  };

  // -------------------------
  // Filtering & Data
  // -------------------------
  const filteredResources = useMemo(() => {
    let list = resources;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => 
        (r.name || '').toLowerCase().includes(q) || 
        (r.resource_code || '').toLowerCase().includes(q)
      );
    }
    if (activeTab === 'rooms-cages') {
      list = list.filter(r => ['Cage', 'Room', 'Ward', 'Exam Room', 'Surgery Room'].includes(r.resource_type || ''));
    } else if (activeTab === 'equipment') {
      list = list.filter(r => !['Cage', 'Room', 'Ward', 'Exam Room', 'Surgery Room'].includes(r.resource_type || ''));
    }
    return list;
  }, [resources, searchQuery, activeTab]);

  const activeResources = resources.filter(r => r.active !== false);
  const availableCount = resources.filter(r => r.status === 'Available').length;
  const inUseCount = resources.filter(r => r.status === 'In Use' || r.status === 'Occupied').length;
  const reservedCount = resources.filter(r => r.status === 'Reserved').length;
  const maintenanceCount = resources.filter(r => r.status === 'Maintenance').length;
  const billableCount = resources.filter(r => r.billable).length;

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All Resources', icon: <Box className="w-4 h-4 mr-2" /> },
    { key: 'rooms-cages', label: 'Rooms & Cages', icon: <LayoutDashboard className="w-4 h-4 mr-2" /> },
    { key: 'equipment', label: 'Equipment', icon: <Wrench className="w-4 h-4 mr-2" /> },
    { key: 'reservations', label: 'Reservations', icon: <CalendarRange className="w-4 h-4 mr-2" /> },
    { key: 'pricing', label: 'Pricing Rules', icon: <DollarSign className="w-4 h-4 mr-2" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // -------------------------
  // RENDERERS
  // -------------------------
  const renderResourceTable = (data: Resource[]) => (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-600">Resource</TableHead>
              <TableHead className="font-semibold text-slate-600">Type & Dept</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="font-semibold text-slate-600">Settings</TableHead>
              <TableHead className="font-semibold text-slate-600">Service Mapped</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <Box className="w-12 h-12 mb-4 text-slate-300" />
                    <p className="text-lg font-medium text-slate-900">No resources found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleOpenView(r)}>
                  <TableCell>
                    <p className="font-medium text-slate-900">{r.name}</p>
                    <p className="font-mono text-xs text-slate-500">{r.resource_code}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-white">{r.resource_type}</Badge>
                    <p className="text-xs text-slate-500 mt-1">{r.department}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      r.status === 'Available' ? 'success' : 
                      r.status === 'In Use' ? 'destructive' : 
                      r.status === 'Maintenance' ? 'warning' : 'secondary'
                    } className={r.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : ''}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {r.schedulable && <Badge variant="secondary" className="text-[10px] py-0 bg-blue-50 text-blue-700">Schedulable</Badge>}
                      {r.billable && <Badge variant="secondary" className="text-[10px] py-0 bg-purple-50 text-purple-700">Billable</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.service_mapping_id ? (
                      <p className="text-xs text-slate-700 line-clamp-1">{servicesCatalog.find(s => s.id === r.service_mapping_id)?.service_name || 'Mapped'}</p>
                    ) : (
                      <span className="text-xs text-slate-400 italic">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenView(r)} title="View Details">
                        <Eye className="w-4 h-4 text-slate-500 hover:text-slate-900" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4 text-slate-500" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(r)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit Resource
                          </DropdownMenuItem>
                          {r.status === 'Available' && (
                            <DropdownMenuItem onClick={() => { setSelectedResource(r); setIsReserveDrawerOpen(true); }}>
                              <CalendarRange className="w-4 h-4 mr-2 text-blue-600" /> Reserve
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDeactivate(r.id!)} className="text-orange-600 focus:text-orange-700">
                            <Trash2 className="w-4 h-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  const renderCalendar = () => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM
    
    return (
      <Card className="border-slate-200 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Reservation Schedule
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">Today</Button>
            <div className="flex items-center mx-4">
              <Button variant="ghost" size="sm" className="px-2"><ArrowRight className="w-4 h-4 rotate-180" /></Button>
              <span className="text-sm font-semibold mx-2 w-40 text-center">{format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}</span>
              <Button variant="ghost" size="sm" className="px-2"><ArrowRight className="w-4 h-4" /></Button>
            </div>
            <Select defaultValue="week">
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day View</SelectItem>
                <SelectItem value="week">Week View</SelectItem>
                <SelectItem value="month">Month View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Weekly Grid */}
        <div className="flex flex-col h-[600px] overflow-y-auto custom-scrollbar bg-white">
          <div className="flex sticky top-0 z-10 bg-white border-b shadow-sm">
            <div className="w-16 flex-shrink-0 border-r bg-slate-50"></div>
            {days.map(day => (
              <div key={day.toISOString()} className="flex-1 p-3 text-center border-r last:border-r-0">
                <p className="text-xs font-semibold text-slate-500 uppercase">{format(day, 'EEE')}</p>
                <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full mt-1 ${isSameDay(day, today) ? 'bg-blue-600 text-white font-bold' : 'text-slate-900 font-semibold'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-1 relative">
            {/* Time Column */}
            <div className="w-16 flex-shrink-0 border-r bg-slate-50 relative">
              {hours.map(hour => (
                <div key={hour} className="h-20 border-b border-slate-100 relative">
                  <span className="absolute -top-3 right-2 text-[10px] font-medium text-slate-400">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Day Columns */}
            {days.map((day, dayIdx) => (
              <div key={day.toISOString()} className="flex-1 border-r last:border-r-0 relative">
                {hours.map(hour => (
                  <div key={hour} className="h-20 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="hidden group-hover:flex items-center justify-center w-full h-full text-blue-600">
                      <Plus className="w-4 h-4 opacity-50" />
                    </div>
                  </div>
                ))}
                
                {/* Example rendered reservation for MVP */}
                {dayIdx === 2 && (
                  <div className="absolute top-[80px] left-1 right-1 h-[60px] bg-purple-100 border border-purple-200 rounded-md p-1.5 shadow-sm overflow-hidden z-10 cursor-pointer hover:ring-2 ring-purple-400">
                    <p className="text-[10px] font-bold text-purple-800">CAGE-A3</p>
                    <p className="text-[10px] text-purple-600 leading-tight">Buddy (Admitted)</p>
                  </div>
                )}
                {dayIdx === 4 && (
                  <div className="absolute top-[160px] left-1 right-1 h-[120px] bg-blue-100 border border-blue-200 rounded-md p-1.5 shadow-sm overflow-hidden z-10 cursor-pointer hover:ring-2 ring-blue-400">
                    <p className="text-[10px] font-bold text-blue-800">XRAY-01</p>
                    <p className="text-[10px] text-blue-600 leading-tight">Max (Dr. Smith)</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-4 pb-4 -mt-4 px-4 -mx-4 md:pt-6 md:-mt-6 md:px-6 md:-mx-6 lg:pt-8 lg:-mt-8 lg:px-8 lg:-mx-8 border-b border-gray-200/50 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Resources</h1>
            <p className="text-slate-500 mt-1">Manage rooms, cages, equipment, availability, and reservations.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-12 rounded-xl font-medium bg-white">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button 
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-6 h-12 rounded-xl font-bold"
            >
              <Plus className="w-5 h-5 mr-2" /> Add Resource
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500">Total Resources</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{activeResources.length}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-blue-600">Available</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{availableCount}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-red-600">In Use</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{inUseCount}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-purple-600">Reserved</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{reservedCount}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow border-orange-200 bg-orange-50/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-orange-600">Maintenance</p>
              <p className="text-2xl font-bold text-orange-700 mt-1">{maintenanceCount}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500">Billable</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{billableCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-2 border-b overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
              className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {['all', 'rooms-cages', 'equipment'].includes(activeTab) && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name, code, or type..."
              />
            </div>
            <Button variant="outline" className="bg-white"><Filter className="w-4 h-4 mr-2" /> Filters</Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {['all', 'rooms-cages', 'equipment'].includes(activeTab) && renderResourceTable(filteredResources)}
      {activeTab === 'reservations' && renderCalendar()}
      {activeTab === 'pricing' && (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Rule Name</TableHead>
                  <TableHead className="font-semibold text-slate-600">Applies To</TableHead>
                  <TableHead className="font-semibold text-slate-600">Pricing Model</TableHead>
                  <TableHead className="font-semibold text-slate-600">Rate</TableHead>
                  <TableHead className="font-semibold text-slate-600">Service Mapping</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <DollarSign className="w-12 h-12 mb-4 text-slate-300" />
                        <p className="text-lg font-medium text-slate-900">No pricing rules defined</p>
                        <p className="text-sm mt-1">Create rules to determine how resource usage is billed.</p>
                        <Button className="mt-4 bg-blue-600 text-white"><Plus className="w-4 h-4 mr-2" /> Add Rule</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pricingRules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium text-slate-900">{rule.name}</TableCell>
                      <TableCell>{rule.resource_type || 'All'}</TableCell>
                      <TableCell><Badge variant="outline">{rule.pricing_model}</Badge></TableCell>
                      <TableCell className="font-medium">₱{rule.base_rate?.toLocaleString()}</TableCell>
                      <TableCell>{servicesCatalog.find(s => s.id === rule.service_id)?.service_name || 'Mapped'}</TableCell>
                      <TableCell>
                        <Badge variant={rule.status === 'Active' ? 'success' : 'secondary'} className={rule.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : ''}>
                          {rule.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm"><Edit className="w-4 h-4 text-slate-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ADD / EDIT DRAWER (Left Side) */}
      <Drawer open={isAddDrawerOpen} onOpenChange={setIsAddDrawerOpen} direction="left">
        <DrawerContent className="h-full flex flex-col max-w-2xl rounded-r-2xl border-r">
          <DrawerHeader className="border-b px-6 py-4 flex-shrink-0 bg-slate-50/50">
            <DrawerTitle className="text-xl">{form.id ? 'Edit Resource' : 'Add New Resource'}</DrawerTitle>
            <DrawerDescription>Configure availability, pricing rules, and module integration.</DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            <div className="space-y-8">
              
              {/* Section 1: Basic Info */}
              <section className="space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700">Resource Code *</Label>
                    <Input value={form.resource_code || ''} onChange={e => setForm({...form, resource_code: e.target.value})} disabled placeholder="e.g. CAGE-001" className="font-mono uppercase bg-slate-50 cursor-not-allowed" />
                  </div>
                  <div>
                    <Label className="text-slate-700">Resource Name *</Label>
                    <Input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Regular Cage A3" />
                  </div>
                  <div>
                    <Label className="text-slate-700">Type *</Label>
                    <Select value={form.resource_type} onValueChange={v => {
                      const updates: Partial<Resource> = { resource_type: v };
                      if (!form.id) {
                        updates.resource_code = generateResourceCode(v, resources);
                      }
                      setForm({...form, ...updates});
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cage">Cage</SelectItem>
                        <SelectItem value="Exam Room">Exam Room</SelectItem>
                        <SelectItem value="Surgery Room">Surgery Room</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Vehicle">Vehicle</SelectItem>
                        <SelectItem value="Grooming Station">Grooming Station</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-700">Department</Label>
                    <Select value={form.department} onValueChange={v => setForm({...form, department: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admissions">Admissions</SelectItem>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="Lab & Diagnostics">Lab & Diagnostics</SelectItem>
                        <SelectItem value="Grooming">Grooming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-700">Branch</Label>
                    <Input value={form.branch_id || ''} onChange={e => setForm({...form, branch_id: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-slate-700">Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({...form, status: v as any})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Out of Service">Out of Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Section 2: Availability */}
              <section className="space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2">Capacity & Availability</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700">Capacity (Pets/Uses)</Label>
                    <Input type="number" value={form.capacity || 1} onChange={e => setForm({...form, capacity: parseInt(e.target.value) || 1})} min={1} />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <input type="checkbox" id="schedulable" checked={form.schedulable} onChange={e => setForm({...form, schedulable: e.target.checked})} className="rounded border-gray-300 text-blue-600" />
                    <Label htmlFor="schedulable">Is Schedulable / Reservable?</Label>
                  </div>
                </div>
              </section>

              {/* Section 3: Billing & Service Mapping */}
              <section className="space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2">Billing & Integration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 pt-2 col-span-2">
                    <input type="checkbox" id="billable" checked={form.billable} onChange={e => setForm({...form, billable: e.target.checked})} className="rounded border-gray-300 text-blue-600" />
                    <Label htmlFor="billable">Resource generates billing charges</Label>
                  </div>
                  
                  {form.billable && (
                    <div className="col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <Label className="text-slate-700 mb-2 block">Service Catalog Mapping *</Label>
                      <p className="text-xs text-slate-500 mb-3">Map this resource to an invoice item in the Services Catalog. Charges will be billed as this service.</p>
                      <Select value={form.service_mapping_id || ''} onValueChange={v => setForm({...form, service_mapping_id: v})}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Select service item to map..." /></SelectTrigger>
                        <SelectContent>
                          {servicesCatalog.map(sc => (
                            <SelectItem key={sc.id} value={sc.id!}>{sc.service_code} - {sc.service_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </section>

            </div>
          </div>

          <div className="border-t p-6 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
            <Button variant="outline" onClick={() => setIsAddDrawerOpen(false)} className="rounded-xl px-6">Cancel</Button>
            <Button onClick={handleSaveResource} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-md">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Resource'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* VIEW DRAWER (Left Side) */}
      <Drawer open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen} direction="left">
        <DrawerContent className="h-full flex flex-col max-w-lg rounded-r-2xl border-r">
          {selectedResource && (
            <>
              <DrawerHeader className="border-b px-6 py-6 flex-shrink-0 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="bg-white font-mono text-xs">{selectedResource.resource_code}</Badge>
                  <Badge variant={
                      selectedResource.status === 'Available' ? 'success' : 
                      selectedResource.status === 'In Use' ? 'destructive' : 
                      selectedResource.status === 'Maintenance' ? 'warning' : 'secondary'
                    } className={selectedResource.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : ''}>
                    {selectedResource.status}
                  </Badge>
                </div>
                <DrawerTitle className="text-2xl font-bold text-slate-900">{selectedResource.name}</DrawerTitle>
                <DrawerDescription className="mt-1 flex items-center text-slate-500">
                  <Box className="w-4 h-4 mr-1" /> {selectedResource.resource_type} • {selectedResource.department}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Configuration</h4>
                  <div className="bg-white border rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Branch</p>
                      <p className="font-medium text-slate-900">{selectedResource.branch_id || 'Main Branch'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Capacity</p>
                      <p className="font-medium text-slate-900">{selectedResource.capacity} {selectedResource.capacity === 1 ? 'slot' : 'slots'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Schedulable</p>
                      <p className="font-medium text-slate-900">{selectedResource.schedulable ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Billable</p>
                      <p className="font-medium text-slate-900">{selectedResource.billable ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {selectedResource.billable && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Service Mapping Integration</h4>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      {selectedResource.service_mapping_id ? (
                        <div className="flex items-start gap-3">
                          <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm border border-blue-100">
                            <List className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-blue-600 mb-1 uppercase tracking-wider">Mapped Catalog Item</p>
                            <p className="font-medium text-slate-900">{servicesCatalog.find(s => s.id === selectedResource.service_mapping_id)?.service_name || 'Mapped Item'}</p>
                            <p className="text-xs text-slate-500 font-mono mt-1">{servicesCatalog.find(s => s.id === selectedResource.service_mapping_id)?.service_code}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600 font-medium">⚠️ Billable resource has no mapped service. Billing will fail.</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Utilization Chart Placeholder */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Utilization</h4>
                  <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-100">
                    <BarChart3 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Utilization data will appear here once the resource has historical reservations.</p>
                  </div>
                </div>
              </div>

              <div className="border-t p-6 bg-slate-50 flex justify-between flex-shrink-0">
                <Button variant="outline" className="text-orange-600 hover:bg-orange-50" onClick={() => handleDeactivate(selectedResource.id!)}>
                  Deactivate
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsViewDrawerOpen(false)}>Close</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => { setIsViewDrawerOpen(false); handleOpenEdit(selectedResource); }}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
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
