export interface EmailAddress {
    name?: string;
    address: string;
}

export interface NormalizedAttachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    data?: string;
}

export interface NormalizedEmail {
    id: string;
    threadId: string;
    from?: EmailAddress;
    to?: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    subject?: string;
    snippet?: string;
    receivedAt?: string;
    labels?: string[];
    hasAttachments: boolean;
    attachments?: NormalizedAttachment[];
    textBody?: string;
    htmlBody?: string;
}