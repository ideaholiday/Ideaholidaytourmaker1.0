
import { GoogleGenAI } from "@google/genai";
import * as functions from 'firebase-functions';

// Initialize Gemini
// Note: Ensure your Google Cloud Project has Vertex AI API enabled or use an API Key
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || functions.config().gemini?.key });

export const generateEmailContent = async (
    type: 'BOOKING_CONFIRMATION' | 'PAYMENT_RECEIPT' | 'QUOTE',
    data: any
): Promise<{ subject: string; email_body_html: string }> => {
    
    // Sanitize data to ensure we don't send huge objects or circular refs to AI
    const safeData = {
        uniqueRefNo: data.uniqueRefNo || 'N/A',
        agentName: data.agentName || 'Partner',
        destination: data.destination || 'Destination',
        travelDate: data.travelDate,
        paxCount: data.paxCount,
        sellingPrice: data.sellingPrice, // Client view price
        currency: data.currency,
        status: data.status,
        serviceDetails: data.serviceDetails || (data.itinerary ? `${data.itinerary.length} Days Trip` : ''),
        companyName: data.companyName || 'Travel Agency'
    };

    const contextStr = JSON.stringify(safeData, null, 2);

    const prompt = `
    You are an email content generator for "Idea Holiday Pvt Ltd.", a B2B travel platform.
    Platform Name: Idea Tour Maker.
    Website: https://b2b.ideaholiday.com
    
    TASK: Generate a professional transactional email for a B2B Travel Agent.
    TYPE: ${type}

    DATA CONTEXT:
    ${contextStr}

    STRICT RULES:
    1. Return output ONLY in valid JSON format.
    2. JSON keys: "subject", "email_body_html".
    3. Content must be professional, polite, and clear.
    4. "email_body_html" must be valid HTML with inline CSS for basic styling.
    5. Signature: 
       <br><br>
       Regards,<br>
       Team Idea Holiday<br>
       info@ideaholiday.com
    `;

    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text; 
        
        if (!text) throw new Error("Empty response from AI");

        // Parse JSON
        return JSON.parse(text);

    } catch (error) {
        console.error("AI Email Generation Failed:", error);
        
        // Fallback if AI fails so the email still sends
        return {
            subject: `Update: Booking #${safeData.uniqueRefNo}`,
            email_body_html: `
                <p>Dear ${safeData.agentName},</p>
                <p>This is an automated update regarding booking <strong>${safeData.uniqueRefNo}</strong> for ${safeData.destination}.</p>
                <p>Status: ${safeData.status}</p>
                <p>Please log in to your dashboard for full details.</p>
                <br>
                Team Idea Holiday
            `
        };
    }
};
