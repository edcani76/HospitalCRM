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
  patientId?: string;
  ownerUid: string;
  name: string;
  species: string;
  breed?: string;
  type?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: string;
  color?: string;
  bloodType?: string;
  microchipId?: string;
  weight?: number;
  weightHistory?: any[];
  imageUrl?: string;
  lastUpdate?: any;
  currentStatus?: PatientStatus;
  medicalHistory?: string;
  size?: string;
  // Alerts & Warnings
  allergies?: string[];
  chronicConditions?: string[];
  aggressionWarning?: boolean;
  aggressionNotes?: string;
  specialHandlingNotes?: string;
  medicationReactions?: string[];
  contagiousDiseaseFlag?: boolean;
  contagiousDiseaseNotes?: string;
  // Consent fields
  consentPrivacy?: boolean;
  consentTerms?: boolean;
  consentPrivacyTimestamp?: string;
  consentTermsTimestamp?: string;
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
  status: 'unconfirmed' | 'confirmed' | 'cancelled' | 'in-progress' | 'medical-completed' | 'completed' | 'no-show';
  medicalCompletedAt?: any; // When doctor marked medical services as done
  medicalCompletedBy?: string; // User who completed medical
  workflowStatus?: PatientStatus; // Link to active workflow status
  notes?: string;
  createdAt: any;
  cancelReason?: string;
  services?: string[];
  audit?: any[];
  mode?: 'scheduled' | 'walk-in';
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

export interface Admission {
  id?: string;
  petId: string;
  petName: string;
  ownerId: string;
  ownerName?: string;
  checkInDate: any;
  expectedDischarge?: any;
  actualDischarge?: any;
  reason: string;
  status: 'admitted' | 'discharged' | 'transferred';
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  cageWard?: string;
  initialDiagnosis?: string;
  specialInstructions?: string;
  createdAt: any;
  updatedAt: any;
}

export interface AdmissionRound {
  id?: string;
  admissionId: string;
  date: any;
  attendingStaffId: string;
  attendingStaffName?: string;
  vitals?: {
    temperatureC?: number;
    heartRateBpm?: number;
    respiratoryRateRpm?: number;
    weightKg?: number;
    mmColor?: string;
    notes?: string;
  };
  treatmentGiven?: string;
  notes?: string;
  nextInstructions?: string;
  createdAt: any;
}

export interface AdmissionService {
  id?: string;
  admissionId: string;
  date: any;
  serviceName: string;
  serviceCode?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  createdAt: any;
}

export interface DischargeSummary {
  id?: string;
  admissionId: string;
  petId: string;
  petName: string;
  dischargeDate: any;
  summary: string;
  finalDiagnosis?: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  followUpInstructions?: string;
  signedBy?: string;
  createdAt: any;
}

export type PatientStatus = 'active' | 'inactive' | 'critical' | 'stable' | 'recovered';
