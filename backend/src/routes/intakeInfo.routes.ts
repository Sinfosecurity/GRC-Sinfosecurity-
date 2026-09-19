import { Router, Response, NextFunction } from 'express';
import { activationRateLimiter } from '../middleware/rateLimiter';
import { getPublicIntakeInfo, submitPublicIntakeInfo } from '../services/intakeEngagementService';

const router = Router();

router.get('/', activationRateLimiter, async (req, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getPublicIntakeInfo(String(req.query.token || '')) });
    } catch (error) {
        next(error);
    }
});

router.post('/respond', activationRateLimiter, async (req, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await submitPublicIntakeInfo(String(req.body?.token || req.query.token || ''), req.body || {}),
        });
    } catch (error) {
        next(error);
    }
});

export default router;
