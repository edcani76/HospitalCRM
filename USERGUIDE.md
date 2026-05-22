# EdvirontVet Veterinary CRM — User Guide

Complete guide for using the EdvirontVet Veterinary Clinic Management System.

---

## Table of Contents

1. [Accessing the System](#1-accessing-the-system)
2. [Client Portal (Patient-Facing)](#2-client-portal-patient-facing)
   - [2.1 Home Page](#21-home-page)
   - [2.2 Doctors Directory](#22-doctors-directory)
   - [2.3 Departments](#23-departments)
   - [2.4 Sign Up / Registration](#24-sign-up--registration)
   - [2.5 Login](#25-login)
   - [2.6 Password Reset](#26-password-reset)
   - [2.7 Dashboard](#27-dashboard)
   - [2.8 Book Appointment](#28-book-appointment)
   - [2.9 Pet Profile](#29-pet-profile)
   - [2.10 Owner Profile](#210-owner-profile)
3. [CRM Portal (Staff-Facing)](#3-crm-portal-staff-facing)
   - [3.1 Layout & Navigation](#31-layout--navigation)
   - [3.2 Admin Dashboard](#32-admin-dashboard)
   - [3.3 Doctor Dashboard](#33-doctor-dashboard)
   - [3.4 Staff Dashboard](#34-staff-dashboard)
   - [3.5 Patients Management](#35-patients-management)
   - [3.6 Owners Management](#36-owners-management)
   - [3.7 Appointments Management](#37-appointments-management)
   - [3.8 Create Appointment](#38-create-appointment)
   - [3.9 Appointment Details](#39-appointment-details)
   - [3.10 EMR Directory](#310-emr-directory)
   - [3.11 EMR (Electronic Medical Records)](#311-emr-electronic-medical-records)
   - [3.12 Billing & Payments](#312-billing--payments)
   - [3.13 Pharmacy Operations](#313-pharmacy-operations)
    - [3.14 Lab & Diagnostics](#314-lab--diagnostics)
   - [3.15 Admissions](#315-admissions)
   - [3.16 Analytics](#316-analytics)
   - [3.17 Audit Log](#317-audit-log)
   - [3.18 Staff Management](#318-staff-management)
   - [3.19 Doctor Availability](#319-doctor-availability)
   - [3.20 Service Catalog](#320-service-catalog)
   - [3.21 Google Drive Settings](#321-google-drive-settings)
4. [Email Notifications](#4-email-notifications)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Accessing the System

| Portal | URL | Access |
|--------|-----|--------|
| **Public / Marketing Site** | `http://localhost:3000` | Anyone |
| **Client Portal** | `http://localhost:3000/dashboard` | Registered pet owners |
| **CRM Portal** | `http://localhost:3000/crm/...` | Staff (admin, doctor, staff, lab, pharmacist) |

### User Roles

| Role | Access | Capabilities |
|------|--------|--------------|
| `client` | Client Portal | Book appointments, manage pets, view invoices |
| `admin` | CRM Portal | Full system access — manage staff, services, billing, all modules |
| `doctor` | CRM Portal | EMR consultations, prescribe, view appointments, manage patients |
| `staff` | CRM Portal | Manage appointments, patients, owners, billing |
| `lab` | CRM Portal | Lab & Diagnostics page |
| `pharmacist` | CRM Portal | Pharmacy operations, manage inventory, dispense prescriptions |

> See `USERS.md` for test/demo login credentials.

---

## 2. Client Portal (Patient-Facing)

### 2.1 Home Page

The public landing page showcases the clinic with:
- Hero section with clinic branding and call-to-action buttons
- Feature highlights (online booking, specialist care, emergency services)
- Quick links to Doctors, Departments, and Book Appointment
- Footer with clinic contact information

### 2.2 Doctors Directory

Browse all veterinarians with:
- Search by name
- Filter by department/specialty (e.g., Cardiology, Surgery, Preventive Care)
- Doctor profile cards with photo, specialization, experience, and bio
- Click a doctor to view full profile

### 2.3 Departments

Overview of all clinic departments/services:
- Diagnostic Medicine
- Avian/Exotics
- Therapy/Rehabilitation
- Emergency Care
- Each department shows description and available services

### 2.4 Sign Up / Registration

Multi-step registration wizard for new clients:

**Step 1 — Owner Info:**
- Full name, email (normalized to lowercase), phone, password
- If email belongs to an existing registered user, shows warning and redirects to login
- If email belongs to a returning guest (previous booking without account), shows existing booking history and allows account creation

**Step 2 — Pet Info:**
- Pet name, species (Dog/Cat/Bird/Rabbit/Hamster/Other), breed
- Weight, date of birth
- For returning guests: shows existing pets as selectable cards
- Data privacy consent and terms & conditions checkboxes (required)

**Step 3 — Book Appointment:**
- Select date, time slot, doctor (or "Any Available"), and service
- Reviews appointment summary

**Step 4 — Confirmation:**
- Shows booking confirmation with pet and appointment details
- Sends booking confirmation email to client
- Sends new booking alert to clinic staff

### 2.5 Login

Sign in with:
- Email + password (Firebase Authentication)
- Google Sign-In (one-click)
- "Forgot Password?" link sends branded password reset email
- Role-based redirect after login (clients → `/dashboard`, staff → respective CRM dashboard)

### 2.6 Password Reset

Two paths:
1. **Branded SMTP** (via Firebase Admin SDK): Server generates a real Firebase reset link and sends a branded email with the EdvirontVet template
2. **Firebase fallback**: If SMTP unavailable, Firebase sends its own password reset email, but the link redirects to the branded `/reset-password` page with `handleCodeInApp: true`

The `/reset-password` page handles:
- oobCode verification (spinner while validating)
- Expired link handler (manual email re-entry)
- Valid link shows password form (new password + confirm)
- Success state with auto-redirect to login after 3s
- Error state with retry button

### 2.7 Dashboard

The main client portal hub with 6 tabs:

**Overview Tab:**
- Welcome message with dynamic daily messages (5 rotating variants)
- Key stats: Upcoming Appointments, Pending Invoices, Registered Pets
- Quick actions: Book Appointment, Register Pet, View Appointments
- Next appointment card with status badge and countdown
- Recent invoices list

**My Pets Tab:**
- Pet cards with name, species, breed, age (auto-converts to months for < 1 year), photo
- Click a pet to navigate to their Pet Profile
- Register new pet button opens PetDialog
- Duplicate name detection across linked accounts (auth UID + linked guest UID)

**My Appointments Tab:**
- Split into "Upcoming" (top 5 with "Load More") and "Past Visits"
- Each appointment shows: date, time, doctor, pet, status badge, services
- "Manage" button opens appointment management dialog:
  - Cancel with required reason textarea
  - Reschedule with date picker + 12 time slots (AM/PM)
  - View/Edit services
- "Book New Appointment" button navigates to `/book-appointment`

**Billing Tab:**
- List of invoices with amount, status (Paid/Active), pet name, due date
- Amount formatted in PHP (₱)

**Records Tab:**
- Medical reports and documents for the client's pets

**Profile Tab:**
- Edit display name, phone, address
- Profile photo upload (uploaded to Google Drive, URL saved to Firestore)
- Camera icon overlay on hover when editing
- Data Privacy consent and Terms & Conditions with timestamps
- Consent state persists across sessions

### 2.8 Book Appointment

Full-featured booking flow:

**Doctor Carousel:**
- Horizontal scrollable carousel of all doctors
- "Any Available Doctor" option (auto-matches first available vet)
- Left/right arrow navigation with animated transitions
- Fixed-height cards (280px) preventing layout shifts

**Selection Panel:**
- Date picker: Full calendar component with `minDate` (today), disables past dates
- Time slot grid: 12 slots (AM/PM), dynamically filtered by doctor's availability
- Doctor availability stored as weekly schedule (`0=Sun..6=Sat`), fetches booked slots to exclude

**Service Selection:**
- Service type dropdown (Consultation, Vaccination, Grooming, etc.)

**Your Selection Sidebar:**
- Live-updating summary: doctor, date, time, service, pet
- "Book Appointment" button to confirm

**Pet Handling:**
- Select from existing pets, or register a new one inline
- Duplicate name check across all linked accounts

### 2.9 Pet Profile

Full pet detail page with tabs:
- **Overview:** Name, species, breed, age, photo, owner info
- **Clinical Details:** Blood type, microchip ID, date of birth, gender, color, medical history, size
- **Appointments:** List of past and upcoming appointments for this pet
- **Invoices:** Financial records for this pet's visits
- **Reports:** Lab results and medical documents

**Quick Start Visit** button available when no scheduled appointment exists (creates a walk-in emergency visit).

### 2.10 Owner Profile

Personal information, linked pets, appointment history, and invoices.

---

## 3. CRM Portal (Staff-Facing)

### 3.1 Layout & Navigation

Left sidebar with navigation groups:

- **Dashboard** — Role-specific landing page
- **Calendar** — Appointments management
- **Patients** — Patient directory and profiles
- **Owners** — Pet owner directory
- **EMR** — Electronic Medical Records
- **Billing** — Invoices, payments, financial reporting
- **Pharmacy** — Medication inventory, prescriptions
- **Lab** — Lab reports
- **Admissions** — Hospital admissions
- **Analytics** — Charts and reporting
- **More** — Staff management, audit log, services, settings

Sidebar toggle: Light-filled circle on the border between sidebar and content for expand/collapse.

### 3.2 Admin Dashboard

KPI cards showing:
- Total Patients
- Today's Appointments
- Revenue (₱ formatted)
- Pending Invoices count
- Monthly appointment trend chart (recharts bar chart)
- Revenue trend chart (recharts line chart)
- Recent activity feed with latest events

### 3.3 Doctor Dashboard

- Patient stats overview
- Today's appointments list with time and status
- Recent encounters
- Quick access to EMR

### 3.4 Staff Dashboard

- Appointment overview
- Pet statistics
- Invoice summary
- Doctor availability snapshot

### 3.5 Patients Management

Patient directory with:
- **Search** by name or owner
- **Filter** by species, status, owner
- **Grid/List** view toggle
- Patient cards showing: name, species, breed, age, owner name, status badge
- Status indicators: Active visit (`🟢`), inactive, critical, stable
- Guest/Migrated badges next to owner names for guest-origin patients
- **Add Pet** button opens pet registration dialog
- **Edit/Delete** actions per patient
- Click patient → navigate to Patient Profile

**CRM Pet Registration Dialog:**
- Species (Dog/Cat/Bird/Rabbit/Hamster/Other) with breed selector
- Weight, date of birth, gender (Male/Female), color
- Blood type, microchip ID
- Medical history textarea
- Photo upload with compression and Google Drive storage
- Data privacy & T&Cs consent checkboxes (required)

### 3.6 Owners Management

Client directory with:
- Search by name/email/phone
- Filter by pet count
- Each row shows: name, email, phone, registered pets count
- Click → navigate to Owner Profile for full details and linked records

### 3.7 Appointments Management

**Views:**
- **Calendar View**: Month calendar showing appointment dots on dates
- **List View**: Table with filters

**Filters:**
- Status (Unconfirmed, Confirmed, In Progress, Completed, Cancelled, No-Show)
- Doctor
- Date range (Today, This Week, This Month, Custom)

**Table Columns:**
- Pet name, Owner name (with Guest/Migrated badges), Doctor, Date, Time, Status (color-coded badges), Mode (Scheduled/Walk-in), Services, Actions

**Actions:**
- **Confirm** — Changes status to `confirmed`, sends confirmation email to client
- **Start** — Begins appointment (status → `in-progress`), creates encounter record
- **Cancel** — Changes to `cancelled`, sends cancellation email with reason
- **Mark No-Show** — Changes to `no-show`
- **View** — Navigates to Appointment Details page

**New Appointment** button → navigates to Create Appointment page

### 3.8 Create Appointment

Full appointment creation form:

1. Select **Pet** (search by name or owner)
2. Select **Date** and **Time**
3. Add **Appointment Groups** (click "+ Add New Appointment"):
   - **Provider**: Doctor (Consultation/Vaccination/Procedure/Emergency/Follow-up), Groomer (Grooming), Lab Tech (Laboratory)
   - **Time Slot**: Per group
   - **Services**: Add/remove services with Service Selector dialog
     - Department tabs: Doctor / Grooming / Laboratory
     - Lab center name input for lab services
     - Price display per service
4. **Mode**: Scheduled or Walk-in
5. **Status**: Unconfirmed (default) or Confirmed
6. General notes
7. Services saved to notes as `Services: consultation, grooming`

### 3.9 Appointment Details

Comprehensive appointment management:

**Header:**
- Pet name, Owner, Doctor, Date, Time
- Status badge (color-coded)
- Mode (Walk-in badge if applicable)
- "Start Appointment" / "Medical Complete" buttons (role-based)
  - Start: Creates encounter, sets status to `in-progress`
  - Medical Complete: Sets status to `medical-completed`, generates draft invoice
- Start time displayed once appointment is in progress

**Tabs:**

*Services:*
- List of services from `appointment_services` collection
- Add/remove/edit services with full Create Appointment-style dialog
- Service notes per item

*Vitals:*
- Toggle between View and Edit modes
- Cancel button when editing
- Fields: temperature, weight, heart rate, respiratory rate, MM color, CRT
- Saves to `triage_vitals` collection

*Clinical Notes:*
- SOAP format: Subjective, Objective, Assessment, Plan
- Toggle Save/Edit with Cancel button
- Updates existing document (no duplicate appends)

*Labs:*
- Order Lab button → opens Order Lab modal
- List of ordered labs with status badges

*Prescriptions:*
- Add prescription with medication, dose, frequency, duration
- Dispense from pharmacy inventory

*Audit Trail:*
- Chronological log of all actions on this appointment
- Shows resolved doctor/owner names (not raw UIDs)
- Performed by: `auth.currentUser.displayName`

*Invoice:*
- Auto-generated draft invoice on Medical Complete
- View invoice details

*Billing:*
- Payment status and history

### 3.10 EMR Directory

Patient listing for EMR access:
- Search by patient name
- Each row shows: patient name, species, breed, owner, last visit date
- Active visit indicator (green badge) for patients with in-progress encounters
- Click → navigate to EMR page for that patient

### 3.11 EMR (Electronic Medical Records)

The 15-step consultation workspace — the core clinical module.

**Layout:**
- **Left Panel**: 15-step stepper sidebar
- **Center Panel**: Main content for the active step
- **Right Panel**: Clinical context panel (encounter summary)
- **Bottom Bar**: Action buttons (Continue/Save/Skip per step)

**The 15 Steps:**

| # | Step | Description |
|---|------|-------------|
| 1 | **Chief Complaint** | Reason for visit, onset, duration |
| 2 | **Subjective** | Appetite, water intake, past history, owner-reported symptoms |
| 3 | **Triage & Vitals** | Temperature, weight, heart rate, respiratory rate, MM color, CRT |
| 4 | **Physical Exam** | Full physical examination findings |
| 5 | **Assessment** | Diagnosis status, differentials, severity, prognosis, clinical impression, problem list |
| 6 | **Plan Builder** | 7 inline modals/drawers: Add Treatment, Add Prescription, Add Procedure, Recommend Admission, Add Follow-Up, Add Owner Instructions, Order Lab |
| 7 | **Prescriptions** | Medication list with dosage, frequency, duration; "View in Pharmacy" button |
| 8 | **Labs & Diagnostics** | Lab orders with status badges (12 statuses); Cancel Order button; "View Lab" button |
| 9 | **Procedures** | Procedures performed/recommended with consent tracking |
| 10 | **Admission** | Recommend admission with type (Medical/Surgical/Isolation/ICU), monitoring, duration |
| 11 | **Follow-Up** | Type (Recheck/Surgery follow-up/Lab review/Vaccination/Post-op), due date, reminder method |
| 12 | **Owner Instructions** | Medication instructions, diet, activity, warning signs, follow-up, lab expectations |
| 13 | **Visit Summary** | Full summary of the entire visit |
| 14 | **Finish Checklist** | All items to complete before closing the visit |
| 15 | **Doctor Signature** | Digital sign-off to close the encounter |

**Clinical Context Panel:**
- Patient + Doctor info card
- Chief complaint
- Triage snapshot (color-coded vitals)
- Weight trend with ± difference
- Preventive care due status
- Active admission banner

**Clinical Alert Banner:**
- Gradient banner below sticky header with 5 alert sources:
  - 🔴 Red: Allergies
  - 🟠 Orange: Aggression/behavior flags
  - 🟡 Amber: Chronic conditions
  - 🟢 Yellow: Unpaid balance
  - 🟣 Purple: Pending labs
- Only non-empty alerts render

**Notes Persistence:**
- Auto-save on every step change
- `beforeunload` handler saves on tab close
- Unmount cleanup saves on navigation away
- All fields saved: chiefComplaint, appetite, waterIntake, pastHistory, diagnosis, differentials, severity, prognosis, clinicalImpression, problemList, followup fields, ownerInstructions, dietInstructions, warningSigns, licenseNumber, planItems

**Mode Detection:**
- **Active Mode**: `in-progress` encounter with `startedAt` exists — shows "🟢 Active Visit in Progress"
- **View Mode**: No active encounter — shows "⚪ No Active Visit"

**Plan Builder — 7 Inline Modals/Drawers:**
All open inline (never navigate away from the EMR page):
1. **Add Treatment**: name, reason, dose, route (SC/IM/IV/Oral/Topical), performed by, status, charge to billing, inventory deduction, notes
2. **Add Prescription**: medication, strength, dose, route, frequency, duration, quantity, instructions, linked diagnosis, substitution toggle, billing behavior
3. **Add Procedure**: name, indication, status, performed by, supplies, consent required, billing behavior, notes
4. **Recommend Admission**: type, reason, initial diagnosis, monitoring, duration, isolation/consent/deposit toggles, notes
5. **Add Follow-Up**: type, due date, assigned to, reminder method, create appointment toggle, owner message
6. **Add Owner Instructions**: medication instructions, diet, activity, warning signs, follow-up, lab expectations
7. **Order Lab**: test selector from catalog + manual entry, category, reason, priority, sample type, external lab toggle, billing behavior, owner consent

Plan items persisted as `clinicalNotes.planItems` array. Each item renders as a type-specific card below the plan builder with color, icon, and status badge.

**Services Tab:**
- "Complete" button for in-progress services
- Auto-generates draft invoice when ALL services completed
- `encounterServices` state fetches from `appointment_services` collection

**Visit Summary Tab:**
- Collapsible `SummarySection` component with chevron toggle
- Patient/Doctor/Status header card with gradient background
- Chief Complaint section
- Triage Snapshot with color-coded vital cards (Weight, Temp, Heart Rate, Resp Rate, MM Color, CRT)
- Services overview with pricing and status badges
- Clinical Notes (SOAP format)
- Lab Orders (pending/completed sections)
- Medications/Prescriptions list
- Billing Snapshot (subtotal, tax, grand total, amount paid, balance due)
- Visit Timeline (last 10 encounters, current highlighted)
- File Attachments section

### 3.12 Billing & Payments

**Billing & Payments Command Center:**

**Header:**
- "Billing & Payments" title with "Create Invoice" button

**6 KPI Cards:**
1. Total Billed (₱ + invoice count)
2. Collected (₱)
3. Outstanding (₱)
4. Overdue (₱)
5. Today's Collections (₱)
6. Pending Billing (count)

**Workflow Tabs (with counts):**
- All Invoices, Unpaid, Partially Paid, Paid, Overdue, Pending Billing

**Filters:**
- Search bar (by invoice #, owner, pet)
- Status dropdown
- Source dropdown
- Date range picker

**Invoice Table:**
- Invoice #, Date, Owner, Pet, Source badge, Total (₱), Paid (₱), Balance (₱), Status (color-coded badge), Due Date, Actions
- Dynamic status: draft → unpaid → partial → paid → overdue (computed from payments vs total)

**Row Actions:**
- 👁 View (opens detail side drawer)
- 💲 Pay (opens Receive Payment dialog)
- More dropdown: Print, Download PDF, Send to Owner (email), Void

**Invoice Detail Drawer:**
- Summary card (invoice #, date, status, due date)
- Charges table (line items with quantity, unit price, total)
- Totals: subtotal, tax (12% VAT), grand total
- Payment history table (date, method, amount, reference)

**Receive Payment Dialog:**
- Amount input (pre-filled with balance)
- Payment method: Cash / GCash / Bank Transfer / Card
- Reference number (for digital payments)
- Creates payment record + updates invoice status

**PDF Invoice:**
- Professional A4 format using `@react-pdf/renderer`
- Clinic branding, patient/owner info, services table, totals, payment history
- Status badge (Paid/Partially Paid/Draft) with color coding
- Download button on Billing tab

### 3.13 Pharmacy Operations

**Pharmacy Dashboard:**

**6 KPI Cards:**
1. Total Products
2. Low Stock items
3. Expiring Soon
4. Prescriptions Pending
5. Today's Dispensed
6. Inventory Value (₱)

**5 Tabs:**
- **All Medications**: Table with name, category, stock status (color-coded badges), expiry dates, price
- **Prescription Queue**: Pending prescriptions awaiting dispensing
- **Stock Movements**: Receiving/dispensing/adjustment/transfer history with running balance
- **Purchase Orders**: Pending and completed purchase orders
- **Inventory Reports**: Expiry and stock level reports

**Detail Side Drawer:**
- Medication info card
- Batches table (batch no, quantity, expiry, cost/selling price, status)
- Movement timeline

**Dialogs:**
- **Add/Edit Medication**: Name, category, description, price
- **Receive Stock**: Batch details (batch no, quantity, expiry date, cost/selling price)
- **Adjust Stock**: Quantity adjustment with reason
- **Dispense from Prescription**: Quantity to dispense with prescription reference

**Data Sources:**
- `medications` collection: Product catalog
- `inventory_batches` collection: Batch-level inventory tracking
- `stock_movements` collection: Audit trail for all stock changes
- `prescriptions` collection: Patient prescriptions

### 3.14 Lab & Diagnostics

Complete Lab & Diagnostics Operations Dashboard:
- **7 KPI cards**: Total Orders, Awaiting Collection, In Progress, Completed, Critical, External Labs, Pending Billing
- **Alert banner** for critical results, urgent STAT orders, overdue collections
- **7 workflow tabs**: Orders, Sample Collection, In Progress, Results & Reports, Critical Results, External Labs, Analytics
- **Rich table** with 11 color-coded status badges and full search/filter support
- **Detail drawer** with order timeline, patient info, and results
- **Sample Collection** dialog with barcode and specimen ID tracking
- **Result Entry** dialog with result, unit, reference range, and notes
- Direct links to EMR encounters and billing integration

### 3.15 Admissions

Hospital admission management:
- **Admit Patient** form: Select patient, reason for admission, assigned doctor, cage/ward
- **Active Admissions** list: Admitted patients with check-in date, diagnosis, assigned doctor
- **Admission Types**: Medical, Surgical, Isolation, ICU
- **Rounds Tracking**: Daily vitals and treatment notes per admission
- **Discharge Workflow**: Final diagnosis, discharge medications, follow-up instructions, signed by doctor
- Discharge summary saved and linked to patient record

### 3.16 Analytics

Charts and data visualization:
- Bar chart: Monthly appointment counts
- Line chart: Revenue trends over time
- Filters for date range

### 3.17 Audit Log

Chronological record of all system actions:
- Search by entity type, action, user
- Filter by entity, action type, date range
- Each entry shows: timestamp, user, action, entity type, entity ID, details
- Export functionality

### 3.18 Staff Management

Doctor management:
- List of all doctors with specialization, department, experience
- Edit doctor details
- Delete doctor
- Link Firestore doctor document to Firebase Auth UID (via `link-doctor-uid` utility)

### 3.19 Doctor Availability

Per-doctor weekly schedule:
- Grid: 7 days × time slots
- Enable/disable individual time slots per day
- Default schedule: Monday–Saturday, 8:00 AM – 5:00 PM (seedable via `seed-doctor-availability`)
- Availability stored as: `{ "0": ["09:00 AM", "10:00 AM", ...], "1": [...], ... }` (0=Sunday)

### 3.20 Service Catalog

Admin management of services and resources:

**Services Tab:**
- Service list with code, name, category, price, status (active/inactive)
- Categories: Consultation, Vaccination, Grooming, Surgery, Dental, Laboratory, Imaging, boarding
- Add/Edit: code, name, category, description, default price, taxable toggle, allowed provider types, required resources, duration

**Resources Tab:**
- Resources (rooms, equipment): name, type, status (Available/In Use/Maintenance)
- Add/Edit/Delete resources

### 3.21 Google Drive Settings

Google Drive integration settings:
- "Connect to Google Drive" button (OAuth flow)
- Shows connection status (connected/disconnected)
- If connected, files upload to Drive with nested folder structure: `<owner>/<pet>/photos/` or `<owner>/<pet>/emr/`
- CDN URLs (`lh3.googleusercontent.com/d/{id}=w1000`) prevent HTML-redirect rendering failures

---

## 4. Email Notifications

All emails are sent via SMTP (Gmail App Password) through the Express server at `/api/send-email` or `/api/send-password-reset`. All emails use the **EdvirontVet** brand.

| Trigger | Template | Recipient |
|---------|----------|-----------|
| Client books via portal | `bookingConfirmation` | Client |
| Client books via portal | `newBookingAlert` | All staff users |
| Staff confirms appointment | `appointmentConfirmed` | Client |
| Staff cancels appointment | `appointmentCancelled` | Client |
| Staff sends reminder | `appointmentReminder` | Client |
| Payment recorded | `invoiceReceipt` | Client |
| Password reset requested | Custom branded HTML | Client |

---

## 5. Troubleshooting

**"Cannot read properties of undefined (reading 'toFixed')" at Dashboard:**
- Some invoice documents lack the `amount` field. The system now defaults to `0` with `(amount ?? 0).toFixed(2)`.

**"ThemeContext invalid hook call" in console:**
- Caused by MetaMask browser extension (SES lockdown removes `Proxy`). Disable MetaMask for localhost, or use production build (`npm run build && npx serve dist`).

**Email sending fails with "534-5.7.9":**
- Google is blocking the SMTP login. Visit https://accounts.google.com/DisplayUnlockCaptcha with the SMTP account to unblock, or generate a new App Password at https://myaccount.google.com/apppasswords.

**Password reset not branded:**
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` is set in `.env` pointing to the Firebase Admin SDK service account JSON file.

**Pets loading multiple times on Dashboard:**
- The system now uses `getDocs` (one-time fetch) instead of `onSnapshot` (real-time listener) for pets, preventing listener churn.

**"Cannot access 'location' before initialization" in Login:**
- This was fixed by reordering hooks — `useNavigate` and `useLocation` are called before `useState`.

## 6. Seed Data & Demo Users

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | (see `USERS.md`) | (see `USERS.md`) | admin |
| Doctor | (see `USERS.md`) | (see `USERS.md`) | doctor |
| Staff | (see `USERS.md`) | (see `USERS.md`) | staff |

Seed scripts available:
- `npm run seed:emr` — Creates 7 encounters across 6 pets
- `npm run seed:pharmacy` — Creates 15 medications, 33 inventory batches
- `npm run seed:services` — Seeds service catalog with provider/resource mapping
