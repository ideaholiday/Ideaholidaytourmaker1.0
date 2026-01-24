
import { AgentFavoriteTemplate, TravelerInfo } from '../types';
import { dbHelper } from './firestoreHelper';

const COLLECTION = 'agent_favorites';

class FavoriteTemplateService {
  
  async getTemplates(agentId: string): Promise<AgentFavoriteTemplate[]> {
    return await dbHelper.getWhere<AgentFavoriteTemplate>(COLLECTION, 'agentId', '==', agentId);
  }

  async saveTemplate(template: AgentFavoriteTemplate) {
    await dbHelper.save(COLLECTION, template);
  }

  async deleteTemplate(templateId: string) {
    await dbHelper.delete(COLLECTION, templateId);
  }

  hydrateTemplate(template: AgentFavoriteTemplate, pax: TravelerInfo) {
      // Mock hydration logic logic as it relies on synced Admin data
      return { itinerary: template.itinerary, warnings: [] };
  }
}

export const favoriteTemplateService = new FavoriteTemplateService();
