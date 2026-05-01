import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Filter, Grid, List, MoreHorizontal, Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from '../../firebase';
import PetDialog from '../../components/crm/pet-dialog';

interface Patient {
  id: string;
  name: string;
  ownerUid: string;
  ownerName?: string;
  species: string;
  breed: string;
  color?: string;
  gender?: string;
  weight: number;
  weightHistory?: any[];
  currentStatus: string;
  dateOfBirth?: string;
  bloodType?: string;
  photo?: string;
  contact?: string;
  email?: string;
  address?: string;
  medicalHistory?: string;
  auditTrail?: any[];
  recentVisits?: any[];
  patientId?: string;
  imageUrl?: string;
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<{ [uid: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchData = useCallback(async () => {
    try {
      // Fetch pets
      const petsSnapshot = await getDocs(collection(db, 'pets'));
      const petsData = petsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown',
          ownerUid: data.ownerUid || '',
          species: data.species || '',
          breed: data.breed || '',
          weight: data.weight || 0,
          currentStatus: data.currentStatus || 'active',
          dateOfBirth: data.dateOfBirth || '',
          photo: data.imageUrl || '',
          patientId: `P-${doc.id.slice(0, 8)}`,
          color: data.color || '',
          gender: data.gender || '',
          bloodType: data.bloodType || '',
          ...data
        } as Patient;
      });

      // Fetch users for owner names
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData: { [uid: string]: any } = {};
      usersSnapshot.docs.forEach(doc => {
        usersData[doc.id] = doc.data();
      });
      setUsers(usersData);

      // Add owner names to patients
      const patientsWithOwners = petsData.map(pet => ({
        ...pet,
        ownerName: usersData[pet.ownerUid]?.displayName || 'Unknown',
        contact: usersData[pet.ownerUid]?.phoneNumber || '',
        email: usersData[pet.ownerUid]?.email || '',
      }));

      setPatients(patientsWithOwners);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (patient.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (patient.patientId || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLetter = selectedLetter ? patient.name.startsWith(selectedLetter) : true;
      return matchesSearch && matchesLetter;
    });
  }, [patients, searchQuery, selectedLetter]);

  const handleAddSubmit = async (formData: any) => {
    try {
      const newPet = {
        name: formData.name,
        species: formData.species,
        breed: formData.breed,
        weight: formData.weight || 0,
        currentStatus: 'discharged',
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodType: formData.bloodType || 'Unknown',
        color: formData.color,
        imageUrl: '',
        ownerUid: formData.ownerUid,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'pets'), newPet);
      setIsAddModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error adding patient:', error);
    }
  };

  const handleEditClick = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPatient(patient);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (formData: any) => {
    if (!editingPatient) return;
    try {
      const updatedData = {
        name: formData.name,
        species: formData.species,
        breed: formData.breed,
        weight: formData.weight || editingPatient.weight,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodType: formData.bloodType,
      };
      await updateDoc(doc(db, 'pets', editingPatient.id), updatedData);
      setIsEditModalOpen(false);
      setEditingPatient(null);
      fetchData();
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const handleDeleteClick = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingPatient(patient);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingPatient) return;
    try {
      await deleteDoc(doc(db, 'pets', deletingPatient.id));
      setIsDeleteModalOpen(false);
      setDeletingPatient(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading patients...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Patient Directory" 
        subtitle={
          <div className="flex items-center gap-2">
            <span>Manage the hospital's central database of animals and their owners.</span>
            <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 px-3 py-1 font-bold rounded-lg shadow-sm">
              {patients.length} Total Records
            </Badge>
          </div>
        }
        actions={
          <Button 
            onClick={() => setIsAddModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-6 py-6 rounded-2xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Register New Patient
          </Button>
        }
      />

      {/* Modern Search & View Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-100 shadow-sm rounded-2xl text-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-gray-300"
            placeholder="Search by Name, ID, Owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-fit self-center">
          <button 
            onClick={() => setViewMode('grid')}
            className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-400 hover:bg-gray-50")}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={cn("p-3 rounded-xl transition-all", viewMode === 'list' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-400 hover:bg-gray-50")}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Sidebar: Navigation */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center text-sm uppercase tracking-wider">
              <span className="w-1 h-4 bg-blue-600 rounded-full mr-2"></span>
              A-Z Index
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setSelectedLetter(null)}
                className={cn(
                  "p-2 text-xs font-bold rounded-xl transition-all flex flex-col items-center border",
                  !selectedLetter 
                    ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-200" 
                    : "bg-white border-gray-100 text-gray-500 hover:border-blue-200 hover:bg-blue-50/30"
                )}
              >
                ALL
                <span className={cn(
                  "text-[10px] font-bold mt-0.5",
                  !selectedLetter ? "text-blue-100" : "text-blue-600"
                )}>
                  {patients.length}
                </span>
              </button>
              {alphabet.map(letter => {
                const count = patients.filter(p => p.name.startsWith(letter)).length;
                return (
                  <button
                    key={letter}
                    onClick={() => setSelectedLetter(letter)}
                    className={cn(
                      "p-2 text-xs font-bold rounded-xl transition-all flex flex-col items-center relative border",
                      selectedLetter === letter 
                        ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-200" 
                        : count > 0 
                          ? "bg-white border-gray-100 text-gray-500 hover:border-blue-200 hover:bg-blue-50/30" 
                          : "bg-gray-50/50 border-transparent text-gray-300 cursor-not-allowed"
                    )}
                    disabled={count === 0}
                  >
                    {letter}
                    {count > 0 && (
                      <span className={cn(
                        "text-[10px] font-bold mt-0.5",
                        selectedLetter === letter ? "text-blue-100" : "text-blue-600"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200">
            <Activity className="w-10 h-10 mb-4 opacity-50" />
            <h4 className="text-xl font-bold mb-2">Hospital Growth</h4>
            <p className="text-blue-100 text-sm mb-4">You have registered 12 new patients this week.</p>
            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl">View Analytics</Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPatients.map(patient => (
                <div 
                  key={patient.id}
                  onClick={() => navigate(`/crm/patients/${patient.patientId}`, { state: { from: '/crm/patients' } })}
                  className="group bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md relative mb-4">
                      {patient.photo ? (
                        <img src={patient.photo} alt={patient.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
                          {patient.name[0]}
                        </div>
                      )}
                    </div>
                    {/* Card Actions */}
                    <div className="absolute top-6 right-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
                            <MoreHorizontal className="h-5 w-5 text-gray-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl p-2 border-gray-100 shadow-xl">
                          <DropdownMenuItem 
                            className="rounded-xl py-3 px-4 focus:bg-blue-50 focus:text-blue-600 font-bold cursor-pointer transition-colors"
                            onClick={(e) => handleEditClick(patient, e)}
                          >
                            <Pencil className="w-4 h-4 mr-3" />
                            Edit Patient
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="rounded-xl py-3 px-4 focus:bg-red-50 focus:text-red-600 font-bold cursor-pointer transition-colors"
                            onClick={(e) => handleDeleteClick(patient, e)}
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Delete Patient
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{patient.name}</h3>
                  </div>
                 
                  <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex items-center text-sm text-gray-500 gap-2">
                      <User className="w-4 h-4 opacity-50" />
                      <span className="font-semibold text-gray-700 truncate">{patient.ownerName}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 gap-2">
                      <Phone className="w-4 h-4 opacity-50" />
                      <span>{patient.contact}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold text-blue-600">View Profile</span>
                    <ChevronRight className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {filteredPatients.map(patient => (
                  <div 
                    key={patient.id}
                    onClick={() => navigate(`/crm/patients/${patient.patientId}`, { state: { from: '/crm/patients' } })}
                    className="flex items-center justify-between p-5 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 relative flex-shrink-0">
                        {patient.photo ? (
                          <img src={patient.photo} alt={patient.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold">
                            {patient.name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{patient.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>{patient.patientId}</span>
                          <span>•</span>
                          <span>{patient.species}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Owner</p>
                        <p className="text-sm font-semibold text-gray-700">{patient.ownerName}</p>
                      </div>
                      <div className="w-32 hidden md:block">
                         <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                         <Badge className={cn(
                            "mt-0.5",
                            patient.currentStatus === 'discharged' || patient.currentStatus === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"
                          )}>
                            {patient.currentStatus}
                          </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-100">
                              <MoreHorizontal className="h-5 w-5 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl p-2 border-gray-100 shadow-xl">
                            <DropdownMenuItem 
                              className="rounded-xl py-3 px-4 focus:bg-blue-50 focus:text-blue-600 font-bold cursor-pointer transition-colors"
                              onClick={(e) => handleEditClick(patient, e)}
                            >
                              <Pencil className="w-4 h-4 mr-3" />
                              Edit Patient
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="rounded-xl py-3 px-4 focus:bg-red-50 focus:text-red-600 font-bold cursor-pointer transition-colors"
                              onClick={(e) => handleDeleteClick(patient, e)}
                            >
                              <Trash2 className="w-4 h-4 mr-3" />
                              Delete Patient
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reusable Pet Dialog for Add */}
      <PetDialog 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        mode="add"
        users={users}
        onSubmit={handleAddSubmit}
        onCancel={() => setIsAddModalOpen(false)}
      />
      
      {/* Reusable Pet Dialog for Edit */}
      <PetDialog 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        mode="edit"
        pet={editingPatient}
        users={users}
        onSubmit={handleEditSubmit}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingPatient(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-6 h-6" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you sure you want to delete <span className="font-bold text-gray-900">{deletingPatient?.name}</span>? 
              This action will permanently remove all medical records and history for this patient.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-6 flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="rounded-xl h-12 px-6 font-bold flex-1">Cancel</Button>
            <Button 
              type="button" 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-red-100 flex-1"
            >
              Delete Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
