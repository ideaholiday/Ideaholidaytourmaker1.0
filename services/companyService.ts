
import { CompanyProfile } from '../types';
import { BRANDING } from '../constants';

const STORAGE_KEY_COMPANIES = 'iht_companies';

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
  private companies: CompanyProfile[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_COMPANIES);
    this.companies = stored ? JSON.parse(stored) : [DEFAULT_COMPANY];
  }

  private save() {
    localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(this.companies));
  }

  getAllCompanies(): CompanyProfile[] {
    return this.companies;
  }

  getCompany(id: string): CompanyProfile | undefined {
    return this.companies.find(c => c.id === id);
  }

  getActiveCompanies(): CompanyProfile[] {
    return this.companies.filter(c => c.isActive);
  }

  getDefaultCompany(): CompanyProfile {
    // Return first active or the absolute default
    return this.companies.find(c => c.isActive) || this.companies[0];
  }

  saveCompany(company: CompanyProfile) {
    const index = this.companies.findIndex(c => c.id === company.id);
    if (index >= 0) {
      // Preserve sequential numbers if updating existing company configuration
      const existing = this.companies[index];
      this.companies[index] = { 
          ...company, 
          nextInvoiceNumber: existing.nextInvoiceNumber,
          nextReceiptNumber: existing.nextReceiptNumber,
          nextCreditNoteNumber: existing.nextCreditNoteNumber
      };
    } else {
      // New company
      this.companies.push({ 
        ...company, 
        id: company.id || `comp_${Date.now()}`,
        nextInvoiceNumber: 1,
        nextReceiptNumber: 1,
        nextCreditNoteNumber: 1
      });
    }
    this.save();
  }

  deleteCompany(id: string) {
    if (this.companies.length <= 1) {
        alert("Cannot delete the only company.");
        return;
    }
    this.companies = this.companies.filter(c => c.id !== id);
    this.save();
  }

  /**
   * Generates next invoice number for a specific company and increments the counter.
   * Format: PREFIX-YEAR-SEQUENCE (e.g., IH-DEL-2024-0001)
   */
  generateNextInvoiceNumber(companyId: string): string {
    const company = this.getCompany(companyId);
    if (!company) throw new Error("Company not found");

    const year = new Date().getFullYear();
    const sequence = company.nextInvoiceNumber.toString().padStart(4, '0');
    const invoiceNo = `${company.invoicePrefix}${year}-${sequence}`;

    // Increment and save
    company.nextInvoiceNumber += 1;
    this.save();

    return invoiceNo;
  }

  /**
   * Generates next payment receipt number.
   * Format: PREFIX-YEAR-SEQUENCE (e.g., RCPT-2024-0001)
   */
  generateNextReceiptNumber(companyId: string): string {
    const company = this.getCompany(companyId);
    if (!company) throw new Error("Company not found");

    const year = new Date().getFullYear();
    // Use default prefix if missing
    const prefix = company.receiptPrefix || 'RCPT-';
    // Use default start if missing
    const currentNum = company.nextReceiptNumber || 1;
    
    const sequence = currentNum.toString().padStart(4, '0');
    const receiptNo = `${prefix}${year}-${sequence}`;

    // Increment and save
    company.nextReceiptNumber = currentNum + 1;
    this.save();

    return receiptNo;
  }

  /**
   * Generates next credit note number.
   * Format: PREFIX-YEAR-SEQUENCE (e.g., CN-2024-0001)
   */
  generateNextCreditNoteNumber(companyId: string): string {
    const company = this.getCompany(companyId);
    if (!company) throw new Error("Company not found");

    const year = new Date().getFullYear();
    const prefix = company.creditNotePrefix || 'CN-';
    const currentNum = company.nextCreditNoteNumber || 1;
    
    const sequence = currentNum.toString().padStart(4, '0');
    const cnNo = `${prefix}${year}-${sequence}`;

    // Increment and save
    company.nextCreditNoteNumber = currentNum + 1;
    this.save();

    return cnNo;
  }
}

export const companyService = new CompanyService();
