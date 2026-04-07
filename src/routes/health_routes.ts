import { Router } from 'express';
import { healthCheck } from '../controllers/health_controller';

const router = Router();
router.get('/', healthCheck);

export default router;