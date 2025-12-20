"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const package_json_1 = require("../../package.json");
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'GRC Platform API',
            version: package_json_1.version,
            description: 'Comprehensive Governance, Risk & Compliance Platform API',
            contact: {
                name: 'API Support',
                email: 'support@grc-platform.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:4000',
                description: 'Development server',
            },
            {
                url: 'https://api.grc-platform.com',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token',
                },
                apiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                    description: 'API key for service-to-service authentication',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        error: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    example: 'Resource not found',
                                },
                                code: {
                                    type: 'string',
                                    example: 'NOT_FOUND',
                                },
                                details: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                    },
                                },
                            },
                        },
                    },
                },
                ValidationError: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        error: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    example: 'Validation failed',
                                },
                                code: {
                                    type: 'string',
                                    example: 'VALIDATION_ERROR',
                                },
                                details: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            field: {
                                                type: 'string',
                                                example: 'email',
                                            },
                                            message: {
                                                type: 'string',
                                                example: 'Invalid email format',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                Vendor: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        name: {
                            type: 'string',
                            example: 'Acme Corporation',
                        },
                        tier: {
                            type: 'string',
                            enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
                            example: 'HIGH',
                        },
                        status: {
                            type: 'string',
                            enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED', 'OFFBOARDED'],
                            example: 'ACTIVE',
                        },
                        primaryContact: {
                            type: 'string',
                            format: 'email',
                            example: 'contact@acme.com',
                        },
                        website: {
                            type: 'string',
                            format: 'uri',
                            example: 'https://acme.com',
                        },
                        inherentRiskScore: {
                            type: 'number',
                            minimum: 0,
                            maximum: 100,
                            example: 75,
                        },
                        residualRiskScore: {
                            type: 'number',
                            minimum: 0,
                            maximum: 100,
                            example: 45,
                        },
                        organizationId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                VendorAssessment: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        vendorId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        type: {
                            type: 'string',
                            enum: ['INITIAL', 'ANNUAL', 'INTERIM', 'CONTINUOUS'],
                            example: 'ANNUAL',
                        },
                        status: {
                            type: 'string',
                            enum: ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'COMPLETED', 'APPROVED', 'REJECTED'],
                            example: 'IN_PROGRESS',
                        },
                        dueDate: {
                            type: 'string',
                            format: 'date-time',
                        },
                        completedDate: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        overallScore: {
                            type: 'number',
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                        },
                    },
                },
                PaginationMeta: {
                    type: 'object',
                    properties: {
                        total: {
                            type: 'integer',
                            example: 100,
                        },
                        page: {
                            type: 'integer',
                            example: 1,
                        },
                        pageSize: {
                            type: 'integer',
                            example: 20,
                        },
                        totalPages: {
                            type: 'integer',
                            example: 5,
                        },
                    },
                },
            },
            parameters: {
                PageQuery: {
                    name: 'page',
                    in: 'query',
                    description: 'Page number (1-indexed)',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        default: 1,
                    },
                },
                PageSizeQuery: {
                    name: 'pageSize',
                    in: 'query',
                    description: 'Number of items per page',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 20,
                    },
                },
                VendorIdPath: {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: 'Vendor UUID',
                    schema: {
                        type: 'string',
                        format: 'uuid',
                    },
                },
            },
            responses: {
                Unauthorized: {
                    description: 'Unauthorized - Invalid or missing authentication token',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                error: {
                                    message: 'Authentication required',
                                    code: 'UNAUTHORIZED',
                                },
                            },
                        },
                    },
                },
                Forbidden: {
                    description: 'Forbidden - Insufficient permissions',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                error: {
                                    message: 'Insufficient permissions',
                                    code: 'FORBIDDEN',
                                },
                            },
                        },
                    },
                },
                NotFound: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                error: {
                                    message: 'Resource not found',
                                    code: 'NOT_FOUND',
                                },
                            },
                        },
                    },
                },
                ValidationError: {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ValidationError',
                            },
                        },
                    },
                },
                RateLimitExceeded: {
                    description: 'Rate limit exceeded',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                error: {
                                    message: 'Too many requests, please try again later',
                                    code: 'RATE_LIMIT_EXCEEDED',
                                },
                            },
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization',
            },
            {
                name: 'Vendors',
                description: 'Third-party vendor management',
            },
            {
                name: 'Assessments',
                description: 'Vendor risk assessments',
            },
            {
                name: 'Contracts',
                description: 'Vendor contract management',
            },
            {
                name: 'Issues',
                description: 'Vendor issue tracking',
            },
            {
                name: 'Risks',
                description: 'Risk management',
            },
            {
                name: 'Compliance',
                description: 'Compliance management',
            },
            {
                name: 'Audits',
                description: 'Audit management',
            },
            {
                name: 'Health',
                description: 'System health and monitoring',
            },
        ],
    },
    apis: [
        './src/routes/*.ts',
        './src/routes/**/*.ts',
    ],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
//# sourceMappingURL=swagger.js.map