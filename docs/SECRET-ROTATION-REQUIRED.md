# Secret rotation required

Names only. Values are never reproduced here.

Inspected committed templates on 2026-09-10. No live `.env` was found in git. The following **names** appeared in example/deployment files and must be treated as **ROTATION REQUIRED** if they were ever populated with real credentials in any deployed environment that reused those files.

| Name | Why |
|------|-----|
| `JWT_SECRET` | Example files contained placeholder secrets. Rotate if a real value was committed historically or reused from examples. |
| `JWT_REFRESH_SECRET` | Same as JWT_SECRET. |
| `SESSION_SECRET` | Present in Railway example. |
| `DATABASE_URL` | Present in Docker/Railway examples. |
| `REDIS_URL` / `REDIS_PASSWORD` | Present in Docker/Railway examples. |
| `MONGODB_URI` / `MONGODB_URL` | Present in examples. |
| `AWS_ACCESS_KEY_ID` | Railway example used an `AKIA…` shaped placeholder. Rotate if a real key was ever stored there. |
| `AWS_SECRET_ACCESS_KEY` | Paired with the access key. |
| `SENDGRID_API_KEY` | Railway example used an `SG.…` shaped placeholder. |
| `SLACK_WEBHOOK_URL` | Example used a Slack webhook URL shape. |
| `JIRA_API_TOKEN` | Named in Railway example. |
| `SENTRY_DSN` | Named in backend example. |
| `DATADOG_API_KEY` | Named in backend example. |
| `PAGERDUTY_INTEGRATION_KEY` | Named in backend example. |
| `SMTP_PASSWORD` | Named in backend example. |
| `ELASTICSEARCH_PASSWORD` | Named in backend example. |
| `ENCRYPTION_KEY` | Application previously fell back to `dev-encryption-key`. If that fallback was used in any environment, rotate application-level encryption material and re-encrypt stored secrets. |
| `STRIPE_SECRET_KEY` | New billing variable. Rotate if ever exposed. |
| `STRIPE_WEBHOOK_SECRET` | New billing variable. |
| `OPENAI_API_KEY` / `AI_API_KEY` | New AI variables. |
| `SERVICENOW_PASSWORD` | Integration credential. |
| `SIEM_TOKEN` | Integration credential. |

Do not attempt automatic third-party rotation from this repository. Rotate in the provider console, then update Railway/environment stores.
