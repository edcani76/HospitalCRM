import React, { useState, useEffect } from 'react'
import { 
  Search, Filter, Calendar, User, Clock, ShieldCheck,
  ArrowUpDown, Download, RefreshCw, Activity, History, 
  AlertCircle, PlusCircle, Camera, Loader2
} from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { cn } from '../../lib/utils'
import { fetchAuditLogs, fetchUsers, fetchPets } from '../../lib/firestore-helpers'

interface AuditEntry {
  id: string
  event?: string
  action?: string
  staff?: string
  userName?: string
  userId?: string
  timestamp: any
  patientName?: string
  patientId?: string
  type?: string
  details?: string
}

export default function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [allLogs, setAllLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLogs() {
      try {
        const [data, usersData, petsData] = await Promise.all([
          fetchAuditLogs(),
          fetchUsers(),
          fetchPets()
        ]);

        const userMap = new Map();
        usersData.forEach((u: any) => userMap.set(u.id || u.uid, u.displayName || u.name));
        
        const petMap = new Map();
        petsData.forEach((p: any) => petMap.set(p.id, p.name));

        const enhancedLogs = (data as AuditEntry[]).map(log => {
          let resolvedUserName = log.userName || log.staff;
          if (!resolvedUserName || resolvedUserName === 'Unknown' || resolvedUserName === 'system') {
            resolvedUserName = log.userId ? userMap.get(log.userId) : undefined;
          }

          let resolvedPatientName = log.patientName;
          if (!resolvedPatientName || resolvedPatientName === log.patientId || resolvedPatientName === 'Unknown') {
            resolvedPatientName = log.patientId ? petMap.get(log.patientId) : undefined;
          }

          return {
            ...log,
            userName: resolvedUserName,
            patientName: resolvedPatientName
          };
        });

        setAllLogs(enhancedLogs)
      } catch (error) {
        console.error('Error loading audit logs:', error)
      } finally {
        setLoading(false)
      }
    }
    loadLogs()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const filteredLogs = allLogs.filter(log => {
    const searchLower = searchTerm.toLowerCase()
    const eventName = log.event || log.action || ''
    const staffName = log.staff || log.userName || ''
    const pName = log.patientName || log.details || ''
    
    const matchesSearch = 
      eventName.toLowerCase().includes(searchLower) ||
      staffName.toLowerCase().includes(searchLower) ||
      pName.toLowerCase().includes(searchLower)
    
    const logType = log.type || (log.action?.includes('emr') || log.action?.includes('lab') || log.action?.includes('prescription') ? 'emr' : 'system')
    const matchesType = filterType === 'all' || logType === filterType
    
    return matchesSearch && matchesType
  })

  const getEventIcon = (eventStr: string | undefined) => {
    const ev = (eventStr || '').toLowerCase()
    if (ev.includes('created') || ev.includes('added')) return <PlusCircle className="w-4 h-4 text-emerald-500" />
    if (ev.includes('updated') || ev.includes('changed')) return <RefreshCw className="w-4 h-4 text-blue-500" />
    if (ev.includes('deleted') || ev.includes('removed') || ev.includes('cancelled')) return <AlertCircle className="w-4 h-4 text-red-500" />
    if (ev.includes('photo')) return <Camera className="w-4 h-4 text-purple-500" />
    return <Activity className="w-4 h-4 text-slate-400" />
  }

  const formatTimestamp = (ts: any) => {
    if (!ts) return { date: 'Unknown', time: '' };
    if (typeof ts === 'string') {
      const parts = ts.split(',');
      return { date: parts[0] || ts, time: parts[1]?.trim() || '' };
    }
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString()
    };
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
        <div className="bg-white dark:bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Actions</p>
          <p className="text-3xl font-bold text-foreground">{allLogs.length}</p>
        </div>
        <div className="bg-white dark:bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Clinical Updates</p>
          <p className="text-3xl font-bold text-foreground">{allLogs.filter(l => l.type === 'emr' || l.action?.includes('lab') || l.action?.includes('prescription')).length}</p>
        </div>
        <div className="bg-white dark:bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Staff Involved</p>
          <p className="text-3xl font-bold text-foreground">{new Set(allLogs.map(l => l.staff || l.userName).filter(Boolean)).size}</p>
        </div>
        <div className="bg-white dark:bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">Patients Affected</p>
          <p className="text-3xl font-bold text-foreground">{new Set(allLogs.map(l => l.patientId).filter(Boolean)).size}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search by event, staff, or patient..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 py-6 text-lg rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'patient', 'emr', 'system'].map(type => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                onClick={() => setFilterType(type)}
                className={filterType === type ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-blue-200" : "border-indigo-200 text-indigo-600"}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Event</th>
              <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Staff</th>
              <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Patient / Details</th>
              <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Type</th>
              <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const eventName = log.event || log.action || 'Unknown Event'
              const staffName = log.staff || log.userName || 'System'
              const logType = log.type || (log.action?.includes('emr') || log.action?.includes('lab') || log.action?.includes('prescription') ? 'emr' : 'system')
              const { date, time } = formatTimestamp(log.timestamp)

              return (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getEventIcon(eventName)}
                      <span className="font-bold text-slate-900 max-w-[200px] truncate" title={eventName}>{eventName}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="font-medium text-slate-700 truncate">{staffName}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">{log.patientName || log.patientId || '—'}</span>
                      {log.details && <span className="text-xs text-muted-foreground line-clamp-2" title={log.details}>{log.details}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={logType === 'emr' ? 'default' : 'secondary'}>
                      {logType}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">
                        {date}
                      </span>
                      <span className="text-xs text-slate-400">
                        {time}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No audit logs found matching your filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
