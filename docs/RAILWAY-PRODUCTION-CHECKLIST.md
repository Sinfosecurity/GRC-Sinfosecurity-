# Railway production checklist

Do not deploy automatically from this transformation.

## Services

- Backend (this repo `backend/`)
- Frontend (Vite static)
- PostgreSQL
- Redis (required for Bull queues; optional for API-only)
- Object storage (S3-compatible)
- Email provider (SendGrid or SMTP)
- Stripe (if billing enabled)
- AI provider (if AI enabled)
- Monitoring providers (if enabled)

## Build

`railway.toml` remains:

1. `npm install` in backend
2. `prisma generate`
3. `npm run build`
4. `prisma migrate deploy`
5. `node dist/server.js`

## Environment variable names only

`NODE_ENV` `PORT` `DATABASE_URL` `JWT_SECRET` `JWT_REFRESH_SECRET` `CORS_ORIGIN` `FRONTEND_URL` `REDIS_URL` `S3_BUCKET` `AWS_REGION` `AWS_ACCESS_KEY_ID` `AWS_SECRET_ACCESS_KEY` `STRIPE_SECRET_KEY` `STRIPE_WEBHOOK_SECRET` `STRIPE_PRICE_STARTER` `STRIPE_PRICE_PROFESSIONAL` `STRIPE_PRICE_ENTERPRISE` `SENDGRID_API_KEY` `OPENAI_API_KEY` `SLACK_WEBHOOK_URL` `JIRA_BASE_URL` `JIRA_EMAIL` `JIRA_API_TOKEN` `SERVICENOW_INSTANCE` `SERVICENOW_USER` `SERVICENOW_PASSWORD` `SIEM_WEBHOOK_URL`

Never set `DEV_MODE=true` in production.
