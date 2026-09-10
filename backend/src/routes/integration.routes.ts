import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import SlackIntegration from '../integrations/slackIntegration';
import JiraIntegration from '../integrations/jiraIntegration';
import ServiceNowIntegration from '../integrations/servicenowIntegration';
import SiemIntegration from '../integrations/siemIntegration';

const router = Router();
router.use(authenticate);
router.use(requirePermission(PERMISSIONS['integration.manage']));

router.get('/status', (req: AuthRequest, res: Response) => {
    res.json({
        success: true,
        data: {
            slack: new SlackIntegration().status(),
            jira: new JiraIntegration().status(),
            servicenow: new ServiceNowIntegration().status(),
            siem: new SiemIntegration().status(),
        },
    });
});

router.post('/:provider/test', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const provider = req.params.provider;
        let result;
        if (provider === 'slack') result = await new SlackIntegration().testConnection();
        else if (provider === 'jira') result = await new JiraIntegration().testConnection();
        else if (provider === 'servicenow') result = await new ServiceNowIntegration().testConnection();
        else if (provider === 'siem') result = await new SiemIntegration().testConnection();
        else result = { status: 'NOT_CONFIGURED' };
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

export default router;
