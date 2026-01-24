
import { CompanyProfile } from '../types';
import { dbHelper } from './firestoreHelper';
import { BRANDING } from '../constants';

const COLLECTION = 'companies';

const DEFAULT_COMPANY: CompanyProfile = {
  id: 'comp_default',
  companyName: BRANDING.legalName,
  brandName: BRANDING.name,
  gstin: '09AAGCI8928Q1ZK',
  email: BRANDING.email,
  phone: BRANDING.supportPhone,
  address: BRANDING.address,
  stateCode: '09', // UP
  gstRate: 5,
  gstType: 'CGST_SGST',
  invoicePrefix: 'INV-',
  nextInvoiceNumber: 1,
  receiptPrefix: 'RCPT-',
  nextReceiptNumber: 1,
  creditNotePrefix: 'CN-',
  nextCreditNoteNumber: 1,
  isActive: true
};

class CompanyService {

  async getAllCompanies(): Promise<CompanyProfile[]> {
    const companies = await dbHelper.getAll<CompanyProfile>(COLLECTION);
    if (companies.length === 0) {
        await this.saveCompany(DEFAULT_COMPANY);
        return [DEFAULT_COMPANY];
    }
    return companies;
  }

  async getCompany(id: string): Promise<CompanyProfile | null> {
    return await dbHelper.getById<CompanyProfile>(COLLECTION, id);
  }

  async getDefaultCompany(): Promise<CompanyProfile> {
    const companies = await this.getAllCompanies();
    return companies.find(c => c.isActive) || companies[0] || DEFAULT_COMPANY;
  }

  async saveCompany(company: CompanyProfile) {
    if (!company.id) company.id = `comp_${Date.now()}`;
    await dbHelper.save(COLLECTION, company);
  }

  async deleteCompany(id: string) {
    await dbHelper.delete(COLLECTION, id);
  }

  async generateNextInvoiceNumber(companyId: string): Promise<string> {
    const company = await dbHelper.getById<CompanyProfile>(COLLECTION, companyId);
    if (!company) throw new Error("Company not found");

    const year = new Date().getFullYear();
    const sequence = company.nextInvoiceNumber.toString().padStart(4, '0');
    const invoiceNo = `${company.invoicePrefix}${year}-${sequence}`;

    company.nextInvoiceNumber += 1;
    await dbHelper.save(COLLECTION, company);

    return invoiceNo;
  }

  async generateNextReceiptNumber(companyId: string): Promise<string> {
    const company = await dbHelper.getById<CompanyProfile>(COLLECTION, companyId);
    if (!company) throw new Error("Company not found");

    const year = new Date().getFullYear();
    const prefix = company.receiptPrefix || 'RCPT-';
    const currentNum = company.nextReceiptNumber || 1;
    
    const sequence = currentNum.toString().padStart(4, '0');
    const receiptNo = `${prefix}${year}-${sequence}`;

    company.nextReceiptNumber = currentNum + 1;
    await dbHelper.save(COLLECTION, company);

    return receiptNo;
  }

  async generateNextCreditNoteNumber(companyId: string): Promise<string> {
    const company = await dbHelper.getById<CompanyProfile>(COLLECTION, companyId);
    if (!company) throw new Error("Company not found");

    const year = new Date().getFullYear();
    const prefix = company.creditNotePrefix || 'CN-';
    const currentNum = company.nextCreditNoteNumber || 1;
    
    const sequence = currentNum.toString().padStart(4, '0');
    const cnNo = `${prefix}${year}-${sequence}`;

    company.nextCreditNoteNumber = currentNum + 1;
    await dbHelper.save(COLLECTION, company);

    return cnNo;
  }
}

export const companyService = new CompanyService();
