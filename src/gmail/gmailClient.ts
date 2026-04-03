import { google, gmail_v1 } from "googleapis";
import { getOAuth2Client } from "./auth/gmailAuth";

export const GmailClient = (): gmail_v1.Gmail => {
    const oauth2Client = getOAuth2Client();
    google.options({ auth: oauth2Client });
    return google.gmail({ version: 'v1', auth: oauth2Client });
}