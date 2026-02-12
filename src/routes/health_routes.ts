import { Router } from 'express';


const router = Router();
router.get('/', (req, res) => { res.status(200).json({ status: "ok", service: "gmail-ingest-svc" }) });

export default router;