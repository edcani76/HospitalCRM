import { db, collection, getDocs, getDoc, doc, query, where, orderBy } from '../firebase';
import { getCached, getAllCached, setCached, setManyCached } from './offline-cache';

// Helper to check if online
const isOnline = () => navigator.onLine;

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
            if (data) setCached(collectionName, id, data);
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
            if (Array.isArray(data)) setManyCached(collectionName, data);
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
      setCached(collectionName, id, data);
    } else if (Array.isArray(data)) {
      setManyCached(collectionName, data);
    }
  } catch (e) {
    console.log('Cache write failed:', e);
  }

  return data;
}

export async function fetchPets(ownerUid?: string) {
  const queryFn = async () => {
    let q = query(collection(db, 'pets'));
    if (ownerUid) q = query(collection(db, 'pets'), where('ownerUid', '==', ownerUid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('pets', queryFn);
}

export async function fetchPetById(petId: string) {
  const queryFn = async () => {
    const d = await getDoc(doc(db, 'pets', petId));
    return d.exists() ? { id: d.id, ...d.data() } : null;
  };
  return fetchWithCache('pets', queryFn, petId);
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

export async function fetchEmrRecords(petId?: string) {
  const queryFn = async () => {
    let q = query(collection(db, 'emrRecords'));
    if (petId) q = query(collection(db, 'emrRecords'), where('petId', '==', petId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };
  return fetchWithCache('emrRecords', queryFn);
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
  return fetchWithCache('users', queryFn);
}
