
import { CityVisit } from '../types';

interface RouteNode {
  cityId: string;
  keywords: string[]; // For soft matching if IDs change
  isHub: boolean;
  connectedTo: string[]; // Adjacency list (City IDs)
  region: 'Thailand' | 'UAE' | 'Vietnam' | 'Other';
}

// Hardcoded Knowledge Graph for Demo
// In production, this would come from a geospatial DB
const ROUTE_GRAPH: RouteNode[] = [
  // UAE
  { cityId: 'd1', keywords: ['Dubai'], isHub: true, connectedTo: ['d4'], region: 'UAE' }, // Dubai -> Abu Dhabi
  { cityId: 'd4', keywords: ['Abu Dhabi'], isHub: false, connectedTo: ['d1'], region: 'UAE' },

  // Thailand
  { cityId: 'd3', keywords: ['Bangkok'], isHub: true, connectedTo: ['d5', 'd2', 'd6'], region: 'Thailand' }, // BKK connects to Pattaya, Phuket, Krabi
  { cityId: 'd5', keywords: ['Pattaya'], isHub: false, connectedTo: ['d3'], region: 'Thailand' }, // Pattaya -> BKK
  { cityId: 'd2', keywords: ['Phuket'], isHub: true, connectedTo: ['d6', 'd3'], region: 'Thailand' }, // Phuket -> Krabi, BKK
  { cityId: 'd6', keywords: ['Krabi'], isHub: false, connectedTo: ['d2', 'd3'], region: 'Thailand' }, // Krabi -> Phuket, BKK

  // Vietnam
  { cityId: 'd7', keywords: ['Ha Noi'], isHub: true, connectedTo: ['d8', 'd9', 'd10'], region: 'Vietnam' },
  { cityId: 'd8', keywords: ['Ha Long'], isHub: false, connectedTo: ['d7'], region: 'Vietnam' },
  { cityId: 'd9', keywords: ['Da Nang'], isHub: true, connectedTo: ['d7', 'd10'], region: 'Vietnam' },
  { cityId: 'd10', keywords: ['Ho Chi Minh', 'Saigon'], isHub: true, connectedTo: ['d9'], region: 'Vietnam' },
];

export const citySequenceAI = {
  
  optimizeRoute(currentVisits: CityVisit[]): { sorted: CityVisit[], reasoning: string[], score: number, isDifferent: boolean } {
    if (currentVisits.length <= 1) {
      return { sorted: currentVisits, reasoning: [], score: 100, isDifferent: false };
    }

    const originalIds = currentVisits.map(v => v.cityId);
    let score = 0;
    const reasoning: string[] = [];
    const sortedVisits: CityVisit[] = [];
    
    // 1. Identify Region & Hubs
    const activeNodes = currentVisits.map(v => 
      ROUTE_GRAPH.find(n => n.cityId === v.cityId || n.keywords.some(k => v.cityName.includes(k)))
    ).filter(n => n !== undefined) as RouteNode[];

    // If we don't have graph data for these cities, return as is
    if (activeNodes.length === 0) {
      return { sorted: currentVisits, reasoning: ['No route data available for optimization.'], score: 0, isDifferent: false };
    }

    // 2. Algorithm: Find the best starting point (Hub)
    // Preference: Capital/Hub > Others
    let startNode = activeNodes.find(n => n.isHub) || activeNodes[0];
    
    // Heuristic: If "Bangkok" is present, it's usually the start or end. Let's make it start for B2B standard.
    const capital = activeNodes.find(n => n.keywords.some(k => ['Bangkok', 'Dubai', 'Ha Noi'].includes(k)));
    if (capital) {
        startNode = capital;
        score += 20;
        reasoning.push(`Starting with major hub: ${capital.keywords[0]}`);
    }

    // 3. Build Route using Nearest Neighbor / Connectivity
    const remainingIds = new Set(originalIds);
    let currentNodeId = startNode.cityId;
    
    // Add Start
    const startVisit = currentVisits.find(v => v.cityId === currentNodeId);
    if(startVisit) {
        sortedVisits.push(startVisit);
        remainingIds.delete(currentNodeId);
    }

    while (remainingIds.size > 0) {
        const currentNode = ROUTE_GRAPH.find(n => n.cityId === currentNodeId);
        
        // Find best next step from remaining
        let bestNextId: string | null = null;

        // Priority 1: Direct Connection in Graph
        if (currentNode) {
            const directConnection = Array.from(remainingIds).find(id => currentNode.connectedTo.includes(id));
            if (directConnection) {
                bestNextId = directConnection;
                score += 15;
                reasoning.push(`Smart Connect: ${getCityName(currentVisits, currentNodeId)} → ${getCityName(currentVisits, bestNextId)}`);
            }
        }

        // Priority 2: If no direct connection, just pick the next available (greedy fallback)
        if (!bestNextId) {
            bestNextId = Array.from(remainingIds)[0];
            score -= 5; // Penalty for disjoint jump
        }

        if (bestNextId) {
            const nextVisit = currentVisits.find(v => v.cityId === bestNextId);
            if(nextVisit) {
                sortedVisits.push(nextVisit);
                remainingIds.delete(bestNextId);
                currentNodeId = bestNextId;
            } else {
                break; // Should not happen
            }
        } else {
            break;
        }
    }

    // 4. Check Difference
    const isDifferent = JSON.stringify(originalIds) !== JSON.stringify(sortedVisits.map(v => v.cityId));
    
    if (!isDifferent) {
        reasoning.push("Current route is already optimal.");
        score = 100;
    }

    return { sorted: sortedVisits, reasoning, score, isDifferent };
  }
};

// Helper
function getCityName(visits: CityVisit[], id: string) {
    return visits.find(v => v.cityId === id)?.cityName || id;
}
