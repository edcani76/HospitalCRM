import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { PageHeader } from '../../components/ui/page-header'
import { StatsCard } from '../../components/ui/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Receipt, TestTube, Clock, CheckCircle } from 'lucide-react'

export default function LabDashboard() {
  const { user } = useAuth()

  return (
    <>
      <PageHeader
        title="Lab Dashboard"
        subtitle={`Welcome, ${user?.displayName || 'Lab Technician'}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Pending Tests"
          value="18"
          icon={Clock}
          trend={{ value: 3, isPositive: false }}
        />
        <StatsCard
          title="Today's Tests"
          value="24"
          icon={TestTube}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Completed"
          value="156"
          icon={CheckCircle}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Reports Generated"
          value="142"
          icon={Receipt}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Lab Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Patient #{i}00{i}</p>
                    <p className="text-sm text-muted-foreground">Blood Test</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Requested: Today</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Patient #{i}00{i + 10}</p>
                    <p className="text-sm text-muted-foreground">X-Ray</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Completed: Today</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
