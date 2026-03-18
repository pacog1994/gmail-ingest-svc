import { Controller } from "./types";

export const healthCheck: Controller = (req, res) => {
    res.status(200).json({ status: "ok", service: "gmail-ingest-svc" });
};
