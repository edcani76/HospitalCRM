import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Clock, ArrowRight, Filter, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { fetchPets } from '../../lib/firestore-helpers';

export default function EMRDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPets() {
      try {
        const data = await fetchPets();
        setPets(data);
      } catch (error) {
        console.error('Error loading pets:', error);
      } finally {
        setLoading(false);
      }
    }
    loadPets();
  }, []);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  const filteredPatients = pets.filter(patient => {
    const fullName = `${patient.name} (${patient.species})`;
    const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patient.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLetter = selectedLetter ? fullName.toUpperCase().startsWith(selectedLetter) : true;
    return matchesSearch && matchesLetter;
  });

  const recentPatients = pets.slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="Clinical Record Directory" 
        subtitle={
          <div className="flex items-center gap-3">
            <span>Access and manage comprehensive medical histories for all patients.</span>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 rounded-lg px-3 py-1 font-bold shadow-sm">
              {pets.length} Total Records
            </Badge>
          </div>
        }
      />

      {/* Search & Global Actions */}
      <div className="relative mb-12">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-blue-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-12 pr-4 py-6 bg-white border-none shadow-xl rounded-2xl text-xl focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
          placeholder="Search by Patient Name, ID, or Owner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
          <Button variant="outline" className="rounded-xl border-blue-100 text-blue-600 hover:bg-blue-50">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: A-Z Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-4">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></span>
              A-Z Directory
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
                  {pets.length}
                </span>
              </button>
              {alphabet.map(letter => {
                const count = pets.filter(p => {
                  const fullName = `${p.name} (${p.species})`;
                  return fullName.toUpperCase().startsWith(letter);
                }).length;
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
        </div>

        {/* Main Content: Patient List */}
        <div className="lg:col-span-3 space-y-6">
          {/* Recent Patients */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Recent Patients
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentPatients.map((patient) => (
                <div 
                  key={patient.id}
                  onClick={() => navigate(`/crm/emr/${patient.id}`)}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{patient.name}</p>
                      <p className="text-xs text-gray-500">{patient.species} • {patient.breed}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>ID: {patient.id}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Patients */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              All Patients ({filteredPatients.length})
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {filteredPatients.map((patient, idx) => (
                <div 
                  key={patient.id}
                  onClick={() => navigate(`/crm/emr/${patient.id}`)}
                  className={cn(
                    "p-5 flex items-center justify-between cursor-pointer hover:bg-blue-50/30 transition-all group",
                    idx !== filteredPatients.length - 1 && "border-b border-gray-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {patient.name} ({patient.species})
                      </p>
                      <p className="text-sm text-gray-500">
                        {patient.breed} • Owner: {patient.ownerName || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {patient.currentStatus || 'Active'}
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
              {filteredPatients.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No patients found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
