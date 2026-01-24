
import { AuditLog, EntityType, UserRole, User } from '../types';
import { dbHelper } from './firestoreHelper';

const COLLECTION = 'audit_logs';

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
  
  async logAction(input: AuditLogInput) {
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

    await dbHelper.save(COLLECTION, newLog);
    console.debug(`[AUDIT] ${newLog.action} on ${newLog.entityType}`);
  }

  async getLogs(filters?: any): Promise<AuditLog[]> {
    // Basic implementation: fetch all then filter (inefficient for prod but works for migration)
    // Real implementation should use compound queries
    let logs = await dbHelper.getAll<AuditLog>(COLLECTION);
    
    // Sort descending
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters) {
        if (filters.entityType && filters.entityType !== 'ALL') {
            logs = logs.filter(l => l.entityType === filters.entityType);
        }
        // ... apply other filters
    }
    return logs;
  }
}

export const auditLogService = new AuditLogService();
