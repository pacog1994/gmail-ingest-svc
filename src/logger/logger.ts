import { pino, Logger } from "pino";
import packageInfo from "../../package.json";
import { asyncStore } from "./async-context";

export const pinoconfig = pino({
    level: process.env.LOG_LEVEL || "info",
    base: {
        service: "gmail-ingest-svc",
        version: packageInfo.version
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: process.env.NODE_ENV === "production" ? undefined
        : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname"
            }
        }
});

export const logger = new Proxy(pinoconfig, {
    get(target, prop: keyof Logger) {
        const storeLogger = asyncStore.getStore()?.logger;
        return storeLogger?.[prop] ?? target[prop]
    }
});