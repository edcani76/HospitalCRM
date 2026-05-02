/**
 * Doctor Availability Seed Script
 * 
 * TO RUN: Open browser at http://localhost:3001/crm/seed-doctor-availability
 * This page will seed all doctors with weekly availability
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc } from '../../firebase';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
];

const WORK_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday

function generateWeeklyAvailability(): { [key: string]: string[] } {
  const availability: { [key: string]: string[] } = {};
  for (let day = 0; day < 7; day++) {
    availability[day.toString()] = WORK_DAYS.includes(day) ? [...DEFAULT_TIME_SLOTS] : [];
  }
  return availability;
}

export default function SeedDoctorAvailabilityPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; skipped: number; errors: string[] } | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'doctors'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const seedAll = async () => {
    setLoading(true);
    setResult(null);
    const errors: string[] = [];
    let success = 0;
    let skipped = 0;

    try {
      const snapshot = await getDocs(collection(db, 'doctors'));
      
      if (snapshot.docs.length === 0) {
        setResult({ success: 0, skipped: 0, errors: ['No doctors found. Please add doctors first.'] });
        setLoading(false);
        return;
      }

      const weeklyAvailability = generateWeeklyAvailability();

      for (const document of snapshot.docs) {
        try {
          const doctorData = document.data();
          const doctorName = doctorData.name || 'Unknown';

          // Check if already has availability
          if (doctorData.availability && 
              typeof doctorData.availability === 'object' &&
              !Array.isArray(doctorData.availability) &&
              Object.keys(doctorData.availability).length > 0) {
            console.log(`Skipping ${doctorName} - already has availability`);
            skipped++;
            continue;
          }

          await updateDoc(doc(db, 'doctors', document.id), {
            availability: weeklyAvailability
          });

          success++;
          console.log(`✓ Updated availability for Dr. ${doctorName}`);
        } catch (err: any) {
          errors.push(`Failed to update ${doctorData.name}: ${err.message}`);
        }
      }

      setResult({ success, skipped, errors });
      fetchDoctors(); // Refresh
    } catch (error: any) {
      setResult({ success: 0, skipped: 0, errors: [error.message] });
    } finally {
      setLoading(false);
    }
  };

  const seedSingle = async (doctorId: string) => {
    try {
      const weeklyAvailability = generateWeeklyAvailability();
      await updateDoc(doc(db, 'doctors', doctorId), {
        availability: weeklyAvailability
      });
      alert('✓ Availability seeded!');
      fetchDoctors();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 px-2 sm:px-0">
      <div className="flex items-center gap-4">
        <Button type="button" variant="outline" onClick={() => navigate('/crm/admin-dashboard')}>
          ← Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold">Seed Doctor Availability</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What this does</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Adds weekly availability to all doctors</li>
            <li><strong>Working days:</strong> {DAYS_OF_WEEK.filter((_, i) => WORK_DAYS.includes(i)).join(', ')}</li>
            <li><strong>Working hours:</strong> 9:00 AM - 5:00 PM (30-min slots)</li>
            <li><strong>Days off:</strong> Saturday, Sunday</li>
            <li>Skips doctors that already have availability set</li>
          </ul>
        </CardContent>
      </Card>

      {/* Doctors List */}
      <Card>
        <CardHeader>
          <CardTitle>Doctors ({doctors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {doctors.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-xs text-gray-500">{doc.specialization}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {doc.availability && Object.keys(doc.availability).length > 0 ? (
                      <span className="text-xs text-emerald-600">✓ Has availability</span>
                    ) : (
                      <span className="text-xs text-yellow-600">⚠ No availability set</span>
                    )}
                  </div>
                </div>
                {!doc.availability || Object.keys(doc.availability).length === 0 ? (
                  <Button size="sm" onClick={() => seedSingle(doc.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Seed This Doctor
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seed All Button */}
      <div className="flex justify-center">
        <Button
          onClick={seedAll}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-lg"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Seeding...
            </>
          ) : (
            'Seed All Doctors with Availability'
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-emerald-600">✓ Successfully updated: {result.success} doctor(s)</p>
              <p className="text-yellow-600">⏭ Skipped (already set): {result.skipped} doctor(s)</p>
              {result.errors.length > 0 && (
                <div>
                  <p className="text-red-600 font-medium">Errors:</p>
                  <ul className="list-disc pl-5 text-sm text-red-600">
                    {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
