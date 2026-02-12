import { getOAuth2Client } from "./gmailAuth"

/**
 * ONE-TIME SCRIPT: use to obtain refresh token and store it in .env file
 * Generates and logs an authentication URL for the OAuth2 client
 */

const oauth2Client = getOAuth2Client()

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent'
})

console.log("Authentication URL:\n", authUrl)