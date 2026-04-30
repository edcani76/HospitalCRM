import React, { useState } from 'react'
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Clock, 
  ShieldCheck,
  ArrowUpDown,
  Download,
  FileText,
  Activity,
  History,
  AlertCircle,
  PlusCircle,
  Camera
} from 'lucide-react'
import { patients as allPatients } from '../../data/crm-data'
import { PageHeader } from '../../components/ui/page-header'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { cn } from '../../lib/utils'

interface AuditEntry {
  id: string
  event: string
  staff: string
  timestamp: string
  patientName: string
  patientId: string
  type: 'patient' | 'emr' | 'system'
}

export default function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  // Aggregate all audit logs from all patients
  const allLogs: AuditEntry[] = allPatients.flatMap(patient => 
    (patient.auditTrail || []).map(log => ({
      ...log,
      patientName: patient.name,
      patientId: patient.patientId,
      type: log.event.toLowerCase().includes('emr') || log.event.toLowerCase().includes('medication') || log.event.toLowerCase().includes('medical') 
        ? 'emr' : 'patient'
    })) as AuditEntry[]
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const filteredLogs = allLogs.filter(log => {
    const matchesSearch = 
      log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.staff.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.patientName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || log.type === filterType
    
    return matchesSearch && matchesType
  })

  const getEventIcon = (event: string) => {
    const ev = event.toLowerCase()
    if (ev.includes('created')) return <PlusCircle className="w-4 h-4 text-emerald-500" />
    if (ev.includes('updated') || ev.includes('changed')) return <RefreshCw className="w-4 h-4 text-blue-500" />
    if (ev.includes('deleted') || ev.includes('removed')) return <AlertCircle className="w-4 h-4 text-red-500" />
    if (ev.includes('photo')) return <Camera className="w-4 h-4 text-purple-500" />
    return <Activity className="w-4 h-4 text-slate-400" />
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="System Audit Trail" 
        subtitle="Comprehensive log of all record modifications and clinical updates across the CRM"
        actions={
          <Button variant="outline" className="rounded-xl border-slate-200 hover:bg-slate-50">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-card p-6 rounded-3xl border border-border shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Actions</p>
          <p className="text-3xl font-bold text-foreground">{allLogs.length}</p>
        </div>
        <div className="bg-white dark:bg-card p-6 rounded-3xl border border-border shadow-sm">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Clinical Updates</p>
          <p className="text-3xl font-bold text-foreground">{allLogs.filter(l => l.type === 'emr').length}</p>
        </div>
        <div className="bg-white dark:bg-card p-6 rounded-3xl border border-border shadow-sm">
          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Staff Involved</p>
          <p className="text-3xl font-bold text-foreground">{new Set(allLogs.map(l => l.staff)).size}</p>
        </div>
        <div className="bg-white dark:bg-card p-6 rounded-3xl border border-border shadow-sm">
          <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">Patients Affected</p>
          <p className="text-3xl font-bold text-foreground">{new Set(allLogs.map(l => l.patientId)).size}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-card p-4 rounded-3xl border border-border shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by event, staff, or patient..." 
            className="pl-10 rounded-2xl border-border bg-muted/30 focus:bg-background h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant={filterType === 'all' ? 'default' : 'outline'} 
            className="rounded-2xl h-11 px-6 font-semibold"
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          <Button 
            variant={filterType === 'emr' ? 'default' : 'outline'} 
            className="rounded-2xl h-11 px-6 font-semibold"
            onClick={() => setFilterType('emr')}
          >
            Clinical
          </Button>
          <Button 
            variant={filterType === 'patient' ? 'default' : 'outline'} 
            className="rounded-2xl h-11 px-6 font-semibold"
            onClick={() => setFilterType('patient')}
          >
            Administrative
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Timestamp</th>
                <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Event & Description</th>
                <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Target Patient</th>
                <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Performed By</th>
                <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{log.timestamp.split(',')[0]}</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                        {log.timestamp.includes(',') ? log.timestamp.split(',')[1].trim() : log.timestamp}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        {getEventIcon(log.event)}
                      </div>
                      <span className="text-sm font-bold text-foreground">{log.event}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{log.patientName}</span>
                        <span className="text-[10px] font-bold text-muted-foreground">{log.patientId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{log.staff}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={log.type === 'emr' ? 'default' : 'secondary'} className="rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {log.type === 'emr' ? 'Clinical' : 'Admin'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <History className="w-12 h-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No audit logs match your search criteria</p>
                      <Button variant="link" onClick={() => {setSearchTerm(''); setFilterType('all')}}>Clear all filters</Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground bg-muted/20 py-3 rounded-2xl border border-border border-dashed">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>All records are cryptographically signed and immutable for compliance purposes.</span>
        <RefreshCw className="w-3 h-3 animate-spin-slow" />
        <span>Syncing...</span>
      </div>
    </div>
  )
}


