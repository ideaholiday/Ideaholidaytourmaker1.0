
import { SupplierContract, ContractStatus, User } from '../types';
import { auditLogService } from './auditLogService';

const STORAGE_KEY_CONTRACTS = 'iht_supplier_contracts';

class ContractService {
  private contracts: SupplierContract[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_CONTRACTS);
    this.contracts = stored ? JSON.parse(stored) : [];
  }

  private save() {
    localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(this.contracts));
  }

  getAllContracts(): SupplierContract[] {
    return this.contracts;
  }

  getContractsBySupplier(supplierId: string): SupplierContract[] {
    return this.contracts.filter(c => c.supplierId === supplierId);
  }

  getContract(id: string): SupplierContract | undefined {
    return this.contracts.find(c => c.id === id);
  }

  // --- CRUD ---

  saveContract(contract: Partial<SupplierContract>, user: User): SupplierContract {
    const isNew = !contract.id;
    
    // Auto-generate ID and Code for new contracts
    const contractData: SupplierContract = {
      ...contract,
      id: contract.id || `ctr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      contractCode: contract.contractCode || `CTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      status: contract.status || 'DRAFT',
      createdAt: contract.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: contract.createdBy || user.id
    } as SupplierContract;

    const index = this.contracts.findIndex(c => c.id === contractData.id);
    if (index >= 0) {
      this.contracts[index] = contractData;
    } else {
      this.contracts.unshift(contractData);
    }
    
    this.save();

    auditLogService.logAction({
        entityType: 'CONTRACT',
        entityId: contractData.id,
        action: isNew ? 'CONTRACT_CREATED' : 'CONTRACT_UPDATED',
        description: `${isNew ? 'Created' : 'Updated'} contract ${contractData.contractCode} for ${contractData.supplierName}`,
        user: user,
        newValue: contractData
    });

    return contractData;
  }

  // --- APPROVAL WORKFLOW ---

  updateStatus(id: string, status: ContractStatus, user: User, reason?: string) {
    const contract = this.getContract(id);
    if (!contract) throw new Error("Contract not found");

    const oldStatus = contract.status;
    contract.status = status;
    contract.updatedAt = new Date().toISOString();

    if (status === 'ACTIVE') {
        contract.approvedBy = user.id;
        contract.approvedAt = new Date().toISOString();
        contract.rejectionReason = undefined;
    } else if (status === 'REJECTED') {
        contract.rejectionReason = reason;
    }

    this.save();

    auditLogService.logAction({
        entityType: 'CONTRACT',
        entityId: id,
        action: `CONTRACT_${status}`,
        description: `Contract ${contract.contractCode} status changed to ${status}. ${reason ? `Reason: ${reason}` : ''}`,
        user: user,
        previousValue: { status: oldStatus },
        newValue: { status: status, reason }
    });
  }

  // --- VALIDATION HELPERS ---

  /**
   * Checks if a contract is valid for a specific date and city.
   */
  isValidForBooking(contractId: string, cityId: string, travelDate: string): boolean {
    const contract = this.getContract(contractId);
    if (!contract) return false;

    if (contract.status !== 'ACTIVE') return false;

    const date = new Date(travelDate);
    const validFrom = new Date(contract.validFrom);
    const validTo = new Date(contract.validTo);

    if (date < validFrom || date > validTo) return false;

    if (!contract.applicableCities.includes(cityId)) return false;

    // Check Blackout Dates
    if (contract.blackoutDates && contract.blackoutDates.some(d => d === travelDate)) return false;

    return true;
  }
}

export const contractService = new ContractService();
