import dotenv from "dotenv";
import express from "express";
//dependency imports
import { initDB } from "./db/email_sqlite";
import { buildKafka, getKafkaProducer } from "./kafka/kafka-producer";
//routes
import ingestRoutes from './routes/ingest_routes';
import healthRoutes from './routes/health_routes';
//logger
import { randomUUID } from "crypto";
import { logger, pinoconfig } from "./logger/logger";
import { asyncStore } from "./logger/async-context";

dotenv.config();

async function main() {

    const app = express();
    const PORT = Number(process.env.PORT) || 3000;

    app.use((req, res, next) => {
        const requestId = randomUUID();
        // Store requestID in context map for logging in downstream calls
        asyncStore.run({ requestId, logger: pinoconfig.child({ requestId }) }, () => {
            next();
        })
    })

    //Build connections to service dependencies
    await initDB();
    await buildKafka();

    app.use('/health', healthRoutes);
    app.use('/ingest', ingestRoutes);

    const server = app.listen(PORT, '127.0.0.1', () => {
        logger.info({ event: `gmail-ingest-svc is running on port ${PORT}` });
    });

    const shutdown = async () => {
        logger.info({ event: "Shutting down gmail-inget-svc..." });

        try {
            const producer = getKafkaProducer();
            await producer.disconnect();
            logger.info({ event: "Kafka producer disconnected" });
        } catch (err) {
            logger.error({ event: "Error disconnecting Kafka producer: ", error: err });
        }

        try {
            server.close(() => {
                logger.info({ event: "express server closed" });
            });
            process.exit(0);
        } catch (err) {
            logger.error({ event: "Error shutting down express server: ", error: err });
            process.exit(1);
        }
    }

    //event listeners for shutdown signals
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch(err => {
    logger.error({ event: "Error starting the service: ", error: err });
    process.exit(1);
})

