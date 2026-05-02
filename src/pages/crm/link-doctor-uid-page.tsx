import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Loader2, Link, Check, AlertTriangle } from 'lucide-react';
import { auth } from '../../firebase';
import { collection, getDocs, doc, updateDoc } from '../../firebase';

export default function LinkDoctorUidPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const snapshot = await getDocs(collection('doctors'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDoctors(data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const linkByEmail = async (doctorId: string, email: string) => {
    if (!email) {
      alert('Doctor has no email field!');
      return;
    }

    setUpdating(doctorId);
    try {
      // We can't directly query Firebase Auth from client-side
      // Instead, show instructions
      alert(`To link this doctor:\n\n1. Go to Firebase Console > Authentication > Users\n2. Find user with email: ${email}\n3. Copy their User UID\n4. Manually add "uid" field to doctor document in Firestore`);
    } finally {
      setUpdating(null);
    }
  };

  const linkByCurrentUser = async (doctorId: string) => {
    const user = auth.currentUser;
    if (!user) {
      alert('No user logged in. Please login first.');
      return;
    }

    setUpdating(doctorId);
    try {
      await updateDoc(doc('doctors', doctorId), { uid: user.uid, email: user.email });
      alert(`✓ Linked! Doctor document now has uid: ${user.uid}`);
      loadDoctors();
    } catch (error) {
      console.error('Error linking:', error);
      alert('Failed to link doctor.');
    } finally {
      setUpdating(null);
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
    <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-0">
      <PageHeader
        title="Link Doctor UID"
        backTo="/crm/staff"
        backText="Back to Staff"
      />

      <Card>
        <CardHeader>
          <CardTitle>Link Doctor Documents to Firebase Auth</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Each doctor's Firestore document needs a <code className="bg-gray-100 px-1 rounded">uid</code> field matching their Firebase Auth UID.
            This allows the Doctor Availability page to find the correct doctor document.
          </p>

          <div className="space-y-3">
            {doctors.map((doctor) => {
              const hasUid = !!doctor.uid;
              return (
                <div key={doctor.id} className="flex items-center justify-between border-b pb-3">
                  <div className="flex-1">
                    <p className="font-medium">{doctor.name}</p>
                    <p className="text-sm text-gray-500">{doctor.email || 'No email'}</p>
                    {hasUid ? (
                      <Badge variant="success" className="mt-1">✓ Linked (uid: {doctor.uid})</Badge>
                    ) : (
                      <Badge variant="warning" className="mt-1">⚠ Not Linked</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!hasUid && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => linkByCurrentUser(doctor.id)}
                          disabled={updating === doctor.id}
                        >
                          {updating === doctor.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Link className="w-3 h-3 mr-1" />
                              Link to Me
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => linkByEmail(doctor.id, doctor.email)}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Instructions
                        </Button>
                      </>
                    )}
                    {hasUid && (
                      <Badge variant="success"><Check className="w-3 h-3 mr-1" />Ready</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
