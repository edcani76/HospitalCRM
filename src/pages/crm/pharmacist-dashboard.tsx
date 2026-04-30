import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { PageHeader } from '../../components/ui/page-header'
import { StatsCard } from '../../components/ui/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Pill, AlertTriangle, Package, TrendingUp } from 'lucide-react'

export default function PharmacistDashboard() {
  const { user } = useAuth()

  return (
    <>
      <PageHeader
        title="Pharmacist Dashboard"
        subtitle={`Welcome, ${user?.displayName || 'Pharmacist'}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Prescriptions Today"
          value="32"
          icon={Pill}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Low Stock Items"
          value="5"
          icon={AlertTriangle}
          trend={{ value: 2, isPositive: false }}
        />
        <StatsCard
          title="Inventory Items"
          value="248"
          icon={Package}
          trend={{ value: 0, isPositive: true }}
        />
        <StatsCard
          title="Monthly Dispensed"
          value="856"
          icon={TrendingUp}
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Patient #{i}00{i}</p>
                    <p className="text-sm text-muted-foreground">Antibiotics - 7 days</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    Dispensed
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Amoxicillin', 'Insulin', 'Pain Relievers', 'Antibiotics', 'Vitamins'].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="font-medium">{item}</p>
                  </div>
                  <span className="text-xs text-red-600 font-medium">Low Stock</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
