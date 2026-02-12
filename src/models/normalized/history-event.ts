export interface NormalizedHistoryEvent {
    id: string;
    type: "MESSAGE_ADDED" | "MESSAGE_DELETED" | "LABELS_ADDED" | "LABELS_REMOVED";
    messageId: string;
    threadId: string;
    labelIds?: string[];
}