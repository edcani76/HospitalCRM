# MyHospital CRM Workflow Documentation

This document describes the complete workflow for appointment management in the MyHospital veterinary clinic system.

## Table of Contents
1. [Appointment Lifecycle](#appointment-lifecycle)
2. [Status Definitions](#status-definitions)
3. [Detailed Workflow Stages](#detailed-workflow-stages)
4. [Service Management](#service-management)
5. [Automatic Processes](#automatic-processes)
6. [Notification System](#notification-system)
7. [Data Models](#data-models)

---

## Appointment Lifecycle

```
[pending] → [confirmed] → [in-progress] → [completed]
     ↓              ↓
[cancelled]   [no-show]
```

### Status Flow Rules
- `pending` → `confirmed` (staff confirms) or `cancelled` (staff cancels)
- `confirmed` → `in-progress` (doctor starts on appointment day) or `no-show` (auto-tag if missed)
- `in-progress` → `completed` (doctor completes)
- `no-show` → (no further transitions - archival only)

---

## Status Definitions

| Status | Description | Who Can Update | UI Badge |
|---------|-------------|-----------------|----------|
| `pending` | Patient requested appointment, awaiting confirmation | Patient (create) | Gray (secondary) |
| `confirmed` | Staff/Doctor approved the appointment | Staff/Doctor | Green (success) |
| `in-progress` | Appointment started, EMR and billing initialized | Doctor (on appointment day) | Blue (text-white) |
| `completed` | Appointment finished, all services done | Doctor/Staff | Default |
| `cancelled` | Appointment cancelled before completion | Staff/Doctor/Patient | Red (destructive) |
| `no-show` | Patient missed the appointment (auto-tagged) | System (auto) or Staff | Yellow (outline) |

---

## Detailed Workflow Stages

### 1. Appointment Creation

**Locations:**
- **Patient Portal:** `/book-appointment` (doctor carousel with dynamic availability)
- **CRM Portal:** `/crm/appointments` (Staff creates directly)

**Process (Patient Portal):**
1. Patient lands on booking page — sees doctor carousel with left/right navigation
2. Carousel shows all doctors plus "Any Available Doctor" option (auto-matches first free vet)
3. Patient selects a doctor from carousel
4. Selects: Date (next 8 days, unavailable dates disabled per doctor availability), Time slot (filtered by doctor's schedule and existing bookings), Pet, Services, Notes/Reason
5. Submits → creates in Firestore with `status: 'unconfirmed'`
   - If "Any Available Doctor" selected, system auto-assigns first doctor free at selected slot

**Process (CRM Portal):**
1. Staff clicks "New Appointment" button
2. Fills form: Pet, Doctor, Date, Time, Type, Mode, Notes
3. Submits → creates in Firestore with `status: 'confirmed'` (bypasses unconfirmed)

**Data Created:**
```typescript
{
  clientUid: string,        // Patient's user ID
  petId: string,          // Pet ID
  petName: string,        // Denormalized
  doctorId: string,       // Doctor ID (or 'general' for Any Available)
  doctorName: string,     // Denormalized
  date: string,           // Format: 'yyyy-MM-dd'
  time: string,           // Format: 'HH:MM AM/PM'
  status: 'unconfirmed' | 'confirmed',
  notes: string,          // Format: "Services: {services}\nMode: {mode}\n{additional notes}"
  services: Array<{       // Service catalog IDs with provider mapping
    catalogId: string,
    providerId: string
  }>,
  servicesText: string,   // Human-readable: "Services: consultation, grooming"
  cancelReason?: string,   // If cancelled
  audit: array,           // Audit trail entries
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

### 2. Appointment Confirmation

**Location:** `/crm/appointments`

**Process:**
1. Staff views appointments in calendar view
2. Filters by: Date (calendar), Doctor (dropdown)
3. Pending appointments show "Confirm" button (replaces "Start Appointment" for pending)
4. On confirm:
   - Status: `pending` → `confirmed`
   - Audit entry added: `{ action: 'confirmed', userId, timestamp, reason: 'Appointment confirmed' }`
   - Notifications sent to doctor and client

**Button Visibility:**
- `unconfirmed`: Shows "Confirm" button (not "Start Appointment")
- `confirmed`: Shows "Start Appointment" button (enabled only on appointment day)

---

### 3. Starting an Appointment
 
**Prerequisites:**
- Status must be `confirmed`
- Must be the day of the appointment (checked via date comparison)
 
**Location:** `/crm/appointments/:appointmentId`
 
**Process (when "Start Appointment" clicked):**
 
1. **Update Appointment Status:**
    ```
    status: 'confirmed' → 'in-progress'
    Audit: { action: 'started', userId, timestamp, reason: 'Appointment started' }
    ```
 
2. **Create EMR Record (Electronic Medical Record):**
    ```typescript
    {
      petId, petName, clientUid, doctorId, doctorName,
      appointmentId: appointment.id,
      date, time,
      status: 'in-progress',
      startedAt: serverTimestamp(),  // Fixed: using startedAt (not createdAt)
      vitals: { weightKg: 0, temperatureC: 0, heartRateBpm: 0, ... },
      clinicalNotes: { subjective: '', objective: '', assessment: '', ... },
      services: [],  // Created separately in appointment_services
      createdBy, createdAt, updatedAt
    }
    ```
 
3. **Create Initial Service** (from `Services:` line in notes):
    ```typescript
    {
      appointmentId, encounterId, petId, clientUid,
      serviceCatalogId: '',
      serviceCode: 'CON',
      serviceName: 'Consultation',
      serviceType: 'consultation',
      status: 'in-progress',
      source: 'pre-booked',
      performedBy: doctorId,
      unitPrice: 500,
      createdBy, createdAt, updatedAt
    }
    ```
 
4. **Create Draft Invoice:**
    ```typescript
    {
      petId, petName, clientUid, doctorId, doctorName,
      appointmentId: appointment.id,
      encounterId: emrRecord.id,
      date: timestamp,
      status: 'draft',
      items: [{
        description: 'Consultation',
        amount: serviceFee,
        quantity: 1
      }],
      total: serviceFee,
      createdAt, updatedAt
    }
    ```
 
5. **Send Notifications:**
    - **Doctor:** "Appointment Started - EMR and billing initialized"
    - **Client:** "Your pet's appointment has started"
 
6. **UI Updates:**
    - Status badge changes to blue "In Progress" (with white text)
    - Header shows: "Appointment Details (Ongoing)"
    - "Start Appointment" button disappears
    - "Edit" and "Cancel" buttons hidden (appointment is now in-progress)
    - "Services" table appears showing the initial service
    - "View Medical Record" button appears (links to EMR)
 
---
 
### 3.5 Quick Start Visit (Walk-in / Emergency)
 
**Locations:**
- **Patient Profile page:** `/crm/patients/:petId`
- **EMR page:** `/crm/emr/:petId`
 
**Process (when "Quick Start Visit" clicked):**
 
1. **Show Doctor Selector Dialog:**
    - Fetches ALL doctors (for emergency/walk-in flexibility)
    - Pre-selects current logged-in doctor if they are a doctor
    - Doctor can override and select any available doctor
 
2. **Create Appointment (auto-confirmed):**
    ```typescript
    {
      clientUid, petId, petName,
      doctorId: selectedDoctorId,
      doctorName: selectedDoctorName,
      date: today,
      time: currentTime,
      status: 'unconfirmed' → 'confirmed',
      notes: "Services: consultation\nMode: Walk-in"
    }
    ```
 
3. **Create Encounter (Quick Start):**
    ```typescript
    {
      appointmentId, petId, petName, clientUid,
      doctorId: selectedDoctorId,
      doctorName: selectedDoctorName,
      startedAt: serverTimestamp(),  // EMR mode detection uses this
      status: 'in-progress',
      vitals: { ... },
      clinicalNotes: { ... },
      createdBy, createdAt, updatedAt
    }
    ```
 
4. **Create Initial Service:**
    ```typescript
    {
      appointmentId, encounterId, petId, ownerId,
      serviceCatalogId: '',
      serviceCode: 'CON',
      serviceName: 'Consultation',
      serviceType: 'consultation',
      status: 'in-progress',
      source: 'walk-in',
      performedBy: selectedDoctorId,
      unitPrice: 500,
      createdBy, createdAt, updatedAt
    }
    ```
 
5. **Navigate to EMR:**
    - Navigates to `/crm/emr/:petId` with `encounterId` in state
    - EMR page detects active encounter (has `startedAt`) → shows "Active Visit" mode
 
6. **EMR Mode Detection:**
    - **Active Mode:** `encounter.status === 'in-progress'` AND `encounter.startedAt` exists
    - **View Mode:** No active encounter found
    - PageHeader shows "🟢 Active Visit in Progress" or "⚪ No Active Visit"
 
---
 
### 4. Service Management (Edit Appointment)

**Location:** `/crm/appointments/:appointmentId` (Services table) and `/crm/patients/:petId/emr/:emrId`

**Services Table (on Appointment Details page):**
Shows all services added to the EMR for this appointment:

| Service | Start Time | End Time | Status | Fee |
|----------|------------|----------|--------|-----|
| Consultation | 09:00 AM | -- | In Progress (blue) | ₱500 |

**Adding Services:**
1. Click "View Medical Record" button → navigates to EMR page
2. From EMR page, doctor can:
   - Add services: Laboratory, Procedure, Vaccination, Grooming
   - Update service status: `in-progress` → `completed`
   - Set `endTime` when service completed
   - Add diagnosis, treatment, prescriptions
   - Update invoice with additional service fees

**Service Types & Fees:**
| Type | Fee (₱) |
|------|----------|
| Consultation | 500 |
| Grooming | 800 |
| Vaccination | 300 |
| Procedure | 1000 |
| Laboratory | TBD |
| Others | TBD |

---

### 5. Completing an Appointment

**Location:** `/crm/patients/:petId/emr/:emrId`

**Process:**
1. Doctor completes all services in EMR
2. Sets all service statuses to `completed`
3. Adds final diagnosis, treatment, prescriptions
4. Updates EMR status: `in-progress` → `completed`
5. Finalizes invoice (status: `draft` → `finalized`)
6. Updates appointment status: `in-progress` → `completed`

---

## Automatic Processes

### Auto No-Show Tagging

**Trigger:** When viewing appointment details or appointments list

**Logic:**
```typescript
if (appointment.date < today && 
    status !== 'completed' && 
    status !== 'cancelled' && 
    status !== 'in-progress') {
  // Auto-tag as no-show
  status: 'no-show'
  audit: { action: 'no-show', reason: 'Automatically marked as no-show' }
  // Send notifications to doctor and client
}
```

**Affected Pages:**
- `/crm/appointments` (appointments list)
- `/crm/appointments/:appointmentId` (appointment details)

---

## Notification System

### Notification Types

| Trigger | Type | Recipients | Message |
|---------|------|------------|---------|
| Appointment Confirmed | `appointment_confirmed` | Doctor, Client | "Appointment for {pet} on {date} confirmed" |
| Appointment Started | `appointment_started` | Doctor, Client | "Appointment started. EMR and billing initialized." |
| Appointment Cancelled | `appointment_cancelled` | Doctor, Client | "Appointment cancelled. Reason: {reason}" |
| Appointment No-Show | `appointment_no_show` | Doctor, Client | "Appointment auto-marked as No-Show" |
| EMR Updated | `emr_updated` | Client (optional) | "Medical record updated for {pet}" |

### Notification Storage

**In-App Notifications:**
```typescript
// Collection: notifications
{
  userId: string,        // Recipient's UID
  type: string,          // Notification type
  title: string,         // Display title
  message: string,       // Display message
  read: boolean,         // Read status
  createdAt: timestamp
}
```

**Future Enhancements:**
- Email notifications (via Firebase Cloud Functions + SendGrid)
- SMS notifications (via Twilio)

---

## Data Models

### Pet
```typescript
interface Pet {
  id: string;
  externalPetId?: string;
  patientId?: string;          // Format: P-{docId.slice(0,8)}
  ownerUid: string;
  name: string;
  species: string;
  breed?: string;
  type?: string;
  age?: number;                // In years (legacy)
  dateOfBirth?: string;        // Format: 'yyyy-MM-dd'
  gender?: string;             // Male / Female
  color?: string;
  bloodType?: string;
  microchipId?: string;        // e.g., 985112345678901
  weight?: number;             // In kg
  weightHistory?: any[];
  imageUrl?: string;           // Google Drive CDN URL
  lastUpdate?: any;
  currentStatus?: PatientStatus;
  medicalHistory?: string;     // Pre-existing conditions, allergies
  size?: string;               // Small / Medium / Large (derived from weight)
}
```

### Appointment
```typescript
interface Appointment {
  id: string;
  clientUid: string;        // Patient's user ID
  petId: string;           // Pet ID
  petName: string;         // Denormalized
  doctorId: string;        // Doctor ID
  doctorName: string;      // Denormalized
  date: string;            // Format: 'yyyy-MM-dd'
  time: string;            // Format: 'HH:MM AM/PM'
  status: 'unconfirmed' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes: string;           // Format: "Services: {services}\nMode: {mode}\n{general notes}"
  services?: Array<{       // Service catalog IDs with provider mapping
    catalogId: string;
    providerId: string;
  }>;
  servicesText?: string;   // Human-readable: "Services: consultation, grooming"
  cancelReason?: string;   // If cancelled
  audit: Array<{
    action: string;
    userId: string;
    timestamp: string;
    reason?: string;
  }>;
  createdAt: any;          // Firestore timestamp
  updatedAt: any;
}
```

### EMR Record (Electronic Medical Record)
```typescript
interface EMRRecord {
  id: string;
  petId: string;
  petName: string;
  clientUid: string;
  doctorId: string;
  doctorName: string;
  appointmentId: string;
  date: string;
  time: string;
  status: 'in-progress' | 'completed' | 'draft';
  type: string;            // Consultation, Grooming, etc.
  vitals: {
    temperature?: number;
    weight?: number;
    heartRate?: number;
    respiratoryRate?: number;
  };
  diagnosis: string;
  treatment: string;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  labResults: Array<{
    test: string;
    result: string;
    date: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string | null;
    status: 'in-progress' | 'completed';
    fee: number;
  }>;
  notes: string;
  createdAt: any;
  updatedAt: any;
}
```

### Invoice
```typescript
interface Invoice {
  id: string;
  petId: string;
  petName: string;
  clientUid: string;
  doctorId: string;
  doctorName: string;
  appointmentId: string;
  emrId?: string;
  date: string;
  status: 'draft' | 'finalized' | 'paid' | 'cancelled';
  items: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
  total: number;
  createdAt: any;
  updatedAt: any;
}
```

---

## Role-Based Access

| Role | Can Confirm | Can Start | Can Cancel | Can Edit EMR | Can Finalize Invoice |
|------|--------------|-----------|-------------|-----------------|---------------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Doctor | ❌ | ✅ (own appointments) | ✅ (own) | ✅ (own) | ✅ (own) |
| Staff | ✅ | ✅ | ✅ | ❌ | ✅ |
| Client/Patient | ❌ | ❌ | ✅ (own, before start) | ❌ | ❌ |

---

## File Structure

### Key Files for Appointment Workflow

| File | Purpose |
|------|---------|
| `src/pages/crm/appointments-page.tsx` | Appointments list with calendar view, confirm/cancel actions, auto no-show |
| `src/pages/crm/appointment-details-page.tsx` | Appointment details, start workflow, services table, EMR/invoice creation |
| `src/pages/crm/create-appointment-page.tsx` | Create new appointment (staff), includes type/mode selection |
| `src/pages/crm/patient-profile.tsx` | Patient profile with appointment history |
| `src/pages/crm/patients-page.tsx` | Patients directory |
| `src/pages/BookAppointment.tsx` | Patient portal booking with doctor carousel and dynamic availability |
| `src/pages/Dashboard.tsx` | Client portal with appointment management (cancel/reschedule) |
| `src/pages/PetProfile.tsx` | Pet clinical details with enhanced fields (microchip, blood type, etc.) |
| `src/components/crm/pet-dialog.tsx` | Pet registration with Microchip ID and Medical History |
| `src/components/ServiceSelector.tsx` | Reusable service multi-select with provider filtering |
| `src/components/ui/breadcrumb.tsx` | Breadcrumb navigation with onClick support |
| `src/lib/firestore-helpers.ts` | Firestore CRUD operations |
| `src/lib/notifications.ts` | Notification creation and sending |
| `src/lib/google-drive.ts` | Google Drive upload proxy |

---

## Future Enhancements

1. **Conflict Detection:** Prevent double-booking for same doctor/time
2. **Recurring Appointments:** Support for follow-up visits
3. **Calendar Sync:** Sync with Google Calendar/Outlook
4. **SMS/Email Reminders:** Send reminders 24h before appointment
5. **Waitlist:** Allow patients to join waitlist for popular time slots
6. **Online Payment:** Pay deposit or full amount during booking
7. **Service Completion:** Individual service status tracking with end times
8. **Prescription Integration:** Auto-add prescriptions to pharmacy orders
9. **Lab Integration:** Real-time lab result tracking and notification

---

**Last Updated:** 2026-05-02
