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

export const generateItinerary = async (destination: string, duration: string, type: string): Promise<string> => {
  const client = getAIClient();
  
  if (!client) {
    // Fallback simulation if no API key
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`[SIMULATED AI RESPONSE]\n\n**Day 1: Arrival in ${destination}**\n- Airport pickup and transfer to hotel.\n- Evening at leisure.\n\n**Day 2: City Tour**\n- Visit major landmarks.\n\n(Add API_KEY to environment to see real Gemini output)`);
      }, 1500);
    });
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a brief, professional B2B travel itinerary for ${destination}. Duration: ${duration}. Type: ${type}. Format with markdown bold headers for days. Keep it concise.`,
    });
    return response.text || "No content generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating itinerary. Please try again later.";
  }
};
