import { google } from "googleapis";
import { getOAuth2Client } from "./auth/gmailAuth";

export function getGmailClient() {
    const oauth2Client = getOAuth2Client();
    google.options({ auth: oauth2Client });
    return google.gmail({ version: 'v1', auth: oauth2Client });
}