import { google, gmail_v1 } from "googleapis";
import { getOAuth2Client } from "./auth/gmailAuth";
import { logger } from "../logger/logger";

export const GmailClient = (): gmail_v1.Gmail => {
    logger.debug({ event: "Initializing Gmail API client" });
    const oauth2Client = getOAuth2Client();
    google.options({ auth: oauth2Client });
    return google.gmail({ version: 'v1', auth: oauth2Client });
}