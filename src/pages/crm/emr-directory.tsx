import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, User, ChevronRight, Loader2, Activity, Grid, List,
  CircleDot, CheckCircle2, FileText, Stethoscope, AlertTriangle, X, Calendar,
  Eye, ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { PageHeader } from '../../components/ui/page-header';
import { fetchPets, fetchUsers, fetchEncounters } from '../../lib/firestore-helpers';
import { db, collection, getDocs, query, where } from '../../firebase';
import { format } from 'date-fns';

type TabType = 'patients' | 'encounters';

function getEncounterStatusBadge(status: string) {
  switch (status) {
    case 'in-progress': return <Badge className="bg-blue-600 text-white text-[10px]">In Progress</Badge>;
    case 'medical-completed': return <Badge className="bg-purple-600 text-white text-[10px]">Medical Complete</Badge>;
    case 'completed': return <Badge className="bg-emerald-600 text-white text-[10px]">Completed</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function parseDate(val: any): number {
  if (!val) return 0;
  if (typeof val?.toDate === 'function') return val.toDate().getTime();
  if (val?._seconds !== undefined) return val._seconds * 1000;
  if (typeof val === 'string') { const ts = Date.parse(val); return isNaN(ts) ? 0 : ts; }
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val > 1e12 ? val : val * 1000;
  return 0;
}

function formatDate(val: any): string {
  const ts = parseDate(val);
  if (!ts) return '—';
  try { return format(new Date(ts), 'MMM dd, yyyy'); } catch { return '—'; }
}

function formatTime(val: any): string {
  const ts = parseDate(val);
  if (!ts) return '';
  try { return format(new Date(ts), 'hh:mm a'); } catch { return ''; }
}

export default function EMRDirectory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [users, setUsers] = useState<{ [uid: string]: any }>({});
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<TabType>('patients');
  const [activeEncounters, setActiveEncounters] = useState<Map<string, string>>(new Map());
  const [selectedEncounter, setSelectedEncounter] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [petsData, usersData, encData] = await Promise.all([
          fetchPets(),
          fetchUsers(),
          fetchEncounters(),
        ]);
        setPets(petsData);
        const usersMap: { [uid: string]: any } = {};
        usersData.forEach((u: any) => { usersMap[u.id] = u; });
        setUsers(usersMap);
        setEncounters(encData);

        const activePetIds = new Map<string, string>();
        encData.forEach((enc: any) => {
          if (enc.petId && (enc.status === 'in-progress' || enc.status === 'medical-completed')) {
            activePetIds.set(enc.petId, enc.status);
          }
        });
        setActiveEncounters(activePetIds);

        try {
          const apptSnap = await getDocs(query(collection(db, 'appointments'), where('status', 'in', ['unconfirmed', 'confirmed', 'in-progress', 'medical-completed'])));
          setAllAppointments(apptSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {}
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // ---- KPI computations ----
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayEncounters = useMemo(() =>
    encounters.filter(e => {
      const d = new Date(parseDate(e.startedAt));
      return format(d, 'yyyy-MM-dd') === todayStr;
    }), [encounters, todayStr]);

  const inProgressCount = useMemo(() =>
    encounters.filter(e => e.status === 'in-progress').length, [encounters]);

  const medicalCompletedCount = useMemo(() =>
    encounters.filter(e => e.status === 'medical-completed').length, [encounters]);

  const completedCount = useMemo(() =>
    encounters.filter(e => e.status === 'completed').length, [encounters]);

  const todayAppointments = useMemo(() =>
    allAppointments.filter(a => a.date === todayStr && a.status !== 'cancelled'), [allAppointments, todayStr]);

  // ---- Alert banner ----
  const alerts = useMemo(() => {
    const items: string[] = [];
    const incompleteSoap = encounters.filter(e => e.status === 'in-progress').length;
    if (incompleteSoap > 0) items.push(`${incompleteSoap} active consultation${incompleteSoap !== 1 ? 's' : ''}`);
    if (medicalCompletedCount > 0) items.push(`${medicalCompletedCount} pending billing`);
    return items;
  }, [encounters, medicalCompletedCount]);

  // ---- Patient filtering ----
  const filteredPatients = useMemo(() => {
    return pets.filter(patient => {
      if (!patient) return false;
      const fullName = `${patient.name || ''} (${patient.species || 'Unknown'})`;
      const ownerName = users[patient.ownerUid]?.displayName || users[patient.ownerUid]?.name || '';
      const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (patient.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                             ownerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLetter = selectedLetter ? (patient.name || '').toUpperCase().startsWith(selectedLetter) : true;
      return matchesSearch && matchesLetter;
    });
  }, [pets, users, searchQuery, selectedLetter]);

  // ---- Encounter filtering ----
  const filteredEncounters = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return encounters.filter(enc => {
      if (!enc) return false;
      const petName = pets.find(p => p?.id === enc.petId)?.name || '';
      const ownerName = users[pets.find(p => p?.id === enc.petId)?.ownerUid]?.displayName || '';
      const doctorName = enc.doctorName || '';
      const complaint = enc.chiefComplaint || '';
      const diagnosis = enc.diagnosis || '';
      const target = `${petName} ${ownerName} ${doctorName} ${complaint} ${diagnosis} ${enc.id}`.toLowerCase();
      return target.includes(q);
    });
  }, [encounters, pets, users, searchQuery]);

  const openEncounterDetail = (enc: any) => {
    setSelectedEncounter(enc);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const petNameForEncounter = (enc: any) => {
    const p = pets.find(p => p?.id === enc.petId);
    return p?.name || 'Unknown Pet';
  };

  const ownerNameForEncounter = (enc: any) => {
    const p = pets.find(p => p?.id === enc.petId);
    if (!p) return '—';
    return users[p.ownerUid]?.displayName || users[p.ownerUid]?.name || '—';
  };

  const petSpeciesForEncounter = (enc: any) => {
    const p = pets.find(p => p?.id === enc.petId);
    return p?.species || '';
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header, KPIs, Alerts, & Controls Section */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-4 pb-4 -mt-4 px-4 -mx-4 md:pt-6 md:-mt-6 md:px-6 md:-mx-6 lg:pt-8 lg:-mt-8 lg:px-8 lg:-mx-8 border-b border-gray-200/50 mb-6 space-y-4">
        {/* Header */}
        <PageHeader
          title="EMR & Medical Records"
          subtitle={
            <span>Manage consultations, SOAP notes, diagnoses, prescriptions, lab orders, and clinical history</span>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="shadow-sm border-stone-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Today's Consults</p>
                  <p className="text-2xl font-bold text-stone-900 mt-1">{todayEncounters.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              {todayAppointments.length > 0 && (
                <p className="text-[10px] text-stone-400 mt-2">{todayAppointments.length} scheduled</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-stone-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{inProgressCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-stone-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Medical Complete</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{medicalCompletedCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-[10px] text-stone-400 mt-2">Pending billing</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-stone-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Completed</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-stone-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total Patients</p>
                  <p className="text-2xl font-bold text-stone-900 mt-1">{pets.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-stone-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-stone-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total Records</p>
                  <p className="text-2xl font-bold text-stone-900 mt-1">{encounters.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{alerts.join(' • ')}</span>
          </div>
        )}

        {/* Controls Section */}
        <div className="space-y-4">
        {/* Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3 bg-white border border-stone-200 shadow-sm rounded-xl text-base focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-stone-300"
              placeholder={activeTab === 'patients' ? "Search by Name, ID, Owner..." : "Search by pet, owner, doctor, diagnosis, complaint..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-stone-200 h-fit self-center">
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-2.5 rounded-xl transition-all", viewMode === 'grid' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-stone-400 hover:bg-stone-50")}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn("p-2.5 rounded-xl transition-all", viewMode === 'list' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-stone-400 hover:bg-stone-50")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-stone-100 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab('patients'); setSearchQuery(''); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'patients' ? "bg-white text-blue-600 shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            <User className="w-4 h-4 inline mr-1.5" />
            Patients
          </button>
          <button
            onClick={() => { setActiveTab('encounters'); setSearchQuery(''); setSelectedLetter(null); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'encounters' ? "bg-white text-blue-600 shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            <FileText className="w-4 h-4 inline mr-1.5" />
            Encounters
            <span className="ml-1.5 text-[10px] bg-stone-200 px-1.5 py-0.5 rounded-full">{encounters.length}</span>
          </button>
        </div>

        {/* A-Z Alpha-Filter Bar (Only in Patients Tab) */}
        {activeTab === 'patients' && (
          <div className="flex flex-wrap items-center justify-center gap-1 p-3 bg-white rounded-xl border border-stone-200 shadow-sm">
            <button
              onClick={() => setSelectedLetter(null)}
              className={cn(
                "flex flex-col items-center justify-center h-9 w-9 p-0 rounded-xl font-bold transition-colors text-xs",
                selectedLetter === null ? "bg-blue-600 text-white" : "text-stone-400 hover:text-blue-600 hover:bg-blue-50"
              )}
            >
              All
            </button>
            {alphabet.map((letter) => {
              const count = pets.filter(p => p?.name?.startsWith(letter)).length;
              return (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(letter)}
                  className={cn(
                    "flex flex-col items-center justify-center h-9 w-9 p-0 rounded-xl font-bold transition-colors text-xs",
                    selectedLetter === letter
                      ? "bg-blue-600 text-white"
                      : count > 0
                        ? "text-stone-400 hover:text-blue-600 hover:bg-blue-50"
                        : "text-stone-200 cursor-not-allowed"
                  )}
                  disabled={count === 0}
                >
                  {letter}
                  {count > 0 && (
                    <span className={cn("text-[7px] font-bold leading-none mt-0.5", selectedLetter === letter ? "text-blue-100" : "text-blue-600")}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>

      {/* ==================== PATIENTS TAB CONTENT ==================== */}
      {activeTab === 'patients' && (
        <>
          {/* Patient Grid/List */}
          <div className="grid grid-cols-1">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPatients.map(patient => (
                  <div
                    key={patient.id}
                    onClick={() => navigate(`/crm/emr/${patient.id}`)}
                    className="group bg-white rounded-xl p-5 border border-stone-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm relative mb-3">
                        {patient.imageUrl || patient.photo ? (
                          <img src={patient.imageUrl || patient.photo} alt={patient.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold">
                            {patient.name?.[0]}
                          </div>
                        )}
                        {activeEncounters.has(patient.id) && (() => {
                          const status = activeEncounters.get(patient.id);
                          const isInProgress = status === 'in-progress';
                          return (
                            <div className={`absolute -top-1 -right-1 flex items-center gap-1 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg ${isInProgress ? 'bg-green-500 animate-pulse' : 'bg-purple-500'}`}>
                              {isInProgress ? <CircleDot className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                              {isInProgress ? 'ACTIVE' : 'DONE'}
                            </div>
                          );
                        })()}
                      </div>
                      <h3 className="text-base font-bold text-stone-900 group-hover:text-blue-600 transition-colors">{patient.name}</h3>
                      <p className="text-xs text-stone-500">{patient.species}{patient.breed ? ` · ${patient.breed}` : ''}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                      <div className="flex items-center text-xs text-stone-500 gap-1.5">
                        <User className="w-3.5 h-3.5 opacity-50" />
                        <span className="font-semibold text-stone-700 truncate">{users[patient.ownerUid]?.displayName || users[patient.ownerUid]?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center text-xs text-stone-500 gap-1.5">
                        <span className="text-[10px] font-bold text-stone-400 uppercase">ID:</span>
                        <span className="text-stone-600">{patient.patientId || patient.id?.slice(0, 8)}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold text-blue-600">Open Records</span>
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="col-span-full text-center py-12 text-stone-400">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-lg font-medium">No patients found</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="divide-y divide-stone-100">
                  {filteredPatients.map(patient => (
                    <div
                      key={patient.id}
                      onClick={() => navigate(`/crm/emr/${patient.id}`)}
                      className="flex items-center justify-between p-4 hover:bg-blue-50/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-stone-100 relative shrink-0">
                          {patient.imageUrl || patient.photo ? (
                            <img src={patient.imageUrl || patient.photo} alt={patient.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold text-sm">
                              {patient.name?.[0]}
                            </div>
                          )}
                          {activeEncounters.has(patient.id) && (
                            <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow ${activeEncounters.get(patient.id) === 'in-progress' ? 'bg-green-500 animate-pulse' : 'bg-purple-500'}`} />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900 group-hover:text-blue-600 transition-colors text-sm">{patient.name}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-stone-400">
                            <span>{patient.species || '—'}</span>
                            {patient.breed && <><span>·</span><span>{patient.breed}</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-stone-400 uppercase">Owner</p>
                          <p className="text-xs font-semibold text-stone-700">{users[patient.ownerUid]?.displayName || users[patient.ownerUid]?.name || 'Unknown'}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                  {filteredPatients.length === 0 && (
                    <div className="text-center py-12 text-stone-400">
                      <p className="text-lg font-medium">No patients found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== ENCOUNTERS TAB ==================== */}
      {activeTab === 'encounters' && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Pet</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Chief Complaint</th>
                  <th className="px-4 py-3">Diagnosis</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filteredEncounters.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-stone-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-lg font-medium">No records found</p>
                    </td>
                  </tr>
                ) : (
                  filteredEncounters.map(enc => (
                    <tr key={enc.id} className="hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => openEncounterDetail(enc)}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-bold text-stone-700 text-xs">{formatDate(enc.startedAt)}</p>
                        <p className="text-[10px] text-stone-400">{formatTime(enc.startedAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                            {petNameForEncounter(enc)[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-stone-900">{petNameForEncounter(enc)}</p>
                            {petSpeciesForEncounter(enc) && <p className="text-[10px] text-stone-400">{petSpeciesForEncounter(enc)}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600">{ownerNameForEncounter(enc)}</td>
                      <td className="px-4 py-3 text-xs text-stone-600">{enc.doctorName || '—'}</td>
                      <td className="px-4 py-3 text-xs text-stone-700 max-w-[180px] truncate">{enc.chiefComplaint || '—'}</td>
                      <td className="px-4 py-3 text-xs text-stone-700 max-w-[180px] truncate">{enc.diagnosis || '—'}</td>
                      <td className="px-4 py-3">{getEncounterStatusBadge(enc.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-stone-400 hover:text-blue-600"
                            onClick={(e) => { e.stopPropagation(); navigate(`/crm/emr/${enc.petId}`, { state: { encounterId: enc.id } }); }}
                            title="Open in EMR"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-stone-400 hover:text-blue-600"
                            onClick={(e) => { e.stopPropagation(); openEncounterDetail(enc); }}
                            title="View details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== ENCOUNTER DETAIL DRAWER ==================== */}
      {drawerOpen && selectedEncounter && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-xl border-l border-stone-200 overflow-y-auto animate-slide-right">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-base font-bold text-stone-900">Encounter Details</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDrawerOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-5">
              {/* Status */}
              <div className="flex items-center gap-2">
                {getEncounterStatusBadge(selectedEncounter.status)}
                <span className="text-xs text-stone-400">{formatDate(selectedEncounter.startedAt)} {formatTime(selectedEncounter.startedAt)}</span>
              </div>

              {/* Pet & Owner */}
              <div className="bg-stone-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
                    {petNameForEncounter(selectedEncounter)[0]}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{petNameForEncounter(selectedEncounter)}</p>
                    <p className="text-xs text-stone-500">{petSpeciesForEncounter(selectedEncounter)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span>{ownerNameForEncounter(selectedEncounter)}</span>
                </div>
              </div>

              {/* Doctor */}
              <div>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Attending Doctor</p>
                <p className="text-sm font-semibold text-stone-800">{selectedEncounter.doctorName || '—'}</p>
              </div>

              {/* Chief Complaint */}
              <div>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Chief Complaint</p>
                <p className="text-sm text-stone-700">{selectedEncounter.chiefComplaint || '—'}</p>
              </div>

              {/* Diagnosis */}
              <div>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Diagnosis</p>
                <p className="text-sm font-semibold text-stone-800">{selectedEncounter.diagnosis || '—'}</p>
              </div>

              {/* Mode */}
              {selectedEncounter.mode && (
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Visit Mode</p>
                  <Badge variant="outline" className="text-[10px]">{selectedEncounter.mode}</Badge>
                </div>
              )}

              {/* ID */}
              <div>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Record ID</p>
                <p className="text-xs text-stone-500 font-mono">{selectedEncounter.id}</p>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="sticky bottom-0 bg-white border-t border-stone-200 px-5 py-4 space-y-2">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => { setDrawerOpen(false); navigate(`/crm/emr/${selectedEncounter.petId}`, { state: { encounterId: selectedEncounter.id } }); }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Full Record
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => { setDrawerOpen(false); navigate(`/crm/patients/${selectedEncounter.petId}`); }}
                >
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  Pet Profile
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => { setDrawerOpen(false); navigate(`/crm/appointments?petId=${selectedEncounter.petId}`); }}
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Appointments
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide animation style */}
      <style>{`
        @keyframes slide-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-right {
          animation: slide-right 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
