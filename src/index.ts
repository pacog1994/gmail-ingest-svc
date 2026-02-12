import dotenv from "dotenv";
import express from "express";
import { getGmailClient } from "./gmail/gmailClient";
import ingestRoutes from './routes/ingest_routes';
import healthRoutes from './routes/health_routes';
import eventRoutes from './routes/events_routes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const gmail = getGmailClient();

let ghistoryId: string | undefined

function getLastMessageId(): string | undefined {
    return ghistoryId
}

function setLastMessageId(id: string) {
    ghistoryId = id
}

app.use('/health', healthRoutes);
app.use('/ingest', ingestRoutes);
app.use('/events', eventRoutes);

// app.use('/profile', async (req, res) => {
//     try {
//         gmail.users.getProfile({ userId: 'me' })
//             .then(response => {
//                 const { historyId } = response.data;
//                 console.log("Profile Data\n", response.data)
//                 if (historyId) {
//                     setLastMessageId(historyId);
//                 }
//                 res.json(response.data)
//             });
//     } catch (error) {
//         console.error("Error accessing Gmail API:", error);
//     }
// })

// app.use('/history', async (req, res) => {
//     try {
//         const startHistoryId = getLastMessageId();
//         const response = await gmail.users.history.list({
//             labelId: 'INBOX',
//             maxResults: 20,
//             userId: 'me',
//             startHistoryId: "10123973",
//             historyTypes: ['messageAdded']
//         })

//         const history = response.data.history ?? []

//         console.log("History List Data\n", response.data)
//         res.json(history)

//     } catch (error) {
//         console.error(`Error getting history with ${getLastMessageId()}:`);
//     }
// });

app.listen(PORT, '127.0.0.1', () => {
    console.log(`gmail-ingest-svc is running on port ${PORT}`);
});

