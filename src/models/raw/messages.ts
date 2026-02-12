export interface Message {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    historyId: string;
    internalDate: string;
    payload: MessagePart;
    sizeEstimate: number;
    raw: string;
}

export interface MessagePart {
    partId: string;
    mimeType: string;
    filename: string;
    headers: Array<Header>;
    body: MessagePartBody;
    parts: Array<MessagePart>;
}

export interface Header {
    name: string;
    value: string;
}

export interface MessagePartBody {
    attachmentId: string;
    size: number;
    data: string;
}