import { prisma } from '../config/database';
import { isProviderConfigured } from '../config/env';

export type AiFeature =
    | 'vendor_summary'
    | 'weak_controls'
    | 'evidence_summary'
    | 'policy_analysis'
    | 'contract_analysis'
    | 'finding_draft'
    | 'remediation'
    | 'executive_summary'
    | 'portfolio_query';

export type AiResult = {
    status: 'NOT_CONFIGURED' | 'SUCCESS' | 'ERROR';
    text?: string;
    provider?: string;
    model?: string;
    generated: true;
};

const BLOCKED = ['password', 'token', 'secret', 'authorization', 'api key', 'mfa'];

export function sanitizeAiContext(input: string): string {
    let text = input;
    for (const word of BLOCKED) {
        const re = new RegExp(`${word}\\s*[:=].*`, 'ig');
        text = text.replace(re, `${word}: [redacted]`);
    }
    return text.slice(0, 8000);
}

export function aiStatus() {
    if (isProviderConfigured('OPENAI_API_KEY') || isProviderConfigured('AI_API_KEY')) {
        return { status: 'CONNECTED' as const, provider: process.env.AI_PROVIDER || 'openai' };
    }
    return { status: 'NOT_CONFIGURED' as const, provider: undefined };
}

export async function runAi(input: {
    organizationId: string;
    feature: AiFeature;
    context: string;
}): Promise<AiResult> {
    const started = Date.now();
    const configured = aiStatus();
    if (configured.status === 'NOT_CONFIGURED') {
        await prisma.aiOperationLog.create({
            data: {
                organizationId: input.organizationId,
                feature: input.feature,
                provider: 'none',
                success: false,
                latencyMs: Date.now() - started,
            },
        });
        return { status: 'NOT_CONFIGURED', generated: true };
    }

    const provider = process.env.AI_PROVIDER || 'openai';
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an analyst assistant for Supreme Risk. You explain and recommend. You never invent risk scores. Clearly label output as AI-generated analysis.',
                    },
                    { role: 'user', content: sanitizeAiContext(input.context) },
                ],
                temperature: 0.2,
            }),
        });
        if (!response.ok) {
            throw new Error(`AI provider returned ${response.status}`);
        }
        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = data.choices?.[0]?.message?.content || '';
        await prisma.aiOperationLog.create({
            data: {
                organizationId: input.organizationId,
                feature: input.feature,
                provider,
                model,
                success: true,
                latencyMs: Date.now() - started,
            },
        });
        return { status: 'SUCCESS', text, provider, model, generated: true };
    } catch {
        await prisma.aiOperationLog.create({
            data: {
                organizationId: input.organizationId,
                feature: input.feature,
                provider,
                model,
                success: false,
                latencyMs: Date.now() - started,
            },
        });
        return { status: 'ERROR', generated: true };
    }
}
