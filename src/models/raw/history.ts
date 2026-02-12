import { Message } from "./messages"

export interface History {
    id: string;
    messagesAdded?: Array<{ message: Message }>;
    messagesDeleted?: Array<{ message: Message }>;
    labelsAdded?: Array<{ message: Message, labelIds: Array<string> }>;
    labelsRemoved?: Array<{ message: Message, labelIds: Array<string> }>;
}