import { Router, Response, NextFunction } from 'express';
import { activationRateLimiter } from '../middleware/rateLimiter';
import { getIraForm, saveIraForm, submitIraForm } from '../services/requesterTaskLinkService';

const router = Router();

router.get('/', activationRateLimiter, async (req, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getIraForm(String(req.query.token || '')) });
    } catch (error) {
        next(error);
    }
});

router.patch('/', activationRateLimiter, async (req, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await saveIraForm(String(req.body?.token || req.query.token || ''), req.body?.answers || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/submit', activationRateLimiter, async (req, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await submitIraForm(String(req.body?.token || req.query.token || ''), req.body?.answers || {}, Boolean(req.body?.attested)),
        });
    } catch (error) {
        next(error);
    }
});

export default router;
