import React, { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '../../components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Pill, AlertTriangle, Package, TrendingUp, Loader2 } from 'lucide-react'
import { SearchBar } from '../../components/ui/search-bar'
import { fetchMedications } from '../../lib/firestore-helpers'

export default function PharmacyPage() {
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadMedications() {
      try {
        const data = await fetchMedications()
        setMedications(data)
      } catch (error) {
        console.error('Error loading medications:', error)
      } finally {
        setLoading(false)
      }
    }
    loadMedications()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const lowStockCount = medications.filter(m => m.stock <= m.minStock).length
  const totalStock = medications.reduce((sum, m) => sum + m.stock, 0)

  const filteredMedications = useMemo(() => {
    if (!searchQuery) return medications;
    const term = searchQuery.toLowerCase();
    return medications.filter(m => 
      m.name?.toLowerCase().includes(term) ||
      m.category?.toLowerCase().includes(term) ||
      m.description?.toLowerCase().includes(term)
    );
  }, [medications, searchQuery]);

  return (
    <>
      <PageHeader title="Pharmacy" subtitle="Manage medications and prescriptions" />

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search medications..."
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="w-5 h-5 text-blue-600" />
              Total Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{filteredMedications.length}</p>
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
            <p className="text-3xl font-bold text-red-600">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-green-600" />
              Total Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{new Set(medications.map(m => m.category)).size}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Inventory Status</h3>
          <div className="space-y-3">
            {filteredMedications.map((med) => (
              <div key={med.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{med.name}</p>
                  <p className="text-sm text-muted-foreground">{med.category}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${med.stock <= med.minStock ? 'text-red-600' : 'text-green-600'}`}>
                    {med.stock} {med.unit || 'units'}
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
