import React, { useState, useEffect } from 'react'
import { PageHeader } from '../../components/ui/page-header'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Plus, Users, Loader2 } from 'lucide-react'
import { fetchDoctors } from '../../lib/firestore-helpers'

export default function StaffManagementPage() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDoctors() {
      try {
        const data = await fetchDoctors()
        setDoctors(data)
      } catch (error) {
        console.error('Error loading doctors:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDoctors()
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
      <PageHeader title="Staff Management" actions={<Button><Plus className="w-4 h-4 mr-2" />Add Staff</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{doctors.length}</p>
                <p className="text-sm text-muted-foreground">Total Doctors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell className="font-medium">{doctor.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doctor.specialization}</Badge>
                  </TableCell>
                  <TableCell>{doctor.department}</TableCell>
                  <TableCell>{doctor.experience} years</TableCell>
                  <TableCell>
                    <button className="text-primary hover:underline text-sm">Edit</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
