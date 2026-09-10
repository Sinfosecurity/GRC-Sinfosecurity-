import { aiStatus, runAi } from '../ai/aiProvider';

export interface RiskPrediction {
    status: 'NOT_CONFIGURED' | 'SUCCESS' | 'ERROR';
    riskId?: string;
    predictedSeverity?: string;
    confidence?: number;
    factors?: string[];
    recommendations?: string[];
    generated?: true;
    text?: string;
}

class AIServiceConnector {
    async predictRisk(riskData: { id?: string; organizationId?: string; summary?: string }): Promise<RiskPrediction> {
        const status = aiStatus();
        if (status.status === 'NOT_CONFIGURED' || !riskData.organizationId) {
            return { status: 'NOT_CONFIGURED' };
        }
        const result = await runAi({
            organizationId: riskData.organizationId,
            feature: 'vendor_summary',
            context: riskData.summary || JSON.stringify({ id: riskData.id }),
        });
        return {
            status: result.status,
            riskId: riskData.id,
            text: result.text,
            generated: true,
        };
    }

    async analyzeGaps(organizationId: string, context: string) {
        return runAi({ organizationId, feature: 'weak_controls', context });
    }

    async getRecommendations(organizationId: string, context: string) {
        return runAi({ organizationId, feature: 'remediation', context });
    }

    status() {
        return aiStatus();
    }
}

const aiServiceConnector = new AIServiceConnector();
export default aiServiceConnector;
