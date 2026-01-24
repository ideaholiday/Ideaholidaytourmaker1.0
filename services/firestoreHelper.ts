
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

// Helper to remove undefined values which Firestore rejects
const sanitizeData = (data: any): any => {
    if (data === null || data === undefined) return null;
    if (Array.isArray(data)) return data.map(sanitizeData);
    if (typeof data === 'object' && !(data instanceof Date)) {
        const result: any = {};
        for (const key in data) {
            const value = data[key];
            if (value !== undefined) {
                result[key] = sanitizeData(value);
            } else {
                // Explicitly set undefined fields to null to ensure consistency in DB
                result[key] = null;
            }
        }
        return result;
    }
    return data;
};

export const dbHelper = {
    // --- READ ---
    async getAll<T>(collectionName: string): Promise<T[]> {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            return querySnapshot.docs.map(doc => doc.data() as T);
        } catch (error) {
            console.error(`Error getting all from ${collectionName}:`, error);
            return [];
        }
    },

    async getById<T>(collectionName: string, id: string): Promise<T | null> {
        try {
            const docRef = doc(db, collectionName, id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data() as T) : null;
        } catch (error) {
            console.error(`Error getting ${id} from ${collectionName}:`, error);
            return null;
        }
    },

    async getWhere<T>(collectionName: string, field: string, operator: any, value: any): Promise<T[]> {
        try {
            const q = query(collection(db, collectionName), where(field, operator, value));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as T);
        } catch (error) {
            console.error(`Error querying ${collectionName}:`, error);
            return [];
        }
    },

    // --- WRITE ---
    // Uses setDoc with merge:true to act as both Create and Update safely
    async save<T extends { id: string }>(collectionName: string, data: T): Promise<void> {
        try {
            const cleanData = sanitizeData(data);
            await setDoc(doc(db, collectionName, data.id), cleanData, { merge: true });
        } catch (error) {
            console.error(`Error saving to ${collectionName}:`, error);
            throw error;
        }
    },

    async delete(collectionName: string, id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, collectionName, id));
        } catch (error) {
            console.error(`Error deleting from ${collectionName}:`, error);
            throw error;
        }
    },

    // --- BATCH (For Seeding/Bulk) ---
    async batchSave<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
        const batch = writeBatch(db);
        items.forEach(item => {
            const cleanItem = sanitizeData(item);
            const docRef = doc(db, collectionName, item.id);
            batch.set(docRef, cleanItem, { merge: true });
        });
        await batch.commit();
    }
};
