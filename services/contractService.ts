
import { SupplierContract, ContractStatus, User } from '../types';
import { dbHelper } from './firestoreHelper';
import { auditLogService } from './auditLogService';

const COLLECTION = 'supplier_contracts';

class ContractService {
  
  async getAllContracts(): Promise<SupplierContract[]> {
    return await dbHelper.getAll<SupplierContract>(COLLECTION);
  }

  async getContractsBySupplier(supplierId: string): Promise<SupplierContract[]> {
    return await dbHelper.getWhere<SupplierContract>(COLLECTION, 'supplierId', '==', supplierId);
  }

  async saveContract(contract: Partial<SupplierContract>, user: User): Promise<SupplierContract> {
    const isNew = !contract.id;
    
    const contractData: SupplierContract = {
      ...contract,
      id: contract.id || `ctr_${Date.now()}`,
      contractCode: contract.contractCode || `CTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      status: contract.status || 'DRAFT',
      createdAt: contract.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: contract.createdBy || user.id
    } as SupplierContract;

    await dbHelper.save(COLLECTION, contractData);

    auditLogService.logAction({
        entityType: 'CONTRACT',
        entityId: contractData.id,
        action: isNew ? 'CONTRACT_CREATED' : 'CONTRACT_UPDATED',
        description: `${isNew ? 'Created' : 'Updated'} contract ${contractData.contractCode}`,
        user: user
    });

    return contractData;
  }

  async updateStatus(id: string, status: ContractStatus, user: User, reason?: string) {
    await dbHelper.save(COLLECTION, { 
        id, 
        status, 
        updatedAt: new Date().toISOString(),
        approvedBy: status === 'ACTIVE' ? user.id : undefined,
        rejectionReason: reason 
    });
  }
}

export const contractService = new ContractService();
