import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, orderBy, limit } from '../firebase';

export interface Notification {
  id?: string;
  userId: string; // recipient
  userRole?: string; // 'doctor', 'staff', 'admin', 'client'
  type: 'appointment_cancelled' | 'appointment_updated' | 'appointment_created' | 'appointment_confirmed' | 'appointment_no_show' | 'appointment_started' | 'service_added' | 'new_appointment' | 'appointment_reminder';
  title: string;
  message: string;
  appointmentId?: string;
  read: boolean;
  createdAt: any;
}

export const createNotification = async (
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  appointmentId?: string,
  userRole?: string
) => {
  try {
    const data: any = {
      userId,
      userRole,
      type,
      title,
      message,
      read: false,
      createdAt: serverTimestamp()
    };
    if (appointmentId) {
      data.appointmentId = appointmentId;
    }
    await addDoc(collection(db, 'notifications'), data);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Notify doctor about appointment changes
export const notifyDoctor = async (
  doctorId: string,
  type: Notification['type'],
  title: string,
  message: string,
  appointmentId?: string
) => {
  await createNotification(doctorId, type, title, message, appointmentId, 'doctor');
};

// Notify client about appointment changes
export const notifyClient = async (
  clientUid: string,
  type: Notification['type'],
  title: string,
  message: string,
  appointmentId?: string
) => {
  await createNotification(clientUid, type, title, message, appointmentId, 'client');
};

// Get notifications for current user
export const getNotifications = async (userId: string, maxResults = 50) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

// Mark notification as read
export const markAsRead = async (notificationId: string) => {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};
