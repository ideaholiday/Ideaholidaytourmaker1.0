
import { QuickQuoteTemplate } from '../types';
import { dbHelper } from './firestoreHelper';

const COLLECTION = 'quick_quote_templates';

class QuickQuoteTemplateService {

  async getAllTemplates(): Promise<QuickQuoteTemplate[]> {
    return await dbHelper.getAll<QuickQuoteTemplate>(COLLECTION);
  }

  async getSystemTemplates(): Promise<QuickQuoteTemplate[]> {
    return await dbHelper.getWhere<QuickQuoteTemplate>(COLLECTION, 'isSystem', '==', true);
  }

  async getAgentTemplates(agentId: string): Promise<QuickQuoteTemplate[]> {
    const all = await this.getAllTemplates();
    return all.filter(t => t.createdBy === agentId && !t.isSystem);
  }

  async saveTemplate(template: QuickQuoteTemplate) {
    await dbHelper.save(COLLECTION, template);
  }

  async deleteTemplate(id: string) {
    await dbHelper.delete(COLLECTION, id);
  }
}

export const quickQuoteTemplateService = new QuickQuoteTemplateService();
