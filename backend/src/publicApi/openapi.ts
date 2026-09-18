import { PUBLIC_API_SCOPES, WEBHOOK_EVENTS } from './scopes';

const pageSchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', example: 1 },
        pageSize: { type: 'integer', example: 20 },
        total: { type: 'integer', example: 1 },
        items: { type: 'array', items: { type: 'object' } },
    },
};

const errorSchema = {
    type: 'object',
    properties: {
        error: {
            type: 'object',
            properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                requestId: { type: 'string' },
            },
        },
    },
};

function op(summary: string, scope: string, extra: Record<string, unknown> = {}) {
    return {
        summary,
        security: [{ bearerAuth: [] }],
        'x-scopes': [scope],
        responses: {
            200: { description: 'Success', content: { 'application/json': { schema: pageSchema } } },
            401: { description: 'Invalid, expired, or revoked credential', content: { 'application/json': { schema: errorSchema } } },
            403: { description: 'Missing scope', content: { 'application/json': { schema: errorSchema } } },
            429: { description: '120 requests / 15 minutes per API client and organization' },
        },
        ...extra,
    };
}

export function publicOpenApi() {
    return {
        openapi: '3.0.3',
        info: {
            title: 'Supreme Public API',
            version: 'v1',
            description: 'Tenant-scoped customer API. Authenticate with Authorization: Bearer srk_…. Secrets are hashed and shown once. Session /api/v1 routes remain for the browser application and are not this contract.',
        },
        servers: [{ url: '/public/v1' }],
        security: [{ bearerAuth: [] }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', description: 'API client secret shown once at creation' },
            },
            schemas: { Page: pageSchema, Error: errorSchema },
        },
        paths: {
            '/vendors': {
                get: op('List third parties', 'vendors:read', {
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
                        { name: 'search', in: 'query', schema: { type: 'string' } },
                    ],
                }),
                post: op('Create a third party', 'vendors:write', {
                    parameters: [{ name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name'],
                                    properties: {
                                        name: { type: 'string' },
                                        contactEmail: { type: 'string' },
                                        primaryContact: { type: 'string' },
                                        servicesProvided: { type: 'string' },
                                    },
                                },
                                example: { name: 'Acme Cloud', contactEmail: 'vendor@example.com' },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Created' },
                        401: { description: 'Invalid credential' },
                        403: { description: 'Missing vendors:write' },
                    },
                }),
            },
            '/vendors/{id}': {
                get: op('Get a third party', 'vendors:read'),
                patch: op('Update a third party', 'vendors:write'),
            },
            '/findings': { get: op('List findings', 'findings:read') },
            '/findings/{id}': { get: op('Get a finding', 'findings:read') },
            '/assessments': { get: op('List assessments', 'assessments:read') },
            '/risks': { get: op('List third-party residual risk summaries', 'risks:read') },
            '/evidence': { get: op('List evidence metadata', 'evidence:read') },
            '/insurance/configuration': { get: op('Get Insurance Edition configuration history', 'insurance:read') },
            '/insurance/entities': { get: op('List insurance entities', 'insurance:read') },
            '/insurance/licenses': { get: op('List insurance license records', 'insurance:read') },
            '/insurance/risks': { get: op('Get insurance risk taxonomy summary', 'insurance:read') },
            '/insurance/regulatory-packs': { get: op('List insurance regulatory pack applicability (read-only)', 'insurance:read') },
            '/insurance/models': { get: op('List insurance AI/model context records', 'insurance:read') },
        },
        'x-scopes': PUBLIC_API_SCOPES,
        'x-webhook-events': WEBHOOK_EVENTS,
        'x-rate-limit': { category: 'public_api', window: '15m', max: 120, headers: ['RateLimit-Limit', 'RateLimit-Remaining', 'Retry-After'] },
        'x-errors': { code: 'string', message: 'string', requestId: 'string' },
        'x-webhooks': {
            signature: 'HMAC-SHA256 of timestamp + "." + body',
            headers: ['X-Supreme-Signature', 'X-Supreme-Timestamp', 'X-Supreme-Event-Id', 'X-Supreme-Event', 'X-Supreme-Schema'],
            replayWindowSeconds: 300,
        },
    };
}
