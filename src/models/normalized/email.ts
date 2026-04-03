export interface EmailAddress {
    name?: string;
    address: string;
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
    textBody?: string;
    htmlBody?: string;
}