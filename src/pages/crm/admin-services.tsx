import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { fetchServiceCatalog, fetchAllResources, addServiceToCatalog, updateServiceCatalog, updateServiceProviders, addResource, updateResourceStatus, addAuditLog } from '../../lib/firestore-helpers';
import { db, auth, collection, getDocs, doc, updateDoc } from '../../firebase';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, Filter, Package, Settings, Save, X } from 'lucide-react';

type TabType = 'services' | 'resources';

export default function AdminServicesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [loading, setLoading] = useState(true);

  // Services state
  const [services, setServices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({
    code: '', name: '', category: 'consultation', description: '',
    defaultPrice: 0, taxable: false, active: true, requiresClinicalRecord: true,
    durationMin: 30, allowedProviderIds: [] as string[], requiredResourceIds: [] as string[],
  });

  // Resources state
  const [resources, setResources] = useState<any[]>([]);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [resourceForm, setResourceForm] = useState({
    name: '', type: 'room' as 'room' | 'equipment', status: 'available' as string, description: '',
  });

  // Providers state
  const [doctors, setDoctors] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogData, resourceData, doctorSnap] = await Promise.all([
        fetchServiceCatalog(),
        fetchAllResources(),
        getDocs(collection(db, 'doctors')),
      ]);
      setServices(catalogData);
      setResources(resourceData);
      const docs = doctorSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDoctors(docs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openNewService = () => {
    setEditingService(null);
    setServiceForm({
      code: '', name: '', category: 'consultation', description: '',
      defaultPrice: 0, taxable: false, active: true, requiresClinicalRecord: true,
      durationMin: 30, allowedProviderIds: [], requiredResourceIds: [],
    });
    setShowServiceDialog(true);
  };

  const openEditService = (service: any) => {
    setEditingService(service);
    setServiceForm({
      code: service.code || '',
      name: service.name || '',
      category: service.category || 'consultation',
      description: service.description || '',
      defaultPrice: service.defaultPrice || 0,
      taxable: service.taxable ?? false,
      active: service.active ?? true,
      requiresClinicalRecord: service.requiresClinicalRecord ?? true,
      durationMin: service.durationMin || 30,
      allowedProviderIds: service.allowedProviderIds || [],
      requiredResourceIds: service.requiredResourceIds || [],
    });
    setShowServiceDialog(true);
  };

  const saveService = async () => {
    if (!serviceForm.name || !serviceForm.code) {
      alert('Name and code are required');
      return;
    }
    try {
      if (editingService) {
        await updateServiceCatalog(editingService.id, serviceForm);
        await updateServiceProviders(editingService.id, serviceForm.allowedProviderIds);
      } else {
        await addServiceToCatalog(serviceForm);
      }
      setShowServiceDialog(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save service:', err);
      alert('Failed to save service');
    }
  };

  const toggleServiceActive = async (service: any) => {
    try {
      await updateServiceCatalog(service.id, { active: !service.active });
      await loadData();
    } catch (err) {
      console.error('Failed to toggle service:', err);
    }
  };

  const openNewResource = () => {
    setEditingResource(null);
    setResourceForm({ name: '', type: 'room', status: 'available', description: '' });
    setShowResourceDialog(true);
  };

  const openEditResource = (resource: any) => {
    setEditingResource(resource);
    setResourceForm({
      name: resource.name,
      type: resource.type,
      status: resource.status,
      description: resource.description || '',
    });
    setShowResourceDialog(true);
  };

  const saveResource = async () => {
    if (!resourceForm.name) {
      alert('Name is required');
      return;
    }
    try {
      if (editingResource) {
        await updateDoc(doc(db, 'resources', editingResource.id), {
          ...resourceForm,
          updatedAt: new Date(),
        });
        await addAuditLog({ action: 'resource_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', details: `Updated resource ${resourceForm.name}` });
      } else {
        await addResource(resourceForm);
      }
      setShowResourceDialog(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save resource:', err);
      alert('Failed to save resource');
    }
  };

  const toggleResourceStatus = async (resource: any) => {
    const nextStatus = resource.status === 'available' ? 'maintenance' : 'available';
    try {
      await updateResourceStatus(resource.id, nextStatus);
      await loadData();
    } catch (err) {
      console.error('Failed to toggle resource:', err);
    }
  };

  const filteredServices = services.filter(s => {
    if (categoryFilter && s.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const categories = ['consultation', 'vaccination', 'lab', 'diagnostic', 'procedure', 'grooming', 'medication', 'supply'];
  const categoryLabels: Record<string, string> = {
    consultation: 'Consultations', vaccination: 'Vaccinations', lab: 'Lab Tests',
    diagnostic: 'Diagnostics', procedure: 'Procedures', grooming: 'Grooming',
    medication: 'Medications', supply: 'Supplies',
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <>
      <PageHeader title="Service & Resource Management" subtitle="Manage services, pricing, providers, and resources" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'services' ? 'default' : 'outline'} onClick={() => setActiveTab('services')}>
          <Package className="w-4 h-4 mr-2" /> Services
        </Button>
        <Button variant={activeTab === 'resources' ? 'default' : 'outline'} onClick={() => setActiveTab('resources')}>
          <Settings className="w-4 h-4 mr-2" /> Resources
        </Button>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Service Catalog ({services.length})</CardTitle>
            <Button onClick={openNewService}><Plus className="w-4 h-4 mr-2" /> Add Service</Button>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search services..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{categoryLabels[c]}</option>)}
              </select>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Code</th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-right p-3 font-medium">Price</th>
                    <th className="text-center p-3 font-medium">Providers</th>
                    <th className="text-center p-3 font-medium">Duration</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map(s => (
                    <tr key={s.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{s.code}</td>
                      <td className="p-3">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{s.description}</p>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{categoryLabels[s.category] || s.category}</Badge>
                      </td>
                      <td className="p-3 text-right font-bold">₱{s.defaultPrice?.toFixed(2)}</td>
                      <td className="p-3 text-center text-xs text-gray-500">{s.allowedProviderIds?.length || 0}</td>
                      <td className="p-3 text-center text-xs">{s.durationMin || '-'} min</td>
                      <td className="p-3 text-center">
                        <Badge variant={s.active ? 'success' : 'outline'} className="text-xs">
                          {s.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditService(s)}><Edit2 className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleServiceActive(s)}>
                            {s.active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredServices.length === 0 && <div className="p-8 text-center text-gray-400">No services found.</div>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Resources ({resources.length})</CardTitle>
            <Button onClick={openNewResource}><Plus className="w-4 h-4 mr-2" /> Add Resource</Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map(r => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs capitalize">{r.type}</Badge>
                      </td>
                      <td className="p-3 text-xs text-gray-500">{r.description || '-'}</td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={r.status === 'available' ? 'success' : r.status === 'maintenance' ? 'warning' : 'outline'}
                          className="text-xs"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditResource(r)}><Edit2 className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleResourceStatus(r)}>
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {resources.length === 0 && <div className="p-8 text-center text-gray-400">No resources found.</div>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Code</Label>
              <Input value={serviceForm.code} onChange={e => setServiceForm({ ...serviceForm, code: e.target.value })} placeholder="e.g. CONS-001" />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="Service name" />
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={serviceForm.category}
                onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                {categories.map(c => <option key={c} value={c}>{categoryLabels[c]}</option>)}
              </select>
            </div>
            <div>
              <Label>Default Price (₱)</Label>
              <Input type="number" value={serviceForm.defaultPrice} onChange={e => setServiceForm({ ...serviceForm, defaultPrice: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={serviceForm.durationMin} onChange={e => setServiceForm({ ...serviceForm, durationMin: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={serviceForm.taxable} onChange={e => setServiceForm({ ...serviceForm, taxable: e.target.checked })} />
                Taxable
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={serviceForm.active} onChange={e => setServiceForm({ ...serviceForm, active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} rows={2} />
            </div>

            {/* Provider Assignment */}
            <div className="col-span-2">
              <Label>Allowed Providers</Label>
              <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {doctors.map(d => {
                  const checked = serviceForm.allowedProviderIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        const ids = checked
                          ? serviceForm.allowedProviderIds.filter(id => id !== d.id)
                          : [...serviceForm.allowedProviderIds, d.id];
                        setServiceForm({ ...serviceForm, allowedProviderIds: ids });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        checked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resource Assignment */}
            <div className="col-span-2">
              <Label>Required Resources</Label>
              <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {resources.map(r => {
                  const checked = serviceForm.requiredResourceIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        const ids = checked
                          ? serviceForm.requiredResourceIds.filter(id => id !== r.id)
                          : [...serviceForm.requiredResourceIds, r.id];
                        setServiceForm({ ...serviceForm, requiredResourceIds: ids });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        checked ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-200'
                      }`}
                    >
                      {r.name} ({r.type})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceDialog(false)}><X className="w-4 h-4 mr-2" /> Cancel</Button>
            <Button onClick={saveService}><Save className="w-4 h-4 mr-2" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resource Dialog */}
      <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={resourceForm.name} onChange={e => setResourceForm({ ...resourceForm, name: e.target.value })} placeholder="e.g. Exam Room 1" />
            </div>
            <div>
              <Label>Type</Label>
              <select
                value={resourceForm.type}
                onChange={e => setResourceForm({ ...resourceForm, type: e.target.value as 'room' | 'equipment' })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="room">Room</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={resourceForm.status}
                onChange={e => setResourceForm({ ...resourceForm, status: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="available">Available</option>
                <option value="in-use">In Use</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={resourceForm.description} onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResourceDialog(false)}><X className="w-4 h-4 mr-2" /> Cancel</Button>
            <Button onClick={saveResource}><Save className="w-4 h-4 mr-2" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
