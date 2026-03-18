import dotenv from "dotenv";
import express from "express";
import ingestRoutes from './routes/ingest_routes';
import healthRoutes from './routes/health_routes';
import eventRoutes from './routes/events_routes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use('/health', healthRoutes);
app.use('/ingest', ingestRoutes);
app.use('/events', eventRoutes);

app.listen(PORT, '127.0.0.1', () => {
    console.log(`gmail-ingest-svc is running on port ${PORT}`);
});

