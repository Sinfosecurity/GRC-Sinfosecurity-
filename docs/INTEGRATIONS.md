# Integrations

| Provider | Status without credentials | Implementation |
|----------|----------------------------|----------------|
| Slack | NOT_CONFIGURED | Webhook POST when `SLACK_WEBHOOK_URL` is set |
| Jira | NOT_CONFIGURED | REST issue create when Jira env vars are set |
| ServiceNow | NOT_CONFIGURED | Table API when instance credentials are set |
| SIEM | NOT_CONFIGURED | Webhook POST when `SIEM_WEBHOOK_URL` is set |

Test endpoint: `POST /api/v1/integrations/:provider/test`.  
A console.log is not treated as success. Missing credentials never return CONNECTED.
