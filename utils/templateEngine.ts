
import { ItineraryTemplate, TemplateServiceSlot, Activity, Transfer, ItineraryItem, ItineraryService } from '../types';

interface Inventory {
  activities: Activity[];
  transfers: Transfer[];
}

interface PaxInfo {
  adults: number;
  children: number;
}

export const generateItineraryFromTemplate = (
  template: ItineraryTemplate,
  inventory: Inventory,
  pax: PaxInfo
): ItineraryItem[] => {
  return template.days.map((dayPlan) => {
    const generatedServices: ItineraryService[] = [];

    // Safely iterate slots
    dayPlan.slots?.forEach((slot) => {
      const match = findBestMatch(slot, inventory);
      if (match) {
        generatedServices.push(createServiceFromMatch(match, slot.type, pax));
      }
    });

    return {
      day: dayPlan.day,
      title: dayPlan.title,
      description: dayPlan.description,
      inclusions: [], // Can be enhanced to pull from items
      services: generatedServices
    };
  });
};

const findBestMatch = (slot: TemplateServiceSlot, inventory: Inventory): Activity | Transfer | null => {
  if (slot.type === 'ACTIVITY') {
    // 1. Try Category Match
    if (slot.category) {
      const catMatch = inventory.activities.find(a => 
        a.activityType.toLowerCase() === slot.category?.toLowerCase() && a.isActive
      );
      if (catMatch) return catMatch;
    }
    
    // 2. Try Keyword Match
    if (slot.keywords && slot.keywords.length > 0) {
      const kwMatch = inventory.activities.find(a => 
        slot.keywords!.some(k => a.activityName.toLowerCase().includes(k.toLowerCase())) && a.isActive
      );
      if (kwMatch) return kwMatch;
    }
  }

  if (slot.type === 'TRANSFER') {
     // 1. Try Keyword Match (e.g. Airport)
     if (slot.keywords && slot.keywords.length > 0) {
        const kwMatch = inventory.transfers.find(t => 
           slot.keywords!.some(k => t.transferName.toLowerCase().includes(k.toLowerCase())) && t.isActive
        );
        if (kwMatch) return kwMatch;
     }
     
     // 2. Fallback to any active transfer
     return inventory.transfers.find(t => t.isActive) || null;
  }

  return null;
};

const createServiceFromMatch = (
    item: Activity | Transfer, 
    type: 'ACTIVITY' | 'TRANSFER',
    pax: PaxInfo
): ItineraryService => {
    let cost = 0;
    let name = '';
    let meta = {};

    if (type === 'ACTIVITY') {
        const act = item as Activity;
        name = act.activityName;
        cost = (act.costAdult * pax.adults) + (act.costChild * pax.children);
        meta = { type: act.activityType };
    } else {
        const trf = item as Transfer;
        name = trf.transferName;
        // Simple logic: if per vehicle, assume 1 vehicle for now or max pax logic
        if (trf.costBasis === 'Per Vehicle') {
             const totalPax = pax.adults + pax.children;
             const vehicles = Math.ceil(totalPax / trf.maxPassengers);
             cost = trf.cost * vehicles;
        } else {
             cost = trf.cost * (pax.adults + pax.children);
        }
        meta = { vehicle: trf.vehicleType };
    }

    return {
        id: item.id,
        type: type,
        name: name,
        cost: cost,
        price: cost, // B2B Price same as cost initially
        isRef: false,
        meta: meta
    };
};
