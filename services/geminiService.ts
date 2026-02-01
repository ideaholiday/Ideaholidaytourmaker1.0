
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
        resolve(`[SIMULATED AI RESPONSE]\n\n**Trip to ${destination}**\n*Duration: ${duration} | Style: ${type} | Hotel: ${hotelCategory}*\n\n**Day 1 (${travelDate}): Arrival & Welcome**\n- Arrive in ${destination}.\n- Private transfer to your ${hotelCategory} hotel.\n- Evening leisure time to explore local surroundings.\n\n**Day 2: City Highlights & Culture**\n- Full day tour covering major landmarks tailored to a ${type} trip.\n- Special focus: ${preferences || 'General Sightseeing'}.\n\n**Day 3: Adventure & Exploration**\n- Visit local markets and historical sites.\n- Optional evening dinner cruise.\n\n**Day 4: Departure**\n- Breakfast at hotel.\n- Transfer to airport for onward journey.\n\n(Add API_KEY to environment to see real Gemini output)`);
      }, 1500);
    });
  }

  try {
    const prompt = `
      Act as a B2B Travel Expert. Create a highly detailed, day-by-day itinerary summary for a trip to ${destination}.
      
      **Trip Parameters:**
      - Duration: ${duration}
      - Start Date: ${travelDate}
      - Trip Style: ${type}
      - Hotel Standard: ${hotelCategory}
      - Specific Client Interests/Preferences: ${preferences || 'Standard highlights'}

      **Output Requirements:**
      1. **Structure:** Use the format "Day X (Date): [Title]".
      2. **Detail:** Under each day, provide 3-4 specific bullet points of activities.
      3. **Context:** Ensure the activities align with the "${type}" style. For example, if "Honeymoon", include romantic dinners/sunset views. If "Adventure", include active sports.
      4. **Dates:** Calculate the specific date for each day starting from ${travelDate}.
      5. **Tone:** Professional, exciting, and sales-oriented (ready to send to a client).
      6. **Exclusions:** Do not include prices or flight numbers.
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
