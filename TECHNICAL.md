# EdvirontVet Veterinary CRM — Technical Documentation

Architecture, data models, API references, and development guide.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Firestore Data Models](#4-firestore-data-models)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Server API Reference](#6-server-api-reference)
7. [Email System](#7-email-system)
8. [Google Drive Integration](#8-google-drive-integration)
9. [EMR System](#9-emr-system)
10. [Development Setup](#10-development-setup)
11. [Data Flow Patterns](#11-data-flow-patterns)
12. [Key Design Decisions](#12-key-design-decisions)

---

## 1. Project Structure

```
HospitalCRM/
├── public/                    # Static assets
│   └── _redirects             # Netlify SPA routing
├── scripts/                   # Database seed & migration scripts
│   ├── seed-emr-data.ts
│   ├── seed-service-catalog.ts
│   ├── seed-pharmacy-data.ts
│   ├── migrate-appointment-services.ts
│   ├── migrate-encounters-startedAt.ts
│   ├── migrate-pet-images-to-drive.ts
│   └── remove-duplicate-encounters.ts
├── src/
│   ├── components/
│   │   ├── ui/                # shadcn-style primitives
│   │   │   ├── badge.tsx, button.tsx, calendar.tsx, card.tsx
│   │   │   ├── dialog.tsx, drawer.tsx, dropdown-menu.tsx
│   │   │   ├── input.tsx, label.tsx, select.tsx, textarea.tsx
│   │   │   ├── breadcrumb.tsx, page-header.tsx, search-bar.tsx
│   │   │   ├── stats-card.tsx, table.tsx, payment-terms-dialog.tsx
│   │   ├── crm/               # CRM-specific components
│   │   │   ├── pet-dialog.tsx, order-lab-modal.tsx
│   │   ├── Layout.tsx         # Public layout
│   │   ├── DashboardLayout.tsx # Client portal layout
│   │   ├── crm-layout.tsx     # CRM portal layout
│   │   ├── ProtectedRoute.tsx # Auth guard
│   │   ├── ServiceSelector.tsx # Service multi-select
│   │   ├── invoice-pdf.tsx    # PDF generation
│   │   └── AIChatWidget.tsx   # Gemini AI chat
│   ├── pages/
│   │   ├── Home.tsx, Doctors.tsx, Departments.tsx
│   │   ├── Login.tsx, Signup.tsx, ResetPassword.tsx
│   │   ├── Dashboard.tsx, BookAppointment.tsx
│   │   ├── PetProfile.tsx, OwnerProfile.tsx
│   │   └── crm/               # 30 CRM pages
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Firebase Auth provider
│   │   └── ThemeContext.tsx    # Theme toggle
│   ├── lib/                   # Shared utilities & data layer
│   │   ├── firestore-helpers.ts # 50+ Firestore CRUD functions
│   │   ├── email-service.ts   # Client email proxy
│   │   ├── email-templates.ts # HTML email templates
│   │   ├── google-drive.ts    # Drive upload client
│   │   ├── file-upload.ts     # Upload helpers
│   │   ├── storage.ts         # Drive storage wrapper
│   │   ├── notifications.ts   # In-app notification helpers
│   │   ├── aiService.ts       # Gemini AI client
│   │   ├── offline-cache.ts   # Simple offline cache
│   │   ├── utils.ts           # cn() classname merger
│   │   └── seed-doctor-availability.ts
│   ├── firebase.ts            # Firebase SDK init & exports
│   └── types.ts               # All TypeScript interfaces
├── server.ts                  # Express server (API + Vite)
├── tailwind.config.ts
├── vite.config.ts
├── package.json
├── tsconfig.json
└── .env / .env.example
```

---

## 2. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.0.0 | UI framework |
| TypeScript | ~5.8.2 | Type safety |
| Vite | ^6.2.0 | Build tool + dev server |
| Tailwind CSS | ^4.1.14 | Utility CSS |
| React Router | ^7.13.1 | Client-side routing |
| Firebase Client SDK | ^12.11.0 | Auth + Firestore |
| motion (framer-motion) | ^12.23.24 | Animations |
| recharts | ^3.8.1 | Charts |
| date-fns | ^4.1.0 | Date utilities |
| lucide-react | ^0.546.0 | Icons |
| @react-pdf/renderer | ^4.5.1 | PDF invoices |
| react-calendar | ^6.0.1 | Calendar component |
| react-markdown | ^10.1.0 | Markdown rendering |
| @radix-ui/* | various | Accessible UI primitives |
| browser-image-compression | ^2.0.2 | Client-side image compression |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Express | ^4.21.2 | HTTP server |
| tsx | ^4.21.0 | TypeScript execution |
| Firebase Admin SDK | ^13.10.0 | Server-side Firebase (reset links) |
| Nodemailer | ^8.0.7 | SMTP email sending |
| Multer | ^2.1.1 | File upload handling |
| Google Gemini SDK | ^1.29.0 | AI chat |
| googleapis | ^171.4.0 | Google API client |
| dotenv | ^17.2.3 | Environment config |

### Infrastructure

| Component | Technology |
|-----------|------------|
| Database | Firestore (NoSQL) |
| Authentication | Firebase Auth |
| File Storage | Google Drive (via API) |
| Email | Gmail SMTP (App Password) |
| AI | Google Gemini 2.0 Flash |
| Hosting | Netlify (planned) |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Public Pages  │  │ Client Portal│  │  CRM Portal│ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘ │
│         │                 │                  │        │
│         └────────┬────────┴─────────┬────────┘        │
│                  │                  │                  │
│         ┌────────▼────────┐ ┌──────▼───────┐          │
│         │ Firebase Auth   │ │ Firestore    │          │
│         │ (client SDK)    │ │ (client SDK) │          │
│         └────────┬────────┘ └──────┬───────┘          │
└──────────────────┼─────────────────┼──────────────────┘
                   │                 │
                   │    HTTP API     │
                   │                 │
┌──────────────────▼─────────────────▼──────────────────┐
│                   Express Server (port 3000)            │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Nodemailer │  │ Firebase     │  │ Google Drive   │ │
│  │ (SMTP)     │  │ Admin SDK    │  │ API            │ │
│  └────────────┘  └──────────────┘  └────────────────┘ │
│  ┌────────────┐                                        │
│  │ Gemini AI  │                                        │
│  └────────────┘                                        │
└────────────────────────────────────────────────────────┘
```

### Three-Layer Architecture

1. **Client Layer** (Browser): React SPA with Firebase Auth + Firestore direct reads
2. **Server Layer** (Express): API proxy for Drive uploads, email sending, password reset, AI chat. In dev mode, Vite is embedded as Express middleware.
3. **Data Layer** (Firebase): Firestore for all persistence, Firebase Auth for authentication

### Data Access Patterns

- **Real-time listeners** (`onSnapshot`): Appointments, invoices, reports in Dashboard; encounters in EMR
- **One-time reads** (`getDocs`): Pets list in Dashboard (previously `onSnapshot`, changed to prevent listener churn)
- **Server-mediated writes**: File uploads (multipart → Drive), emails (JSON → SMTP), password reset (Admin SDK → SMTP)
- **Client writes**: Most Firestore mutations (appointments, pets, encounters, invoices) happen directly from the client SDK

---

## 4. Firestore Data Models

### Core Entities

```
users/{uid}
├── email: string
├── displayName: string
├── photoURL: string
├── role: "client" | "admin" | "doctor" | "staff" | "lab" | "pharmacist"
├── isGuest?: boolean
├── linkedTo?: string        # guest → registered account link
├── phone?: string
├── address?: string
├── createdAt: timestamp
├── consentPrivacy: boolean
├── consentTerms: boolean
├── consentPrivacyTimestamp?: string
└── consentTermsTimestamp?: string

pets/{petId}
├── ownerUid: string
├── name: string
├── species: string
├── breed: string
├── age: number
├── dateOfBirth?: string
├── gender?: "male" | "female"
├── color?: string
├── bloodType?: string
├── microchipId?: string
├── weight?: number
├── weightHistory?: { date: string; weight: number }[]
├── imageUrl?: string
├── currentStatus?: PatientStatus
├── size?: string
├── medicalHistory?: string
├── allergies?: string[]
├── chronicConditions?: string
├── aggressionFlags?: string
└── consentPrivacy/consentTerms?: boolean

appointments/{appointmentId}
├── clientUid: string
├── petId: string
├── petName: string
├── doctorId: string
├── doctorName: string
├── date: string (YYYY-MM-DD)
├── time: string (HH:MM AM/PM)
├── status: "unconfirmed" | "confirmed" | "in-progress" | "medical-completed" | "completed" | "cancelled" | "no-show"
├── notes?: string
├── services?: string[]
├── mode?: "scheduled" | "walk-in"
├── cancelReason?: string
├── encounterId?: string
└── createdAt: timestamp

encounters/{encounterId}
├── patientId: string
├── appointmentId: string
├── doctorId: string
├── status: "in-progress" | "completed"
├── startedAt: timestamp
├── completedAt?: timestamp
└── ...

clinical_notes/{encounterId}
├── chiefComplaint: string
├── subjective: string
├── objective: string
├── assessment: string
├── plan: string
├── planItems: PlanItem[]
├── diagnosisStatus: string
├── differentials: string
├── severity: string
├── prognosis: string
├── clinicalImpression: string
├── problemList: string
├── appetite: string
├── waterIntake: string
├── pastHistory: string
├── followupType: string
├── followUpDate: string
├── ownerInstructions: string
├── dietInstructions: string
├── warningSigns: string
├── licenseNumber: string
└── createdAt/updatedAt: timestamp

triage_vitals/{encounterId}
├── temperature: number
├── weight: number
├── heartRate: number
├── respiratoryRate: number
├── mmColor: string
├── crt: number
├── performedBy: string
└── createdAt: timestamp

invoices/{invoiceId}
├── invoiceNo: string
├── clientUid: string
├── petId?: string
├── petName: string
├── encounterId?: string
├── status: "draft" | "unpaid" | "partial" | "paid" | "overdue" | "void"
├── subtotal: number
├── taxPercent: number
├── taxAmount: number
├── grandTotal: number
├── amountPaid: number
├── balance: number
├── dueDate: string
├── date: string
├── source: string
└── description: string

invoice_items/{itemId}
├── invoiceId: string
├── description: string
├── quantity: number
├── unitPrice: number
├── total: number
└── type: string

payments/{paymentId}
├── invoiceId: string
├── clientUid: string
├── amount: number
├── method: "Cash" | "GCash" | "Bank Transfer" | "Card"
├── reference: string
├── date: string
└── recordedBy: string

service_catalog/{serviceId}
├── code: string
├── name: string
├── category: "Consultation" | "Vaccination" | "Grooming" | ...
├── description: string
├── defaultPrice: number
├── taxable: boolean
├── active: boolean
├── requiresClinicalRecord: boolean
├── inventoryItemId?: string
├── durationMin?: number
├── allowedProviderIds: string[]
└── requiredResourceIds: string[]

resources/{resourceId}
├── name: string
├── type: "room" | "equipment"
└── status: "available" | "in-use" | "maintenance"

appointment_services/{serviceId}
├── appointmentId: string
├── name: string
├── category?: string
├── price: number
├── status: "pending" | "in-progress" | "completed"
└── notes?: string
```

### Pharmacy Collections

```
medications/{medicationId}
├── name: string
├── category: string
├── description: string
├── price: number
└── active: boolean

inventory_batches/{batchId}
├── medicationId: string
├── batchNo: string
├── quantity: number
├── originalQuantity: number
├── expiryDate: string
├── costPrice: number
├── sellingPrice: number
└── status: "active" | "expired" | "depleted"

stock_movements/{movementId}
├── medicationId: string
├── batchId?: string
├── type: "receiving" | "dispensing" | "adjustment" | "transfer" | "expired" | "return"
├── quantity: number
├── runningBalance: number
├── reference: string
├── notes: string
├── performedBy: string
└── createdAt: timestamp

prescriptions/{prescriptionId}
├── encounterId: string
├── petId: string
├── doctorId: string
├── status: "pending" | "dispensed" | "cancelled"
├── items: { medicationId: string; dosage: string; frequency: string; quantity: number }[]
└── createdAt: timestamp
```

### Clinical Collections

```
lab_orders/{labOrderId}
├── encounterId: string
├── patientId: string
├── patientName: string
├── ownerName: string
├── doctorId: string
├── testName: string
├── testCategory: "Laboratory" | "Imaging" | "External Lab"
├── status: LabOrderStatus (12 statuses)
├── reason: string
├── priority: "Routine" | "Urgent" | "STAT"
├── sampleType: string
├── expectedDate: string
├── externalLab: boolean
├── billingBehavior: "Queue" | "Create Invoice Line"
├── ownerConsent: "pending" | "signed" | "waived" | "not required"
├── notes: string
└── orderedBy: string

admissions/{admissionId}
├── petId: string
├── ownerId: string
├── encounterId?: string
├── type: "Medical" | "Surgical" | "Isolation" | "ICU"
├── checkInDate: timestamp
├── expectedDischarge: string
├── reason: string
├── status: "admitted" | "discharged" | "transferred"
├── assignedDoctor: string
├── cageWard: string
├── initialDiagnosis: string
├── monitoring: string
├── isolationRequired: boolean
├── consentObtained: boolean
├── depositCollected: boolean
└── notes: string
```

---

## 5. Authentication & Authorization

### Flow
1. Firebase Auth handles sign-in, sign-up, Google OAuth, and password reset
2. `onAuthStateChanged` listener in `AuthContext.tsx` tracks auth state
3. On auth state change, fetches the corresponding `users/{uid}` doc from Firestore
4. `UserProfile` (merged from Auth + Firestore) stored in context

### Role-Based Access
- **`ProtectedRoute.tsx`** wraps all protected routes with `allowedRoles` prop
- If user's role doesn't match, redirects to appropriate dashboard
- `client` role → redirected to `/dashboard`
- `admin|doctor|staff|lab|pharmacist` → redirected to `/crm/*`

### Guest User Flow
- **Returning Guest**: `fetchSignInMethodsForEmail` detects if email has an Auth account
- **Guest Leads**: Signup checks `guest_leads` collection for previous guest bookings
- **Pet Migration**: Uses `linkedTo` field on `users/{uid}` to link guest pets; queries use `where('ownerUid', 'in', [authUid, linkedGuestUid])`

---

## 6. Server API Reference

All API routes are defined in `server.ts` and served on port 3000.

### Health & Status

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns `{ status, geminiConfigured }` |
| `GET` | `/api/drive/status` | Returns Google Drive connection state |

### Google Drive

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/google-drive/connect` | Initiates OAuth flow → redirects to Google |
| `GET` | `/api/auth/google-drive/callback` | OAuth callback, exchanges code for tokens |
| `POST` | `/api/upload-to-drive` | Multipart upload → nested folder creation → Drive API |

**Upload flow:**
1. Client sends multipart form with file + metadata (ownerName, petName, fileType)
2. Server gets access token via refresh token
3. Creates nested folder: `<owner>/<pet>/<fileType>/`
4. Uploads file, sets public read permission
5. Returns `{ fileId, webViewLink, downloadUrl }`

### Email

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/send-email` | Sends arbitrary email via SMTP |
| `POST` | `/api/send-password-reset` | Generates Firebase reset link via Admin SDK, sends branded SMTP email |

**`POST /api/send-email`**
```json
{ "to": "user@example.com", "subject": "...", "html": "..." }
```
→ `{ "success": true, "messageId": "..." }`

**`POST /api/send-password-reset`**
```json
{ "email": "user@example.com" }
```
→ `{ "success": true, "method": "smtp" }` (Admin SDK + SMTP)
→ `{ "success": false, "method": "firebase" }` (fallback to client-side `sendPasswordResetEmail`)

### AI

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ai/chat` | Gemini AI chat with conversation history |

## 7. Email System

### Architecture

```
Client (React)              Server (Express)           Gmail SMTP
     │                            │                       │
     │  POST /api/send-email      │                       │
     │  { to, subject, html }─────┤                       │
     │                            │  nodemailer.sendMail() │
     │                            ├───────────────────────┤
     │                            │  ✓ / ✗                │
     │  { success, messageId }◄───┤                       │
     │                            │                       │
     │  POST /api/send-password-reset                     │
     │  { email }────────────────┤                       │
     │                            │                       │
     │                            │ Admin SDK             │
     │                            │ generatePasswordReset │
     │                            │ Link(email)           │
     │                            │   │                   │
     │                            │  get resetLink        │
     │                            │   │                   │
     │                            │ nodemailer.sendMail() │
     │                            │  with branded HTML    │
     │                            ├───────────────────────┤
```

### Templates (in `src/lib/email-templates.ts`)

All templates use the `wrap()` function which generates a consistent HTML email with:
- Emerald green header with clinic name
- White content area
- Footer with clinic info and automated message disclaimer

Available templates:
- `bookingConfirmation(ownerName, petName, date, time, doctorName?)`
- `appointmentConfirmed(ownerName, petName, date, time, doctorName?)`
- `appointmentCancelled(ownerName, petName, date, time, reason?)`
- `appointmentReminder(ownerName, petName, date, time, doctorName?)`
- `newBookingAlert(ownerName, petName, species, date, time, phone, doctorName?)`
- `invoiceReceipt(ownerName, petName, invoiceNo, amount, status, paidAmount?)`
- `passwordReset(ownerName, resetLink)`

## 8. Google Drive Integration

### Folder Structure
```
Root (GOOGLE_DRIVE_FOLDER_ID)
├── <Owner Name>/
│   ├── <Pet Name>/
│   │   ├── photos/
│   │   │   └── <filename>.jpg
│   │   └── emr/
│   │       └── <filename>.pdf
```

### Auth Flow
1. User clicks "Connect" → redirected to Google OAuth consent screen
2. User authorizes → Google redirects back to `/api/auth/google-drive/callback`
3. Server exchanges authorization code for tokens
4. Refresh token stored in `.env` (manual step after initial auth)
5. Subsequent uploads use refresh token to get access tokens silently

### CDN URLs
After upload, the `downloadUrl` returned is:
```
https://drive.google.com/thumbnail?id={fileId}&sz=w1000
```
This uses Google's CDN (`lh3.googleusercontent.com`) to render images directly without HTML redirects.

## 9. EMR System

### 15-Step Consultation Workspace

The EMR page (`src/pages/crm/emr-page.tsx`) implements a full clinical workflow as a 3-column layout:

```
┌─────────────────────────────────────────────────────────────┐
│  Clinical Alert Banner (gradient, 5 alert sources)          │
├──────────┬────────────────────────────────┬─────────────────┤
│ Step     │  Main Content Area             │ Clinical        │
│ Stepper  │                                │ Context Panel   │
│          │  (active step content)         │                 │
│  1 CC    │                                │ • Patient Card  │
│  2 Subj  │                                │ • Chief Compl.  │
│  3 Vitals│                                │ • Triage Snap   │
│  4 PE    │                                │ • Weight Trend  │
│  5 Assess│                                │ • Prev. Care    │
│  6 Plan  │                                │ • Admission     │
│  7 Rx    │                                │                 │
│  8 Labs  │                                │                 │
│  9 Proc  │                                │                 │
│ 10 Admis │                                │                 │
│ 11 F/U   │                                │                 │
│ 12 Instr │                                │                 │
│ 13 Summ  │                                │                 │
│ 14 Check │                                │                 │
│ 15 Sign  │                                │                 │
├──────────┴────────────────────────────────┴─────────────────┤
│  Bottom Action Bar: [Skip] [Save & Continue] [Complete]     │
└─────────────────────────────────────────────────────────────┘
```

### Step-to-Tab Mapping

Steps 4–9 reuse the tab-based content from the old EMR layout via `stepToTabMap`:
- Step 4 (Physical Exam) → "vitals" tab
- Step 5 (Assessment) → "soap" tab (Objective)
- Step 6 (Plan Builder) → "plan" tab
- Step 7 (Prescriptions) → "pharmacy" tab
- Step 8 (Labs) → "labs" tab
- Step 9 (Procedures) → "procedures" tab

Steps 1–2 (Chief Complaint, Subjective) and 10–12 (Follow-Up, Owner Instructions) have dedicated inline forms.

### Auto-Save
- Calls `saveClinicalNotes()` on every step change
- `beforeunload` event handler saves on tab close
- `useEffect` cleanup calls `saveClinicalNotes()` on unmount
- All plan items persisted in `clinicalNotes.planItems` array

### Mode Detection
- **Active Mode**: Encounter with `status === 'in-progress'` and `startedAt` exists
- **View Mode**: No active encounter (past visit or never started)
- Detection happens on mount by querying `encounters` collection for the patient

## 10. Development Setup

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- Firebase project with Auth and Firestore enabled
- Google Cloud project with Drive API enabled (for file uploads)
- Gmail account with App Password (for SMTP emails)

### Environment Variables (`.env`)

```
GEMINI_API_KEY=your_key_here
APP_URL=http://localhost:3000
SMTP_USER=website.edvirontmed@gmail.com
SMTP_PASS=your-app-password
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token
```

### Firebase Configuration (`public/firebase-applet-config.json`)
```
{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}
```

### Commands

```bash
npm run dev          # Start dev server (Express + Vite) on port 3000
npm run build        # Production build (Vite)
npm run preview      # Preview production build
npm run lint         # ESLint
npx kill-port 3000   # Kill dev server
```

### Database Scripts

```bash
npx tsx scripts/seed-service-catalog.ts
npx tsx scripts/seed-emr-data.ts
npx tsx scripts/seed-pharmacy-data.ts
npx tsx scripts/migrate-appointment-services.ts
npx tsx scripts/migrate-encounters-startedAt.ts
npx tsx scripts/migrate-pet-images-to-drive.ts
```

## 11. Data Flow Patterns

### Appointment Lifecycle

```
Booked (client portal)
  │
  ▼
unconfirmed ──► cancelled
  │
  ▼ (staff confirms)
confirmed ──► cancelled
  │
  ▼ (staff starts)
in-progress
  │
  ▼ (doctor completes medical work)
medical-completed
  │
  ▼ (billing finalized)
completed
  │
  ▼ (no-show)
no-show
```

### Encounter Lifecycle

```
Start Appointment
  │
  ▼
encounter created (status: in-progress, startedAt: now)
  │
  ├── triage vitals recorded
  ├── clinical notes (SOAP) updated
  ├── services completed
  ├── labs ordered
  ├── prescriptions created
  ├── plan items added
  │
  ▼
Finish Consultation
  │
  ▼
encounter completed (status: completed, completedAt: now)
  │
  ▼
draft invoice generated (if not already created)
```

### Invoice Lifecycle

```
Draft (auto-generated on Medical Complete or Create Invoice)
  │
  ▼
Unpaid (after finalizing)
  │
  ├── Partial (some payment received)
  │     │
  │     ▼
  │   Paid (fully paid)
  │
  ├── Paid (one payment covers full amount)
  │
  ├── Overdue (past due date)
  │     │
  │     ▼
  │   Partial or Paid (after payment)
  │
  └── Void (cancelled invoice)
```

## 12. Key Design Decisions

### Why `getDocs` instead of `onSnapshot` for Dashboard pets?
The pets listener was inside an async IIFE — if the effect re-ran before `getDoc` resolved, the old `onSnapshot` subscription couldn't be cleaned up (unsubPets was still null), causing multiple leaked listeners. Pets don't change in real-time during a dashboard session, so `getDocs` (one-time fetch) with a `mounted` flag is sufficient.

### Why Server Proxy for Google Drive instead of Direct Upload?
Firebase Storage was initially used but replaced with Google Drive for:
- Better compatibility with clinic workflows (Drive is ubiquitous)
- Direct viewing/editing by clinic staff in Google Drive UI
- Firebase Storage free tier limitations

### Why Firebase Admin SDK for Password Reset?
Firebase's `sendPasswordResetEmail` always sends an email from Firebase's servers with Firebase's branding. The Admin SDK's `generatePasswordResetLink` generates the reset link without sending any email, allowing us to send a fully branded email via our SMTP.

### Why `handleCodeInApp: true`?
When the user clicks the password reset link, instead of Firebase showing its own reset page, the `handleCodeInApp` setting redirects to our branded `/reset-password` page with the oobCode in the URL. Our page then calls `confirmPasswordReset()` to complete the flow.

### Why `linkedTo` instead of Pet Migration?
Firestore rules block `updateDoc` on pets unless the full `{ name, species, breed, age }` payload is present. Instead of migrating pets (which would require rule changes or bypasses), the system uses a `linkedTo` field on the user document to link guest and registered accounts. All pet queries use `where('ownerUid', 'in', [authUid, linkedGuestUid])`.

### Why Gmail SMTP instead of Firebase Email Extension?
Gmail SMTP with App Password provides:
- Full control over email content and branding
- No additional service costs (uses existing Gmail account)
- Reliable delivery with proper DKIM/SPF if domain is configured
- Fallback to Firebase's `sendPasswordResetEmail` when SMTP is unavailable
