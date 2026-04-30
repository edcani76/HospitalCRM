import React from 'react'
import { PageHeader } from '../../components/ui/page-header'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Plus, Users } from 'lucide-react'
import { doctors } from '../../data/crm-data'

export default function StaffManagementPage() {
  const staff = [
    ...doctors,
    { id: '4', name: 'James Wilson', speciality: 'Lab Technician', department: 'Lab', contact: '(555) 444-5555', email: 'james.w@vitacare.com' },
    { id: '5', name: 'Maria Garcia', speciality: 'Pharmacist', department: 'Pharmacy', contact: '(555) 555-6666', email: 'maria.g@vitacare.com' },
  ]

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
                <p className="text-2xl font-bold">{staff.length}</p>
                <p className="text-sm text-muted-foreground">Total Staff</p>
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
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{member.speciality}</Badge>
                  </TableCell>
                  <TableCell>{member.department}</TableCell>
                  <TableCell>{member.contact}</TableCell>
                  <TableCell>{member.email}</TableCell>
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
