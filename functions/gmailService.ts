
import { google } from 'googleapis';
import * as functions from 'firebase-functions';
import { Buffer } from 'buffer';

// --- CONFIGURATION ---
// In production, set these via: firebase functions:config:set gmail.client_id="..." gmail.client_secret="..." gmail.refresh_token="..."
const CLIENT_ID = functions.config().gmail?.client_id || "669144046620-dr4v4553lo3nvpbus5b1b2h8h8a5uiq9.apps.googleusercontent.com";
const CLIENT_SECRET = functions.config().gmail?.client_secret || "YOUR_CLIENT_SECRET"; // Replace with actual secret in Env
const REDIRECT_URI = "https://b2b.ideaholiday.com/google/callback";
const REFRESH_TOKEN = functions.config().gmail?.refresh_token; // Critical: You must generate this once using OAuth Playground

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

if (REFRESH_TOKEN) {
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
}

export const sendGmail = async (to: string, subject: string, htmlBody: string) => {
    
    if (!REFRESH_TOKEN) {
        console.warn("Gmail Refresh Token missing. Skipping email send.");
        return;
    }

    try {
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

        // Construct MIME message
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `To: ${to}`,
            `Subject: ${utf8Subject}`,
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=utf-8",
            "",
            htmlBody
        ];
        const message = messageParts.join('\n');

        // Encode the message
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        return res.data;
    } catch (error) {
        console.error("Gmail API Error:", error);
        throw new Error("Failed to send email via Gmail API");
    }
};
