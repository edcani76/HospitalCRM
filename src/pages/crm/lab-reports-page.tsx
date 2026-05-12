import React, { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '../../components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { TestTube, Clock, CheckCircle, FileText, Loader2 } from 'lucide-react'
import { SearchBar } from '../../components/ui/search-bar'
import { fetchReports } from '../../lib/firestore-helpers'

export default function LabReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const pendingCount = reports.filter(r => r.status === 'pending' || r.status === 'in_progress').length
  const completedCount = reports.filter(r => r.status === 'completed').length

  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports;
    const term = searchQuery.toLowerCase();
    return reports.filter(r =>
      r.title?.toLowerCase().includes(term) ||
      r.petName?.toLowerCase().includes(term) ||
      r.type?.toLowerCase().includes(term)
    );
  }, [reports, searchQuery]);

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await fetchReports()
        setReports(data)
      } catch (error) {
        console.error('Error loading reports:', error)
      } finally {
        setLoading(false)
      }
    }
    loadReports()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Lab Reports" subtitle="Manage laboratory tests and reports" />

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search lab reports..."
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {pendingCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {completedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-blue-600" />
              Total Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{filteredReports.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <TestTube className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{report.petName}</p>
                    <p className="text-sm text-muted-foreground">{report.category || report.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{report.date}</p>
                  <Badge variant={report.status === 'completed' ? 'success' : 'warning'}>
                    {report.status === 'in_progress' ? 'In Progress' : report.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
