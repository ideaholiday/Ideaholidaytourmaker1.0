
import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { UserRole } from '../types';

const COUNTER_DOC_REF = 'settings/id_counters';

class IdGeneratorService {
  
  /**
   * Generates a unique, human-readable ID based on role using Firestore Transactions.
   * Format: PREFIX-IH-NUMBER (e.g. AG-IH-000123)
   */
  async generateUniqueId(role: UserRole | string): Promise<string> {
    const roleKey = role.toString().toUpperCase();
    let prefix = 'GEN';

    switch (roleKey) {
      case 'AGENT': prefix = 'AG'; break;
      case 'OPERATOR': prefix = 'OP'; break;
      case 'HOTEL_PARTNER': prefix = 'HP'; break;
      case 'STAFF': prefix = 'ST'; break;
      case 'ADMIN': prefix = 'AD'; break;
      default: prefix = 'GEN'; break;
    }

    try {
        const newCount = await runTransaction(db, async (transaction) => {
            const sfDocRef = doc(db, COUNTER_DOC_REF);
            const sfDoc = await transaction.get(sfDocRef);

            let currentCount = 0;
            if (sfDoc.exists()) {
                const data = sfDoc.data();
                currentCount = data[roleKey] || 0;
            }

            const nextCount = currentCount + 1;
            
            transaction.set(sfDocRef, { [roleKey]: nextCount }, { merge: true });
            
            return nextCount;
        });

        const paddedCount = newCount.toString().padStart(6, '0');
        return `${prefix}-IH-${paddedCount}`;

    } catch (e) {
        console.error("ID Generation Failed", e);
        // Fallback random ID if transaction fails (prevent blocking)
        return `${prefix}-ERR-${Date.now().toString().slice(-6)}`;
    }
  }
}

export const idGeneratorService = new IdGeneratorService();
