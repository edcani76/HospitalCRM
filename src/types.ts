export type PatientStatus = 'registered' | 'triage' | 'consultation' | 'lab' | 'pharmacy' | 'billing' | 'discharged';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'client' | 'admin' | 'doctor' | 'staff' | 'lab' | 'pharmacist';
  createdAt: any;
}

export interface Doctor {
  id: string;
  uid?: string; // Links to Firebase Auth user ID
  name: string;
  specialization: string;
  department: string;
  experience: number;
  availability?: string[];
  image?: string;
  bio?: string;
}

export interface Pet {
  id: string;
  externalPetId?: string;
  ownerUid: string;
  name: string;
  species: string;
  breed?: string;
  type?: string;
  age?: number;
  weight?: number;
  imageUrl?: string;
  lastUpdate?: any;
  currentStatus?: PatientStatus; // Tracking current workflow status
}

export interface Appointment {
  id: string;
  clientUid: string;
  petId?: string;
  petName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'unconfirmed' | 'confirmed' | 'cancelled' | 'completed' | 'no-show' | 'in-progress' | 'pending';
  workflowStatus?: PatientStatus; // Link to active workflow status
  notes?: string;
  createdAt: any;
  cancelReason?: string;
  services?: string[];
  audit?: any[];
}

export interface Report {
  id: string;
  clientUid: string;
  petId?: string;
  title: string;
  date: string;
  fileUrl: string;
  description?: string;
  type?: 'lab' | 'medical' | 'prescription';
}

export interface Invoice {
  id: string;
  clientUid: string;
  petId?: string;
  petName: string;
  amount: number;
  status: 'active' | 'paid';
  date: string;
  dueDate: string;
  description: string;
}

export interface Notification {
  id?: string;
  userId: string;
  userRole?: string;
  type: 'appointment_cancelled' | 'appointment_updated' | 'appointment_created' | 'appointment_confirmed' | 'appointment_no_show' | 'appointment_reminder' | 'appointment_started' | 'service_added';
  title: string;
  message: string;
  appointmentId?: string;
  read: boolean;
  createdAt: any;
}

export interface ServiceCatalogItem {
  id?: string;
  code: string;
  name: string;
  category: 'consultation' | 'vaccination' | 'lab' | 'diagnostic' | 'procedure' | 'grooming' | 'medication' | 'supply';
  description: string;
  defaultPrice: number;
  taxable: boolean;
  active: boolean;
  requiresClinicalRecord: boolean;
  inventoryItemId?: string;
  durationMin?: number;
  allowedProviderIds?: string[];
  requiredResourceIds?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface Resource {
  id?: string;
  name: string;
  type: 'room' | 'equipment';
  status: 'available' | 'in-use' | 'maintenance';
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}
