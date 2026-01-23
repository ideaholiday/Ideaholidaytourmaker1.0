
import { OperatorInventoryItem, InventoryStatus, User, UserRole } from '../types';
import { adminService } from './adminService';
import { auditLogService } from './auditLogService';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query } from 'firebase/firestore';

const STORAGE_KEY_OP_INVENTORY = 'iht_operator_inventory';

class InventoryService {
  private items: OperatorInventoryItem[];
  private isOffline = false;

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_OP_INVENTORY);
    this.items = stored ? JSON.parse(stored) : [];
    
    // Migration logic
    let migrated = false;
    this.items.forEach(item => {
        if (!item.productId) {
            item.productId = item.id; 
            item.version = 1;
            item.isCurrent = item.status === 'APPROVED';
            migrated = true;
        }
    });
    if (migrated) this.saveLocal();
    
    // Kick off Cloud Sync
    this.syncFromCloud();
  }

  private saveLocal() {
    localStorage.setItem(STORAGE_KEY_OP_INVENTORY, JSON.stringify(this.items));
  }

  async syncFromCloud() {
      if (this.isOffline) return;

      try {
          const q = query(collection(db, 'products'));
          const snapshot = await getDocs(q);
          const remoteItems = snapshot.docs.map(doc => doc.data() as OperatorInventoryItem);
          
          if (remoteItems.length > 0) {
              this.items = remoteItems;
              this.saveLocal();
          }
      } catch (e: any) {
          if (e.code === 'permission-denied' || e.code === 'unavailable' || e.code === 'not-found' || e.message?.includes('permission-denied')) {
             console.warn("⚠️ Inventory Service: Backend unavailable. Switching to Offline Mode.");
             this.isOffline = true;
          } else {
             console.warn("Inventory Cloud Sync Failed", e);
          }
      }
  }

  private async persist(item: OperatorInventoryItem) {
      // 1. Local
      const index = this.items.findIndex(i => i.id === item.id);
      if (index >= 0) this.items[index] = item;
      else this.items.unshift(item);
      this.saveLocal();

      // 2. Cloud
      if (!this.isOffline) {
          try {
              await setDoc(doc(db, 'products', item.id), item, { merge: true });
          } catch (e: any) {
              if (e.code === 'permission-denied' || e.code === 'unavailable' || e.code === 'not-found') {
                  this.isOffline = true;
              } else {
                  console.error("Cloud inventory save failed", e);
              }
          }
      }
  }

  getAllItems(): OperatorInventoryItem[] {
    return this.items;
  }

  getItemsByOperator(operatorId: string): OperatorInventoryItem[] {
    const userItems = this.items.filter(i => i.operatorId === operatorId);
    
    // Group by Product ID to find latest version
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

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getApprovedItems(destinationId?: string): OperatorInventoryItem[] {
    return this.items.filter(i => 
      i.status === 'APPROVED' && 
      i.isCurrent &&
      (!destinationId || i.destinationId === destinationId)
    );
  }

  // --- CRUD ---

  createItem(item: Partial<OperatorInventoryItem>, user: User): OperatorInventoryItem {
    if (!item.type || !item.name || !item.costPrice) {
      throw new Error("Missing required fields");
    }

    const uniqueId = `opi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const newItem: OperatorInventoryItem = {
      id: uniqueId,
      productId: uniqueId,
      version: 1,
      isCurrent: false, 
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
      ...item
    } as OperatorInventoryItem;

    this.persist(newItem);
    return newItem;
  }

  updateItem(id: string, updates: Partial<OperatorInventoryItem>, user: User): void {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Item not found");

    const existing = this.items[index];
    
    if (existing.operatorId !== user.id && user.role !== UserRole.ADMIN) {
        throw new Error("Unauthorized");
    }

    if (existing.status === 'APPROVED') {
        // Create New Version
        const newVersionNum = existing.version + 1;
        const newId = `opi_${Date.now()}_v${newVersionNum}`;
        
        const newVersion: OperatorInventoryItem = {
            ...existing,
            ...updates,
            id: newId,
            productId: existing.productId,
            version: newVersionNum,
            status: 'PENDING_APPROVAL',
            isCurrent: false,
            rejectionReason: undefined,
            createdAt: new Date().toISOString()
        };
        
        this.persist(newVersion);
        
    } else {
        // Update Draft
        const updated = {
            ...existing,
            ...updates,
            status: existing.status === 'REJECTED' ? 'PENDING_APPROVAL' : existing.status
        };
        this.persist(updated);
    }
  }

  deleteItem(id: string, user: User): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    if (item.operatorId !== user.id && user.role !== UserRole.ADMIN) {
        throw new Error("Unauthorized");
    }
    
    // Local Delete
    this.items = this.items.filter(i => i.id !== id);
    this.saveLocal();

    // Cloud Delete
    if (!this.isOffline) {
        deleteDoc(doc(db, 'products', id)).catch(console.error);
    }
  }

  // --- APPROVAL WORKFLOW ---

  approveItem(id: string, adminUser: User): void {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) return;
    
    const approvedItem = this.items[index];

    // Archive previous
    this.items.forEach(i => {
        if (i.productId === approvedItem.productId && i.isCurrent) {
            i.isCurrent = false;
            this.persist(i); // Save archive state
        }
    });

    // Activate new
    const newItem = {
      ...approvedItem,
      status: 'APPROVED' as const,
      isCurrent: true,
      approvedBy: adminUser.id,
      approvedAt: new Date().toISOString(),
      rejectionReason: undefined
    };
    
    this.persist(newItem);

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

    const rejected = {
      ...this.items[index],
      status: 'REJECTED' as const,
      rejectionReason: reason
    };
    
    this.persist(rejected);

    auditLogService.logAction({
      entityType: 'INVENTORY_APPROVAL',
      entityId: id,
      action: 'ITEM_REJECTED',
      description: `Rejected inventory item: ${rejected.name}. Reason: ${reason}`,
      user: adminUser,
      newValue: { status: 'REJECTED', reason }
    });
  }
}

export const inventoryService = new InventoryService();
