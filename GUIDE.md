# MyHospital CRM - User Guide

Complete guide for using the MyHospital Veterinary Clinic Management System.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Appointment Management](#appointment-management)
3. [Patient Management](#patient-management)
4. [Medical Records (EMR)](#medical-records-emr)
5. [Billing & Invoicing](#billing--invoicing)
6. [Dashboards](#dashboards)
7. [Offline Support](#offline-support)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Accessing the System
- **CRM Portal**: `http://localhost:3000/crm` (Staff/Admin/Doctor)
- **Patient Portal**: `http://localhost:3000` (Patients)

### Login Credentials (Demo)
See `USERS.md` for test user credentials.

---

## Appointment Management

### Creating Appointments (CRM Staff) - Multi-Provider System

1. Navigate to **CRM → Appointments**
2. Click **"New Appointment"** button
3. Select **Pet** from registered pets
4. Select **Date**
5. Add **Appointment Groups** (click "+ Add New Appointment"):
   - **Provider**: Choose from:
     - Doctors (for Consultation, Vaccination, Procedure, Emergency, Follow-up)
     - Groomers (for Grooming services)
     - Lab Techs (for Laboratory services)
   - **Time Slot**: Selected per appointment group
   - **Services** (click "+ Add Service to this Appointment"):
     - Select service type
     - Add notes for each service
     - For Laboratory: Add Laboratory Center name
   - Remove services with ✕ button
   - Remove entire appointment group with "Remove" button
6. **Mode**: Walk-in or Scheduled (applies to all groups)
7. **Status**: Unconfirmed or Confirmed (applies to all groups)
8. **General Notes**: Overall appointment notes
9. Review summary showing each appointment group
10. Click **"Create Appointment"** → System creates SEPARATE appointments for each provider group

### Appointment Groups & Providers

Appointments are now organized by **Provider Groups**:
- Services with the **same provider** are combined into one appointment
- Services with **different providers** create separate appointments
- Each group has its own:
  - Provider (Doctor/Groomer/Lab Tech)
  - Time slot
  - List of services
  - Department tag

**Example:**
- Appointment 1: Dr. Smith (Doctor) - Consultation + Vaccination at 9:00 AM
- Appointment 2: John's Grooming (Groomer) - Grooming at 2:00 PM
- Appointment 3: Lab Tech Alice (Laboratory) - Laboratory at 10:00 AM

### Appointment Status Flow
```
[Unconfirmed] → [Confirmed] → [In-Progress] → [Completed]
      ↓              ↓
   [Cancelled]   [No-Show]
```

### Starting an Appointment (Scheduled)
1. Go to **Appointment Details** page
2. Click **"Start Appointment"** (only enabled on appointment day)
3. System automatically:
   - Creates Electronic Medical Record (EMR)
   - Initializes draft invoice
   - Sends notifications to doctor and client

### Quick Start Visit (Walk-in / Emergency)
1. **From Patient Profile:**
   - Click **"Quick Start Visit"** (when no scheduled appointment exists)
   - Doctor selector dialog appears with ALL doctors
   - Select a doctor (current user pre-selected if doctor)
   - System creates: Appointment (confirmed) → Encounter (in-progress) → Service
   - Navigates to EMR with encounterId in state

2. **From EMR Page:**
   - Click **"Quick Start Visit"** button
   - Same doctor selector dialog appears
   - Follow same flow as above

3. **EMR Mode Detection:**
   - **Active Mode:** `encounter.status === 'in-progress'` AND `encounter.startedAt` exists
   - **View Mode:** No active encounter found
   - PageHeader shows "🟢 Active Visit in Progress" or "⚪ No Active Visit"

### Editing Appointments
- Click **"Edit"** button on Appointment Details page
- Modify services, notes, or status
- Changes are tracked in audit trail

---

## Patient Management

### Adding New Patients
1. Navigate to **CRM → Patients**
2. Click **"Add Patient"** (opens PetDialog)
3. Fill in:
   - Pet name, species, breed
   - Owner selection
   - Medical information (blood type, allergies, etc.)

### Patient Profile
Access comprehensive patient information:
- **Basic Info**: Name, species, breed, age
- **Medical History**: Past appointments, conditions
- **Vitals**: Latest weight, temperature, etc.
- **Appointments**: Upcoming and past visits
- **Audit Trail**: All changes with user names and timestamps

### Search & Filter
- Use search bar to find patients by name
- Filter by species (Dog, Cat, etc.)
- View appointment history

---

## Medical Records (EMR)

### Accessing EMR
- From **Appointment Details**: Click **"View Medical Record"**
- From **Patient Profile**: Click on appointment in history

### EMR Features
1. **Vitals**: Record temperature, weight, heart rate
2. **Diagnosis**: Document findings
3. **Treatment**: Prescribe medications
4. **Services**: Track individual service progress
   - Add services during appointment
   - Mark services as completed
   - Record end times
5. **Lab Results**: Attach test results
6. **Prescriptions**: Manage medications

### Service Management
- View all services in the services table
- Each service shows: name, start/end time, status, fee
- Add new services as needed during appointment
- Complete services individually

---

## Billing & Invoicing

### Invoice Creation
- Automatically created when appointment starts
- Status: **Draft** → **Finalized** → **Paid**

### Invoice Management
1. Navigate to **CRM → Billing**
2. View draft/finalized invoices
3. Add/remove items
4. Calculate:
   - Subtotal (from services)
   - Tax (automatically calculated)
   - Total amount

### PDF Generation
- Click **"Download PDF"** on any invoice
- Opens printable invoice in new tab

---

## Dashboards

### Staff Dashboard
- **Today's Schedule**: Upcoming appointments with types and status
- **Quick Stats**: Total appointments, patients, revenue
- **Recent Activity**: Latest updates

### Doctor Dashboard
- **My Appointments**: Today's schedule for logged-in doctor
- **Patient Queue**: Waiting patients
- **Quick Actions**: Start appointment, view EMR

### Patient Dashboard
- **Upcoming Appointments**: Future bookings
- **Pet Profiles**: Manage registered pets
- **Medical History**: Past visits and records

---

## Offline Support

### Online/Offline Indicator
- **Green dot**: Online - full functionality
- **Red dot**: Offline - limited functionality

### How It Works
1. **While Online**:
   - Data is cached in IndexedDB
   - Ready for offline access

2. **While Offline**:
   - View cached appointments, patients, EMR
   - Create/edit records (queued for sync)
   - See "Pending Sync" indicator

3. **Reconnecting**:
   - Click **"Sync Now"** button
   - Queued mutations are pushed to Firestore
   - Conflicts are handled automatically

### Limitations Offline
- Cannot create new patients (requires server validation)
- Cannot process payments
- Real-time notifications disabled

---

## Troubleshooting

### Appointment Not Showing
- Check date filter on calendar
- Verify doctor filter
- Refresh page (F5)

### "appointmentTypes is not defined" Error
- Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Clear browser cache
- Restart dev server

### Services Not Saving
- Ensure at least one service is added
- Check that service type is selected
- Verify notes don't contain invalid characters

### Offline Indicator Stuck
- Click sync button
- Check internet connection
- Restart browser if needed

### EMR Not Creating
- Verify appointment status is "Confirmed"
- Ensure you're on the appointment day
- Check browser console for errors

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | New Appointment (CRM) |
| `Ctrl + P` | Print Invoice |
| `Esc` | Close Dialog |
| `Ctrl + S` | Save Changes (EMR) |

---

## FAQ

**Q: Can I book for multiple pets at once?**
A: No, create separate appointments for each pet.

**Q: How do I cancel an appointment?**
A: Go to Appointment Details → Click "Cancel" → Provide reason.

**Q: Can I edit a completed appointment?**
A: No, completed appointments are locked. Create a follow-up instead.

**Q: Where do I see past appointments?**
A: Patient Profile → Appointment History tab.

**Q: How do I add multiple services?**
A: Click "+ Add Service" button, select type, add notes for each.

---

## Support

For technical issues:
1. Check browser console (F12) for errors
2. Verify Firebase connection
3. Check `PROGRESS.md` for recent changes
4. Review `WORKFLOW.md` for process details

---

**Last Updated**: 2026-05-02
