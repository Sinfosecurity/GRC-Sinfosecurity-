import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { aiStatus, runAi, AiFeature } from '../ai/aiProvider';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/status', (req: AuthRequest, res: Response) => {
    res.json({ success: true, data: aiStatus() });
});

router.post('/analyze', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const feature = (req.body?.feature || 'vendor_summary') as AiFeature;
        const context = String(req.body?.context || '');
        if (!context) {
            throw new ApiError(400, 'Context is required');
        }
        const result = await runAi({
            organizationId: req.user!.organizationId,
            feature,
            context,
        });
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

export default router;
