import { Message } from "../raw/messages";
import { Thread } from "../raw/threads";
import { History } from "../raw/history";
import { NormalizedEmail } from "../normalized/email";
import { NormalizedThread } from "../normalized/thread";
import { NormalizedHistoryEvent } from "../normalized/history-event";

export interface IngestEvent {
    type:
    | "EMAIL_INGESTED"
    | "THREAD_UPDATED"
    | "HISTORY_DELTA"
    | "LABELS_UPDATED";

    gmailUser: string;
    gmailHistoryId: string;

    raw?: {
        message?: Message;
        thread?: Thread;
        history?: History;
    }

    normalized?: {
        email?: NormalizedEmail
        thread?: NormalizedThread;
        histroyEvents?: Array<NormalizedHistoryEvent>;
    }

    metadata: {
        ingestedAt: string;
        source: "gmail-ingest-svc";
        version: string;
    }
}
