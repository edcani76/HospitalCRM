import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Search,
  User,
  Plus,
  Filter,
  ChevronRight,
  Grid,
  List,
  MoreHorizontal,
  Mail,
  Phone,
  Activity,
  UserCheck,
  Calendar,
  MapPin,
  Pencil,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription
} from '../../components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { db, auth, collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc } from '../../firebase';
import { addAuditLog } from '../../lib/firestore-helpers';

interface Owner {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name: string;
  displayName?: string;
  email: string;
  contact?: string;
  phoneNumber?: string;
  address?: string;
  role: string;
  petCount?: number;
  status?: string;
  joinDate?: string;
  createdAt?: string;
}

export default function OwnersPage() {
  const navigate = useNavigate();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [deletingOwner, setDeletingOwner] = useState<Owner | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchData = useCallback(async () => {
    try {
      // Fetch users with role 'client'
      const q = query(collection(db, 'users'), where('role', '==', 'client'));
      const usersSnapshot = await getDocs(q);
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          firstName: data.firstName || '',
          middleName: data.middleName || '',
          lastName: data.lastName || '',
          name: [data.lastName, data.firstName, data.middleName].filter(Boolean).join(' ') || data.displayName || data.email || 'Unknown',
        } as Owner;
      });

      // Fetch pets to count per owner
      const petsSnapshot = await getDocs(collection(db, 'pets'));
      const petsData = petsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPets(petsData);

      // Count pets per owner
      const ownerPetCount: { [uid: string]: number } = {};
      petsData.forEach((pet: any) => {
        if (pet.ownerUid) {
          ownerPetCount[pet.ownerUid] = (ownerPetCount[pet.ownerUid] || 0) + 1;
        }
      });

      // Add pet count to owners
      const ownersWithPetCount = usersData.map(owner => ({
        ...owner,
        petCount: ownerPetCount[owner.id] || 0,
        status: 'Active', // Default status
        joinDate: owner.createdAt,
      }));

      setOwners(ownersWithPetCount);
    } catch (error) {
      console.error('Error fetching owners:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'N/A';
    let date: Date;
    if (dateValue?.toDate) {
      date = dateValue.toDate();
    } else if (dateValue?.seconds) {
      date = new Date(dateValue.seconds * 1000);
    } else {
      date = new Date(dateValue);
    }
    return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMMM yyyy');
  };

  const getOwnerName = (owner: Owner) => {
    if (owner.lastName && owner.firstName) {
      return owner.middleName ? `${owner.lastName}, ${owner.firstName} ${owner.middleName}` : `${owner.lastName}, ${owner.firstName}`;
    }
    return owner.displayName || owner.name || 'Unknown';
  };

  const getOwnerInitials = (owner: Owner) => {
    const parts = [owner.lastName, owner.firstName, owner.middleName].filter(Boolean);
    if (parts.length > 0) return parts[0][0].toUpperCase();
    return (owner.displayName || owner.name || '?')[0].toUpperCase();
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const filteredOwners = useMemo(() => {
    return owners.filter(owner => {
      const fullName = [owner.lastName, owner.firstName, owner.middleName].filter(Boolean).join(' ') || owner.displayName || owner.name || '';
      const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (owner.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (owner.id || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLetter = selectedLetter ? (owner.lastName || fullName).toUpperCase().startsWith(selectedLetter) : true;
      return matchesSearch && matchesLetter;
    });
  }, [owners, searchQuery, selectedLetter]);

  const handleAddOwner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Note: Adding owners requires Firebase Auth user creation
    // This is a simplified version - in production, you'd create an auth user first
    alert('To add a new client, use the Signup page or Firebase Console to create a user with role "client"');
    setIsAddModalOpen(false);
  };

  const handleEditClick = (owner: Owner, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOwner(owner);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (owner: Owner, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingOwner(owner);
    setIsDeleteModalOpen(true);
  };

  const handleUpdateOwner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOwner) return;
    
    try {
      const formData = new FormData(e.currentTarget);
      const updatedData = {
        firstName: formData.get('firstName') as string,
        middleName: formData.get('middleName') as string,
        lastName: formData.get('lastName') as string,
        displayName: `${formData.get('firstName')} ${formData.get('middleName')} ${formData.get('lastName')}`.replace(/\s+/g, ' ').trim(),
        phoneNumber: formData.get('contact') as string,
        email: formData.get('email') as string,
      };
      
      await updateDoc(doc(db, 'users', editingOwner.id), updatedData);
      await addAuditLog({ action: 'owner_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', details: `Updated owner ${editingOwner.displayName || editingOwner.name}` });
      setIsEditModalOpen(false);
      setEditingOwner(null);
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error updating owner:', error);
    }
  };

  const confirmDelete = async () => {
    if (!deletingOwner) return;
    try {
      // Note: Deleting users requires admin SDK or client-side auth deletion
      // This is a simplified version
      alert('To delete a client, use Firebase Console or implement admin SDK');
      setIsDeleteModalOpen(false);
      setDeletingOwner(null);
    } catch (error) {
      console.error('Error deleting owner:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading owners...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Pet Owner Directory" 
        subtitle={
          <div className="flex items-center gap-2">
            <span>Manage the hospital's database of clients and their primary contact information.</span>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1 font-bold rounded-lg shadow-sm">
              {owners.length} Registered Clients
            </Badge>
          </div>
        }
        actions={
          <Button 
            onClick={() => setIsAddModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-6 h-12 rounded-xl font-bold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Client
          </Button>
        }
      />

      {/* Modern Search & View Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-100 shadow-sm rounded-xl text-lg focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-gray-300"
            placeholder="Search by Name, ID, Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className={cn("rounded-xl transition-all", viewMode === 'grid' && "bg-white shadow-sm")}
          >
            <Grid className="h-5 w-5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            className={cn("rounded-xl transition-all", viewMode === 'list' && "bg-white shadow-sm")}
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* A-Z Alpha-Filter Bar */}
      <div className="flex flex-wrap items-center justify-center gap-1 p-3 bg-white rounded-xl border border-gray-100 shadow-sm mb-10">
        <button
          onClick={() => setSelectedLetter(null)}
          className={cn(
            "flex flex-col items-center justify-center h-10 w-10 p-0 rounded-xl font-bold transition-colors",
            selectedLetter === null ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
          )}
        >
          All
        </button>
        {alphabet.map((letter) => {
          const count = owners.filter(o => (o.lastName || o.displayName || o.name).toUpperCase().startsWith(letter)).length;
          return (
            <button
              key={letter}
              onClick={() => setSelectedLetter(letter)}
              className={cn(
                "flex flex-col items-center justify-center h-10 w-10 p-0 rounded-xl font-bold transition-colors",
                selectedLetter === letter
                  ? "bg-emerald-600 text-white"
                  : count > 0
                    ? "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                    : "text-gray-200 cursor-not-allowed"
              )}
              disabled={count === 0}
            >
              {letter}
              {count > 0 && (
                <span className={cn(
                  "text-[8px] font-bold leading-none mt-0.5",
                  selectedLetter === letter ? "text-emerald-100" : "text-emerald-600"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Owner Grid/List Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredOwners.map((owner) => (
            <div 
              key={owner.id} 
              className="group relative bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-100/50 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl font-bold mb-4 group-hover:scale-110 transition-transform">
                        {getOwnerInitials(owner)}
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
                        className="rounded-xl py-3 px-4 focus:bg-emerald-50 focus:text-emerald-600 font-bold cursor-pointer transition-colors"
                        onClick={(e) => handleEditClick(owner, e)}
                      >
                        <Pencil className="w-4 h-4 mr-3" />
                        Edit Client
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="rounded-xl py-3 px-4 focus:bg-red-50 focus:text-red-600 font-bold cursor-pointer transition-colors"
                        onClick={(e) => handleDeleteClick(owner, e)}
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        Delete Client
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{getOwnerName(owner)}</h3>
                <p className="text-sm text-gray-400 font-medium mb-3">Member since {formatDate(owner.joinDate)}</p>
                <Badge 
                  className={cn(
                    "px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider",
                    owner.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-100"
                  )}
                >
                  {owner.status}
                </Badge>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                  <Mail className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="break-all">{owner.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span>{owner.phoneNumber || owner.contact || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 border-t border-gray-50 pt-4 px-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">{owner.petCount || 0} Registered Pets</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full rounded-xl h-12 border-gray-100 group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-all font-bold"
                onClick={() => navigate(`/crm/owners/${owner.id}`, { state: { from: '/crm/owners' } })}
              >
                View Profile
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Client Name</th>
                <th className="text-left px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Info</th>
                <th className="text-left px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Pets</th>
                <th className="text-right px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOwners.map((owner) => (
                <tr 
                  key={owner.id} 
                  className="hover:bg-emerald-50/30 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/crm/owners/${owner.id}`, { state: { from: '/crm/owners' } })}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  {getOwnerInitials(owner)}
                      </div>
                        <div>
                        <p className="font-bold text-gray-900">{getOwnerName(owner)}</p>
                        <p className="text-xs text-gray-400">Member since {formatDate(owner.joinDate)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-600">
                    <div className="flex flex-col">
                      <span className="font-medium">{owner.email}</span>
                      <span className="text-gray-400 text-xs">{owner.phoneNumber || owner.contact || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <Badge className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase",
                      owner.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-100"
                    )}>
                      {owner.status}
                    </Badge>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-gray-600">
                    {owner.petCount || 0} Pets
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-100">
                            <MoreHorizontal className="h-5 w-5 text-gray-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl p-2 border-gray-100 shadow-xl">
                          <DropdownMenuItem 
                            className="rounded-xl py-3 px-4 focus:bg-emerald-50 focus:text-emerald-600 font-bold cursor-pointer transition-colors"
                            onClick={(e) => handleEditClick(owner, e)}
                          >
                            <Pencil className="w-4 h-4 mr-3" />
                            Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="rounded-xl py-3 px-4 focus:bg-red-50 focus:text-red-600 font-bold cursor-pointer transition-colors"
                            onClick={(e) => handleDeleteClick(owner, e)}
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Delete Client
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-xl hover:bg-emerald-100 hover:text-emerald-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/crm/owners/${owner.id}`, { state: { from: '/crm/owners' } });
                        }}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Owner Modal */}
      <Drawer open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DrawerContent className="">
          <DrawerHeader>
            <DrawerTitle className="text-2xl font-bold">Register New Client</DrawerTitle>
            <DrawerDescription>Add a new pet owner to the hospital database.</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleAddOwner} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="lastName" className="font-bold text-gray-700">Last Name</Label>
                <Input id="lastName" name="lastName" required className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName" className="font-bold text-gray-700">First Name</Label>
                <Input id="firstName" name="firstName" required className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName" className="font-bold text-gray-700">Middle Name</Label>
                <Input id="middleName" name="middleName" className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact" className="font-bold text-gray-700">Phone Number</Label>
                <Input id="contact" name="contact" required className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold text-gray-700">Email Address</Label>
                <Input id="email" name="email" type="email" required className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="font-bold text-gray-700">Home Address</Label>
                <Input id="address" name="address" required className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" />
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-emerald-100 flex-1">Register Client</Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
      {/* Edit Owner Modal */}
      <Drawer open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DrawerContent className="">
          <DrawerHeader>
            <DrawerTitle className="text-2xl font-bold">Edit Client Information</DrawerTitle>
            <DrawerDescription>Update contact details for {editingOwner ? getOwnerName(editingOwner) : ''}.</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleUpdateOwner} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-lastName" className="font-bold text-gray-700">Last Name</Label>
                <Input 
                  id="edit-lastName" 
                  name="lastName" 
                  defaultValue={editingOwner?.lastName} 
                  required 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-firstName" className="font-bold text-gray-700">First Name</Label>
                <Input 
                  id="edit-firstName" 
                  name="firstName" 
                  defaultValue={editingOwner?.firstName} 
                  required 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-middleName" className="font-bold text-gray-700">Middle Name</Label>
                <Input 
                  id="edit-middleName" 
                  name="middleName" 
                  defaultValue={editingOwner?.middleName} 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact" className="font-bold text-gray-700">Phone Number</Label>
                <Input 
                  id="edit-contact" 
                  name="contact" 
                  defaultValue={editingOwner?.contact} 
                  required 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="font-bold text-gray-700">Email Address</Label>
                <Input 
                  id="edit-email" 
                  name="email" 
                  type="email" 
                  defaultValue={editingOwner?.email} 
                  required 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address" className="font-bold text-gray-700">Home Address</Label>
                <Input 
                  id="edit-address" 
                  name="address" 
                  defaultValue={editingOwner?.address} 
                  required 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                />
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-emerald-100 flex-1">Save Changes</Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Modal */}
      <Drawer open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DrawerContent className="">
          <DrawerHeader>
            <DrawerTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-6 h-6" />
              Confirm Deletion
            </DrawerTitle>
            <DrawerDescription className="text-base pt-2">
              Are you sure you want to delete <span className="font-bold text-gray-900">{deletingOwner?.name}</span>? 
              This action cannot be undone and will remove all associated pet records.
            </DrawerDescription>
          </DrawerHeader>
          <div className="pt-6 flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="rounded-xl h-12 px-6 font-bold flex-1">Cancel</Button>
            <Button 
              type="button" 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-red-100 flex-1"
            >
              Delete Permanently
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
