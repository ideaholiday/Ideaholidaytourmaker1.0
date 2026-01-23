
import { UserRole } from '../types';

const STORAGE_KEY_ID_COUNTERS = 'iht_id_counters';

interface IdCounters {
  AGENT: number;
  OPERATOR: number;
  PARTNER: number;
  STAFF: number;
  ADMIN: number;
}

const DEFAULT_COUNTERS: IdCounters = {
  AGENT: 100,
  OPERATOR: 20,
  PARTNER: 10,
  STAFF: 5,
  ADMIN: 1
};

class IdGeneratorService {
  
  private getCounters(): IdCounters {
    const stored = localStorage.getItem(STORAGE_KEY_ID_COUNTERS);
    return stored ? JSON.parse(stored) : DEFAULT_COUNTERS;
  }

  private saveCounters(counters: IdCounters) {
    localStorage.setItem(STORAGE_KEY_ID_COUNTERS, JSON.stringify(counters));
  }

  /**
   * Generates a unique, human-readable ID based on role.
   * Format: PREFIX-IH-NUMBER (e.g. AG-IH-000123)
   */
  generateUniqueId(role: UserRole): string {
    const counters = this.getCounters();
    let prefix = '';
    let count = 0;

    switch (role) {
      case UserRole.AGENT:
        prefix = 'AG';
        count = ++counters.AGENT;
        break;
      case UserRole.OPERATOR:
        prefix = 'OP';
        count = ++counters.OPERATOR;
        break;
      case UserRole.HOTEL_PARTNER:
        prefix = 'HP';
        count = ++counters.PARTNER;
        break;
      case UserRole.STAFF:
        prefix = 'ST';
        count = ++counters.STAFF;
        break;
      case UserRole.ADMIN:
        prefix = 'AD';
        count = ++counters.ADMIN;
        break;
    }

    this.saveCounters(counters);
    
    // Pad with leading zeros (6 digits)
    const paddedCount = count.toString().padStart(6, '0');
    return `${prefix}-IH-${paddedCount}`;
  }
}

export const idGeneratorService = new IdGeneratorService();
