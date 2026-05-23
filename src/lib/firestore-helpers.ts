import { db, collection, getDocs, getDoc, doc, query, where, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp } from '../firebase';
import { getCached, getAllCached, setCached, setManyCached, queueMutation, isOnline } from './offline-cache';

// Convert Firestore Timestamps to ISO strings for safe caching
function serializeTimestamps(obj: any): any {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(serializeTimestamps);
  if (typeof obj !== 'object') return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && typeof (value as any).toDate === 'function') {
      result[key] = (value as any).toDate().toISOString();
    } else if (value && typeof value === 'object' && (value as any)._seconds !== undefined) {
      result[key] = new Date((value as any)._seconds * 1000).toISOString();
    } else if (value && typeof value === 'object') {
      result[key] = serializeTimestamps(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Wrapper to fetch with cache fallback
async function fetchWithCache(collectionName: string, queryFn: () => Promise<any>, id?: string) {
  const cacheKey = id ? `${collectionName}/${id}` : collectionName;
  
  // Try cache first (always check for instant UI)
  try {
    if (id) {
      const cached = await getCached(collectionName, id);
      if (cached) {
        // Return cached data immediately, then update in background if online
        if (isOnline()) {
          queryFn().then(data => {
            if (data) setCached(collectionName, id, serializeTimestamps(data));
          }).catch(() => {});
        }
        return cached;
      }
    } else {
      const cached = await getAllCached(collectionName);
      if (cached && cached.length > 0) {
        // Return cached data, update in background if online
        if (isOnline()) {
          queryFn().then(data => {
            if (Array.isArray(data)) setManyCached(collectionName, data.map(serializeTimestamps));
          }).catch(() => {});
        }
        return cached;
      }
    }
  } catch (e) {
    console.log('Cache read failed, fetching from Firestore:', e);
  }

  // Fetch from Firestore
  if (!isOnline()) {
    throw new Error('Offline and no cached data available');
  }

  const data = await queryFn();
  
  // Write to cache
  try {
    if (id) {
      setCached(collectionName, id, serializeTimestamps(data));
    } else if (Array.isArray(data)) {
      setManyCached(collectionName, data.map(serializeTimestamps));
    }
  } catch (e) {
    console.log('Cache write failed:', e);
  }

  return data;
}

// Create document (offline-aware)
export async function createDocument(collectionName: string, data: any): Promise<string> {
  if (isOnline()) {
    // Online: write directly to Firestore
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update cache
    try {
      setCached(collectionName, docRef.id, { id: docRef.id, ...data });
    } catch (e) {}
    
    return docRef.id;
  } else {
    // Offline: queue mutation
    const tempId = `temp_${Date.now()}`;
    const offlineData = { id: tempId, ...data, createdAt: new Date(), updatedAt: new Date() };
    
    await queueMutation(collectionName, tempId, 'create', offlineData);
    
    // Add to cache immediately for UI
    try {
      setCached(collectionName, tempId, offlineData);
    } catch (e) {}
    
    return tempId;
  }
}

// Update document (offline-aware)
export async function updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
  if (isOnline()) {
    // Online: update directly
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    // Update cache
    try {
      const cached = await getCached(collectionName, docId);
      if (cached) {
        setCached(collectionName, docId, { ...cached, ...data, updatedAt: new Date() });
      }
    } catch (e) {}
  } else {
    // Offline: queue mutation
    await queueMutation(collectionName, docId, 'update', data);
    
    // Update cache immediately for UI
    try {
      const cached = await getCached(collectionName, docId);
      if (cached) {
        setCached(collectionName, docId, { ...cached, ...data, updatedAt: new Date() });
      }
    } catch (e) {}
  }
}

// Delete document (offline-aware)
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  if (isOnline()) {
    // Online: delete directly
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    
    // Remove from cache
    try {
      const { deleteCached } = await import('./offline-cache');
      deleteCached(collectionName, docId);
    } catch (e) {}
  } else {
    // Offline: queue mutation
    await queueMutation(collectionName, docId, 'delete');
  }
}

export async function fetchPets(ownerUid?: string) {
  const queryFn = async () => {
    let q = query(collection(db, 'pets'));
    if (ownerUid) q = query(collection(db, 'pets'), where('ownerUid', '==', ownerUid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(ownerUid ? `pets_owner_${ownerUid}` : 'pets', queryFn);
}

export async function fetchPetById(petId: string) {
  const queryFn = async () => {
    const d = await getDoc(doc(db, 'pets', petId));
    return d.exists() ? { id: d.id, ...d.data() } : null;
  };
  return fetchWithCache('pets', queryFn, petId);
}

export async function fetchOwnerByUid(ownerUid: string) {
  const queryFn = async () => {
    const d = await getDoc(doc(db, 'users', ownerUid));
    return d.exists() ? { id: d.id, ...d.data() } : null;
  };
  return fetchWithCache('users', queryFn, ownerUid);
}

export async function fetchDoctors() {
  const queryFn = async () => {
    const snapshot = await getDocs(collection(db, 'doctors'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('doctors', queryFn);
}

export async function fetchAppointments(filters?: any) {
  const queryFn = async () => {
    let q = query(collection(db, 'appointments'));
    if (filters?.petId) q = query(collection(db, 'appointments'), where('petId', '==', filters.petId));
    if (filters?.clientUid) q = query(collection(db, 'appointments'), where('clientUid', '==', filters.clientUid));
    if (filters?.status) q = query(collection(db, 'appointments'), where('status', '==', filters.status));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('appointments', queryFn);
}

export async function fetchInvoices(filters?: any) {
  const queryFn = async () => {
    let q = query(collection(db, 'invoices'));
    if (filters?.clientUid) q = query(collection(db, 'invoices'), where('clientUid', '==', filters.clientUid));
    if (filters?.petId) q = query(collection(db, 'invoices'), where('petId', '==', filters.petId));
    if (filters?.status) q = query(collection(db, 'invoices'), where('status', '==', filters.status));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('invoices', queryFn);
}

export async function fetchReports(filters?: any) {
  const queryFn = async () => {
    let q = query(collection(db, 'reports'));
    if (filters?.petId) q = query(collection(db, 'reports'), where('petId', '==', filters.petId));
    if (filters?.status) q = query(collection(db, 'reports'), where('status', '==', filters.status));
    if (filters?.type) q = query(collection(db, 'reports'), where('type', '==', filters.type));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('reports', queryFn);
}

export async function fetchMedications() {
  const queryFn = async () => {
    const snapshot = await getDocs(collection(db, 'medications'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('medications', queryFn);
}

// EMR Records (now uses encounters collection)
export async function fetchEmrRecords(petId?: string) {
  const queryFn = async () => {
    let q = query(collection(db, 'encounters'), orderBy('startedAt', 'desc'));
    if (petId) q = query(collection(db, 'encounters'), where('petId', '==', petId), orderBy('startedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('encounters', queryFn);
}

// Encounters - bypass cache to always get fresh data
export async function fetchEncounters(petId?: string) {
  const queryFn = async () => {
    let q = query(collection(db, 'encounters'), orderBy('startedAt', 'desc'));
    if (petId) q = query(collection(db, 'encounters'), where('petId', '==', petId), orderBy('startedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  
  // Bypass cache - always fetch fresh data for encounters
  return queryFn();
}

// Fetch encounters by appointment ID - bypass cache
export async function fetchEncountersByAppointment(appointmentId: string) {
  const q = query(collection(db, 'encounters'), where('appointmentId', '==', appointmentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Fetch single encounter by ID - bypass cache
export async function fetchEncounterById(encounterId: string) {
  const docRef = doc(db, 'encounters', encounterId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

// Service Catalog
export async function fetchServiceCatalog(category?: string) {
  const queryFn = async () => {
    let q = query(collection(db, 'service_catalog'), where('active', '==', true));
    if (category) q = query(collection(db, 'service_catalog'), where('category', '==', category), where('active', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('service_catalog', queryFn);
}

// Fetch services available for a specific provider (doctor)
export async function fetchServicesForProvider(providerId: string, category?: string) {
  const queryFn = async () => {
    let q = query(
      collection(db, 'service_catalog'),
      where('active', '==', true),
      where('allowedProviderIds', 'array-contains', providerId)
    );
    if (category) {
      q = query(
        collection(db, 'service_catalog'),
        where('active', '==', true),
        where('category', '==', category),
        where('allowedProviderIds', 'array-contains', providerId)
      );
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`services_provider_${providerId}${category || ''}`, queryFn);
}

// Fetch all resources
export async function fetchAllResources() {
  const queryFn = async () => {
    const snapshot = await getDocs(collection(db, 'resources'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('resources', queryFn);
}

// Ensure consultation service exists (creates if missing)
export async function ensureConsultationService() {
  const existing = await fetchServiceCatalog('consultation');
  const consultation = existing.find((s: any) => s.code === 'CONS-001');
  if (consultation) return consultation;

  const fallback = {
    code: 'CONS-001',
    name: 'General Consultation',
    category: 'consultation',
    description: 'Standard veterinary consultation',
    defaultPrice: 500,
    taxable: false,
    active: true,
    requiresClinicalRecord: true,
    durationMin: 30,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const ref = await addDoc(collection(db, 'service_catalog'), fallback);
  return { id: ref.id, ...fallback };
}

// Add service to catalog (admin)
export async function addServiceToCatalog(serviceData: any) {
  const ref = await addDoc(collection(db, 'service_catalog'), {
    ...serviceData,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return { id: ref.id, ...serviceData };
}

// Update service providers (admin)
export async function updateServiceProviders(serviceId: string, providerIds: string[]) {
  const ref = doc(db, 'service_catalog', serviceId);
  await updateDoc(ref, {
    allowedProviderIds: providerIds,
    updatedAt: new Date()
  });
}

// Update service resources (admin)
export async function updateServiceResources(serviceId: string, resourceIds: string[]) {
  const ref = doc(db, 'service_catalog', serviceId);
  await updateDoc(ref, {
    requiredResourceIds: resourceIds,
    updatedAt: new Date()
  });
}

// Update service catalog item (admin)
export async function updateServiceCatalog(serviceId: string, updates: any) {
  const ref = doc(db, 'service_catalog', serviceId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date()
  });
}

// Add resource (admin)
export async function addResource(resourceData: any) {
  const ref = await addDoc(collection(db, 'resources'), {
    ...resourceData,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return { id: ref.id, ...resourceData };
}

// Update resource status (admin)
export async function updateResourceStatus(resourceId: string, status: string) {
  const ref = doc(db, 'resources', resourceId);
  await updateDoc(ref, {
    status,
    updatedAt: new Date()
  });
}

// Appointment Services
export async function fetchAppointmentServices(encounterId: string) {
  const q = query(collection(db, 'appointment_services'), where('encounterId', '==', encounterId));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  // Update cache in background without blocking
  setManyCached('appointment_services', data).catch(() => {});
  return data;
}

// Triage Vitals
export async function fetchTriageVitals(encounterId: string) {
  const queryFn = async () => {
    const q = query(collection(db, 'triage_vitals'), where('encounterId', '==', encounterId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`triage_vitals_v2_${encounterId}`, queryFn);
}

// Fetch ALL triage vitals for a patient (for historical chart)
export async function fetchAllPatientVitals(patientId: string) {
  const queryFn = async () => {
    const q = query(collection(db, 'triage_vitals'), where('patientId', '==', patientId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`patient_vitals_v2_${patientId}`, queryFn);
}

// Clinical Notes
export async function fetchClinicalNotes(encounterId: string) {
  const queryFn = async () => {
    const q = query(collection(db, 'clinical_notes'), where('encounterId', '==', encounterId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`clinical_notes_${encounterId}`, queryFn);
}

// Lab Orders
export async function fetchLabOrders(encounterId: string) {
  const queryFn = async () => {
    const q = query(collection(db, 'lab_orders'), where('encounterId', '==', encounterId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`lab_orders_${encounterId}`, queryFn);
}

// Fetch ALL lab orders (for Lab & Diagnostics dashboard)
export async function fetchAllLabOrders() {
  const queryFn = async () => {
    const q = query(collection(db, 'lab_orders'), orderBy('orderedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('lab_orders_all', queryFn);
}

// Update lab order status with timestamps
export async function updateLabOrderStatus(labId: string, status: string, extra?: any) {
  const ref = doc(db, 'lab_orders', labId);
  const now = serverTimestamp();
  const updates: any = { status, updatedAt: now, ...extra };
  if (status === 'in-progress') updates.startedAt = now;
  if (status === 'completed') updates.completedAt = now;
  if (status === 'sample-collected') updates.sampleCollectedAt = now;
  if (status === 'cancelled') updates.cancelledAt = now;
  await updateDoc(ref, updates);
}

// Prescriptions
export async function fetchPrescriptions(encounterId: string) {
  const queryFn = async () => {
    const q = query(collection(db, 'prescriptions'), where('encounterId', '==', encounterId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`prescriptions_${encounterId}`, queryFn);
}

// Dispensing Records
export async function fetchDispensingRecords(encounterId: string) {
  const queryFn = async () => {
    const q = query(collection(db, 'dispensing_records'), where('encounterId', '==', encounterId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`dispensing_records_${encounterId}`, queryFn);
}

// Invoices
export async function fetchInvoicesByEncounter(encounterId: string) {
  const queryFn = async () => {
    const q = query(collection(db, 'invoices'), where('encounterId', '==', encounterId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`invoices_${encounterId}`, queryFn);
}

// Invoice Items
export async function fetchInvoiceItems(invoiceId: string) {
  const queryFn = async () => {
    const q = query(collection(db, 'invoice_items'), where('invoiceId', '==', invoiceId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`invoice_items_${invoiceId}`, queryFn);
}

// Payments
export async function fetchPayments(invoiceId: string) {
  const queryFn = async () => {
    const q = query(collection(db, 'payments'), where('invoiceId', '==', invoiceId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`payments_${invoiceId}`, queryFn);
}

// Create Invoice from Encounter
export async function generateInvoiceFromEncounter(encounterId: string, appointmentServices: any[], patientId: string, ownerId: string, dueDays: number = 0) {
  // Clear cache to ensure idempotent guard sees latest data
  const { clearCache } = await import('./offline-cache');
  await clearCache(`invoices_${encounterId}`).catch(() => {});

  // Guard: check if an invoice already exists for this encounter
  const existing = await fetchInvoicesByEncounter(encounterId);
  if (existing.length > 0) {
    return existing[0];
  }

  const now = serverTimestamp();
  const invoiceNo = `INV-${Date.now()}`;

  // Calculate totals
  let subTotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const invoiceItems = appointmentServices.map(svc => {
    const lineTotal = (svc.unitPrice || 0) * (svc.quantity || 1);
    const discount = svc.discountAmount || 0;
    const taxRate = svc.taxRate || 0;
    subTotal += lineTotal;
    discountTotal += discount;
    taxTotal += (lineTotal - discount) * taxRate;
    return {
      invoiceId: '', // Will be set after invoice creation
      encounterId,
      appointmentServiceId: svc.id,
      itemType: svc.serviceType || 'service',
      description: svc.serviceName,
      quantity: svc.quantity || 1,
      unitPrice: svc.unitPrice || 0,
      discountAmount: discount,
      taxRate,
      lineTotal: lineTotal - discount,
      createdAt: now
    };
  });

  const grandTotal = subTotal - discountTotal + taxTotal;

  // Look up patient/pet name from the encounter or patient data
  let petName = '';
  try {
    const snap = await getDoc(doc(db, 'encounters', encounterId));
    if (snap.exists()) {
      const enc = snap.data();
      petName = enc.petName || '';
    }
    if (!petName) {
      const petSnap = await getDoc(doc(db, 'pets', patientId));
      if (petSnap.exists()) {
        petName = petSnap.data().name || '';
      }
    }
  } catch {}

  // Create invoice
  const dueDate = dueDays > 0 ? new Date(Date.now() + dueDays * 86400000) : null;
  const invoiceData = {
    invoiceNo,
    encounterId,
    petId: patientId,
    petName,
    clientUid: ownerId,
    ownerName: '',
    patientId,
    ownerId,
    subTotal,
    discountTotal,
    taxAmount: taxTotal,
    grandTotal,
    amountPaid: 0,
    balanceDue: grandTotal,
    status: 'draft',
    dueDate,
    createdAt: now,
    updatedAt: now
  };

  const invoiceRef = await addDoc(collection(db, 'invoices'), invoiceData);
  const invoiceId = invoiceRef.id;

  // Create invoice items
  for (const item of invoiceItems) {
    item.invoiceId = invoiceId;
    await addDoc(collection(db, 'invoice_items'), item);
  }

  return { id: invoiceId, ...invoiceData };
}

// Record Payment
export async function recordPayment(invoiceId: string, amount: number, paymentMethod: string, referenceNo?: string) {
  const now = serverTimestamp();

  const paymentData = {
    invoiceId,
    amount,
    paymentMethod,
    referenceNo: referenceNo || '',
    paidAt: now,
    createdAt: now
  };

  const paymentRef = await addDoc(collection(db, 'payments'), paymentData);

  // Update invoice
  const invoice = (await fetchInvoicesByEncounter('')).find(inv => inv.id === invoiceId);
  if (invoice) {
    const payments = await fetchPayments(invoiceId);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0) + amount;
    const balanceDue = invoice.grandTotal - totalPaid;
    const status = balanceDue <= 0 ? 'paid' : 'partially-paid';

    const invoiceRef = doc(db, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      amountPaid: totalPaid,
      balanceDue,
      status,
      updatedAt: now
    });
  }

  return { id: paymentRef.id, ...paymentData };
}

// Update Invoice Status
export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const invoiceRef = doc(db, 'invoices', invoiceId);
  await updateDoc(invoiceRef, {
    status,
    updatedAt: serverTimestamp()
  });
}

// Attachments
export async function fetchAttachments(encounterId: string) {
  const queryFn = async () => {
    const q = query(collection(db, 'attachments'), where('encounterId', '==', encounterId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(`attachments_${encounterId}`, queryFn);
}

export async function fetchAuditLogs(filters?: any) {
  const queryFn = async () => {
    let q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    let logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));    
    if (filters?.petId) logs = logs.filter((log: any) => log.petId === filters.petId);
    if (filters?.type) logs = logs.filter((log: any) => log.type === filters.type);
    return logs;
  };
  return fetchWithCache('auditLogs', queryFn);
}

export async function fetchUsers(role?: string) {
  const queryFn = async () => {
    let q = query(collection(db, 'users'));
    if (role) q = query(collection(db, 'users'), where('role', '==', role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache(role ? `users_role_${role}` : 'users', queryFn);
}

// Create test user if missing
export async function createTestUserIfMissing(email: string, displayName: string): Promise<string> {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const doc = snap.docs[0];
    return doc.id;
  }
  const ref = await addDoc(collection(db, 'users'), {
    email,
    displayName,
    role: 'client',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

// ==================== Pharmacy: Inventory Batches ====================

export async function fetchInventoryBatches(medicationId?: string) {
  const queryFn = async () => {
    let q = query(collection(db, 'inventory_batches'));
    if (medicationId) q = query(collection(db, 'inventory_batches'), where('medicationId', '==', medicationId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('inventory_batches', queryFn);
}

export async function createInventoryBatch(data: any) {
  const ref = await addDoc(collection(db, 'inventory_batches'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { id: ref.id, ...data };
}

export async function updateInventoryBatch(batchId: string, data: any) {
  const ref = doc(db, 'inventory_batches', batchId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

// ==================== Pharmacy: Stock Movements ====================

export async function fetchStockMovements(medicationId?: string) {
  const queryFn = async () => {
    let q = query(collection(db, 'stock_movements'), orderBy('createdAt', 'desc'));
    if (medicationId) q = query(collection(db, 'stock_movements'), where('medicationId', '==', medicationId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('stock_movements', queryFn);
}

export async function createStockMovement(data: any) {
  const ref = await addDoc(collection(db, 'stock_movements'), {
    ...data,
    createdAt: serverTimestamp()
  });
  return { id: ref.id, ...data };
}

// ==================== Pharmacy: Medications CRUD ====================

export async function createMedication(data: any) {
  const ref = await addDoc(collection(db, 'medications'), {
    ...data,
    stock: 0,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { id: ref.id, ...data, stock: 0, active: true };
}

export async function updateMedication(medicationId: string, data: any) {
  const ref = doc(db, 'medications', medicationId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMedication(medicationId: string) {
  await deleteDoc(doc(db, 'medications', medicationId));
}

// ==================== Pharmacy: All Prescriptions ====================

export async function fetchAllPrescriptions() {
  const queryFn = async () => {
    const q = query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('prescriptions', queryFn);
}

// ==================== Pharmacy: Update Prescription ====================

export async function updatePrescription(prescriptionId: string, data: any) {
  const ref = doc(db, 'prescriptions', prescriptionId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

// ==================== Admissions ====================

export async function fetchAdmissions(petId?: string) {
  const queryFn = async () => {
    let q = query(collection(db, 'admissions'), orderBy('createdAt', 'desc'));
    if (petId) q = query(collection(db, 'admissions'), where('petId', '==', petId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('admissions', queryFn);
}

// Create Lab Order
export async function createLabOrder(data: any) {
  const now = serverTimestamp();
  const docData = {
    ...data,
    status: data.status || 'ordered',
    orderedAt: now,
    createdAt: now,
    updatedAt: now
  };
  const ref = await addDoc(collection(db, 'lab_orders'), docData);
  return { id: ref.id, ...docData };
}

// Update Lab Order
export async function updateLabOrder(labId: string, data: any) {
  const ref = doc(db, 'lab_orders', labId);
  const now = serverTimestamp();
  const updates = { ...data, updatedAt: now };
  if (data.status === 'completed') updates.completedAt = now;
  await updateDoc(ref, updates);
}

// Update pet medical history (appends event text)
export async function appendPetMedicalHistory(petId: string, eventText: string) {
  const ref = doc(db, 'pets', petId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const existing = snap.data().medicalHistory || '';
  const entry = `[${new Date().toLocaleDateString()}] ${eventText}`;
  const updated = existing ? `${existing}\n${entry}` : entry;
  await updateDoc(ref, { medicalHistory: updated, updatedAt: serverTimestamp() });
}

export async function addAuditLog(data: {
  action: string;
  userId: string;
  userName?: string;
  encounterId?: string;
  patientId?: string;
  appointmentId?: string;
  details?: string;
}) {
  const now = serverTimestamp();
  const clean = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  const logEntry = {
    ...clean,
    timestamp: now,
    createdAt: now
  };
  await addDoc(collection(db, 'auditLogs'), logEntry);
  // Also invalidate cache
  const { clearCache } = await import('./offline-cache');
  clearCache('auditLogs');
}
