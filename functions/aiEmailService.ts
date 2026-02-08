
import { GoogleGenAI } from "@google/genai";
import * as functions from 'firebase-functions';

// Initialize Gemini
// Note: Ensure your Google Cloud Project has Vertex AI API enabled or use an API Key
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || functions.config().gemini?.key });

export const generateEmailContent = async (
    type: 'BOOKING_CONFIRMATION' | 'PAYMENT_RECEIPT' | 'QUOTE',
    data: any
): Promise<{ subject: string; email_body_html: string }> => {
    
    const contextStr = JSON.stringify(data, null, 2);

    const prompt = `
    You are an email content generator for a professional travel technology platform called "Idea Tour Maker", operated by "Idea Holiday Pvt Ltd.".

    Company Details:
    - Legal Name: Idea Holiday Pvt Ltd.
    - Platform Name: Idea Tour Maker
    - Website: https://b2b.ideaholiday.com
    - Official Email (sender): info@ideaholiday.com

    Your role:
    - Generate professional, clear, and trustworthy TRANSACTIONAL emails
    - Tone must be premium, polite, reliable, and business-friendly
    - Context: Generating a ${type} email.

    Data Context:
    ${contextStr}

    STRICT RULES:
    1. Always return output ONLY in valid JSON.
    2. JSON must contain exactly two keys: "subject" and "email_body_html".
    3. Do NOT include markdown, explanations, or extra text.
    4. Do NOT mention AI, automation, system prompts, or internal tools.
    5. Use simple, professional English.
    6. Personalize emails using provided variables in Data Context.
    7. Email body must be valid HTML (<p>, <br>, <strong>, <ul>, <li>, <table> allowed). Inline CSS is allowed for basic styling.
    8. No emojis unless explicitly requested.
    9. Keep content concise, clear, and action-oriented.
    10. End every email with this exact signature:
    <br><br>
    Team Idea Holiday<br>
    info@ideaholiday.com<br>
    <a href="https://b2b.ideaholiday.com">https://b2b.ideaholiday.com</a>
    `;

    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text();
        if (!text) throw new Error("Empty response from AI");

        // Parse JSON
        const result = JSON.parse(text);
        return result;

    } catch (error) {
        console.error("AI Email Generation Failed:", error);
        // Fallback if AI fails
        return {
            subject: `Update regarding ${data.uniqueRefNo || 'your trip'}`,
            email_body_html: `<p>Dear Partner,</p><p>Here is an update regarding your transaction. Please check your dashboard for details.</p>`
        };
    }
};
