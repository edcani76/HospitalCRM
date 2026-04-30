import React from 'react'
import { PageHeader } from '../../components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Pill, AlertTriangle, Package, TrendingUp } from 'lucide-react'

const medications = [
  { id: '1', name: 'Amoxicillin', stock: 250, minStock: 100, category: 'Antibiotic' },
  { id: '2', name: 'Insulin', stock: 45, minStock: 50, category: 'Hormone' },
  { id: '3', name: 'Pain Relievers', stock: 30, minStock: 60, category: 'Analgesic' },
  { id: '4', name: 'Antibiotics', stock: 20, minStock: 80, category: 'Antibiotic' },
  { id: '5', name: 'Vitamins', stock: 15, minStock: 50, category: 'Supplement' },
]

export default function PharmacyPage() {
  return (
    <>
      <PageHeader title="Pharmacy" subtitle="Manage medications and prescriptions" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="w-5 h-5 text-blue-600" />
              Total Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">248</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">5</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-green-600" />
              Dispensed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">32</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Monthly Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">856</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Inventory Status</h3>
          <div className="space-y-3">
            {medications.map((med) => (
              <div key={med.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{med.name}</p>
                  <p className="text-sm text-muted-foreground">{med.category}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${med.stock <= med.minStock ? 'text-red-600' : 'text-green-600'}`}>
                    {med.stock} units
                  </p>
                  {med.stock <= med.minStock && (
                    <p className="text-xs text-red-600">Below minimum</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
