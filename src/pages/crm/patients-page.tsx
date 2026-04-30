import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { patients as initialPatients } from '../../data/crm-data';

export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState(initialPatients);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           patient.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           patient.patientId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLetter = selectedLetter ? patient.name.startsWith(selectedLetter) : true;
      return matchesSearch && matchesLetter;
    });
  }, [patients, searchQuery, selectedLetter]);

  const handleAddPatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPatient = {
      id: (patients.length + 1).toString(),
      patientId: `P-${1000 + patients.length + 1}`,
      name: formData.get('name') as string,
      owner: formData.get('owner') as string,
      species: formData.get('species') as string,
      breed: formData.get('breed') as string,
      status: 'Active',
      contact: formData.get('contact') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      dateOfBirth: formData.get('dob') as string,
      gender: formData.get('gender') as string,
      bloodType: formData.get('bloodType') as string,
      emergencyContact: '',
      medicalHistory: '',
      recentVisits: []
    };
    setPatients([newPatient, ...patients]);
    setIsAddModalOpen(false);
  };

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
                    <span className={cn(
                      "text-[9px] font-bold mt-0.5",
                      selectedLetter === letter 
                        ? "text-blue-100" 
                        : count > 0 ? "text-blue-600" : "text-gray-300"
                    )}>
                      {count}
                    </span>
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
                  className="group bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer overflow-hidden relative"
                  onClick={() => navigate(`/crm/patients/${patient.patientId}`, { state: { from: '/crm/patients' } })}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md relative">
                        {patient.photo ? (
                          <img src={patient.photo} alt={patient.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
                            {patient.name[0]}
                          </div>
                        )}
                      </div>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-5 h-5 border-2 border-white rounded-full",
                        patient.status === 'Active' ? 'bg-green-500' : 'bg-gray-300'
                      )}></div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight mb-6">{patient.name}</h3>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex items-center text-sm text-gray-500 gap-2">
                      <User className="w-4 h-4 opacity-50" />
                      <span className="font-semibold text-gray-700 truncate">{patient.owner}</span>
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
                        <p className="text-sm font-semibold text-gray-700">{patient.owner}</p>
                      </div>
                      <div className="w-32 hidden md:block">
                         <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                         <Badge className={cn(
                            "mt-0.5",
                            patient.status === 'Active' ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"
                          )}>
                            {patient.status}
                          </Badge>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Patient Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Register New Patient</DialogTitle>
            <DialogDescription>Fill out the profile for a new animal and its primary owner.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPatient} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold">Pet Name</Label>
                <Input id="name" name="name" className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white" placeholder="Buddy" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner" className="font-bold">Owner Name</Label>
                <Input id="owner" name="owner" className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white" placeholder="John Smith" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="species" className="font-bold">Species</Label>
                <Input id="species" name="species" className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white" placeholder="Dog" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed" className="font-bold">Breed</Label>
                <Input id="breed" name="breed" className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white" placeholder="Golden Retriever" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact" className="font-bold">Contact Number</Label>
                <Input id="contact" name="contact" className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white" placeholder="(555) 000-0000" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold">Email Address</Label>
                <Input id="email" name="email" type="email" className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white" placeholder="owner@example.com" />
              </div>
            </div>
            <DialogFooter className="pt-4 flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-blue-100">Create Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
