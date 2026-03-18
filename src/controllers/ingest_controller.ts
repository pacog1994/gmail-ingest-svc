
import { Controller } from "./types";
import { GmailClient } from "../gmail/gmailClient";
import { NormalizedAttachment, NormalizedEmail } from "../models/normalized/email";
import KafkaProducer from "../kafka-producer";
import { getLastMessageIdFromCache, setLastMessageIdWithCache } from "../cache/historyIdStore";
import { NormalizedThread } from "../models/normalized/thread";

// Helper to normalize a Gmail message (basic, can be extended)
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
        attachments: [], // TODO: fill in with attachment fetching
        textBody: undefined, // TODO: extract text
        htmlBody: undefined // TODO: extract html
    };
}

function normalizeThread(thread: any): NormalizedThread {
    return {} as NormalizedThread; // Placeholder, implement as needed
}

function normalizeAttachments(attachments: any): NormalizedAttachment[] {
    return [] as NormalizedAttachment[]; // Placeholder, implement as needed
}

export const ingestCheck: Controller = async (req, res) => {
    try {
        const client = GmailClient();
        let lastHistoryId = getLastMessageIdFromCache();
        if (!lastHistoryId) {
            // No historyId, get from profile
            const profile = await client.users.getProfile({ userId: 'me' });
            if (profile.data.historyId) {
                setLastMessageIdWithCache(profile.data.historyId.toString());
                lastHistoryId = profile.data.historyId.toString();
            } else {
                res.status(500).json({ error: 'Could not get initial historyId' });
                return;
            }
        }

        // Get history delta since lastHistoryId
        const historyDelta = await client.users.history.list({
            userId: 'me',
            startHistoryId: lastHistoryId,
            historyTypes: ['messageAdded'],
            maxResults: 20
        });

        // Get added message IDs from history delta 
        const history = historyDelta.data.history ?? [];
        const addedMessages: string[] = [];
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

        // Optionally overwrite stored historyId to the latest based off successful retrievals of new messages
        if (normalizedEmails.length > 0 && historyDelta.data.historyId) {
            setLastMessageIdWithCache(historyDelta.data.historyId.toString(), true);
        }
        const producer = new KafkaProducer();
        await producer.connect();
        await producer.send('gmail.emails', normalizedEmails)
        await producer.disconnect();
        res.status(200).json({ emails: normalizedEmails });
    } catch (error) {
        console.error("Error accessing Gmail API:", error);
        res.status(500).json({ error: 'Gmail ingest failed', details: error?.toString() });
    }
}