import { Kafka } from 'kafkajs';

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

    async send(topic: string, messages: any[]) {
        await this.producer.send({
            topic,
            messages: messages.map(msg => ({ value: JSON.stringify(msg) }))
        });
    }

    async disconnect() {
        await this.producer.disconnect();
    }
}

export default KafkaProducer;