export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'patient' | 'admin' | 'doctor';
  createdAt: any;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  experience: number;
  availability?: string[];
  image?: string;
  bio?: string;
}

export interface Appointment {
  id: string;
  patientUid: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: any;
}

export interface Report {
  id: string;
  patientUid: string;
  title: string;
  date: string;
  fileUrl: string;
  description?: string;
}
