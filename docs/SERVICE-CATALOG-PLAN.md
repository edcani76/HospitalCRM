# Service Catalog & Provider-Resource Mapping Implementation Plan

## Goal
Build a unified service catalog that maps services to providers (doctors) and optional resources (rooms, equipment). This enables customers to select services when booking, ensures staff can only add services a doctor can perform, and provides an admin UI to manage everything.

## Design Principles
- **Service-centric mapping**: The `service_catalog` collection stores `allowedProviderIds[]` and `requiredResourceIds[]`
- **Consultation always present**: Every appointment/encounter must have a consultation service
- **Reusable components**: Single `ServiceSelector` component used across customer booking, staff EMR, and admin pages
- **Backward compatible**: Existing appointment/encounter records continue to work; new records use catalog IDs

---

## Phase 1: Data Model & Seed Data

### 1.1 Collections Structure

| Collection | Key Fields |
|------------|-----------|
| **`service_catalog`** (existing, extend) | `name`, `code`, `category`, `defaultPrice`, `taxable`, `active`, `durationMin`, `allowedProviderIds[]`, `requiredResourceIds[]`, `description` |
| **`resources`** (new) | `name`, `type` (room/equipment), `status` (available/in-use/maintenance), `description` |
| **`service_provider`** (optional, new) | `serviceId`, `providerId`, `resourceId?`, `priceOverride?`, `notes`, `active` |
| **`appointments`** (extend) | `services: [{ catalogId, providerId, resourceId? }]` |

### 1.2 Seed Script
Create `scripts/seed-service-catalog-extended.ts` that:
- Creates base services (Consultation, Vaccination, Dental Cleaning, Grooming, X-Ray, Blood Panel, Surgery, etc.)
- Assigns allowed providers per service (e.g., only cardiologists for heart services)
- Creates sample resources (Exam Room 1, Ultrasound Machine, Surgical Suite)
- Verifies consultation service exists and is active

**Status**: ✅ `scripts/seed-service-catalog.ts` already exists (basic catalog)
**Action**: Extend it with provider/resource mapping

---

## Phase 2: Backend Helpers

### 2.1 New functions in `src/lib/firestore-helpers.ts`

| Function | Purpose |
|----------|---------|
| `fetchServicesForProvider(providerId)` | Returns services where `allowedProviderIds` contains the provider |
| `fetchProvidersForService(serviceId)` | Returns doctors who can perform this service |
| `fetchAllResources()` | Get all resources (rooms, equipment) |
| `ensureConsultationService()` | Guarantees a consultation service exists; creates one if missing |
| `addServiceToCatalog(serviceData)` | Admin helper to add/update catalog items |
| `updateServiceProviders(serviceId, providerIds)` | Update allowed providers for a service |

### 2.2 Firestore rules
- Admin/Staff: read/write `service_catalog` and `resources`
- Doctors: read `service_catalog`
- Customers: read `service_catalog` (filtered by `active: true`)

---

## Phase 3: Admin Service Management Page

### 3.1 Page: `src/pages/crm/admin-services.tsx`
Route: `/crm/admin-services`

**Features**:
- Table of all services (name, category, price, active status)
- "Add Service" dialog with fields: name, code, category, price, taxable, duration, description
- **Provider assignment**: multi-select of doctors who can perform this service
- **Resource assignment**: multi-select of required rooms/equipment
- Edit/Delete/Deactivate actions
- Search & filter by category or provider

### 3.2 Page: `src/pages/crm/admin-resources.tsx`
Route: `/crm/admin-resources`

**Features**:
- Table of all resources (name, type, status)
- Add/Edit/Delete resources
- Status toggle (available / in-use / maintenance)

### 3.3 Update `admin-dashboard.tsx`
- Add navigation links to Services and Resources pages
- Optionally show service count and revenue stats per service

---

## Phase 4: Customer Booking Enhancement

### 4.1 Component: `src/components/ServiceSelector.tsx`
**Props**:
- `selectedServices: string[]` (catalog IDs)
- `onChange: (ids: string[]) => void`
- `providerId?: string` (filter services by this provider)
- `showPrice: boolean` (default true)
- `requireConsultation: boolean` (default true, consultation is pre-selected and disabled)

**Features**:
- Fetches catalog via `fetchServiceCatalog()`
- If `providerId` is provided, filters to only services that provider can perform
- Consultation is always pre-selected and cannot be removed
- Checkbox list with service name, description, price, duration
- Multi-select support

### 4.2 Update `src/pages/BookAppointment.tsx`
- Add `serviceCatalog` state + `selectedServices` state
- Fetch catalog on mount, pre-select consultation
- Insert `ServiceSelector` component in the form
- On submit, persist `services: selectedServices.map(id => ({ catalogId: id, providerId: doctor?.id }))`
- Also store `notes: Services: ${names.join(', ')}` for backward compatibility

---

## Phase 5: Staff/EMR Service Integration

### 5.1 Update `src/pages/crm/emr-page.tsx` (Orders & Services tab)
- Replace current hardcoded service dropdown with `ServiceSelector`
- Filter available services by the selected encounter's doctor
- Consultation always present
- Add service → creates `appointment_services` record with `serviceCatalogId`
- Remove service → updates status to `cancelled`

### 5.2 Update `src/pages/crm/appointment-details-page.tsx`
- Same `ServiceSelector` integration
- Parse existing `Services:` notes to pre-select services
- Validate that selected services match the assigned doctor's allowed list

### 5.3 Update `src/pages/crm/create-appointment-page.tsx`
- Replace hardcoded `doctorServices`, `groomingServices`, `laboratoryServices` arrays with catalog data
- Use `ServiceSelector` component
- Consultation pre-selected

---

## Phase 6: Validation & Enforcement

### 6.1 Validation rules
- **Booking**: Cannot submit without at least one service (consultation is default)
- **EMR**: Cannot add a service if the assigned doctor is not in `allowedProviderIds` (show error: "Dr. X cannot perform this service")
- **Invoice**: Only billable services (`billable !== false`) are included in invoice generation
- **Admin**: Cannot deactivate a service that has upcoming appointments (warning dialog)

### 6.2 Migration script
Create `scripts/migrate-existing-services.ts` that:
- Reads existing `appointment_services` records
- Matches by `serviceName` or `serviceType` to catalog entries
- Updates records with `serviceCatalogId`
- Logs unmatched services for manual review

---

## Phase 7: Testing & Polish

### 7.1 Test scenarios
1. Customer books appointment → sees only services their selected doctor can perform
2. Customer cannot remove consultation service
3. Staff adds service in EMR → only sees doctor's allowed services
4. Admin adds new service with specific providers → immediately available in booking
5. Admin deactivates service → disappears from customer booking but existing records preserved
6. Invoice generation correctly pulls prices from `appointment_services` (which originated from catalog)

### 7.2 Lint & build
- Run `npm run lint` (TypeScript check)
- Run `npm run build` (Vite production build)
- Fix any type errors

---

## File Inventory

### New files
- `src/pages/crm/admin-services.tsx`
- `src/pages/crm/admin-resources.tsx`
- `src/components/ServiceSelector.tsx`
- `scripts/seed-service-catalog-extended.ts`
- `scripts/migrate-existing-services.ts`

### Modified files
- `src/lib/firestore-helpers.ts` (add new helpers)
- `src/pages/BookAppointment.tsx` (add service selection)
- `src/pages/crm/emr-page.tsx` (use ServiceSelector)
- `src/pages/crm/appointment-details-page.tsx` (use ServiceSelector)
- `src/pages/crm/create-appointment-page.tsx` (use ServiceSelector)
- `src/pages/crm/admin-dashboard.tsx` (add nav links)
- `src/types.ts` (add ServiceCatalogItem interface if not exists)
- `package.json` (add script entries if needed)
- `AGENTS.md` (update progress)

---

## Implementation Order

1. ✅ Review existing `seed-service-catalog.ts` and `fetchServiceCatalog`
2. Extend seed script with provider/resource mapping
3. Add backend helpers to `firestore-helpers.ts`
4. Build `ServiceSelector` component
5. Update customer booking page
6. Build admin services management page
7. Update EMR/staff pages to use ServiceSelector
8. Create migration script for existing records
9. Test, lint, build, commit

---

## Timeline
- **Phase 1-2**: ~1 hour (seed data + helpers)
- **Phase 3**: ~2 hours (admin pages)
- **Phase 4**: ~1.5 hours (customer booking)
- **Phase 5**: ~2 hours (staff/EMR integration)
- **Phase 6-7**: ~1.5 hours (validation, migration, testing)
- **Total**: ~8 hours

---

## Success Criteria
- [ ] Service catalog supports provider and resource mapping
- [ ] Customer booking shows services filtered by selected doctor
- [ ] Consultation service is always present and cannot be removed
- [ ] Admin can add/edit/deactivate services and assign providers
- [ ] Staff EMR uses catalog for service selection
- [ ] Existing records migrated to use `serviceCatalogId`
- [ ] All lint/build checks pass
