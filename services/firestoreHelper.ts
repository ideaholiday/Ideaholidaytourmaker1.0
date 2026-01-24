
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
            await setDoc(doc(db, collectionName, data.id), data, { merge: true });
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
            const docRef = doc(db, collectionName, item.id);
            batch.set(docRef, item, { merge: true });
        });
        await batch.commit();
    }
};
