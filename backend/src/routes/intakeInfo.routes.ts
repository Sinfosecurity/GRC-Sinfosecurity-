import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { activationRateLimiter, uploadLimiter } from '../middleware/rateLimiter';
import { getPublicIntakeInfo, submitPublicIntakeInfo, uploadPublicIntakeAttachment } from '../services/intakeEngagementService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.get('/', activationRateLimiter, async (req, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getPublicIntakeInfo(String(req.query.token || '')) });
    } catch (error) {
        next(error);
    }
});

router.post('/attachments', activationRateLimiter, uploadLimiter, upload.single('file'), async (req, res: Response, next: NextFunction) => {
    try {
        if (!req.file) throw new Error('Choose a supporting document.');
        res.status(201).json({
            success: true,
            data: await uploadPublicIntakeAttachment(String(req.body?.token || req.query.token || ''), {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
                buffer: req.file.buffer,
            }),
        });
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
