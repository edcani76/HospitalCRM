# EMR Encounter, Visit Summary, Status Lifecycle & Billing Workflow (Master Spec)

---

## 1. Overview

This document defines the complete workflow and behavior for:

- Appointment lifecycle
- EMR (Encounter) behavior
- Visit Summary behavior
- Encounter status transitions
- Billing integration
- Lab & Pharmacy integration
- Doctor vs Cashier workflow separation

---

## 2. Core Concept

Appointment → Encounter → Services → Billing → Completion

Key rules:
- 1 Appointment = 1 Encounter
- All actions tied to encounterId
- All billable items come from appointment_services
- Clinical and billing workflows are separated but linked

---

## 3. Encounter Status Lifecycle

Status Flow:
draft → in-progress → ready-for-billing → completed

---

## 4. Status Definitions

draft = created but not started  
in-progress = doctor working  
ready-for-billing = doctor done, cashier phase  
completed = fully closed  

---

## 5. Visit Summary Behavior

Visit Summary = Snapshot + Status + Actions

Shows:
- Header (patient, doctor, status)
- Chief complaint
- Triage snapshot
- Services overview
- Clinical summary
- Lab summary
- Medication summary
- Billing snapshot
- Timeline

---

## 6. EMR Modes

Active Mode:
→ full editing

No Appointment:
→ read-only chart + history

---

## 7. Billing Workflow

Services completed  
→ Generate invoice  
→ Issue  
→ Payment  
→ Close encounter  

---

## 8. Lab & Pharmacy

Lab:
order → process → complete → billable

Pharmacy:
prescription → dispense → billable

---

## 9. Critical Rules

- No billing without encounter
- No services without encounter
- Prescription ≠ billing
- Lab order ≠ billing
- Only completed services are billable

---

## 10. End-to-End Flow

Book → Start → Encounter → Triage → Consult → Services → Billing → Payment → Complete

---

## 11. UX Principles

- One EMR page
- Status-driven UI
- Real-time updates
- Clear separation of roles

---

## 12. Mental Model

in-progress = doctor  
ready-for-billing = cashier  
completed = closed
