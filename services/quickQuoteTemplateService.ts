
import { QuickQuoteTemplate, QuickQuoteInputs } from '../types';

const STORAGE_KEY_QQ_TEMPLATES = 'iht_quick_quote_templates';

const SYSTEM_TEMPLATES: QuickQuoteTemplate[] = [
  {
    id: 'sys_dxb_3n',
    name: 'Dubai Quick Saver (3N)',
    description: 'Perfect for short weekend trips. Includes essential city tour.',
    destination: 'Dubai, UAE',
    nights: 3,
    defaultPax: { adults: 2, children: 0 },
    inputs: {
      hotelCategory: '3 Star',
      mealPlan: 'BB',
      transfersIncluded: true,
      sightseeingIntensity: 'Standard',
      rooms: 1,
    },
    tags: ['Budget', 'Short Trip', 'Best Seller'],
    isSystem: true,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    basePriceEstimate: 450
  },
  {
    id: 'sys_dxb_5n_fam',
    name: 'Dubai Family Fun (5N)',
    description: 'Comprehensive family package with parks and desert safari.',
    destination: 'Dubai, UAE',
    nights: 5,
    defaultPax: { adults: 2, children: 1 },
    inputs: {
      hotelCategory: '4 Star',
      mealPlan: 'HB',
      transfersIncluded: true,
      sightseeingIntensity: 'Premium',
      rooms: 1,
    },
    tags: ['Family', 'Popular'],
    isSystem: true,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    basePriceEstimate: 1200
  },
  {
    id: 'sys_thai_bkk_hkt',
    name: 'Bangkok & Phuket Combo (6N)',
    description: 'City and Beach mix. 3N BKK + 3N HKT.',
    destination: 'Thailand',
    nights: 6,
    defaultPax: { adults: 2, children: 0 },
    inputs: {
      hotelCategory: '4 Star',
      mealPlan: 'BB',
      transfersIncluded: true,
      sightseeingIntensity: 'Standard',
      rooms: 1,
    },
    tags: ['Honeymoon', 'Beach'],
    isSystem: true,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    basePriceEstimate: 800
  },
  {
    id: 'sys_maldives_lux',
    name: 'Maldives Water Villa (4N)',
    description: 'Luxury All-Inclusive resort stay with seaplane transfers.',
    destination: 'Maldives',
    nights: 4,
    defaultPax: { adults: 2, children: 0 },
    inputs: {
      hotelCategory: 'Luxury',
      mealPlan: 'AI',
      transfersIncluded: true,
      sightseeingIntensity: 'None',
      rooms: 1,
    },
    tags: ['Luxury', 'Honeymoon'],
    isSystem: true,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    basePriceEstimate: 2500
  }
];

class QuickQuoteTemplateService {
  private templates: QuickQuoteTemplate[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_QQ_TEMPLATES);
    // Merge System Templates with stored templates (which might contain admin edits or agent templates)
    // For simplicity in this mock, we assume system templates are immutable code constants unless overridden in "real" DB
    // Here we concat Agent templates from storage with System templates constant.
    const storedTemplates: QuickQuoteTemplate[] = stored ? JSON.parse(stored) : [];
    
    // Filter out old system templates from storage if we want code-first updates to persist,
    // or keep them if we allow admin edits to persist in LS.
    // Strategy: System templates in code are "defaults". Admin created ones are stored.
    this.templates = [...SYSTEM_TEMPLATES, ...storedTemplates.filter(t => !t.isSystem)];
    
    // Also add stored system templates (if Admin created new ones via UI)
    const adminCreatedSystem = storedTemplates.filter(t => t.isSystem);
    this.templates = [...this.templates, ...adminCreatedSystem];
  }

  private save() {
    // Only save non-hardcoded templates to storage
    const toSave = this.templates.filter(t => !SYSTEM_TEMPLATES.some(st => st.id === t.id));
    localStorage.setItem(STORAGE_KEY_QQ_TEMPLATES, JSON.stringify(toSave));
  }

  getAllTemplates(): QuickQuoteTemplate[] {
    return this.templates;
  }

  getSystemTemplates(): QuickQuoteTemplate[] {
    return this.templates.filter(t => t.isSystem);
  }

  getAgentTemplates(agentId: string): QuickQuoteTemplate[] {
    return this.templates.filter(t => !t.isSystem && t.createdBy === agentId);
  }

  saveTemplate(template: QuickQuoteTemplate) {
    const index = this.templates.findIndex(t => t.id === template.id);
    if (index >= 0) {
      this.templates[index] = template;
    } else {
      this.templates.unshift(template);
    }
    this.save();
  }

  deleteTemplate(id: string) {
    this.templates = this.templates.filter(t => t.id !== id);
    this.save();
  }
}

export const quickQuoteTemplateService = new QuickQuoteTemplateService();
