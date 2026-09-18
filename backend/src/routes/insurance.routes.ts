import { Router, Response, NextFunction } from 'express';
import { AuthRequest, authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { insuranceService } from '../insurance/insuranceService';
import { insuranceOperations } from '../insurance/operationsService';

const router = Router();
router.use(authenticate);

function actor(req: AuthRequest) {
    return { organizationId: req.user!.organizationId, userId: req.user!.id };
}

router.get('/catalog', requirePermission(PERMISSIONS['insurance.read']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: insuranceService.catalog() }); }
    catch (error) { next(error); }
});

router.get('/overview', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceService.overview(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/configuration', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceService.configuration(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.post('/recommend', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: insuranceService.recommend(req.body || {}) }); }
    catch (error) { next(error); }
});

router.post('/activate', requirePermission(PERMISSIONS['organization.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await insuranceService.activate(actor(req).organizationId, actor(req).userId, req.body || {}) }); }
    catch (error) { next(error); }
});

router.get('/entities', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceService.entities(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.post('/entities', requirePermission(PERMISSIONS['insurance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await insuranceService.createEntity(actor(req).organizationId, actor(req).userId, req.body || {}) }); }
    catch (error) { next(error); }
});

router.get('/licenses', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceService.licenses(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.post('/licenses', requirePermission(PERMISSIONS['insurance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await insuranceService.createLicense(actor(req).organizationId, actor(req).userId, req.body || {}) }); }
    catch (error) { next(error); }
});

router.patch('/licenses/:publicId', requirePermission(PERMISSIONS['insurance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceService.updateLicense(actor(req).organizationId, actor(req).userId, req.params.publicId, req.body || {}) }); }
    catch (error) { next(error); }
});

router.get('/vendors', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceService.vendorClasses(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.post('/vendors', requirePermission(PERMISSIONS['insurance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await insuranceService.classifyVendor(actor(req).organizationId, actor(req).userId, req.body || {}) }); }
    catch (error) { next(error); }
});

router.get('/ai-contexts', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceService.aiContexts(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.post('/ai-contexts', requirePermission(PERMISSIONS['insurance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceService.upsertAiContext(actor(req).organizationId, actor(req).userId, req.body || {}) }); }
    catch (error) { next(error); }
});

router.get('/risks', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceService.riskSummary(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/graph', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceService.graphLinks(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/regulatory', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceOperations.regulatoryWorkspace(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.post('/regulatory/applicability', requirePermission(PERMISSIONS['insurance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await insuranceOperations.reviewApplicability(actor(req).organizationId, actor(req).userId, req.body || {}) }); }
    catch (error) { next(error); }
});

router.get('/claims', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceOperations.claimsWorkspace(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/underwriting', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceOperations.underwritingWorkspace(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/reinsurance', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceOperations.reinsuranceWorkspace(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.post('/delegated-authority', requirePermission(PERMISSIONS['insurance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await insuranceOperations.createDelegatedAuthority(actor(req).organizationId, actor(req).userId, req.body || {}) }); }
    catch (error) { next(error); }
});

router.post('/counterparties', requirePermission(PERMISSIONS['insurance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await insuranceOperations.createCounterparty(actor(req).organizationId, actor(req).userId, req.body || {}) }); }
    catch (error) { next(error); }
});

router.get('/concentration', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceOperations.concentration(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/license-attention', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceOperations.licenseAttention(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/signals', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceOperations.signals(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/reports', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceOperations.reports(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/complaints', requirePermission(PERMISSIONS['insurance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await insuranceOperations.complaintContext(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

export default router;
