import { Message } from "./messages";

export interface Thread {
    id: string,
    historyId?: string
    messages: Array<Message>
}