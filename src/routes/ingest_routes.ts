import { Router } from 'express';
import { ingestCheck } from '../controllers/ingest_controller';

const router = Router();
router.get('/', ingestCheck);

export default router;