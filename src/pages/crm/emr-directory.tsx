import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, User, Clock, ArrowRight, Filter, ChevronRight, Loader2, Activity, Grid, List } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { fetchPets, fetchUsers } from '../../lib/firestore-helpers';

export default function EMRDirectory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [users, setUsers] = useState<{ [uid: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    async function loadData() {
      try {
        const [petsData, usersData] = await Promise.all([
          fetchPets(),
          fetchUsers()
        ]);
        setPets(petsData);
        const usersMap: { [uid: string]: any } = {};
        usersData.forEach((u: any) => { usersMap[u.id] = u; });
        setUsers(usersMap);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const filteredPatients = useMemo(() => {
    return pets.filter(patient => {
      const fullName = `${patient.name} (${patient.species})`;
      const ownerName = users[patient.ownerUid]?.displayName || users[patient.ownerUid]?.name || '';
      const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             patient.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             ownerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLetter = selectedLetter ? patient.name.toUpperCase().startsWith(selectedLetter) : true;
      return matchesSearch && matchesLetter;
    });
  }, [pets, users, searchQuery, selectedLetter]);

  const recentPatients = pets.slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clinical Record Directory"
        subtitle={
          <div className="flex items-center gap-2">
            <span>Access and manage comprehensive medical histories for all patients.</span>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 px-3 py-1 font-bold rounded-lg shadow-sm">
              {pets.length} Total Records
            </Badge>
          </div>
        }
      />

      {/* Modern Search & View Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-100 shadow-sm rounded-xl text-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-gray-300"
            placeholder="Search by Name, ID, Owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 h-fit self-center">
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
        <div className="lg:col-span-1 md:col-span-2 sm:col-span-3 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center text-sm uppercase tracking-wider">
              <span className="w-1 h-4 bg-blue-600 rounded-full mr-2"></span>
              A-Z Index
            </h3>
            <div className="grid grid-cols-7 sm:grid-cols-6 md:grid-cols-5 gap-1.5">
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
                const count = pets.filter(p => p.name.startsWith(letter)).length;
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

          <div className="bg-blue-600 rounded-xl p-6 text-white shadow-xl shadow-blue-200">
            <Activity className="w-10 h-10 mb-4 opacity-50" />
            <h4 className="text-xl font-bold mb-2">Hospital Growth</h4>
            <p className="text-blue-100 text-sm mb-4">You have registered 12 new patients this week.</p>
            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl">View Analytics</Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-4 md:col-span-10 sm:col-span-9">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPatients.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => navigate(`/crm/emr/${patient.id}`)}
                  className="group bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md relative mb-4">
                      {patient.imageUrl || patient.photo ? (
                        <img src={patient.imageUrl || patient.photo} alt={patient.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
                          {patient.name[0]}
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{patient.name}</h3>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex items-center text-sm text-gray-500 gap-2">
                      <User className="w-4 h-4 opacity-50" />
                      <span className="font-semibold text-gray-700 truncate">{users[patient.ownerUid]?.displayName || users[patient.ownerUid]?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">ID:</span>
                      <span>{patient.id}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold text-blue-600">View Records</span>
                    <ChevronRight className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {filteredPatients.map(patient => (
                  <div
                    key={patient.id}
                    onClick={() => navigate(`/crm/emr/${patient.id}`)}
                    className="flex items-center justify-between p-5 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 relative flex-shrink-0">
                        {patient.imageUrl || patient.photo ? (
                          <img src={patient.imageUrl || patient.photo} alt={patient.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold">
                            {patient.name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{patient.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>{patient.species}</span>
                          <span>•</span>
                          <span>{patient.breed}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Owner</p>
                        <p className="text-sm font-semibold text-gray-700">{users[patient.ownerUid]?.displayName || users[patient.ownerUid]?.name || 'Unknown'}</p>
                      </div>
                      <div className="w-32 hidden md:block">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                        <Badge className={cn(
                          "mt-0.5",
                          patient.currentStatus === 'discharged' || patient.currentStatus === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"
                        )}>
                          {patient.currentStatus || 'Active'}
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
    </div>
  );
}
