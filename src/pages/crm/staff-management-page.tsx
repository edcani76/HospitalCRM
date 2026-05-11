import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Plus, Users, Loader2, Calendar, Trash2 } from 'lucide-react';
import { fetchDoctors, addAuditLog } from '../../lib/firestore-helpers';
import { db, auth, doc, updateDoc, collection, getDocs } from '../../firebase';

const DEFAULT_TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM'
];

const WORK_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday

function generateWeeklyAvailability(): { [key: string]: string[] } {
  const availability: { [key: string]: string[] } = {};
  for (let day = 0; day < 7; day++) {
    availability[day.toString()] = WORK_DAYS.includes(day) ? [...DEFAULT_TIME_SLOTS] : [];
  }
  return availability;
}

export default function StaffManagementPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const data = await fetchDoctors();
      setDoctors(data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const seedAllAvailability = async () => {
    if (!confirm('This will overwrite availability for ALL doctors. Continue?')) return;
    setSeeding(true);
    try {
      const snapshot = await getDocs(collection(db, 'doctors'));
      const availability = generateWeeklyAvailability();
      let count = 0;
      for (const document of snapshot.docs) {
        await updateDoc(doc(db, 'doctors', document.id), { availability });
        await addAuditLog({ action: 'doctor_availability_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', details: 'Bulk seeded availability for all doctors' });
        count++;
      }
      alert(`✓ Seeded availability for ${count} doctor(s)!`);
      loadDoctors();
    } catch (error) {
      console.error('Error seeding:', error);
      alert('Failed to seed availability.');
    } finally {
      setSeeding(false);
    }
  };

  const seedDoctorAvailability = async (doctorId: string) => {
    try {
      const availability = generateWeeklyAvailability();
      await updateDoc(doc(db, 'doctors', doctorId), { availability });
      await addAuditLog({ action: 'doctor_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', details: `Seeded availability for doctor ${doctorId}` });
      alert('✓ Availability seeded!');
      loadDoctors();
    } catch (error) {
      console.error('Error seeding:', error);
      alert('Failed to seed availability.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Staff Management"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={seedAllAvailability} disabled={seeding}>
              {seeding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Seed All Availability
                </>
              )}
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>
        }
      />

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
                <TableHead>Availability</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor) => {
                const hasAvailability = doctor.availability && Object.keys(doctor.availability).length > 0;
                return (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{doctor.specialization}</Badge>
                    </TableCell>
                    <TableCell>{doctor.department}</TableCell>
                    <TableCell>{doctor.experience} years</TableCell>
                    <TableCell>
                      {hasAvailability ? (
                        <Badge variant="success">✓ Set</Badge>
                      ) : (
                        <Badge variant="warning">⚠ Not Set</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          className="text-primary hover:underline text-sm flex items-center gap-1"
                          onClick={() => navigate('/crm/doctor-availability', { state: { doctorId: doctor.id } })}
                        >
                          <Calendar className="w-3 h-3" />
                          Edit Availability
                        </button>
                        {!hasAvailability && (
                          <button
                            className="text-emerald-600 hover:underline text-sm flex items-center gap-1"
                            onClick={() => seedDoctorAvailability(doctor.id)}
                          >
                            <Plus className="w-3 h-3" />
                            Seed
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
