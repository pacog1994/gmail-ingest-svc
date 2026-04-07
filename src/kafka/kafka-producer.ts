import { Kafka, Producer } from 'kafkajs';
import { logger } from "../logger/logger";

let producer: Producer;

/**
 * Singleton class to manage Kafka producer connection and sending messages to Kafka topics
 */
export async function buildKafka() {
    logger.info({ event: "Initializing Kafka producer connection..." });
    if (!producer) {
        const kafka = new Kafka({
            clientId: 'ingest-controller',
            brokers: ['kafka0:29092', 'kafka1:29092', 'localhost:9092']
        });
        producer = kafka.producer();
        await producer.connect();
    }
}

export function getKafkaProducer(): Producer {
    if (!producer) {
        throw new Error("Kafka producer not intialized");
    }
    return producer;
}
