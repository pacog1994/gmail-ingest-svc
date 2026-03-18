import { google } from "googleapis";
import { getOAuth2Client } from "./auth/gmailAuth";

export const GmailClient = () => {
    const oauth2Client = getOAuth2Client();
    google.options({ auth: oauth2Client });
    return google.gmail({ version: 'v1', auth: oauth2Client });
}