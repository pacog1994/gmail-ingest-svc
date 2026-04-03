import { Kafka } from 'kafkajs';
import { IngestEvent } from "./models/events/event";

class KafkaProducer {
    kafka: Kafka;
    producer: any;

    constructor() {
        this.kafka = new Kafka({
            clientId: 'ingest-controller',
            brokers: ['kafka0:29092', 'kafka1:29092', 'localhost:9092']
        });
        this.producer = this.kafka.producer();
    }

    async connect() {
        await this.producer.connect();
    }

    async send(topic: string, events: IngestEvent[]) {
        await this.producer.send({
            topic,
            messages: events.map(event => ({ value: JSON.stringify(event) }))
        });
    }

    async disconnect() {
        await this.producer.disconnect();
    }
}

export default KafkaProducer;