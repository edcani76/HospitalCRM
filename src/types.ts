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
  // Legacy fields (keep for compatibility during transition)
  code?: string;
  name?: string;
  category?: string;
  defaultPrice?: number;
  taxable?: boolean;
  active?: boolean | string;
  requiresClinicalRecord?: boolean;
  inventoryItemId?: string;
  durationMin?: number;
  allowedProviderIds?: string[];
  requiredResourceIds?: string[];
  
  // New Fields from Services Catalog Spec
  service_code?: string;
  service_name?: string;
  invoice_label?: string;
  category_id?: string;
  department?: string;
  description?: string;
  base_price?: number;
  unit?: string; // 'Per visit', 'Per day', 'Per hour', 'Per test', 'Per kg', 'Per dose'
  tax_type?: 'VAT' | 'Non-VAT' | 'Exempt';
  tax_mode?: 'Inclusive' | 'Exclusive';
  billing_behavior?: 'manual' | 'auto-add' | 'package' | 'estimate-only';
  module_availability?: string[]; // e.g. ['Appointments', 'EMR', 'Billing', 'Lab', 'Admissions']
  allow_discount?: boolean;
  allow_waiver?: boolean;
  allow_price_override?: boolean;
  require_override_reason?: boolean;
  status?: 'active' | 'draft' | 'inactive' | 'archived';
  effective_date?: any;
  created_by?: string;
  updated_by?: string;
  
  createdAt?: any;
  updatedAt?: any;
}

export interface Resource {
  id?: string;
  resource_code?: string;
  name?: string;
  resource_type?: string; // Cage, room, equipment, etc.
  branch_id?: string;
  location?: string;
  department?: string;
  capacity?: number;
  schedulable?: boolean;
  billable?: boolean;
  status?: 'Available' | 'In Use' | 'Reserved' | 'Maintenance' | 'Cleaning' | 'Out of Service' | 'Inactive';
  service_mapping_id?: string; // Links to ServiceCatalogItem
  default_pricing_rule_id?: string;
  species_restriction?: string;
  isolation_capable?: boolean;
  icu_capable?: boolean;
  maintenance_required?: boolean;
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface ResourcePricingRule {
  id?: string;
  name?: string;
  resource_id?: string;
  resource_type?: string;
  service_id?: string;
  pricing_model?: 'Per use' | 'Per hour' | 'Per day' | 'Per night' | 'Package Included' | 'Manual';
  base_rate?: number;
  minimum_charge?: number;
  branch_id?: string;
  status?: 'Active' | 'Draft' | 'Expired' | 'Inactive';
  effective_from?: any;
  effective_to?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface ResourceReservation {
  id?: string;
  resource_id?: string;
  source?: 'Appointment' | 'Admission' | 'Surgery' | 'Lab Order' | 'Grooming' | 'Manual';
  source_id?: string; // ID of the appointment/admission
  pet_id?: string;
  owner_id?: string;
  start_time?: any;
  end_time?: any;
  status?: 'Reserved' | 'Checked In' | 'In Use' | 'Extended' | 'Completed' | 'Cancelled' | 'No-Show' | 'Released';
  billing_status?: 'Not Billable' | 'Queued' | 'Billed' | 'Paid';
  notes?: string;
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

export interface InventoryBatch {
  id?: string;
  medicationId: string;
  batchNo: string;
  quantity: number;
  originalQuantity: number;
  expiryDate: string;
  manufacturingDate?: string;
  costPrice: number;
  sellingPrice: number;
  receivedDate: string;
  status: 'active' | 'expired' | 'depleted';
  createdAt?: any;
  updatedAt?: any;
}

export interface StockMovement {
  id?: string;
  medicationId: string;
  medicationName?: string;
  batchId?: string;
  batchNo?: string;
  type: 'receiving' | 'dispensing' | 'adjustment' | 'transfer' | 'expired' | 'return';
  quantity: number;
  runningBalance?: number;
  reference: string;
  notes?: string;
  userId?: string;
  userName?: string;
  createdAt?: any;
}

export interface Prescription {
  id?: string;
  encounterId: string;
  petId: string;
  petName?: string;
  doctorId?: string;
  doctorName?: string;
  date?: string;
  status: 'pending' | 'dispensed' | 'cancelled';
  items?: Array<{
    medicationId: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    quantity: number;
    instructions?: string;
  }>;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type LabOrderStatus =
  | 'draft'
  | 'ordered'
  | 'awaiting-sample'
  | 'sample-collected'
  | 'in-progress'
  | 'ready-for-review'
  | 'completed'
  | 'cancelled'
  | 'rejected-sample'
  | 'awaiting-external-lab'
  | 'critical-result'
  | 'amended';

export interface LabOrder {
  id?: string;
  encounterId: string;
  appointmentServiceId?: string;
  patientId: string;
  petName?: string;
  ownerName?: string;
  ownerId?: string;
  testName: string;
  testCode?: string;
  testCategory: 'Laboratory' | 'Imaging' | 'External Lab';
  status: LabOrderStatus;
  reason: string;
  priority: 'Routine' | 'Urgent' | 'STAT';
  sampleType?: 'Blood' | 'Urine' | 'Fecal' | 'Swab' | '';
  expectedDate?: any;
  externalLab?: boolean;
  notes?: string;
  billingBehavior: 'queue' | 'create-invoice-line';
  ownerConsent?: 'pending' | 'signed' | 'waived';
  orderedBy: string;
  orderedByUid?: string;
  completedBy?: string;
  orderedAt?: any;
  completedAt?: any;
  resultSummary?: string;
  resultFileUrls?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export type PatientStatus = 'active' | 'inactive' | 'critical' | 'stable' | 'recovered';
