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
- **Patient Portal:** `/book-appointment?doctorId=X`
- **CRM Portal:** `/crm/appointments` (Staff creates directly)

**Process (Patient Portal):**
1. Patient browses doctors at `/doctors`
2. Clicks "Schedule Visit" → navigates to booking page
3. Selects: Date (next 8 days), Time slot, Pet, Notes/Reason
4. Submits → creates in Firestore with `status: 'pending'`

**Process (CRM Portal):**
1. Staff clicks "New Appointment" button
2. Fills form: Pet, Doctor, Date, Time, Type, Mode, Notes
3. Submits → creates in Firestore with `status: 'confirmed'` (bypasses pending)

**Data Created:**
```typescript
{
  clientUid: string,        // Patient's user ID
  petId: string,          // Pet ID
  petName: string,        // Denormalized
  doctorId: string,       // Doctor ID
  doctorName: string,     // Denormalized
  date: string,           // Format: 'yyyy-MM-dd'
  time: string,           // Format: 'HH:MM AM/PM'
  status: 'pending' | 'confirmed',
  notes: string,          // Format: "Type: {type}\nMode: {mode}\n{additional notes}"
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
- `pending`: Shows "Confirm" button (not "Start Appointment")
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
     type: appointmentType,  // From notes: "Type: consultation"
     vitals: {},
     diagnosis: '',
     treatment: '',
     prescriptions: [],
     labResults: [],
     services: [{
       id: timestamp,
       name: 'Consultation' | 'Grooming' | etc.,
       startTime: timestamp,
       endTime: null,
       status: 'in-progress',
       fee: 500 | 800 | 300 | 1000  // Based on type
     }],
     createdAt, updatedAt
   }
   ```

3. **Create Draft Invoice:**
   ```typescript
   {
     petId, petName, clientUid, doctorId, doctorName,
     appointmentId: appointment.id,
     emrId: emrRecord.id,
     date: timestamp,
     status: 'draft',
     items: [{
       description: 'Consultation' | etc.,
       amount: serviceFee,
       quantity: 1
     }],
     total: serviceFee,
     createdAt, updatedAt
   }
   ```

4. **Send Notifications:**
   - **Doctor:** "Appointment Started - EMR and billing initialized"
   - **Client:** "Your pet's appointment has started"

5. **UI Updates:**
   - Status badge changes to blue "In Progress" (with white text)
   - Header shows: "Appointment Details (Ongoing)"
   - "Start Appointment" button disappears
   - "Edit" and "Cancel" buttons hidden (appointment is now in-progress)
   - "Services" table appears showing the initial service
   - "View Medical Record" button appears (links to EMR)

---

### 4. Service Management (During Appointment)

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
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes: string;           // Format: "Type: {type}\nMode: {mode}\n{notes}"
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
| `src/pages/BookAppointment.tsx` | Patient portal booking form |
| `src/lib/firestore-helpers.ts` | Firestore CRUD operations |
| `src/lib/notifications.ts` | Notification creation and sending |

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
