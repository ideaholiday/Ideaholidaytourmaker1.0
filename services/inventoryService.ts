import { OperatorInventoryItem, InventoryStatus, User, UserRole } from '../types';
import { dbHelper } from './firestoreHelper';
import { auditLogService } from './auditLogService';

const COLLECTION = 'operator_inventory';

class InventoryService {
  private cache: OperatorInventoryItem[] = [];

  async syncFromCloud() {
      this.cache = await dbHelper.getAll<OperatorInventoryItem>(COLLECTION);
  }

  getAllItemsSync() { return this.cache; }

  async getAllItems(): Promise<OperatorInventoryItem[]> {
    const items = await dbHelper.getAll<OperatorInventoryItem>(COLLECTION);
    this.cache = items;
    return items;
  }

  getItemsByOperatorSync(operatorId: string): OperatorInventoryItem[] {
      return this.cache.filter(i => i.operatorId === operatorId);
  }

  async getItemsByOperator(operatorId: string): Promise<OperatorInventoryItem[]> {
    const all = await this.getAllItems();
    return all.filter(i => i.operatorId === operatorId);
  }

  async getApprovedItems(destinationId?: string): Promise<OperatorInventoryItem[]> {
    const all = await this.getAllItems();
    return all.filter(i => 
      i.status === 'APPROVED' && 
      i.isCurrent &&
      (!destinationId || i.destinationId === destinationId)
    );
  }

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
    this.syncFromCloud();
    return newItem;
  }

  async updateItem(id: string, updates: Partial<OperatorInventoryItem>, user: User) {
    const existing = await dbHelper.getById<OperatorInventoryItem>(COLLECTION, id);
    if(!existing) return;

    if (existing.status === 'APPROVED') {
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
        await dbHelper.save(COLLECTION, { ...existing, ...updates });
    }
    this.syncFromCloud();
  }

  async approveItem(id: string, adminUser: User) {
    const item = await dbHelper.getById<OperatorInventoryItem>(COLLECTION, id);
    if (!item) return;

    const allItems = await this.getAllItems();
    const previous = allItems.find(i => i.productId === item.productId && i.isCurrent);
    if (previous && previous.id !== item.id) {
        await dbHelper.save(COLLECTION, { ...previous, isCurrent: false });
    }

    await dbHelper.save(COLLECTION, {
        ...item,
        status: 'APPROVED',
        isCurrent: true,
        approvedBy: adminUser.id,
        approvedAt: new Date().toISOString()
    });

    auditLogService.logAction({
      entityType: 'INVENTORY_APPROVAL',
      entityId: id,
      action: 'ITEM_APPROVED',
      description: `Approved inventory item: ${item.name}`,
      user: adminUser,
      newValue: { status: 'APPROVED' }
    });
    this.syncFromCloud();
  }

  async rejectItem(id: string, reason: string, adminUser: User) {
     await dbHelper.save(COLLECTION, { id, status: 'REJECTED', rejectionReason: reason });
     this.syncFromCloud();
  }
}

export const inventoryService = new InventoryService();