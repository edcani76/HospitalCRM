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
   - Optional notes/reason for visit
4. On submission, appointment is created in Firestore with:
   - `status: 'pending'`
   - `clientUid`: Patient's user ID
   - `doctorId`: Selected doctor
   - `petId` and `petName`: Selected pet
   - `date`, `time`: Selected slot
   - `notes`: Optional reason
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
3. Pending appointments show with "Pending" badge
4. Staff clicks **Checkmark button** to confirm:
   - Updates `status` from `'pending'` → `'confirmed'`
   - Ideally triggers notification to patient (see below)
5. Alternative actions:
   - **X button**: Cancel appointment (`status` → `'cancelled'`)
   - **Complete button**: Mark as completed (`status` → `'completed'`)

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
[pending] → [confirmed] → [completed]
    ↓
[cancelled]
```

**Status Definitions:**
- `pending`: Initial state when patient requests appointment
- `confirmed`: Staff/Doctor has approved the appointment
- `completed`: Appointment has been fulfilled
- `cancelled`: Appointment was cancelled (by staff or patient)

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
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  workflowStatus?: PatientStatus;  // Links to active workflow
  notes?: string;         // Reason for visit
  createdAt: any;        // Firestore timestamp
}
```

---

## Creating New Appointments (CRM)

Staff can create appointments directly from the CRM:
1. Click "New Appointment" button
2. Fill in:
   - Pet (from all registered pets)
   - Doctor (from doctors list)
   - Time slot
   - Optional: Client UID (if booking for existing client)
   - Notes
3. Appointment is created with `status: 'confirmed'` (bypasses pending state)

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
