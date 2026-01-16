
import { useState, useEffect, useMemo } from 'react';
import { PricingInput, PricingBreakdown, PricingRule } from '../types';
import { calculateQuotePrice } from '../utils/pricingEngine';

const DEFAULT_RULES: PricingRule = {
  id: 'default',
  name: 'Standard',
  markupType: 'Percentage',
  companyMarkup: 10,
  agentMarkup: 10,
  gstPercentage: 5,
  roundOff: 'Nearest 10',
  isActive: true
};

const DEFAULT_INPUT: PricingInput = {
  targetCurrency: 'USD',
  travelers: { adults: 2, children: 0, infants: 0 },
  hotel: { nights: 3, cost: 0, costType: 'Per Room', rooms: 1, currency: 'USD' },
  transfers: [],
  activities: [],
  visa: { costPerPerson: 0, enabled: false, currency: 'USD' },
  rules: DEFAULT_RULES
};

export const usePricingEngine = (initialInput?: Partial<PricingInput>) => {
  const [input, setInput] = useState<PricingInput>({
    ...DEFAULT_INPUT,
    ...initialInput
  });

  const [breakdown, setBreakdown] = useState<PricingBreakdown | null>(null);

  // Auto-calculate whenever input changes
  useEffect(() => {
    const result = calculateQuotePrice(input);
    setBreakdown(result);
  }, [input]);

  // Actions to update specific parts of the input
  const updateTravelers = (field: keyof typeof input.travelers, value: number) => {
    setInput(prev => ({
      ...prev,
      travelers: { ...prev.travelers, [field]: value }
    }));
  };

  const updateHotel = (field: keyof typeof input.hotel, value: any) => {
    setInput(prev => ({
      ...prev,
      hotel: { ...prev.hotel, [field]: value }
    }));
  };

  const updateRules = (field: keyof typeof input.rules, value: any) => {
    setInput(prev => ({
      ...prev,
      rules: { ...prev.rules, [field]: value }
    }));
  };

  return {
    input,
    setInput,
    breakdown,
    updateTravelers,
    updateHotel,
    updateRules
  };
};
