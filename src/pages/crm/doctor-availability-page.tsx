// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { CalendarPlus, Trash2, Save, RotateCcw } from 'lucide-react';
import { db, auth, collection, getDocs, doc, getDoc, updateDoc } from '../../firebase';
import { addAuditLog } from '../../lib/firestore-helpers';
import { Doctor } from '../../types';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM'
];

export default function DoctorAvailabilityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const adminDoctorId = (location.state as any)?.doctorId; // Admin can pass a doctorId todo edit
  const isAdmin = !!adminDoctorId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availability, setAvailability] = useState<{ [key: string]: string[] }>({});
  const [blockedDates, setBlockedDates] = useState<Array<{ type: 'single' | 'range'; date?: string; startDate?: string; endDate?: string }>>([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const [doctorNotFound, setDoctorNotFound] = useState(false);

  const fetchDoctorData = async () => {
    try {
      let doctorData: any = null;

      if (adminDoctorId) {
        // Admin mode: load specific doctor by ID
        const doctorDoc = await getDoc(doc(db, 'doctors', adminDoctorId));
        if (!doctorDoc.exists()) {
          console.error('Doctor not found for ID:', adminDoctorId);
          setLoading(false);
          setDoctorNotFound(true);
          return;
        }
        doctorData = { id: doctorDoc.id, ...doctorDoc.data() };
      } else {
        // Doctor mode: load own data
        const user = auth.currentUser;
        if (!user) {
          console.error('No user logged in');
          setLoading(false);
          setDoctorNotFound(true);
          return;
        }

        const snapshot = await getDocs(collection(db, 'doctors'));
        const allDoctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        doctorData = allDoctors.find(d => d.uid === user.uid)
          || allDoctors.find(d => d.email === user.email)
          || allDoctors.find(d => d.name?.toLowerCase() === user.displayName?.toLowerCase());

        if (!doctorData) {
          console.error('Doctor not found for user:', user.email, user.uid);
          setLoading(false);
          setDoctorNotFound(true);
          return;
        }
      }

      setDoctor(doctorData);

      // Parse existing availability
      let avail: { [key: string]: string[] } = {};
      if (doctorData.availability) {
        if (typeof doctorData.availability === 'object' && !Array.isArray(doctorData.availability)) {
          avail = doctorData.availability as { [key: string]: string[] };
        }
      }

      // If no availability set, initialize with defaults (Mon-Fri)
      if (Object.keys(avail).length === 0) {
        for (let day = 0; day < 7; day++) {
          avail[day.toString()] = [1, 2, 3, 4, 5].includes(day) ? [...DEFAULT_TIME_SLOTS] : [];
        }
      }

      setAvailability(avail);

      // Parse blocked dates
      const blocked = doctorData.blockedDates || [];
      setBlockedDates(blocked);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching doctor data:', error);
      setLoading(false);
      setDoctorNotFound(true);
    }
  };

  const toggleDay = (day: number) => {
    const dayKey = day.toString();
    const currentSlots = availability[dayKey] || [];
    const isWorking = currentSlots.length > 0;

    setAvailability({
      ...availability,
      [dayKey]: isWorking ? [] : [...DEFAULT_TIME_SLOTS]
    });
  };

  const toggleTimeSlot = (day: number, time: string) => {
    const dayKey = day.toString();
    const currentSlots = availability[dayKey] || [];
    const isSelected = currentSlots.includes(time);

    setAvailability({
      ...availability,
      [dayKey]: isSelected
        ? currentSlots.filter(t => t !== time)
        : [...currentSlots, time].sort((a, b) =>
            DEFAULT_TIME_SLOTS.indexOf(a) - DEFAULT_TIME_SLOTS.indexOf(b)
          )
    });
  };

  const addBlockedDate = () => {
    if (!newBlockedDate) return;
    if (blockedDates.some(d => d.type === 'single' && d.date === newBlockedDate)) {
      alert('Date already blocked');
      return;
    }
    setBlockedDates([...blockedDates, { type: 'single' as const, date: newBlockedDate }].sort((a, b) => {
      const dateA = a.type === 'range' ? a.startDate : a.date;
      const dateB = b.type === 'range' ? b.startDate : b.date;
      return dateA.localeCompare(dateB);
    }));
    setNewBlockedDate('');
  };

  const removeBlockedDate = (idx: number) => {
    setBlockedDates(blockedDates.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!doctor) return;
    setSaving(true);
    try {
      const doctorRef = doc(db, 'doctors', doctor.id);
      await updateDoc(doctorRef, {
        availability,
        blockedDates,
        updatedAt: new Date()
      });
      await addAuditLog({ action: 'doctor_schedule_updated', userId: auth.currentUser?.uid || 'unknown', userName: auth.currentUser?.displayName || 'Unknown', details: `Updated schedule for ${doctor?.name}` });
      alert('✓ Availability saved successfully!');
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Reset to default schedule (Mon-Fri, 8AM-6PM)?')) return;
    const defaultAvail: { [key: string]: string[] } = {};
    for (let day = 0; day < 7; day++) {
      defaultAvail[day.toString()] = [1, 2, 3, 4, 5].includes(day) ? [...DEFAULT_TIME_SLOTS] : [];
    }
    setAvailability(defaultAvail);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading availability...</div>;
  }

  if (doctorNotFound) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 px-2 sm:px-0">
<PageHeader 
              title="Set Availability"
              backText="Back"
            />
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-red-600 mb-4">
              <h3 className="text-lg font-bold">Doctor Record Not Found</h3>
              <p className="text-sm mt-2">
                No doctor record found for your account ({auth.currentUser?.email}).<br/>
                Your doctor record may not have the correct UID or email field set.
              </p>
            </div>
            <div className="space-y-2 text-sm text-left bg-gray-50 p-4 rounded">
              <p className="font-medium">To fix this:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Go to Firebase Console → Firestore Database</li>
                <li>Find your doctor document in the "doctors" collection</li>
                <li>Ensure it has a field <code className="bg-gray-200 px-1">uid</code> set to: <code className="bg-gray-200 px-1">{auth.currentUser?.uid}</code></li>
                <li>Or add a field <code className="bg-gray-200 px-1">email</code> set to: <code className="bg-gray-200 px-1">{auth.currentUser?.email}</code></li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 px-2 sm:px-0">
<PageHeader 
              title="Doctor Availability"
              backText="Back"
            />

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((dayName, dayIdx) => {
            const dayKey = dayIdx.toString();
            const slots = availability[dayKey] || [];
            const isWorking = slots.length > 0;

            return (
              <div key={dayIdx} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isWorking}
                      onChange={() => toggleDay(dayIdx)}
                      className="w-4 h-4"
                    />
                    <Label className="font-medium">{dayName}</Label>
                    {isWorking && (
                      <Badge variant="success" className="ml-2">Working</Badge>
                    )}
                    {!isWorking && (
                      <Badge variant="warning" className="ml-2">Off</Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {isWorking ? `${slots.length} slots` : 'Not working'}
                  </span>
                </div>

                {isWorking && (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 mt-2">
                    {DEFAULT_TIME_SLOTS.map(time => {
                      const isSelected = slots.includes(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => toggleTimeSlot(dayIdx, time)}
                          className={`p-1 text-xs rounded border transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Blocked Dates (Vacation/Sick Days) */}
      <Card>
        <CardHeader>
          <CardTitle>Blocked Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Block specific dates or date ranges when you're unavailable (vacation, sick day, etc.)
          </p>

          {/* Single Date */}
          <div className="space-y-2">
            <Label>Block Single Date</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={newBlockedDate}
                onChange={e => setNewBlockedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <Button
                type="button"
                onClick={addBlockedDate}
                disabled={!newBlockedDate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CalendarPlus className="w-4 h-4 mr-1" />
                Block Date
              </Button>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Block Date Range</Label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={rangeStartDate}
                  onChange={e => setRangeStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <span className="text-gray-400">to</span>
              <div className="flex-1">
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={rangeEndDate}
                  onChange={e => setRangeEndDate(e.target.value)}
                  min={rangeStartDate || new Date().toISOString().split('T')[0]}
                />
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (!rangeStartDate || !rangeEndDate) { alert('Please select both start and end dates'); return; }
                  const dates: string[] = [];
                  let current = new Date(rangeStartDate);
                  const end = new Date(rangeEndDate);
                  while (current <= end) {
                    const dateStr = current.toISOString().split('T')[0];
                    if (!blockedDates.some(d => d.date === dateStr)) {
                      dates.push({ type: 'single' as const, date: dateStr });
                    }
                    current.setDate(current.getDate() + 1);
                  }
                  setBlockedDates([...blockedDates, ...dates].sort((a, b) => a.date.localeCompare(b.date)));
                  setRangeStartDate('');
                  setRangeEndDate('');
                }}
                disabled={!rangeStartDate || !rangeEndDate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CalendarPlus className="w-4 h-4 mr-1" />
                Block Range
              </Button>
            </div>
          </div>

          {/* Blocked Dates List */}
          {blockedDates.length > 0 && (
            <div className="space-y-2">
              <Label>Blocked Dates ({blockedDates.length}):</Label>
              {blockedDates.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                  <span className="text-sm text-red-800">
                    {item.type === 'range' ? `${item.startDate} to ${item.endDate}` : item.date}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBlockedDates(blockedDates.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {blockedDates.length === 0 && (
            <p className="text-sm text-gray-400 italic">No blocked dates yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset to Default
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              Save Availability
            </>
          )}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-800 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Check/uncheck days to set your weekly working schedule</li>
            <li>• Click time slots to select/deselect available hours</li>
            <li>• Block specific dates (vacations, sick days) in the section below</li>
            <li>• Your availability will be used when patients book appointments</li>
            <li>• Gray/unavailable slots will not be shown to patients</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to check if a date is blocked
export function isDateBlocked(blockedDates: string[], date: string): boolean {
  return blockedDates.includes(date);
}

// Helper to get available slots for a doctor on a specific date
export function getAvailableSlots(
  availability: { [key: string]: string[] } | undefined,
  blockedDates: string[] | undefined,
  date: string
): string[] {
  if (!availability) return [];

  // Check if date is blocked
  if (blockedDates?.includes(date)) return [];

  const dayOfWeek = new Date(date).getDay(); // 0=Sunday, 1=Monday, etc.
  return availability[dayOfWeek.toString()] || [];
}
