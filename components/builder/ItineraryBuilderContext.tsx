
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

// --- TYPES ---
export interface BuilderService {
  id: string; // Temp ID for UI
  inventory_id?: string;
  type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'CUSTOM';
  name: string;
  description?: string;
  // Prices in frontend are for DISPLAY ESTIMATION ONLY. 
  // Backend is source of truth.
  estimated_cost: number; 
  currency: string;
  
  // Quantities
  quantity: number; // e.g. Rooms, Vehicles, Pax
  nights?: number; // Only for Hotels
  
  meta?: any;
  selling_price?: number; // Populated by backend calc
}

export interface BuilderDay {
  id: string; // Temp ID
  day_number: number;
  destination_id: string; // City
  title: string;
  services: BuilderService[];
}

interface BuilderState {
  days: BuilderDay[];
  totalPrice: number; // Selling Price
  netCost: number;    // B2B Agent Cost (New)
  currency: string;
  isCalculating: boolean;
  isSaving: boolean;
  paxCount: number;
  markupPercent: number; // Added to state
}

// --- ACTIONS ---
type Action = 
  | { type: 'INIT_DAYS'; payload: { days: number, destination_id: string } }
  | { type: 'ADD_SERVICE'; payload: { dayId: string, service: BuilderService } }
  | { type: 'REMOVE_SERVICE'; payload: { dayId: string, serviceId: string } }
  | { type: 'UPDATE_SERVICE'; payload: { dayId: string, serviceId: string, updates: Partial<BuilderService> } }
  | { type: 'SET_PRICE'; payload: { total: number, net: number, currency: string, line_items?: any[] } }
  | { type: 'SET_PAX'; payload: number }
  | { type: 'SET_MARKUP'; payload: number }
  | { type: 'SET_CALCULATING'; payload: boolean };

const initialState: BuilderState = {
  days: [],
  totalPrice: 0,
  netCost: 0,
  currency: 'INR', // Default to INR
  isCalculating: false,
  isSaving: false,
  paxCount: 2,
  markupPercent: 10
};

const reducer = (state: BuilderState, action: Action): BuilderState => {
  switch (action.type) {
    case 'INIT_DAYS':
      const newDays = Array.from({ length: action.payload.days }, (_, i) => ({
        id: `day_${Date.now()}_${i}`,
        day_number: i + 1,
        destination_id: action.payload.destination_id,
        title: `Day ${i + 1}`,
        services: []
      }));
      return { ...state, days: newDays };

    case 'ADD_SERVICE':
      return {
        ...state,
        days: state.days.map(d => 
          d.id === action.payload.dayId 
            ? { ...d, services: [...d.services, action.payload.service] }
            : d
        )
      };

    case 'REMOVE_SERVICE':
      return {
        ...state,
        days: state.days.map(d => 
          d.id === action.payload.dayId
            ? { ...d, services: d.services.filter(s => s.id !== action.payload.serviceId) }
            : d
        )
      };

    case 'UPDATE_SERVICE':
      return {
        ...state,
        days: state.days.map(d => 
          d.id === action.payload.dayId
            ? { 
                ...d, 
                services: d.services.map(s => s.id === action.payload.serviceId ? { ...s, ...action.payload.updates } : s)
              }
            : d
        )
      };

    case 'SET_PRICE':
      return {
        ...state,
        totalPrice: action.payload.total,
        netCost: action.payload.net,
        currency: action.payload.currency,
      };

    case 'SET_PAX':
        return { ...state, paxCount: action.payload };

    case 'SET_MARKUP':
        return { ...state, markupPercent: action.payload };

    case 'SET_CALCULATING':
        return { ...state, isCalculating: action.payload };

    default:
      return state;
  }
};

const BuilderContext = createContext<{
  state: BuilderState;
  initDestination: (days: number, destId: string) => void;
  addService: (dayId: string, service: BuilderService) => void;
  removeService: (dayId: string, serviceId: string) => void;
  updateService: (dayId: string, serviceId: string, updates: Partial<BuilderService>) => void;
  setPaxCount: (count: number) => void;
  setMarkup: (percent: number) => void;
  saveItinerary: (title: string, destinationSummary: string, travelDate: string) => Promise<void>;
} | undefined>(undefined);

export const ItineraryBuilderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Initialize Markup from User Defaults
  useEffect(() => {
    if (user?.agentBranding?.defaultMarkup) {
        dispatch({ type: 'SET_MARKUP', payload: user.agentBranding.defaultMarkup });
    }
  }, [user]);

  // Auto-Calculate Effect
  useEffect(() => {
    if (state.days.length > 0) {
        dispatch({ type: 'SET_CALCULATING', payload: true });
        
        // Payload strictly sends IDs and Quantities. Backend does the math.
        const payload = {
            days: state.days.map(d => ({
                day_number: d.day_number,
                services: d.services.map(s => ({
                    inventory_id: s.inventory_id,
                    type: s.type,
                    quantity: s.quantity,
                    nights: s.nights,
                    // Send custom cost for ALL items as fallback if inventory lookup fails
                    cost: s.estimated_cost,
                    currency: s.currency
                }))
            })),
            pax: state.paxCount,
            currency: state.currency,
            markup: state.markupPercent
        };

        apiClient.request('/builder/calculate', {
            method: 'POST',
            body: JSON.stringify(payload)
        }).then((res: any) => {
            dispatch({ 
                type: 'SET_PRICE', 
                payload: { 
                    total: res.selling_price, 
                    net: res.net_cost, 
                    currency: res.currency, 
                    line_items: res.line_items 
                } 
            });
        }).finally(() => {
            dispatch({ type: 'SET_CALCULATING', payload: false });
        });
    }
  }, [state.days, state.paxCount, state.currency, state.markupPercent]);

  const initDestination = (days: number, destId: string) => {
    dispatch({ type: 'INIT_DAYS', payload: { days, destination_id: destId } });
  };

  const addService = (dayId: string, service: BuilderService) => {
    dispatch({ type: 'ADD_SERVICE', payload: { dayId, service } });
  };

  const removeService = (dayId: string, serviceId: string) => {
    dispatch({ type: 'REMOVE_SERVICE', payload: { dayId, serviceId } });
  };

  const updateService = (dayId: string, serviceId: string, updates: Partial<BuilderService>) => {
    dispatch({ type: 'UPDATE_SERVICE', payload: { dayId, serviceId, updates } });
  };

  const setPaxCount = (count: number) => {
      dispatch({ type: 'SET_PAX', payload: count });
  };

  const setMarkup = (percent: number) => {
      dispatch({ type: 'SET_MARKUP', payload: percent });
  };

  const saveItinerary = async (title: string, destinationSummary: string, travelDate: string) => {
      // Map state days to backend expected structure (specifically estimated_cost -> cost)
      const daysPayload = state.days.map(d => ({
        ...d,
        services: d.services.map(s => ({
            ...s,
            cost: s.estimated_cost // Ensure backend gets 'cost' key
        }))
      }));

      await apiClient.request('/builder/save', {
          method: 'POST',
          body: JSON.stringify({
              title,
              destination_summary: destinationSummary,
              travel_date: travelDate,
              pax: state.paxCount,
              days: daysPayload,
              currency: state.currency,
              markup: state.markupPercent
          })
      });
  };

  return (
    <BuilderContext.Provider value={{ state, initDestination, addService, removeService, updateService, setPaxCount, setMarkup, saveItinerary }}>
      {children}
    </BuilderContext.Provider>
  );
};

export const useBuilder = () => {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error("useBuilder must be used within ItineraryBuilderProvider");
  return ctx;
};
