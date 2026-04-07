import { Controller } from "./types";
import packageInfo from "../../package.json";
import { gmail_v1 } from "googleapis";
import { GmailClient } from "../gmail/gmailClient";
import { NormalizedEmail } from "../models/normalized/email";
import { IngestEvent } from "../models/events/event";
import { getKafkaProducer } from "../kafka/kafka-producer";
import { isProcessed, markProcessed, getLastHistoryId, updateLastHistoryId } from "../db/email_sqlite";
import { logger } from "../logger/logger";

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
 * Fetch history delta since last history id
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
        logger.error({ event: `Error fetching history delta with startHistoryId: ${startHistoryId}`, error });
        return undefined;
    }
}

/**
 * Extracts and normalizes new messages from Gmail history delta
 * @param history the history delta array from Gmail API response
 * @returns array of history emails from Category.Primary
 */
async function extractHistoryEmails(history: gmail_v1.Schema$History[] | undefined) {
    logger.debug({ event: "Extracting emails from gmail history delta" })
    try {
        const addedMessages: string[] = [];
        if (!history) return [];
        for (const h of history) {
            if (h.messagesAdded) {
                for (const m of h.messagesAdded) {
                    if (m.message && m.message.id) {
                        if (await isProcessed(m.message.id)) { continue; }
                        addedMessages.push(m.message.id);
                    }
                }
            }
        }
        // Retrieve and normalize each new message found via added message IDs
        const emails: NormalizedEmail[] = [];

        for (const messageId of addedMessages) {
            const msgResp = await client.users.messages.get({ userId: 'me', id: messageId });
            await markProcessed(messageId)
            emails.push(normalizeMessage(msgResp.data));
        }
        return emails;
    } catch (error) {
        logger.error({ event: "Error extracting normalized emails:", error });
        return [];
    }
}

async function extractUpdateEmails() {
    logger.debug({ event: "Extracting emails from gmail update" })
    try {
        const list = await client.users.messages.list({
            userId: 'me',
            'labelIds': ['CATEGORY_UPDATES'],
            maxResults: 50
        })

        const emails: NormalizedEmail[] = [];
        if (list.data && list.data.messages) {
            for (const msg of list.data.messages) {
                const id = msg.id;
                if (!id) { continue; }
                if (await isProcessed(id)) { continue; }
                const msgResp = await client.users.messages.get({ userId: 'me', id });
                await markProcessed(id);
                emails.push(normalizeMessage(msgResp.data));
            }
        }
        return emails;
    } catch (error) {
        logger.error({ event: "email_extraction_failed", error });
        return [];
    }
}

/**
 * Handler function to send emails to Kafka topic for downstream processing
 * @param emails array of normalized emails to send
 * @param lastHistoryId the latest history ID
 * @returns boolean indicating success or failure of send operation
 */
async function sendEmail(emails: NormalizedEmail[], lastHistoryId: string): Promise<boolean> {
    try {
        if (emails.length === 0) {
            // no new emails to send
            return true
        }

        const producer = getKafkaProducer();

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

        await producer.send({
            topic: "gmail.emails",
            messages: events.map(event => ({ value: JSON.stringify(event) }))
        })

        logger.info({ event: "kafka_send_success", count: events.length });
        return true;
    } catch (error) {
        logger.error({ event: "kafka_send_failed", error });
        return false;
    }

}

export const ingestCheck: Controller = async (req, res) => {
    try {
        let lastHistoryId = await getLastHistoryId();

        // if first run, get history id from profile and save it
        if (lastHistoryId === "0") {
            lastHistoryId = await fetchLastHistoryIdFromProfile();
            await updateLastHistoryId(lastHistoryId);
        }

        // Get history delta since lastHistoryId
        const historyDelta = await fetchHistoryDelta(lastHistoryId);
        // Get added message IDs from history delta 
        const history = historyDelta?.history ?? [];

        const historyEmails = await extractHistoryEmails(history);

        // If we got new emails, update lastHistoryId
        if (historyEmails.length > 0 && historyDelta?.historyId) {
            await updateLastHistoryId(historyDelta?.historyId.toString());
        }

        const updateEmails = await extractUpdateEmails();
        const normalizedEmails = [...historyEmails, ...updateEmails];

        const sendResult = await sendEmail(normalizedEmails, lastHistoryId);
        res.status(sendResult ? 200 : 500).json(normalizedEmails);


    } catch (error) {
        logger.error({ event: "Error accessing Gmail API:", error });
        res.status(500).json({ error: 'Gmail ingest failed', details: error?.toString() });
    }
}