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
import { fetchAuditLogs } from '../../lib/firestore-helpers'

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
  const [allLogs, setAllLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await fetchAuditLogs()
        setAllLogs(data as AuditEntry[])
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
      <div className="bg-white dark:bg-card rounded-3xl border border-border shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search by event, staff, or patient..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 py-6 text-lg rounded-2xl"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'patient', 'emr', 'system'].map(type => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                onClick={() => setFilterType(type)}
                className={filterType === type ? "bg-indigo-600 hover:bg-indigo-700" : "border-indigo-200 text-indigo-600"}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white dark:bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Event</th>
              <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Staff</th>
              <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Patient</th>
              <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Type</th>
              <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {getEventIcon(log.event)}
                    <span className="font-bold text-slate-900">{log.event}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <span className="font-medium text-slate-700">{log.staff}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="font-medium text-slate-700">{log.patientName}</span>
                </td>
                <td className="p-4">
                  <Badge variant={log.type === 'emr' ? 'default' : 'secondary'}>
                    {log.type}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      {log.timestamp?.split(',')?.[0] || log.timestamp}
                    </span>
                    <span className="text-xs text-slate-400">
                      {log.timestamp?.includes(',') ? log.timestamp.split(',')[1].trim() : ''}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
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
