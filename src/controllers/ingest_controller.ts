
import { Controller } from "./types";
import { GmailClient } from "../gmail/gmailClient";
import { NormalizedEmail } from "../models/normalized/email";
import { IngestEvent } from "../models/events/event";
import KafkaProducer from "../kafka-producer";
import packageInfo from "../../package.json";
import { getLastMessageIdFromCache, setLastMessageIdWithCache } from "../cache/historyIdStore";
import { gmail_v1 } from "googleapis";

const client: gmail_v1.Gmail = GmailClient();

/**
 * Normalizes a gmail message to a simpler format for downstream services
 * @param message the raw message from Gmail API
 * @returns a simple email object
 */
function normalizeMessage(message: any): NormalizedEmail {
    const headers = (message.payload.headers || []).reduce((acc: any, h: any) => {
        acc[h.name.toLowerCase()] = h.value;
        return acc;
    }, {});
    return {
        id: message.id,
        threadId: message.threadId,
        from: headers['from'] ? { address: headers['from'] } : undefined,
        to: headers['to'] ? [{ address: headers['to'] }] : undefined,
        subject: headers['subject'],
        snippet: message.snippet,
        receivedAt: message.internalDate,
        labels: message.labelIds,
        hasAttachments: !!(message.payload.parts && message.payload.parts.some((p: any) => p.filename)),
        textBody: undefined, // TODO: extract text
        htmlBody: undefined // TODO: extract html
    };
}

/**
 * Fetch user's gmail profile to get last history id
 * @returns history id
 */
async function fetchLastHistoryIdFromProfile(): Promise<string> {
    const profile = await client.users.getProfile({ userId: 'me' });
    const historyId = profile.data.historyId?.toString();
    if (!historyId) {
        throw new Error('Could not get initial historyId');
    }
    return historyId;
}

/**
 * Fetch history delta since last history id to find new messaegs
 * @param startHistoryId 
 * @returns history delta response from Gmail API
 */
async function fetchHistoryDelta(startHistoryId: string): Promise<gmail_v1.Schema$ListHistoryResponse | undefined> {
    try {
        const historyDelta = await client.users.history.list({
            userId: 'me',
            startHistoryId: startHistoryId,
            historyTypes: ['messageAdded', 'labelAdded'],
            maxResults: 50
        });
        return historyDelta.data
    } catch (error) {
        console.error(`Error fetching history delta with startHistoryId: ${startHistoryId}: ${error}`);
        return undefined;
    }
}

/**
 * Extracts and normalizes new messages from Gmail history delta
 * @param history the history delta array from Gmail API response
 * @returns array of emails
 */
async function extractNormalizedEmails(history: gmail_v1.Schema$History[] | undefined) {
    try {
        const addedMessages: string[] = [];
        if (!history) return [];
        for (const h of history) {
            if (h.messagesAdded) {
                for (const m of h.messagesAdded) {
                    if (m.message && m.message.id) {
                        addedMessages.push(m.message.id);
                    }
                }
            }
        }

        // Retrieve and normalize each new message found via added message IDs
        const normalizedEmails: NormalizedEmail[] = [];

        for (const messageId of addedMessages) {
            const msgResp = await client.users.messages.get({ userId: 'me', id: messageId });
            const message = msgResp.data;
            const normalized = normalizeMessage(message);
            // TODO: fetch attachments and thread if needed
            normalizedEmails.push(normalized);
        }
        return normalizedEmails;
    } catch (error) {
        console.error("Error extracting normalized emails:", error);
        return [];
    }
}

/**
 * Handler function to send emails to Kafka topic for downstream processing
 * @param emails array of normalized emails to send
 * @returns boolean indicating success or failure of send operation
 */
async function sendEmail(emails: NormalizedEmail[]): Promise<boolean> {
    try {
        if (emails.length === 0) {
            // no new emails to send
            return true
        }

        const producer = new KafkaProducer();
        let lastHistoryId = getLastMessageIdFromCache();

        await producer.connect();

        let events: IngestEvent[] = []
        for (const email of emails) {
            const event: IngestEvent = {
                type: "EMAIL_INGESTED",
                gmailHistoryId: lastHistoryId || "",
                email: email,
                metadata: {
                    ingestedAt: new Date().toISOString(),
                    source: "gmail-ingest-svc",
                    version: packageInfo.version
                }
            };
            events.push(event);
        }
        await producer.send('gmail.emails', events)
        await producer.disconnect();
        return true;
    } catch (error) {
        console.error("Error sending emails:", error);
        return false;
    }

}

export const ingestCheck: Controller = async (req, res) => {
    try {
        let lastHistoryId = getLastMessageIdFromCache();
        if (!lastHistoryId) {
            lastHistoryId = await fetchLastHistoryIdFromProfile();
            setLastMessageIdWithCache(lastHistoryId, false);
        }

        // Get history delta since lastHistoryId
        const historyDelta = await fetchHistoryDelta(lastHistoryId);


        // Get added message IDs from history delta 
        const history = historyDelta?.history ?? [];

        const normalizedEmails = await extractNormalizedEmails(history);

        // Optionally overwrite stored historyId to the latest based off successful retrievals of new messages
        if (normalizedEmails.length > 0 && historyDelta?.historyId) {
            setLastMessageIdWithCache(historyDelta?.historyId.toString(), true);
        }

        const sendResult = await sendEmail(normalizedEmails);

        res.status(sendResult ? 200 : 500).json(normalizedEmails);


    } catch (error) {
        console.error("Error accessing Gmail API:", error);
        res.status(500).json({ error: 'Gmail ingest failed', details: error?.toString() });
    }
}