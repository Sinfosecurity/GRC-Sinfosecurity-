import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { providerHealth } from '../services/providerHealth';

const router = Router();
router.use(authenticate);

router.get('/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await providerHealth();
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

export default router;
