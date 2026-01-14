
import { AuditLog, EntityType, UserRole, User } from '../types';

const STORAGE_KEY_AUDIT = 'iht_audit_logs';

export interface AuditLogInput {
  entityType: EntityType;
  entityId: string;
  action: string;
  description: string;
  user: User;
  previousValue?: any;
  newValue?: any;
}

class AuditLogService {
  private logs: AuditLog[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_AUDIT);
    this.logs = stored ? JSON.parse(stored) : [];
  }

  private save() {
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(this.logs));
  }

  /**
   * Log a new action. 
   * This should be called by other services when a critical action occurs.
   */
  logAction(input: AuditLogInput) {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      performedByRole: input.user.role,
      performedById: input.user.id,
      performedByName: input.user.name,
      description: input.description,
      previousValue: input.previousValue,
      newValue: input.newValue,
      timestamp: new Date().toISOString()
    };

    // Add to beginning of array (Newest first)
    this.logs.unshift(newLog);
    
    // Limit log size in local storage to prevent overflow (e.g., last 1000 logs)
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    
    this.save();
    console.debug(`[AUDIT] ${newLog.action} on ${newLog.entityType} by ${newLog.performedByName}`);
  }

  /**
   * Get filtered logs.
   * Access Control: Admin gets everything. Staff gets limited view if implemented.
   */
  getLogs(filters?: {
    entityType?: EntityType | 'ALL';
    action?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): AuditLog[] {
    let filtered = this.logs;

    if (filters) {
      if (filters.entityType && filters.entityType !== 'ALL') {
        filtered = filtered.filter(l => l.entityType === filters.entityType);
      }
      if (filters.action) {
        filtered = filtered.filter(l => l.action.toLowerCase().includes(filters.action!.toLowerCase()));
      }
      if (filters.userId) {
        filtered = filtered.filter(l => l.performedById === filters.userId);
      }
      if (filters.dateFrom) {
        filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(filters.dateFrom!));
      }
      if (filters.dateTo) {
        // Add one day to include the end date fully
        const endDate = new Date(filters.dateTo!);
        endDate.setDate(endDate.getDate() + 1);
        filtered = filtered.filter(l => new Date(l.timestamp) < endDate);
      }
    }

    return filtered;
  }

  getLogsForEntity(entityId: string): AuditLog[] {
    return this.logs.filter(l => l.entityId === entityId);
  }
}

export const auditLogService = new AuditLogService();
