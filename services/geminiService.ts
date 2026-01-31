import { GoogleGenAI } from "@google/genai";

// Helper to safely get the AI instance only when needed to avoid init errors if key is missing
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be simulated.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateItinerary = async (
    destination: string, 
    duration: string, 
    type: string,
    travelDate: string,
    hotelCategory: string,
    preferences: string
): Promise<string> => {
  const client = getAIClient();
  
  if (!client) {
    // Fallback simulation if no API key
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`[SIMULATED AI RESPONSE]\n\n**Trip to ${destination} (${duration})**\n*Starts: ${travelDate} | Style: ${type} | Hotel: ${hotelCategory}*\n\n**Day 1: Arrival & Relax**\n- Arrive in ${destination}.\n- Private transfer to your ${hotelCategory} hotel.\n- Evening leisure time.\n\n**Day 2: City Highlights**\n- Full day tour covering major landmarks.\n- Focus on: ${preferences || 'General Sightseeing'}.\n\n**Day 3: Cultural Immersion**\n- Visit local markets and historical sites.\n\n(Add API_KEY to environment to see real Gemini output)`);
      }, 1500);
    });
  }

  try {
    const prompt = `
      Act as a B2B Travel Expert. Create a detailed, day-by-day itinerary summary for a trip to ${destination}.
      
      **Trip Parameters:**
      - Duration: ${duration}
      - Start Date: ${travelDate}
      - Trip Style: ${type}
      - Hotel Standard: ${hotelCategory}
      - Specific Client Interests/Preferences: ${preferences || 'Standard highlights'}

      **Output Requirements:**
      - Provide a structured "Day X: Title" format.
      - Under each day, provide 2-3 bullet points of activities.
      - Ensure the activities align with the requested "${type}" style and "${preferences}".
      - Keep the tone professional and sales-oriented.
      - Do not include pricing, just the plan.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No content generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating itinerary. Please try again later.";
  }
};