import React from 'react'
import { PageHeader } from '../../components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { TestTube, Clock, CheckCircle, FileText } from 'lucide-react'

const labReports = [
  { id: '1', patient: 'Buddy (Golden Retriever)', test: 'Blood Test', status: 'Pending', date: '2026-04-28' },
  { id: '2', patient: 'Whiskers (Siamese Cat)', test: 'X-Ray', status: 'Completed', date: '2026-04-27' },
  { id: '3', patient: 'Max (German Shepherd)', test: 'Allergy Test', status: 'Pending', date: '2026-04-28' },
  { id: '4', patient: 'Luna (Persian Cat)', test: 'Urinalysis', status: 'Completed', date: '2026-04-26' },
]

export default function LabReportsPage() {
  return (
    <>
      <PageHeader title="Lab Reports" subtitle="Manage laboratory tests and reports" />

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
              {labReports.filter(r => r.status === 'Pending').length}
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
              {labReports.filter(r => r.status === 'Completed').length}
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
            <p className="text-3xl font-bold">{labReports.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {labReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <TestTube className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{report.patient}</p>
                    <p className="text-sm text-muted-foreground">{report.test}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{report.date}</p>
                  <Badge variant={report.status === 'Completed' ? 'success' : 'warning'}>
                    {report.status}
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
