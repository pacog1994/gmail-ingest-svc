import { NormalizedEmail } from "../normalized/email";

export interface IngestEvent {
    type: "EMAIL_INGESTED"
    gmailHistoryId: string;
    email?: NormalizedEmail
    metadata: {
        ingestedAt: string;
        source: "gmail-ingest-svc";
        version: string;
    }
}
