
import { OperatorInventoryItem, InventoryStatus, User } from '../types';
import { adminService } from './adminService';
import { auditLogService } from './auditLogService';

const STORAGE_KEY_OP_INVENTORY = 'iht_operator_inventory';

class InventoryService {
  private items: OperatorInventoryItem[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_OP_INVENTORY);
    this.items = stored ? JSON.parse(stored) : [];
  }

  private save() {
    localStorage.setItem(STORAGE_KEY_OP_INVENTORY, JSON.stringify(this.items));
  }

  getAllItems(): OperatorInventoryItem[] {
    return this.items;
  }

  getItemsByOperator(operatorId: string): OperatorInventoryItem[] {
    return this.items.filter(i => i.operatorId === operatorId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getApprovedItems(destinationId?: string): OperatorInventoryItem[] {
    return this.items.filter(i => 
      i.status === 'APPROVED' && 
      (!destinationId || i.destinationId === destinationId)
    );
  }

  getPendingItems(): OperatorInventoryItem[] {
    return this.items.filter(i => i.status === 'PENDING_APPROVAL');
  }

  // --- CRUD ---

  createItem(item: Partial<OperatorInventoryItem>, user: User): OperatorInventoryItem {
    if (!item.type || !item.name || !item.costPrice) {
      throw new Error("Missing required fields");
    }

    const newItem: OperatorInventoryItem = {
      id: `opi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      operatorId: user.id,
      operatorName: user.name,
      type: item.type,
      name: item.name,
      destinationId: item.destinationId || '',
      description: item.description || '',
      currency: item.currency || 'USD',
      costPrice: Number(item.costPrice),
      status: 'PENDING_APPROVAL', // Always start as pending or draft
      createdAt: new Date().toISOString(),
      
      // Merge type specific fields
      ...item
    } as OperatorInventoryItem;

    this.items.unshift(newItem);
    this.save();
    return newItem;
  }

  updateItem(id: string, updates: Partial<OperatorInventoryItem>, user: User): void {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Item not found");

    const existing = this.items[index];
    if (existing.operatorId !== user.id && user.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    // If Operator edits, reset to Pending
    const nextStatus = user.role === 'OPERATOR' ? 'PENDING_APPROVAL' : existing.status;

    this.items[index] = {
        ...existing,
        ...updates,
        status: nextStatus
    };
    this.save();
  }

  deleteItem(id: string, user: User): void {
    // Logic to prevent deletion if used in booking could go here
    this.items = this.items.filter(i => i.id !== id);
    this.save();
  }

  // --- APPROVAL WORKFLOW ---

  approveItem(id: string, adminUser: User): void {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) return;

    this.items[index] = {
      ...this.items[index],
      status: 'APPROVED',
      approvedBy: adminUser.id,
      approvedAt: new Date().toISOString(),
      rejectionReason: undefined
    };
    this.save();

    auditLogService.logAction({
      entityType: 'INVENTORY_APPROVAL',
      entityId: id,
      action: 'ITEM_APPROVED',
      description: `Approved inventory item: ${this.items[index].name} from ${this.items[index].operatorName}`,
      user: adminUser,
      newValue: { status: 'APPROVED' }
    });
  }

  rejectItem(id: string, reason: string, adminUser: User): void {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) return;

    this.items[index] = {
      ...this.items[index],
      status: 'REJECTED',
      rejectionReason: reason
    };
    this.save();

    auditLogService.logAction({
      entityType: 'INVENTORY_APPROVAL',
      entityId: id,
      action: 'ITEM_REJECTED',
      description: `Rejected inventory item: ${this.items[index].name}. Reason: ${reason}`,
      user: adminUser,
      newValue: { status: 'REJECTED', reason }
    });
  }
}

export const inventoryService = new InventoryService();
