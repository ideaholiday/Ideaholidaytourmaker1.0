
import { AgentFavoriteTemplate, ItineraryItem, ItineraryService, TravelerInfo } from '../types';
import { adminService } from './adminService';

const STORAGE_KEY_FAVORITES = 'iht_agent_favorites';

class FavoriteTemplateService {
  
  getTemplates(agentId: string): AgentFavoriteTemplate[] {
    const stored = localStorage.getItem(STORAGE_KEY_FAVORITES);
    const all: AgentFavoriteTemplate[] = stored ? JSON.parse(stored) : [];
    return all.filter(t => t.agentId === agentId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  saveTemplate(template: AgentFavoriteTemplate) {
    const stored = localStorage.getItem(STORAGE_KEY_FAVORITES);
    const all: AgentFavoriteTemplate[] = stored ? JSON.parse(stored) : [];
    
    // Check if updating or creating
    const index = all.findIndex(t => t.id === template.id);
    if (index >= 0) {
      all[index] = template;
    } else {
      all.unshift(template);
    }
    
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(all));
  }

  deleteTemplate(templateId: string) {
    const stored = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (!stored) return;
    const all: AgentFavoriteTemplate[] = JSON.parse(stored);
    const filtered = all.filter(t => t.id !== templateId);
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(filtered));
  }

  /**
   * Hydrates a template by refreshing prices from the current Admin CMS inventory.
   * Ensures that old templates always use live pricing.
   */
  hydrateTemplate(
    template: AgentFavoriteTemplate, 
    pax: TravelerInfo
  ): { itinerary: ItineraryItem[], warnings: string[] } {
    const warnings: string[] = [];
    const activities = adminService.getActivities();
    const transfers = adminService.getTransfers();
    
    const hydratedItinerary = template.itinerary.map(day => {
      const updatedServices: ItineraryService[] = [];

      day.services?.forEach(svc => {
        if (svc.type === 'ACTIVITY') {
          const freshItem = activities.find(a => a.id === svc.id);
          if (freshItem && freshItem.isActive) {
            const cost = (freshItem.costAdult * pax.adults) + (freshItem.costChild * pax.children);
            updatedServices.push({
              ...svc,
              name: freshItem.activityName, // Update name in case it changed
              cost: cost,
              price: cost
            });
          } else {
            warnings.push(`Activity "${svc.name}" (Day ${day.day}) is no longer available and was removed.`);
          }
        } else if (svc.type === 'TRANSFER') {
          const freshItem = transfers.find(t => t.id === svc.id);
          if (freshItem && freshItem.isActive) {
            let cost = 0;
            if (freshItem.costBasis === 'Per Vehicle') {
                 const totalPax = pax.adults + pax.children;
                 const vehicles = Math.ceil(totalPax / freshItem.maxPassengers);
                 cost = freshItem.cost * vehicles;
            } else {
                 cost = freshItem.cost * (pax.adults + pax.children);
            }
            updatedServices.push({
              ...svc,
              name: freshItem.transferName,
              cost: cost,
              price: cost
            });
          } else {
             warnings.push(`Transfer "${svc.name}" (Day ${day.day}) is no longer available and was removed.`);
          }
        } else if (svc.type === 'HOTEL') {
           // Hotels usually require re-selection in step 2, but if stored as a service we keep it.
           updatedServices.push(svc);
        } else {
          updatedServices.push(svc);
        }
      });

      return {
        ...day,
        services: updatedServices
      };
    });

    return { itinerary: hydratedItinerary, warnings };
  }
}

export const favoriteTemplateService = new FavoriteTemplateService();
