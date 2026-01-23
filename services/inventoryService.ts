
import { OperatorInventoryItem, InventoryStatus, User, UserRole } from '../types';
import { adminService } from './adminService';
import { auditLogService } from './auditLogService';

const STORAGE_KEY_OP_INVENTORY = 'iht_operator_inventory';

class InventoryService {
  private items: OperatorInventoryItem[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_OP_INVENTORY);
    this.items = stored ? JSON.parse(stored) : [];
    
    // Migration: If items are missing productId or version, patch them
    let migrated = false;
    this.items.forEach(item => {
        if (!item.productId) {
            item.productId = item.id; // Self-reference for v1
            item.version = 1;
            // Legacy approved items are current
            item.isCurrent = item.status === 'APPROVED';
            migrated = true;
        }
    });
    if (migrated) this.save();
  }

  private save() {
    localStorage.setItem(STORAGE_KEY_OP_INVENTORY, JSON.stringify(this.items));
  }

  getAllItems(): OperatorInventoryItem[] {
    return this.items;
  }

  /**
   * For Operators/Partners: Returns the "Working Copy".
   * This is either the latest Draft/Pending version OR the Current Approved version if no draft exists.
   * Group by productId and pick highest version.
   */
  getItemsByOperator(operatorId: string): OperatorInventoryItem[] {
    const userItems = this.items.filter(i => i.operatorId === operatorId);
    
    // Group by Product ID
    const grouped = new Map<string, OperatorInventoryItem[]>();
    userItems.forEach(item => {
        if (!grouped.has(item.productId)) grouped.set(item.productId, []);
        grouped.get(item.productId)?.push(item);
    });

    const result: OperatorInventoryItem[] = [];
    grouped.forEach(versions => {
        // Sort descending by version number
        versions.sort((a, b) => b.version - a.version);
        // Push the latest one (Head)
        result.push(versions[0]);
    });

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * For the Builder/Agents: Returns ONLY Approved and Current items.
   * "Current" ensures we don't show old versions or pending drafts.
   */
  getApprovedItems(destinationId?: string): OperatorInventoryItem[] {
    return this.items.filter(i => 
      i.status === 'APPROVED' && 
      i.isCurrent &&
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

    const uniqueId = `opi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const newItem: OperatorInventoryItem = {
      id: uniqueId,
      productId: uniqueId, // New product starts its own lineage
      version: 1,
      isCurrent: false, // Not live until approved
      
      operatorId: user.id, 
      operatorName: user.name, 
      type: item.type,
      name: item.name,
      destinationId: item.destinationId || '',
      description: item.description || '',
      currency: item.currency || 'USD',
      costPrice: Number(item.costPrice),
      status: 'PENDING_APPROVAL', 
      createdAt: new Date().toISOString(),
      
      // Merge type specific fields
      ...item
    } as OperatorInventoryItem;

    this.items.unshift(newItem);
    this.save();
    return newItem;
  }

  /**
   * VERSIONED UPDATE
   * If item is APPROVED -> Create New Version (Draft)
   * If item is DRAFT/PENDING -> Update In Place
   */
  updateItem(id: string, updates: Partial<OperatorInventoryItem>, user: User): void {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Item not found");

    const existing = this.items[index];
    
    // Authorization Check
    if (existing.operatorId !== user.id && user.role !== UserRole.ADMIN) {
        throw new Error("Unauthorized: You can only edit your own inventory.");
    }

    if (existing.status === 'APPROVED') {
        // --- CREATE NEW VERSION ---
        const newVersionNum = existing.version + 1;
        const newId = `opi_${Date.now()}_v${newVersionNum}`;
        
        const newVersion: OperatorInventoryItem = {
            ...existing, // Copy all fields
            ...updates,  // Apply updates
            id: newId,
            productId: existing.productId, // Link to same product lineage
            version: newVersionNum,
            status: 'PENDING_APPROVAL',
            isCurrent: false,
            rejectionReason: undefined,
            createdAt: new Date().toISOString()
        };
        
        this.items.unshift(newVersion);
        // Note: The old APPROVED version remains untouched and isCurrent=true until the new one is approved.
        
    } else {
        // --- UPDATE IN PLACE (Draft/Pending/Rejected) ---
        // Admin can update approved directly? Let's say no, admin follows versioning too for audit.
        // But for rejected/draft, just update.
        
        this.items[index] = {
            ...existing,
            ...updates,
            // If it was Rejected, resetting it to Pending Approval on edit is standard workflow
            status: existing.status === 'REJECTED' ? 'PENDING_APPROVAL' : existing.status
        };
    }
    
    this.save();
  }

  deleteItem(id: string, user: User): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    if (item.operatorId !== user.id && user.role !== UserRole.ADMIN) {
        throw new Error("Unauthorized");
    }

    // Logic: If deleting a DRAFT version, just remove it.
    // If deleting an APPROVED version, maybe mark as inactive?
    // For now, strict delete for simplicity, but in real app soft delete.
    
    this.items = this.items.filter(i => i.id !== id);
    this.save();
  }

  // --- APPROVAL WORKFLOW ---

  approveItem(id: string, adminUser: User): void {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) return;
    
    const approvedItem = this.items[index];

    // 1. Archive previous active version
    // Find any other item with same productId that is currently true
    this.items.forEach(i => {
        if (i.productId === approvedItem.productId && i.isCurrent) {
            i.isCurrent = false; // Archive it
        }
    });

    // 2. Activate new version
    this.items[index] = {
      ...approvedItem,
      status: 'APPROVED',
      isCurrent: true,
      approvedBy: adminUser.id,
      approvedAt: new Date().toISOString(),
      rejectionReason: undefined
    };
    
    this.save();

    auditLogService.logAction({
      entityType: 'INVENTORY_APPROVAL',
      entityId: id,
      action: 'ITEM_APPROVED',
      description: `Approved inventory item: ${approvedItem.name} v${approvedItem.version}`,
      user: adminUser,
      newValue: { status: 'APPROVED', version: approvedItem.version }
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
      description: `Rejected inventory item: ${this.items[index].name} v${this.items[index].version}. Reason: ${reason}`,
      user: adminUser,
      newValue: { status: 'REJECTED', reason }
    });
  }
}

export const inventoryService = new InventoryService();
