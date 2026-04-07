import "express"

declare module "express-serve-static-core" {
    interface Request {
        logger: import("pino").Logger;
    }
}