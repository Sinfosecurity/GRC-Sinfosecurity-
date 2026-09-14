import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { activationRateLimiter, uploadLimiter } from '../middleware/rateLimiter';
import { ApiError } from '../middleware/errorHandler';
import { authenticateVendor, VendorAuthRequest } from '../middleware/vendorAuth';
import {
    activateVendorAccess,
    logoutVendor,
    saveVendorResponse,
    submitVendorAssessment,
    uploadVendorEvidence,
    vendorAssessmentDetail,
    vendorWorkspace,
} from '../services/vendorDueDiligenceService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post('/activate', activationRateLimiter, async (req, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await activateVendorAccess(String(req.body?.token || req.query.token || '')) });
    } catch (error) {
        next(error);
    }
});

router.post('/logout', authenticateVendor, async (req: VendorAuthRequest, res: Response, next: NextFunction) => {
    try {
        await logoutVendor(req.vendor!.sessionId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

router.get('/workspace', authenticateVendor, async (req: VendorAuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await vendorWorkspace(req.vendor!) });
    } catch (error) {
        next(error);
    }
});

router.get('/assessments/:assessmentId', authenticateVendor, async (req: VendorAuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await vendorAssessmentDetail(req.vendor!, req.params.assessmentId) });
    } catch (error) {
        next(error);
    }
});

router.patch('/assessments/:assessmentId/responses', authenticateVendor, async (req: VendorAuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await saveVendorResponse(req.vendor!, req.params.assessmentId, {
                questionKey: String(req.body?.questionKey || ''),
                response: req.body?.response,
                notes: req.body?.notes,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post(
    '/assessments/:assessmentId/evidence',
    authenticateVendor,
    uploadLimiter,
    upload.single('file'),
    async (req: VendorAuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.file && !req.body?.reuseStoredObjectId) {
                throw new ApiError(400, 'Choose a file or reuse a ready file you already uploaded.');
            }
            res.status(201).json({
                success: true,
                data: await uploadVendorEvidence(req.vendor!, req.params.assessmentId, {
                    questionKey: String(req.body?.questionKey || ''),
                    filename: req.file?.originalname || 'evidence',
                    contentType: req.file?.mimetype || 'application/octet-stream',
                    buffer: req.file?.buffer || Buffer.alloc(0),
                    reuseStoredObjectId: req.body?.reuseStoredObjectId,
                }),
            });
        } catch (error) {
            next(error);
        }
    },
);

router.post('/assessments/:assessmentId/submit', authenticateVendor, async (req: VendorAuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await submitVendorAssessment(req.vendor!, req.params.assessmentId, { attested: Boolean(req.body?.attested) }),
        });
    } catch (error) {
        next(error);
    }
});

export default router;
