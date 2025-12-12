# API Documentation

## Base URL
```
Development: http://localhost:4000/api/v1
Production: https://api.sinfosecurity.com/api/v1
```

## Authentication

All API requests (except `/auth/*`) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "organization": {
    "name": "Acme Corp",
    "industry": "Technology",
    "country": "US"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ADMIN"
    }
  }
}
```

## Risk Management

### List Risks
```http
GET /risks?page=1&limit=10&status=IDENTIFIED&category=CYBERSECURITY
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Unauthorized Data Access",
      "description": "Risk of unauthorized access to sensitive data",
      "category": "CYBERSECURITY",
      "likelihood": 4,
      "impact": 5,
      "riskScore": 20,
      "status": "IDENTIFIED",
      "owner": {
        "id": "uuid",
        "name": "John Doe"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 47,
    "pages": 5
  }
}
```

### Create Risk
```http
POST /risks
Content-Type: application/json

{
  "title": "SQL Injection Vulnerability",
  "description": "Potential SQL injection in legacy system",
  "category": "CYBERSECURITY",
  "likelihood": 3,
  "impact": 5,
  "ownerId": "user-uuid",
  "mitigation": "Implement parameterized queries"
}
```

### Update Risk
```http
PUT /risks/:id
Content-Type: application/json

{
  "status": "MITIGATED",
  "mitigation": "Implemented parameterized queries and input validation"
}
```

### Delete Risk
```http
DELETE /risks/:id
```

## Compliance Management

### List Frameworks
```http
GET /compliance/frameworks
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "GDPR",
      "type": "GDPR",
      "version": "2016/679",
      "score": 87,
      "lastAssessed": "2024-01-15T00:00:00Z",
      "requirementsCount": 99,
      "implementedCount": 86
    }
  ]
}
```

### Run Gap Analysis
```http
POST /compliance/gap-analysis
Content-Type: application/json

{
  "frameworkId": "uuid",
  "includeRecommendations": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 87,
    "gaps": [
      {
        "requirementId": "GDPR-ART-30",
        "title": "Records of Processing Activities",
        "severity": "high",
        "description": "Missing comprehensive processing records"
      }
    ],
    "recommendations": [
      {
        "action": "Implement processing activity register",
        "priority": "high",
        "timeline": "2 weeks"
      }
    ]
  }
}
```

## Controls Management

### List Controls
```http
GET /controls?status=OPERATIONAL&type=PREVENTIVE
```

### Create Control
```http
POST /controls
Content-Type: application/json

{
  "name": "Multi-Factor Authentication",
  "description": "Require MFA for all user accounts",
  "type": "PREVENTIVE",
  "category": "Access Control",
  "status": "PLANNED"
}
```

### Test Control
```http
POST /controls/:id/test
Content-Type: application/json

{
  "result": "PASSED",
  "notes": "All users successfully authenticated with MFA"
}
```

## Incident Management

### Report Incident
```http
POST /incidents
Content-Type: application/json

{
  "title": "Suspicious Login Attempts",
  "description": "Multiple failed login attempts from unusual IP",
  "severity": "HIGH",
  "category": "Security",
  "reporterId": "user-uuid"
}
```

### Update Incident
```http
PUT /incidents/:id
Content-Type: application/json

{
  "status": "INVESTIGATING",
  "notes": "IP blocked, investigating source"
}
```

## Policy Management

### List Policies
```http
GET /policies?status=PUBLISHED&category=Security
```

### Create Policy
```http
POST /policies
Content-Type: application/json

{
  "title": "Data Classification Policy",
  "description": "Guidelines for classifying organizational data",
  "content": "Markdown or HTML content...",
  "category": "Data Protection",
  "ownerId": "user-uuid",
  "effectiveDate": "2024-02-01T00:00:00Z",
  "reviewDate": "2025-02-01T00:00:00Z"
}
```

### Publish Policy
```http
POST /policies/:id/publish

{
  "approvedBy": "admin-user-uuid"
}
```

## Document Management

### Upload Document
```http
POST /documents/upload
Content-Type: multipart/form-data

file: <document-file>
category: "Policies"
tags: ["GDPR", "Privacy"]
```

### List Documents
```http
GET /documents?category=Policies&tags=GDPR
```

### Download Document
```http
GET /documents/:id/download
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Authentication: 5 requests per 15 minutes per IP
- Headers included in response:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

## Pagination

List endpoints support pagination via query parameters:

```
?page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 125,
    "pages": 13
  }
}
```

## Filtering & Search

Most list endpoints support filtering:

```
GET /risks?category=CYBERSECURITY&status=IDENTIFIED&minRiskScore=15
```

Search across fields:

```
GET /policies?search=data+protection
```

## Webhooks (Planned)

Subscribe to events:

```http
POST /webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["risk.created", "incident.critical", "compliance.gap_found"],
  "secret": "webhook-secret"
}
```

## SDKs & Client Libraries

- JavaScript/TypeScript: `@sinfosecurity/grc-sdk` (planned)
- Python: `sinfosecurity-grc` (planned)
- cURL examples provided in documentation
