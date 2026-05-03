# EMR Mode Behavior: Active Encounter vs No Active Appointment

## Overview

This document defines how the EMR page behaves under two different states:

1. Active Encounter Mode (with ongoing appointment)
2. Patient Chart Mode (no active appointment)

The goal is to maintain a single EMR page while dynamically changing behavior based on whether an encounter exists.

---

## Core Principle

EMR Page = Dynamic Container

IF active encounter exists:
  → Full clinical workflow (editable)

ELSE:
  → Patient chart viewer (read-only / limited actions)

---

## Modes

### 1. Active Encounter Mode

Status: Active Visit in Progress

This mode is triggered when an encounter is linked to the patient.

### 2. Patient Chart Mode

Status: No Active Visit

This mode is triggered when there is no ongoing encounter.

---

## Mode Detection Logic

const activeEncounter = await findActiveEncounter(patientId)

if (activeEncounter) {
  mode = 'active'
} else {
  mode = 'view'
}

---

## Routing

With Active Encounter:
/crm/emr/:patientId?encounterId=ENC123

Without Active Encounter:
/crm/emr/:patientId

---

## UI Behavior Differences

Feature | Active Encounter | No Active Appointment
--------|------------------|----------------------
Encounter | Current encounter loaded | None
Triage Input | Enabled | Disabled
Clinical Notes | Editable | Read-only
Add Services | Enabled | Disabled
Lab Orders | Enabled | Disabled
Prescriptions | Enabled | Optional (non-billable)
Billing | Enabled | Hidden/Disabled
History | Enabled | Enabled

---

## Page Header Behavior

Active:
🟢 Active Visit in Progress  
Patient: Max  
Visit: Consultation + Vaccination  

No Appointment:
⚪ No Active Visit  
Patient: Max  

CTA:
[ Start New Appointment ]  
[ View Past Visits ]

---

## Tab Behavior

Visit Summary
- Active: Shows current encounter
- No Appointment: Shows last visit

Triage & Vitals
- Active: Editable
- No Appointment: Read-only + graphs

Clinical Notes
- Active: Editable
- No Appointment: Read-only

Orders & Services
- Active: Add/edit
- No Appointment: View only

Medications / Pharmacy
- Active: Full access
- No Appointment:
  - Recommended: Disabled
  - Optional: Quick prescription (not billable)

Diagnostics & Files
- Active: Upload + view
- No Appointment: View only

Billing
- Active: Full billing
- No Appointment:
  - Hidden OR
  - "Billing available only during active visit"

History
- Always available
- Primary use in no-appointment mode

---

## State Example

const [mode, setMode] = useState<'active' | 'view'>()
const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>()

---

## Conditional Rendering

{mode === 'active'
  ? <EditableClinicalTabs />
  : <ReadOnlyPatientChart />
}

---

## Start New Appointment Flow

User clicks:
[ Start New Appointment ]

System:
1. Create appointment
2. Create encounter
3. Redirect to EMR with encounterId
4. Switch to active mode

---

## Quick Visit Mode (Optional)

[ Quick Start Visit ]

System:
- Auto-create appointment
- Auto-create encounter
- Open EMR in active mode

---

## Critical Rules

1. No billing without encounter
2. No services without encounter
3. All clinical data tied to encounterId
4. One EMR page, two modes only

---

## Summary

Active Mode = Clinical Workspace  
No Appointment Mode = Patient History Viewer
