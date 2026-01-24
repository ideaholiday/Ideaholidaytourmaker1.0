
import { OperatorInventoryItem, InventoryStatus, User, UserRole } from '../types';
import { dbHelper } from './firestoreHelper';
import { auditLogService } from './auditLogService';

const COLLECTION = 'operator_inventory';

class InventoryService {
  private cache: OperatorInventoryItem[] = [];

  // Used by AuthContext
  async syncFromCloud() {
     this.cache = await dbHelper.getAll<OperatorInventoryItem>(COLLECTION);
  }

  getAllItems(): OperatorInventoryItem[] {
    return this.cache;
  }

  getItemsByOperator(operatorId: string): OperatorInventoryItem[] {
    const userItems = this.cache.filter(i => i.operatorId === operatorId);
    // Version logic filtering...
    const grouped = new Map<string, OperatorInventoryItem[]>();
    userItems.forEach(item => {
        const pid = item.productId || item.id;
        if (!grouped.has(pid)) grouped.set(pid, []);
        grouped.get(pid)?.push(item);
    });

    const result: OperatorInventoryItem[] = [];
    grouped.forEach(versions => {
        versions.sort((a, b) => b.version - a.version);
        result.push(versions[0]);
    });
    return result;
  }

  getApprovedItems(destinationId?: string): OperatorInventoryItem[] {
    return this.cache.filter(i => 
      i.status === 'APPROVED' && 
      i.isCurrent &&
      (!destinationId || i.destinationId === destinationId)
    );
  }

  // --- CRUD ---

  async createItem(item: Partial<OperatorInventoryItem>, user: User): Promise<OperatorInventoryItem> {
    const uniqueId = `opi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const newItem: OperatorInventoryItem = {
      id: uniqueId,
      productId: uniqueId,
      version: 1,
      isCurrent: false, 
      operatorId: user.id, 
      operatorName: user.name, 
      type: item.type!,
      name: item.name!,
      destinationId: item.destinationId || '',
      description: item.description || '',
      currency: item.currency || 'INR',
      costPrice: Number(item.costPrice),
      status: 'PENDING_APPROVAL', 
      createdAt: new Date().toISOString(),
      ...item
    } as OperatorInventoryItem;

    await dbHelper.save(COLLECTION, newItem);
    await this.syncFromCloud();
    return newItem;
  }

  async updateItem(id: string, updates: Partial<OperatorInventoryItem>, user: User) {
    const existing = this.cache.find(i => i.id === id);
    if(!existing) return;

    if (existing.status === 'APPROVED') {
        // Versioning
        const newVersionNum = existing.version + 1;
        const newId = `opi_${Date.now()}_v${newVersionNum}`;
        const newVersion = {
            ...existing,
            ...updates,
            id: newId,
            productId: existing.productId,
            version: newVersionNum,
            status: 'PENDING_APPROVAL' as const,
            isCurrent: false,
            createdAt: new Date().toISOString()
        };
        await dbHelper.save(COLLECTION, newVersion);
    } else {
        // Direct Update
        await dbHelper.save(COLLECTION, { ...existing, ...updates });
    }
    await this.syncFromCloud();
  }

  async approveItem(id: string, adminUser: User) {
    const item = this.cache.find(i => i.id === id);
    if (!item) return;

    // Archive previous current
    const previous = this.cache.find(i => i.productId === item.productId && i.isCurrent);
    if (previous) {
        await dbHelper.save(COLLECTION, { ...previous, isCurrent: false });
    }

    // Activate new
    await dbHelper.save(COLLECTION, {
        ...item,
        status: 'APPROVED',
        isCurrent: true,
        approvedBy: adminUser.id,
        approvedAt: new Date().toISOString()
    });

    await this.syncFromCloud();

    auditLogService.logAction({
      entityType: 'INVENTORY_APPROVAL',
      entityId: id,
      action: 'ITEM_APPROVED',
      description: `Approved inventory item: ${item.name}`,
      user: adminUser,
      newValue: { status: 'APPROVED' }
    });
  }

  async rejectItem(id: string, reason: string, adminUser: User) {
     await dbHelper.save(COLLECTION, { id, status: 'REJECTED', rejectionReason: reason });
     await this.syncFromCloud();
  }
}

export const inventoryService = new InventoryService();
