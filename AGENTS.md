# MyHospital PR1 - Agent Progress

## Goal
Implement EMR mode detection, Quick Start Visit (EMR + Patient Profile), fix timestamp display, add full service management to Edit Appointment matching Create Appointment, build Visit Summary tab, modernize portal dashboard UI/UX, integrate Google Drive via server proxy, build unified service catalog with provider-resource mapping, rebuild customer booking with doctor carousel and dynamic availability, and enhance patient records with full clinical details.

## Current Status (2026-05-11)

### ✅ Completed Features

1. **EMR Mode Detection**
   - Active mode: `in-progress` encounter with `startedAt` exists
   - View mode: No active encounter
   - PageHeader shows "🟢 Active Visit in Progress" or "⚪ No Active Visit"

2. **Quick Start Visit**
   - Available on **Patient Profile** page and **EMR** page
   - Shows doctor selector dialog with ALL doctors (for emergency/walk-in visits)
   - Pre-selects current logged-in doctor if they are a doctor
   - Creates appointment (unconfirmed → confirmed) + encounter + service
   - Navigates to EMR with `encounterId` in state
   - Sets `Mode: Walk-in` correctly

3. **Patient Profile Changes**
   - Quick Start Visit button (when no scheduled appointment exists)
   - Scheduled appointment warning with "View Appointment" button
   - Triage Check button REMOVED

4. **Edit Appointment Service Management**
   - Full Create Appointment-style UI with service selector dialog
   - Department tabs: Doctor / Grooming / Laboratory
   - Add/remove/edit services with lab center input for laboratory services
   - Services saved in `Services: consultation, grooming` format to notes
   - Parses both old `Type:` and new `Services:` formats

5. **Timestamp Fix**
   - Uses `startedAt` (not `createdAt`) for encounters
   - Migration script run: encounters already have `startedAt`

6. **Notes Display**
   - "Type(s)" → "Services" label in Appointment Details
   - Additional Notes shows combined service notes + general notes
   - Mode display handles "Walk-in" with hyphen correctly

7. **Visit Summary Tab (`emr-page.tsx`)**
   - Collapsible `SummarySection` component with chevron toggle
   - Patient/Doctor/Status header card with gradient background
   - Chief Complaint section
   - Triage Snapshot with color-coded vital cards (Weight, Temp, Heart Rate, Resp Rate, MM Color, CRT)
   - Services overview with pricing and status badges
   - Clinical Notes (SOAP format: Subjective, Objective, Assessment, Plan)
   - Lab Orders (pending/completed sections)
   - Medications/Prescriptions list
   - Billing Snapshot (subtotal, tax, grand total, amount paid, balance due)
   - Visit Timeline (last 10 encounters, current highlighted)
   - File Attachments section

8. **Google Drive Integration (Server Proxy)**
   - `/api/upload-to-drive` Express endpoint with `multer`
   - OAuth callback (`/api/auth/google/callback`)
   - Server-side token refresh using `GOOGLE_DRIVE_REFRESH_TOKEN`
   - Nested folder creation: `<patient_owner>/<pet>/photos/` or `<patient_owner>/<pet>/emr/`
   - `PetImage` component auto-converts Drive links to CDN URLs (`lh3.googleusercontent.com/d/{id}=w1000`)
   - Pet name, species, and breed are mandatory for proper folder organization

9. **Portal Dashboard UI/UX Modernization**
   - Reduced excessive rounding (`rounded-[3rem]` → `rounded-xl`)
   - Compacted text sizes (`text-6xl` → `text-2xl`, avatar `font-size=0.33`)
   - Reduced padding/gaps globally for denser layout
   - Mobile responsive with proper overlay behavior

10. **Appointments Logic**
    - "Scheduled Visits" stat includes `unconfirmed` status
    - Next appointment card shows earliest non-cancelled with "Pending Confirmation" badge
    - Appointments tab split: "Upcoming" (top 5 with "Load More") + "Past Visits"
    - "Back to Overview" button REMOVED

11. **Sidebar/Layout (`DashboardLayout.tsx`)**
    - Mobile: overlay appears only when open, blocks right panel
    - Desktop: collapse/expand toggle restored
    - Header hamburger menu for mobile

12. **Comprehensive EMR Seed Data**
    - `scripts/seed-emr-data.ts` creates end-to-end patient visits
    - 7 encounters across 6 pets (Buddy×2, Whiskers, Max, Luna, Charlie, Rocky)
    - Each visit includes: encounter, triage vitals, SOAP notes, services, lab orders, prescriptions, invoices, invoice items, payments, audit logs
    - Sample attachments (X-Ray reports, lab results) for Buddy, Whiskers, Max

13. **PDF Invoice Generation**
    - `src/components/invoice-pdf.tsx` - Professional PDF invoice using `@react-pdf/renderer`
    - Includes clinic branding, patient/owner info, services table, totals, payment history
    - Status badge (Paid/Partially Paid/Draft) with color coding
    - Download button on Billing tab generates and downloads PDF
    - Format: A4, clean layout with MediPaws branding

14. **Customer Portal Breadcrumb Navigation**
    - `Breadcrumb` component with `onClick` support for Dashboard tab state
    - Integrated into `DashboardLayout` header
    - `PageHeader` on BookAppointment, PetProfile, OwnerProfile
    - PetProfile: back button hidden, sidebar menus navigate correctly

15. **Appointment Management Dialog (Client Portal)**
    - "Manage" button on upcoming visits opens appointment detail dialog
    - Shows appointment card: pet name, doctor, date, time, status, notes
    - Cancel action: opens confirmation dialog with required reason textarea
    - Reschedule action: date picker + time slot grid (12 slots AM/PM)
    - Firestore updates: cancel sets `status: cancelled` + `cancelReason`, reschedule sets new `date`/`time` + `status: unconfirmed`
    - Loading states during async operations

16. **My Appointments Page Enhancements**
    - "Book New Appointment" button navigates to `/book-appointment`
    - Fixed "Dr. Dr." duplicate name display with `normalizeDoctorName()` helper
    - Renamed "Visit History" → "My Appointments"

17. **Doctor Carousel & Dynamic Availability (`BookAppointment.tsx`)**
    - Full-width doctor carousel with left/right arrow navigation
    - "Any Available Doctor" option (auto-matches first free vet)
    - Animated transitions with `motion/react` (slide left/right)
    - Fixed-height cards (280px) with flex layout preventing size jumps
    - Dynamic availability: fetches doctor's weekly schedule + filters booked slots
    - Date picker disables unavailable dates per doctor
    - "Your Selection" sidebar card updates live with doctor, date, time

18. **Enhanced Patient Records**
    - `Pet` type extended: `patientId`, `dateOfBirth`, `gender`, `color`, `bloodType`, `microchipId`, `weightHistory`, `medicalHistory`, `size`
    - My Pets cards: age auto-converts to months when < 1 year (`3mo`, `6mo`)
    - PetProfile: Clinical Details section with Blood Type, Microchip ID, DOB, Medical History
    - PetDialog form: added Microchip ID input and Medical History textarea
    - All pet creation paths (Dashboard, BookAppointment) save new fields to Firestore

19. **Profile Photo Editing (Customer Portal)**
    - Camera icon overlay on hover when editing profile
    - File picker for photo upload with instant preview
    - Photo uploaded to Google Drive via `uploadToGoogleDrive` helper
    - `photoURL` saved to Firestore `users` collection
    - Hint text "Click photo to change" shown during edit mode

20. **Pet Edit Dialog Data Population**
    - `PetDialog` now populates all fields when opened in edit mode
    - Handles `species`/`breed` with "Other" custom values correctly
    - Preserves existing pet photo as preview until new photo selected
    - Fields populated: species, breed, weight, dateOfBirth, gender, bloodType, color, microchipId, medicalHistory

21. **Full Calendar Booking Integration**
    - Replaced 8-day picker with full `Calendar` component in BookAppointment
    - Calendar supports `minDate` (today) and `disabledDays` for unavailable dates
    - Past dates disabled, weekends enabled
    - Auto-selection via `?doctorId=X` URL parameter

22. **Dynamic Dashboard Messages**
    - 5 rotating welcome messages per tab (overview, pets, appointments, billing, records)
    - Messages include personalized data: pet names, appointment counts, balances
    - Daily rotation based on `new Date().getDate() % messages.length`

23. **Notification Bell (Customer Portal)**
    - Fetches notifications from Firestore on mount
    - Dropdown displays unread notifications
    - Click marks as read via `markAsRead` function
    - Polls every 30 seconds for fresh data
    - Badge shows unread count

24. **Sidebar Toggle Modernization**
    - Light-filled circle centered on border between sidebar and content
    - Applied to both `DashboardLayout.tsx` and `crm-layout.tsx`
    - Hover state with subtle background transition

25. **Currency & Icon Standardization**
    - All currency displays use `₱` symbol (removed "PHP", "PHP$")
    - Pet icons changed to `PawPrint` across all pages
    - Report/EMR icons changed to `FileText`

26. **TypeScript Fixes**
    - Added `'profile'` to `activeTab` type union in Dashboard.tsx
    - Fixed invoice status comparison (`'pending'` → `'active'` per Invoice type)
    - Removed invalid `appointments` prop from Calendar component usage

27. **Data Privacy & T&Cs Consent**
    - Added consent checkboxes to Profile Edit (Dashboard.tsx):
      - "Data Privacy Consent" - consent to collection/processing of personal data per Data Privacy Act
      - "Terms & Conditions" - agreement to Terms of Service
    - Save button disabled until both consents are checked
    - Consent stored in Firestore with individual timestamps:
      - `consentPrivacyTimestamp` - when privacy consent was given
      - `consentTermsTimestamp` - when terms were accepted
    - Profile page displays consent records with formatted timestamps
    - Added consent checkboxes to Pet Registration (pet-dialog.tsx):
      - Same consent requirements for new patient registration
      - Pet health data processing consent included
      - Timestamps saved to `pets` collection
    - Consent state persists across sessions (loaded from Firestore on mount)

28. **Appointment Details Enhancements**
    - Removed flashing Ongoing badge (redundant with Medical in Progress)
    - Medical in Progress uses `animate-pulse`
    - Start time displayed in Appointment Details and EMR headers
    - Medical Complete triggers `generateInvoiceFromEncounter` to create draft invoice
    - Vitals form: toggle Save/Edit Vitals with Cancel button in edit mode
    - Clinical Notes: toggle Save/Edit Notes with Cancel button in edit mode
    - Clinical Notes update existing doc instead of appending duplicates
    - `performedBy`/`createdBy` uses `auth.currentUser?.displayName` instead of UID placeholders
    - Audit Trail shows resolved doctor/owner names instead of raw IDs

29. **Service Completion in EMR (Orders & Services Tab)**
    - "Complete" button for in-progress services
    - Auto-generates draft invoice when ALL services completed
    - `clinicalNotes` state stores single note object (extracts latest from array)

30. **Billing & Payments Command Center**
    - Header with "Billing & Payments" title and "Create Invoice" button
    - 6 KPI cards: Total Billed (₱ + count), Collected, Outstanding, Overdue, Today's Collections, Pending Billing
    - Workflow tabs: All Invoices, Unpaid, Partially Paid, Paid, Overdue, Pending Billing with counts
    - Search bar + filter dropdowns (Status, Source, Date range)
    - Rich invoice table: Invoice #, Date, Owner, Pet, Source badge, Total, Paid, Balance, Status, Due Date, Actions
    - Row actions: View (eye), Pay ($), More dropdown (Print, Download PDF, Send to Owner, Void)
    - Invoice detail side drawer with summary, charges, totals, payment history
    - Receive Payment dialog with amount, method (Cash/GCash/Bank Transfer/Card), reference
    - Dynamic status computation (draft/unpaid/partial/paid/overdue) for both old and new invoice formats
    - Color-coded status badges (Draft, Unpaid, Partial, Paid, Overdue, Void, Refunded)
    - Friendly empty state with Create Invoice button


### 📝 Recent Commits (branch: `codex/pr-1`)

| Commit | Description |
|--------|-------------|
| `78b9caf` | Fix DialogContent aria-describedby warning - add sr-only DialogDescription to invoice dialogs |
| `9b42947` | Redesign Billing page as Billing & Payments Command Center with KPI cards, tabs, rich table, drawer, payment dialog |
| `42c78ff` | Add Complete button for services in EMR, auto-generate draft invoice when all services completed |
| `7b2be7c` | Fix resolveName scope - move from VisitSummaryTab into EMRPage component |
| `341c580` | Fix SOAP notes save/display, replace UID placeholders with display names in audit trail and performedBy |
| `2d6757f` | Remove Ongoing badge, make Medical in Progress flash, add start time to headers, generate invoice on Medical Complete, fix Vitals toggle |
| `6d17aeb` | Show Walk-in badge on appointments, auto-flag orphaned multi-day encounters |
| `c569b6e` | Add admissions module, role-based appointment completion, search bars, and in-progress indicators |
| `927d655` | Add role-based restrictions for appointment confirmation and start |

### 🔧 Build Status
- ✅ Lint: Clean (0 errors)
- ✅ Build: Succeeds
- ✅ Dev Server: Running at `http://0.0.0.0:3000`

### 📂 Migration Scripts (Already Run)
- `scripts/migrate-appointment-services.ts`: 12 appointments migrated from `Type:` to `Services:` format
- `scripts/migrate-encounters-startedAt.ts`: Encounters already have `startedAt`

### 🚀 Next Steps
1. Test PDF invoice generation with real data
2. Test Visit Summary tab with seeded data
3. Verify Google Drive uploads work end-to-end
4. Test full appointment lifecycle (confirm → start → medical-complete → bill → pay → close)
5. If "ThemeContext invalid hook call" error appears in console: disable MetaMask extension for localhost (SES lockdown removes `Proxy`), or use `npm run build && npx serve dist`

### 🗂️ Key Files Modified
- `src/pages/crm/billing-page.tsx` - Billing & Payments Command Center with KPI cards, tabs, filters, rich table, side drawer, payment dialog
- `src/pages/crm/emr-page.tsx` - EMR page with VisitSummaryTab, mode detection, Quick Start Visit, PDF download, vitals form toggle, start time in header, service Complete button, resolveName fix
- `src/pages/crm/patient-profile.tsx` - Quick Start Visit, doctor selector
- `src/pages/crm/appointment-details-page.tsx` - Service management, notes display
- `src/pages/crm/admin-services.tsx` - Admin UI for service catalog, provider/resource management
- `src/pages/BookAppointment.tsx` - Doctor carousel, dynamic availability, service selection
- `src/pages/Dashboard.tsx` - My Appointments page, appointment management, pet age formatting, profile photo editing, data privacy & T&Cs consent with timestamps
- `src/pages/PetProfile.tsx` - Enhanced clinical details, breadcrumb navigation
- `src/components/DashboardLayout.tsx` - Sidebar/layout with mobile/desktop state management, breadcrumb integration, notification bell
- `src/components/crm-layout.tsx` - CRM portal layout with mobile sidebar, sidebar toggle
- `src/components/ServiceSelector.tsx` - Reusable service multi-select with provider filtering
- `src/components/invoice-pdf.tsx` - PDF invoice generation component
- `src/components/crm/pet-dialog.tsx` - Pet registration with Microchip ID, medical history, edit mode population, data privacy & T&Cs consent with timestamps
- `src/components/ui/breadcrumb.tsx` - New breadcrumb component with onClick support
- `src/components/ui/calendar.tsx` - Enhanced calendar with minDate and disabledDays support
- `src/components/ui/page-header.tsx` - Page header with back button support
- `server.ts` - Express API for Drive uploads, OAuth, token refresh
- `src/lib/google-drive.ts` - Client-side proxy for Drive uploads
- `src/lib/firestore-helpers.ts` - `fetchServicesForProvider`, `fetchAllResources`, service catalog helpers
- `src/lib/storage.ts` - Google Drive wrapper (removed Firebase Storage)
- `src/lib/file-upload.ts` - Google Drive upload helper
- `src/types.ts` - Pet type extended, ServiceCatalogItem, Resource, notification types
- `src/pages/Login.tsx` - Client redirect defaults to `/dashboard`
- `scripts/seed-service-catalog.ts` - Extended seed with provider/resource mapping, resources creation
- `scripts/seed-emr-data.ts` - Comprehensive EMR seed data script
- `scripts/migrate-pet-images-to-drive.ts` - Migration script for base64/Firebase images to Drive
- `public/_redirects` - Netlify SPA routing configuration

### ⚙️ Critical Context
- EMR Page tabs (9): Visit Summary, Triage & Vitals, Clinical Notes, Orders & Services, Medications, Diagnostics, Billing (active only), History, Audit Trail
- `encounterServices` state fetches from `appointment_services` collection
- Service storage in Edit Appointment: `Services: consultation, grooming` line in notes field
- Start Appointment: Parses `Services:` from notes, creates `appointment_services` records
- Drive uploads rely on `GOOGLE_DRIVE_REFRESH_TOKEN` in `.env` for silent token exchange
- `DashboardLayout.tsx` uses separate `mobileOpen` and `expanded` states
- `VisitSummaryTab` receives data via props from `EMRPage`'s existing Firestore fetchers
- CDN URLs (`lh3.googleusercontent.com/d/{id}=w1000`) prevent HTML-redirect rendering failures
- Doctor availability stored as `{ "0": ["09:00 AM", ...], "1": [...], ... }` (0=Sun..6=Sat)
- BookAppointment carousel uses fixed `height: 280px` with `flex` layout to prevent size jumps
- `normalizeDoctorName()` strips "Dr." prefix to prevent duplicate display
- `formatPetAge()` converts to months when < 1 year using `date-fns` differenceInMonths
- `pet-dialog.tsx` photo preview: if `pet.imageUrl` exists and doesn't start with `data:`, sets preview directly
- Calendar component disables days by checking `day < startOfToday()` or custom `disabledDays` set
- Bell notification dropdown renders `Notification` objects from `getNotifications` and calls `markAsRead` on click
- "ThemeContext invalid hook call" error in console is caused by MetaMask SES lockdown removing `Proxy` – disable MetaMask for localhost or use production build
