import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../../components/ui/drawer';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { db, auth, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from '../../firebase';
import { addAuditLog } from '../../lib/firestore-helpers';
import { format, differenceInDays } from 'date-fns';
import { 
  Plus, Search, Calendar, Clock, User, Stethoscope, Heart, 
  Activity, Pill, FileText, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Loader2, Bed, Thermometer, Droplet, Wind, Scale,
  Edit, Trash2, LogOut, Eye
} from 'lucide-react';
import { SearchBar } from '../../components/ui/search-bar';
import { Admission, AdmissionRound, AdmissionService, DischargeSummary, Pet, Doctor } from '../../types';

export default function AdmissionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [filteredAdmissions, setFilteredAdmissions] = useState<Admission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'admitted' | 'discharged'>('all');
  const [isAdmitDialogOpen, setIsAdmitDialogOpen] = useState(false);
  const [isDischargeDialogOpen, setIsDischargeDialogOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admit form state
  const [admitForm, setAdmitForm] = useState({
    petId: '',
    petName: '',
    reason: '',
    cageWard: '',
    initialDiagnosis: '',
    specialInstructions: '',
    expectedDays: 1
  });

  // Discharge form state
  const [dischargeForm, setDischargeForm] = useState({
    summary: '',
    finalDiagnosis: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
    followUpInstructions: ''
  });

  // Detail states
  const [admissionRounds, setAdmissionRounds] = useState<AdmissionRound[]>([]);
  const [admissionServices, setAdmissionServices] = useState<AdmissionService[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    fetchAdmissions();
    fetchDoctors();
    fetchPets();
  }, []);

  useEffect(() => {
    filterAdmissions();
  }, [admissions, searchTerm, statusFilter]);

  const fetchAdmissions = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'admissions'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Admission));
      data.sort((a, b) => {
        const dateA = a.checkInDate?.toDate?.() || new Date(0);
        const dateB = b.checkInDate?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setAdmissions(data);
    } catch (error) {
      console.error('Error fetching admissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'doctors'));
      setDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor)));
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchPets = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'pets'));
      setPets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet)));
    } catch (error) {
      console.error('Error fetching pets:', error);
    }
  };

  const filterAdmissions = () => {
    let filtered = [...admissions];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.petName?.toLowerCase().includes(term) ||
        a.ownerName?.toLowerCase().includes(term) ||
        a.reason?.toLowerCase().includes(term) ||
        a.cageWard?.toLowerCase().includes(term)
      );
    }
    
    setFilteredAdmissions(filtered);
  };

  const handleAdmitPet = async () => {
    if (!admitForm.petId || !admitForm.reason) {
      alert('Please select a pet and provide admission reason');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const pet = pets.find(p => p.id === admitForm.petId);
      const ownerDoc = pet?.ownerUid ? await getDoc(doc(db, 'users', pet.ownerUid)) : null;
      
      const expectedDischarge = new Date();
      expectedDischarge.setDate(expectedDischarge.getDate() + admitForm.expectedDays);
      
      const newAdmission = {
        petId: admitForm.petId,
        petName: pet?.name || admitForm.petName,
        ownerId: pet?.ownerUid || '',
        ownerName: ownerDoc?.data()?.displayName || ownerDoc?.data()?.name || '',
        checkInDate: serverTimestamp(),
        expectedDischarge: expectedDischarge,
        reason: admitForm.reason,
        status: 'admitted' as const,
        cageWard: admitForm.cageWard || null,
        initialDiagnosis: admitForm.initialDiagnosis || null,
        specialInstructions: admitForm.specialInstructions || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'admissions'), newAdmission);
      await addAuditLog({ action: 'admission_created', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', details: `Admitted ${admitForm.petName}` });
      await fetchAdmissions();
      setIsAdmitDialogOpen(false);
      resetAdmitForm();
    } catch (error) {
      console.error('Error admitting pet:', error);
      alert('Failed to admit pet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDischargePet = async () => {
    if (!selectedAdmission || !dischargeForm.summary) {
      alert('Please provide a discharge summary');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Update admission status
      await updateDoc(doc(db, 'admissions', selectedAdmission.id!), {
        status: 'discharged',
        actualDischarge: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await addAuditLog({ action: 'admission_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', details: `Discharged ${selectedAdmission.petName}` });
      
      // Create discharge summary
      await addDoc(collection(db, 'discharge_summaries'), {
        admissionId: selectedAdmission.id,
        petId: selectedAdmission.petId,
        petName: selectedAdmission.petName,
        dischargeDate: serverTimestamp(),
        summary: dischargeForm.summary,
        finalDiagnosis: dischargeForm.finalDiagnosis || null,
        medications: dischargeForm.medications.filter(m => m.name),
        followUpInstructions: dischargeForm.followUpInstructions || null,
        signedBy: auth.currentUser?.uid || '',
        createdAt: serverTimestamp()
      });
      await addAuditLog({ action: 'discharge_summary_created', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', details: `Discharge summary for ${selectedAdmission.petName}` });
      
      await fetchAdmissions();
      setIsDischargeDialogOpen(false);
      setSelectedAdmission(null);
      resetDischargeForm();
    } catch (error) {
      console.error('Error discharging pet:', error);
      alert('Failed to discharge pet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAdmitForm = () => {
    setAdmitForm({
      petId: '',
      petName: '',
      reason: '',
      cageWard: '',
      initialDiagnosis: '',
      specialInstructions: '',
      expectedDays: 1
    });
  };

  const resetDischargeForm = () => {
    setDischargeForm({
      summary: '',
      finalDiagnosis: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
      followUpInstructions: ''
    });
  };

  const getStayDuration = (checkIn: any) => {
    const checkInDate = checkIn?.toDate?.() || new Date(checkIn);
    return differenceInDays(new Date(), checkInDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'admitted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'discharged': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'transferred': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="Admissions" 
        subtitle="Manage patient admissions and confinements"
        actions={
          (user?.role === 'admin' || user?.role === 'staff' || user?.role === 'doctor') && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-6 h-12 rounded-xl font-bold"
              onClick={() => setIsAdmitDialogOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Admit Patient
            </Button>
          )
        }
      />

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by pet name, owner, or reason..."
          color="emerald"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'admitted' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('admitted')}
        >
          Admitted
        </Button>
        <Button
          variant={statusFilter === 'discharged' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('discharged')}
        >
          Discharged
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Bed className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{admissions.filter(a => a.status === 'admitted').length}</p>
                <p className="text-sm text-gray-500">Currently Admitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{admissions.filter(a => a.status === 'discharged').length}</p>
                <p className="text-sm text-gray-500">Total Discharged</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {admissions.filter(a => a.status === 'admitted').length > 0 
                    ? Math.max(...admissions.filter(a => a.status === 'admitted').map(a => getStayDuration(a.checkInDate)))
                    : 0}
                </p>
                <p className="text-sm text-gray-500">Longest Stay (days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admissions List */}
      <div className="space-y-4">
        {filteredAdmissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No admissions found</p>
            </CardContent>
          </Card>
        ) : (
          filteredAdmissions.map(admission => (
            <Card key={admission.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                      {admission.petName?.[0] || 'P'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{admission.petName}</h3>
                      <p className="text-sm text-gray-500">Owner: {admission.ownerName || 'Unknown'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {admission.cageWard && (
                          <Badge variant="outline" className="text-xs">
                            <Bed className="w-3 h-3 mr-1" />
                            {admission.cageWard}
                          </Badge>
                        )}
                        <Badge className={getStatusColor(admission.status)}>
                          {admission.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      Check-in: {admission.checkInDate?.toDate?.() ? format(admission.checkInDate.toDate(), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                    {admission.status === 'admitted' && (
                      <p className="text-sm font-medium text-blue-600">
                        {getStayDuration(admission.checkInDate)} days
                      </p>
                    )}
                    {admission.actualDischarge && (
                      <p className="text-sm text-gray-500">
                        Discharged: {format(admission.actualDischarge.toDate(), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Reason:</span> {admission.reason}
                  </p>
                  {admission.initialDiagnosis && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Initial Diagnosis:</span> {admission.initialDiagnosis}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/crm/admissions/${admission.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  {admission.status === 'admitted' && (user?.role === 'admin' || user?.role === 'staff' || user?.role === 'doctor') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => {
                        setSelectedAdmission(admission);
                        setIsDischargeDialogOpen(true);
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      Discharge
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Admit Patient Dialog */}
      <Drawer open={isAdmitDialogOpen} onOpenChange={setIsAdmitDialogOpen}>
        <DrawerContent className="">
          <DrawerHeader>
            <DrawerTitle>Admit Patient</DrawerTitle>
            <DrawerDescription>Create a new patient admission record</DrawerDescription>
          </DrawerHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
            <div className="space-y-2">
              <Label htmlFor="petId">Select Pet *</Label>
              <select
                id="petId"
                value={admitForm.petId}
                onChange={(e) => {
                  const pet = pets.find(p => p.id === e.target.value);
                  setAdmitForm({ 
                    ...admitForm, 
                    petId: e.target.value,
                    petName: pet?.name || ''
                  });
                }}
                className="w-full rounded-lg border border-gray-200 p-2.5 text-sm"
                required
              >
                <option value="">Select a pet...</option>
                {pets.map(pet => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Admission Reason *</Label>
              <Textarea
                id="reason"
                value={admitForm.reason}
                onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })}
                placeholder="Describe the reason for admission..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cageWard">Cage/Ward</Label>
                <Input
                  id="cageWard"
                  value={admitForm.cageWard}
                  onChange={(e) => setAdmitForm({ ...admitForm, cageWard: e.target.value })}
                  placeholder="e.g., Ward A-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDays">Expected Stay (days)</Label>
                <Input
                  id="expectedDays"
                  type="number"
                  min={1}
                  value={admitForm.expectedDays}
                  onChange={(e) => setAdmitForm({ ...admitForm, expectedDays: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initialDiagnosis">Initial Diagnosis</Label>
              <Input
                id="initialDiagnosis"
                value={admitForm.initialDiagnosis}
                onChange={(e) => setAdmitForm({ ...admitForm, initialDiagnosis: e.target.value })}
                placeholder="Initial diagnosis if known"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                value={admitForm.specialInstructions}
                onChange={(e) => setAdmitForm({ ...admitForm, specialInstructions: e.target.value })}
                placeholder="Any special care instructions, medications, etc."
                rows={2}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={() => setIsAdmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleAdmitPet}
              disabled={isSubmitting || !admitForm.petId || !admitForm.reason}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Admitting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Admit Patient
                </>
              )}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Discharge Patient Dialog */}
      <Drawer open={isDischargeDialogOpen} onOpenChange={setIsDischargeDialogOpen}>
        <DrawerContent className="">
          <DrawerHeader>
            <DrawerTitle>Discharge Patient</DrawerTitle>
            <DrawerDescription>
              Discharge {selectedAdmission?.petName} after {selectedAdmission && getStayDuration(selectedAdmission.checkInDate)} days
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
            <div className="space-y-2">
              <Label htmlFor="summary">Discharge Summary *</Label>
              <Textarea
                id="summary"
                value={dischargeForm.summary}
                onChange={(e) => setDischargeForm({ ...dischargeForm, summary: e.target.value })}
                placeholder="Summarize the patient's stay and condition at discharge..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalDiagnosis">Final Diagnosis</Label>
              <Input
                id="finalDiagnosis"
                value={dischargeForm.finalDiagnosis}
                onChange={(e) => setDischargeForm({ ...dischargeForm, finalDiagnosis: e.target.value })}
                placeholder="Final diagnosis"
              />
            </div>

            <div className="space-y-2">
              <Label>Send-Home Medications</Label>
              {dischargeForm.medications.map((med, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
                  <Input
                    placeholder="Medication name"
                    value={med.name}
                    onChange={(e) => {
                      const updated = [...dischargeForm.medications];
                      updated[idx].name = e.target.value;
                      setDischargeForm({ ...dischargeForm, medications: updated });
                    }}
                  />
                  <Input
                    placeholder="Dosage"
                    value={med.dosage}
                    onChange={(e) => {
                      const updated = [...dischargeForm.medications];
                      updated[idx].dosage = e.target.value;
                      setDischargeForm({ ...dischargeForm, medications: updated });
                    }}
                  />
                  <Input
                    placeholder="Frequency"
                    value={med.frequency}
                    onChange={(e) => {
                      const updated = [...dischargeForm.medications];
                      updated[idx].frequency = e.target.value;
                      setDischargeForm({ ...dischargeForm, medications: updated });
                    }}
                  />
                  <Input
                    placeholder="Duration"
                    value={med.duration}
                    onChange={(e) => {
                      const updated = [...dischargeForm.medications];
                      updated[idx].duration = e.target.value;
                      setDischargeForm({ ...dischargeForm, medications: updated });
                    }}
                  />
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDischargeForm({
                  ...dischargeForm,
                  medications: [...dischargeForm.medications, { name: '', dosage: '', frequency: '', duration: '' }]
                })}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Medication
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="followUp">Follow-up Instructions</Label>
              <Textarea
                id="followUp"
                value={dischargeForm.followUpInstructions}
                onChange={(e) => setDischargeForm({ ...dischargeForm, followUpInstructions: e.target.value })}
                placeholder="Instructions for follow-up care, diet, activity restrictions, etc."
                rows={2}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={() => {
              setIsDischargeDialogOpen(false);
              setSelectedAdmission(null);
              resetDischargeForm();
            }}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleDischargePet}
              disabled={isSubmitting || !dischargeForm.summary}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Discharging...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Discharge Patient
                </>
              )}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}