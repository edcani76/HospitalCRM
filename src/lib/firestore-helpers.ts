import { db, collection, getDocs, getDoc, doc, query, where, orderBy } from '../firebase';

export async function fetchPets(ownerUid?: string) {
  let q = query(collection(db, 'pets'));
  if (ownerUid) q = query(collection(db, 'pets'), where('ownerUid', '==', ownerUid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchPetById(petId: string) {
  const d = await getDoc(doc(db, 'pets', petId));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

export async function fetchDoctors() {
  const snapshot = await getDocs(collection(db, 'doctors'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchAppointments(filters?: any) {
  let q = query(collection(db, 'appointments'));
  if (filters?.petId) q = query(collection(db, 'appointments'), where('petId', '==', filters.petId));
  if (filters?.clientUid) q = query(collection(db, 'appointments'), where('clientUid', '==', filters.clientUid));
  if (filters?.status) q = query(collection(db, 'appointments'), where('status', '==', filters.status));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchInvoices(filters?: any) {
  let q = query(collection(db, 'invoices'));
  if (filters?.clientUid) q = query(collection(db, 'invoices'), where('clientUid', '==', filters.clientUid));
  if (filters?.petId) q = query(collection(db, 'invoices'), where('petId', '==', filters.petId));
  if (filters?.status) q = query(collection(db, 'invoices'), where('status', '==', filters.status));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchReports(filters?: any) {
  let q = query(collection(db, 'reports'));
  if (filters?.petId) q = query(collection(db, 'reports'), where('petId', '==', filters.petId));
  if (filters?.status) q = query(collection(db, 'reports'), where('status', '==', filters.status));
  if (filters?.type) q = query(collection(db, 'reports'), where('type', '==', filters.type));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchMedications() {
  const snapshot = await getDocs(collection(db, 'medications'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchEmrRecords(petId?: string) {
  let q = query(collection(db, 'emrRecords'));
  if (petId) q = query(collection(db, 'emrRecords'), where('petId', '==', petId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchAuditLogs(filters?: any) {
  let q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  let logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));  
  if (filters?.petId) logs = logs.filter((log: any) => log.petId === filters.petId);
  if (filters?.type) logs = logs.filter((log: any) => log.type === filters.type);
  return logs;
}

export async function fetchUsers(role?: string) {
  let q = query(collection(db, 'users'));
  if (role) q = query(collection(db, 'users'), where('role', '==', role));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
