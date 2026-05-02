# Appointment Workflow Documentation

## Overview
This document describes the appointment request, confirmation, and notification workflow for the MyHospital application.

## Workflow Stages

### 1. Appointment Request (Patient Portal)
**Location:** `/book-appointment?doctorId=X` or `/book-appointment`

**Process:**
1. Patient browses doctors at `/doctors` page
2. Clicks "Schedule Visit" → navigates to booking page with doctor pre-selected
3. Patient selects:
   - Date (next 8 days shown)
   - Time slot (9 AM - 5 PM, with breaks)
   - Pet (from their registered pets)
   - Service type (Consultation, Grooming, Vaccination, etc.)
   - Optional notes/reason for visit
4. On submission, appointment is created in Firestore with:
   - `status: 'pending'`
   - `clientUid`: Patient's user ID
   - `doctorId`: Selected doctor
   - `petId` and `petName`: Selected pet
   - `date`, `time`: Selected slot
   - `notes`: "Type: {type}\nMode: scheduled\n{notes}"
   - `createdAt`: Server timestamp

**Files involved:**
- `src/pages/BookAppointment.tsx` - Booking form
- `src/firebase.ts` - Firestore integration

---

### 2. Appointment Confirmation (CRM Portal)
**Location:** `/crm/appointments` (Admin/Doctor/Staff access)

**Process:**
1. Staff/Doctor views appointments in calendar view
2. Filters by:
   - Date (using calendar component)
   - Doctor (dropdown filter)
3. Pending appointments show with "Unconfirmed" badge
4. Staff clicks **Confirm button** to confirm:
   - Updates `status` from `'unconfirmed'` → `'confirmed'`
   - Triggers notification to patient
5. Alternative actions:
   - **X button**: Cancel appointment (`status` → `'cancelled'`)
   - **Edit**: Modify appointment details including services

**Files involved:**
- `src/pages/crm/appointments-page.tsx` - Appointments management page
- `src/components/ui/calendar.tsx` - Calendar component

---

### 3. Patient Notification (To Be Implemented)

**Current State:** NOT YET IMPLEMENTED

**Recommended Implementation:**
When appointment status changes to `'confirmed'`:

1. **In-App Notification:**
   - Add a `notifications` collection in Firestore
   - Create notification document:
     ```typescript
     {
       userId: clientUid,
       type: 'appointment_confirmed',
       title: 'Appointment Confirmed',
       message: `Your appointment with ${doctorName} on ${date} at ${time} is confirmed.`,
       read: false,
       createdAt: serverTimestamp()
     }
     ```
   - Show notifications in patient dashboard

2. **Email Notification (Optional):**
   - Use Firebase Cloud Functions
   - Trigger on Firestore write to appointments collection
   - Send email via SendGrid/Mailgun/Nodemailer

3. **SMS Notification (Optional):**
   - Integrate Twilio or similar SMS service
   - Send SMS for urgent confirmations

**Files to create/modify:**
- `src/pages/Dashboard.tsx` - Add notifications display
- `functions/` (Firebase Cloud Functions) - For email/SMS notifications

---

## Appointment Status Flow

```
[unconfirmed] → [confirmed] → [in-progress] → [completed]
      ↓              ↓
[cancelled]   [no-show]
```

**Status Definitions:**
- `unconfirmed`: Initial state when appointment is created (CRM) or requested (Patient Portal - legacy 'pending')
- `confirmed`: Staff/Doctor has approved the appointment
- `in-progress`: Appointment has started, EMR and billing initialized
- `completed`: Appointment has been fulfilled, all services done
- `cancelled`: Appointment was cancelled (by staff or patient)
- `no-show`: Patient missed the appointment (auto-tagged by system)

---

## Data Models

**Appointment Interface** (`src/types.ts`):
```typescript
export interface Appointment {
  id: string;
  clientUid: string;      // Patient's user ID
  petId?: string;         // Pet ID
  petName: string;        // Pet name (denormalized)
  doctorId: string;       // Doctor ID
  doctorName: string;     // Doctor name (denormalized)
  date: string;           // Format: 'yyyy-MM-dd'
  time: string;           // Format: 'HH:MM AM/PM'
  status: 'unconfirmed' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;         // Format: "Type: {type}\n  Notes: {notes}\nMode: {mode}\n{general notes}"
  cancelReason?: string;  // If cancelled
  audit?: Array<{
    action: string;
    userId: string;
    timestamp: string;
    reason?: string;
  }>;
  createdAt: any;        // Firestore timestamp
  updatedAt: any;
}
```

---

## Creating New Appointments (CRM) - Multi-Provider System

Staff can create multiple appointments in one form:
1. Click "New Appointment" button
2. Select **Pet** and **Date**
3. Add **Appointment Groups** (click "+ Add New Appointment"):
   - Select **Provider** (Doctor/Groomer/Lab Tech)
   - System auto-detects department (doctor/grooming/laboratory)
   - Select **Time Slot** for this provider
   - Add **Services** to this group (click "+ Add Service to this Appointment"):
     - Select service type (Consultation, Grooming, Vaccination, etc.)
     - Add notes for each service
     - For Laboratory: Add Laboratory Center name
   - Remove services with ✕ button
   - Remove entire group with "Remove" button
4. **Mode**: Walk-in or Scheduled (applies to all groups)
5. **Status**: Unconfirmed or Confirmed
6. **General Notes**: Overall notes
7. Click **"Create Appointment"**
8. System creates **SEPARATE appointments** for each provider group
9. Services with same provider are combined into one appointment

---

## Future Enhancements

1. **Conflict Detection**: Prevent double-booking for same doctor/time
2. **Recurring Appointments**: Support for follow-up visits
3. **Calendar Sync**: Sync with Google Calendar/Outlook
4. **SMS/Email Reminders**: Send reminders 24h before appointment
5. **Waitlist**: Allow patients to join waitlist for popular time slots
6. **Online Payment**: Pay deposit or full amount during booking

---

## Testing the Workflow

1. **As Patient:**
   - Navigate to `/doctors`
   - Select a doctor → "Schedule Visit"
   - Fill booking form → Submit
   - Check dashboard for appointment status

2. **As Staff/Doctor:**
   - Navigate to `/crm/appointments`
   - Select date on calendar
   - View pending appointments
   - Click confirm/cancel buttons
   - Create new appointments using "New Appointment" button

3. **Verify Firestore:**
   - Check `appointments` collection in Firebase Console
   - Verify status transitions
   - Confirm all fields are populated correctly
