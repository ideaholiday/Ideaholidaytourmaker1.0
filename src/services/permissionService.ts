

import { User, Permission, UserRole } from '../types';
import { profileService } from './profileService';
import { auditLogService } from './auditLogService';

export const ALL_PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  { key: 'CREATE_QUOTE', label: 'Create Quotes', description: 'Can create and manage new quotations.' },
  { key: 'EDIT_QUOTE', label: 'Edit Quotes', description: 'Can modify existing quotes.' },
  { key: 'ASSIGN_OPERATOR', label: 'Assign Operators', description: 'Can assign ground operators to bookings.' },
  { key: 'VIEW_NET_COST', label: 'View Net Costs', description: 'Can see internal buying rates.' },
  { key: 'SET_OPERATOR_PRICE', label: 'Set Operator Pricing', description: 'Can override operator payables.' },
  { key: 'APPROVE_BOOKING', label: 'Approve Bookings', description: 'Can confirm bookings and lock itineraries.' },
  { key: 'APPROVE_CANCELLATION', label: 'Approve Cancellations', description: 'Can process refunds and penalties.' },
  { key: 'VIEW_PAYMENTS', label: 'View Payments', description: 'Read-only access to transaction history.' },
  { key: 'MODIFY_PAYMENTS', label: 'Manage Payments', description: 'Can record new payments and refunds.' },
  { key: 'VIEW_AUDIT_LOGS', label: 'View Audit Logs', description: 'Access to system security logs.' },
  { key: 'MANAGE_COMPANIES', label: 'Manage Companies', description: 'Add/Edit legal entities and GST settings.' },
  { key: 'EXPORT_ACCOUNTING', label: 'Export Accounting', description: 'Download Tally/Zoho ledger data.' },
  { key: 'VIEW_FINANCE_REPORTS', label: 'View P&L', description: 'Access to Profit & Loss reports.' },
  { key: 'APPROVE_INVENTORY', label: 'Approve Inventory', description: 'Review and moderate operator-submitted inventory.' },
  { key: 'MANAGE_INVENTORY', label: 'Manage Inventory', description: 'Full access: Add, Edit, and Delete system inventory.' },
  { key: 'CREATE_INVENTORY', label: 'Create Inventory Only', description: 'Restricted access: Can only add new inventory items.' },
  { key: 'MANAGE_CONTRACTS', label: 'Manage Contracts', description: 'Create and update supplier contracts.' },
  { key: 'APPROVE_CONTRACTS', label: 'Approve Contracts', description: 'Finalize and activate supplier contracts.' },
  // Operator Specific Permissions
  { key: 'OPERATOR_VIEW_ASSIGNED_BOOKINGS', label: 'View Assigned Bookings', description: 'Operator can access bookings assigned to them.' },
  { key: 'OPERATOR_MANAGE_OWN_INVENTORY', label: 'Manage Own Inventory', description: 'Operator can create and edit their own inventory.' },
];

class PermissionService {
  
  hasPermission(user: User, permission: Permission): boolean {
    if (user.role === UserRole.ADMIN) return true; // Admin has all
    
    // Check permissions for Staff and Operators
    if (user.role === UserRole.STAFF || user.role === UserRole.OPERATOR) {
      return user.permissions?.includes(permission) || false;
    }
    
    return false; // Agents generally don't use this system permissions
  }

  updatePermissions(userId: string, permissions: Permission[]) {
    const user = profileService.getUser(userId);
    const oldPerms = user?.permissions;
    
    profileService.updateProfileDetails(userId, { permissions });

    if (user) {
        // AUDIT LOG
        const adminUser: User = { id: 'admin_sys', name: 'Admin', role: UserRole.ADMIN, email: '', isVerified: true };
        auditLogService.logAction({
            entityType: 'PERMISSION',
            entityId: userId,
            action: 'PERMISSIONS_UPDATED',
            description: `Permissions updated for ${user.name}.`,
            user: adminUser,
            previousValue: oldPerms,
            newValue: permissions
        });
    }
  }
}

export const permissionService = new PermissionService();
