import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Clock, ArrowRight, Filter, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { patients as allPatients } from '../../data/crm-data';

export default function EMRDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const filteredPatients = allPatients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patient.patientId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLetter = selectedLetter ? patient.name.startsWith(selectedLetter) : true;
    return matchesSearch && matchesLetter;
  });

  const recentPatients = allPatients.slice(0, 3); // Mocking recent patients

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="Clinical Record Directory" 
        subtitle={
          <div className="flex items-center gap-3">
            <span>Access and manage comprehensive medical histories for all patients.</span>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 rounded-lg px-3 py-1 font-bold shadow-sm">
              {allPatients.length} Total Records
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
                  {allPatients.length}
                </span>
              </button>
              {alphabet.map(letter => {
                const count = allPatients.filter(p => p.name.startsWith(letter)).length;
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

            <div className="mt-8 pt-8 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Quick Stats</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Total Records</span>
                  <span className="font-bold text-gray-900">{allPatients.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Updates Today</span>
                  <span className="font-bold text-green-600">12</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: Results & Recent */}
        <div className="lg:col-span-3 space-y-10">
          {/* Recently Viewed (Only show if no search/filter) */}
          {!searchQuery && !selectedLetter && (
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Recently Viewed
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentPatients.map(patient => (
                  <div 
                    key={patient.id}
                    onClick={() => navigate(`/crm/emr/${patient.patientId}`, {
                      state: { from: '/crm/emr' }
                    })}
                    className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl mb-4">
                        {patient.name[0]}
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{patient.name}</h4>
                      <p className="text-xs text-gray-500 mb-2">{patient.species} • {patient.breed}</p>
                      <Badge variant="outline" className="text-[10px] bg-blue-50/50 border-blue-100">{patient.patientId}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Patient List */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Patient List {selectedLetter && `— Starting with "${selectedLetter}"`}
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {filteredPatients.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {filteredPatients.map(patient => (
                    <div 
                      key={patient.id}
                      onClick={() => navigate(`/crm/emr/${patient.patientId}`, {
                        state: { from: '/crm/emr' }
                      })}
                      className="flex items-center justify-between p-5 hover:bg-blue-50/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          {patient.name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{patient.name}</h4>
                          <p className="text-sm text-gray-500">{patient.patientId} • Owner: {patient.owner}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</p>
                          <Badge className={cn(
                            "mt-1",
                            patient.status === 'Active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          )}>
                            {patient.status}
                          </Badge>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-gray-200" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">No records found</h4>
                  <p className="text-gray-500">Try adjusting your search or filter settings.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
