/**
 * Handler to catch Google OAuth2 callback, exchange auth code for tokens, and store tokens
 */
import dotenv from "dotenv";
import express from "express";
import { getOAuth2Client } from "./gmail/auth/gmailAuth";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();

const TOKEN_PATH = path.join(__dirname, 'tokens.json');

app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code as string
    console.log(`Received Code: ${code}`)

    if (!code) {
        res.status(400).send('Missing auth code');
        return
    }

    try {
        const { tokens } = await getOAuth2Client().getToken(code);

        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2))

        res.send('Authentication successful! You can close this window.');
        console.log("Tokens stored to", TOKEN_PATH);
    } catch (error) {
        console.error('Error retrieving access token', error);
        res.status(500).send('Error retrieving access token');
    }
})

const PORT = Number(process.env.CALLBACKPORT) || 3000;

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Callback server is running on port ${PORT} `);
})
