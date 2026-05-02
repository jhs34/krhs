import { collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, orderBy, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface SiteInfo {
  id: string; // 'announcements', 'updates', 'contact'
  content: string;
  updatedAt: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  createdAt: string;
  link?: string;
  // Kept for backward compatibility
  fileUrl?: string;
  fileName?: string;
  files?: Array<{ url: string; name: string }>;
}

export interface FirestoreEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate: string;
  createdAt: string;
  color?: string;
}

export interface SchoolDocument {
  id: string;
  title: string;
  description: string;
  link?: string;
  // Kept for backward compatibility
  fileUrl?: string;
  fileName?: string;
  files?: Array<{ url: string; name: string }>;
  createdAt: string;
}

export const subscribeToNotices = (callback: (notices: Notice[]) => void) => {
  const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notice));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'notices'));
};

export const subscribeToEvents = (callback: (events: FirestoreEvent[]) => void) => {
  // Sort events by date natively if you wish, or just fetch all and sort client-side.
  const q = query(collection(db, 'events'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FirestoreEvent));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'events'));
};

export const subscribeToDocuments = (callback: (docs: SchoolDocument[]) => void) => {
  const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SchoolDocument));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'documents'));
};

export const addNotice = async (data: Omit<Notice, 'id' | 'createdAt'>) => {
  try {
    await addDoc(collection(db, 'notices'), { ...data, createdAt: new Date().toISOString() });
  } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'notices'); }
};

export const updateNotice = async (id: string, data: Omit<Notice, 'id' | 'createdAt'>) => {
  try {
    await updateDoc(doc(db, 'notices', id), { ...data });
  } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `notices/${id}`); }
};

export const deleteNotice = async (id: string) => {
  try { await deleteDoc(doc(db, 'notices', id)); } 
  catch (error) { handleFirestoreError(error, OperationType.DELETE, `notices/${id}`); }
};

export const addEvent = async (data: Omit<FirestoreEvent, 'id' | 'createdAt'>) => {
  try {
    await addDoc(collection(db, 'events'), { ...data, createdAt: new Date().toISOString() });
  } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'events'); }
};

export const updateEvent = async (id: string, data: Omit<FirestoreEvent, 'id' | 'createdAt'>) => {
  try {
    await updateDoc(doc(db, 'events', id), { ...data });
  } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `events/${id}`); }
};

export const deleteEvent = async (id: string) => {
  try { await deleteDoc(doc(db, 'events', id)); } 
  catch (error) { handleFirestoreError(error, OperationType.DELETE, `events/${id}`); }
};

export const addDocument = async (data: Omit<SchoolDocument, 'id' | 'createdAt'>) => {
  try {
    await addDoc(collection(db, 'documents'), { ...data, createdAt: new Date().toISOString() });
  } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'documents'); }
};

export const updateDocument = async (id: string, data: Omit<SchoolDocument, 'id' | 'createdAt'>) => {
  try {
    await updateDoc(doc(db, 'documents', id), { ...data });
  } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `documents/${id}`); }
};

export const deleteDocument = async (id: string) => {
  try { await deleteDoc(doc(db, 'documents', id)); } 
  catch (error) { handleFirestoreError(error, OperationType.DELETE, `documents/${id}`); }
};

export const subscribeToSiteInfo = (callback: (infos: SiteInfo[]) => void) => {
  const q = query(collection(db, 'siteInfo'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SiteInfo));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'siteInfo'));
};

export const updateSiteInfo = async (id: string, content: string) => {
  try {
    await setDoc(doc(db, 'siteInfo', id), { content, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) { handleFirestoreError(error, OperationType.WRITE, `siteInfo/${id}`); }
};
