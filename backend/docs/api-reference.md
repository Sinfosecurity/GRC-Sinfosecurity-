# GRC Platform REST API Reference (v1)

## Base URL
```
https://your-domain.com/api/v1
```

## Authentication

All API requests require an API key passed in the `X-API-Key` header:

```
X-API-Key: grc_your_api_key_here
```

## Rate Limiting

- **Default**: 60 requests per minute
- **Burst**: 100 requests per minute
- Rate limit info returned in response headers:
  - `X-RateLimit-Limit`: Max requests per minute
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

---

## Endpoints

### Risks API

#### List Risks
```
GET /api/v1/risks
```

**Query Parameters:**
- `severity` - Filter by severity (low|medium|high|critical)
- `status` - Filter by status (open|mitigated|closed)
- `category` - Filter by category

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "title": "Data Breach Risk",
      "severity": "high",
      "status": "open",
      "category": "Cybersecurity"
    }
  ]
}
```

#### Get Risk by ID
```
GET /api/v1/risks/:id
```

#### Create Risk
```
POST /api/v1/risks
```

**Request Body:**
```json
{
  "title": "New Risk",
  "severity": "high",
  "category": "Operational"
}
```

---

### Compliance API

#### List Compliance Frameworks
```
GET /api/v1/compliance
```

**Query Parameters:**
- `status` - Filter by status (compliant|non-compliant)

**Response:**
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "id": 1,
      "framework": "ISO 27001",
      "status": "compliant",
      "score": 95,
      "lastAudit": "2024-11-15"
    }
  ]
}
```

#### Get Compliance Framework by ID
```
GET /api/v1/compliance/:id
```

---

### Tasks API

#### List Tasks
```
GET /api/v1/tasks
```

**Query Parameters:**
- `status` - Filter by status (pending|in_progress|completed)
- `priority` - Filter by priority (low|medium|high|critical)
- `assignedTo` - Filter by assigned user

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "task_1",
      "title": "Q4 Risk Assessment",
      "status": "in_progress",
      "priority": "high",
      "assignedTo": "user_2",
      "dueDate": "2024-12-31"
    }
  ]
}
```

#### Get Task by ID
```
GET /api/v1/tasks/:id
```

#### Create Task
```
POST /api/v1/tasks
```

**Request Body:**
```json
{
  "title": "New Task",
  "description": "Task description",
  "type": "risk_assessment",
  "assignedTo": "user_1",
  "dueDate": "2024-12-31",
  "priority": "high"
}
```

---

### Reports API

#### List Report Templates
```
GET /api/v1/reports/templates
```

**Response:**
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "id": "tpl_1",
      "name": "Executive Risk Summary",
      "type": "risk_summary",
      "sections": 3
    }
  ]
}
```

#### Generate Report
```
POST /api/v1/reports/generate
```

**Request Body:**
```json
{
  "templateId": "tpl_1",
  "format": "pdf"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "rpt_123",
    "templateId": "tpl_1",
    "generatedAt": "2024-12-12T18:20:00Z",
    "format": "pdf",
    "fileUrl": "/downloads/report_123.pdf"
  }
}
```

---

## Error Responses

All errors return HTTP status codes with JSON body:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common Status Codes:**
- `400` - Bad Request
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (insufficient scopes)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## API Scopes

API keys can be assigned specific scopes for access control:

- `risks:read` - Read risks
- `risks:write` - Create/update risks
- `compliance:read` - Read compliance data
- `tasks:read` - Read tasks
- `tasks:write` - Create/update tasks
- `reports:read` - List report templates
- `reports:generate` - Generate reports
- `*` - Full access

---

## Webhooks

Configure webhooks to receive real-time notifications:

**Supported Events:**
- `risk.created`
- `risk.updated`
- `task.created`
- `task.completed`
- `compliance.updated`

**Webhook Payload:**
```json
{
  "event": "risk.created",
  "timestamp": "2024-12-12T18:20:00Z",
  "data": {
    "id": 1,
    "title": "New Risk"
  }
}
```

---

## Examples

### cURL
```bash
curl -H "X-API-Key: grc_your_key" \
  https://your-domain.com/api/v1/risks
```

### JavaScript
```javascript
const response = await fetch('https://your-domain.com/api/v1/risks', {
  headers: {
    'X-API-Key': 'grc_your_key'
  }
});
const data = await response.json();
```

### Python
```python
import requests

headers = {'X-API-Key': 'grc_your_key'}
response = requests.get('https://your-domain.com/api/v1/risks', headers=headers)
data = response.json()
```
