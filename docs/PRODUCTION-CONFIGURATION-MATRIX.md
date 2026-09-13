# Production configuration matrix

No secret values. Staging classes are “set / unset / generated” only.

`APP_ENVIRONMENT=production` plus `NODE_ENV=production` is the production profile. Hosted staging today uses `NODE_ENV=production` and `APP_ENVIRONMENT=staging`.

| Variable | Purpose | Required | Secret | Staging class | Production action |
|---|---|---|---|---|---|
| `NODE_ENV` | Runtime profile; fail-fast | REQUIRED | NON-SECRET | `production` on hosted staging | `production` |
| `APP_ENVIRONMENT` | Portal/labeling | REQUIRED | NON-SECRET | `staging` | `production` |
| `DEV_MODE` | Must stay false | REQUIRED | NON-SECRET | `false` | `false` — startup throws if `true` |
| `PORT` | Listen port | OPTIONAL | NON-SECRET | platform-provided | platform-provided |
| `API_VERSION` | API prefix | OPTIONAL | NON-SECRET | `v1` | `v1` |
| `DATABASE_URL` | Authoritative Postgres | REQUIRED | SECRET | hosted generated | paid SSL URL; never Git |
| `REDIS_URL` | Rate limit / cache | REQUIRED for multi-instance | SECRET | hosted generated | paid private Redis |
| `JWT_SECRET` | Access tokens | REQUIRED | SECRET | generated | new ≥32 non-placeholder |
| `JWT_REFRESH_SECRET` | Refresh tokens | REQUIRED | SECRET | generated | distinct ≥32 |
| `JWT_EXPIRES_IN` | Access TTL | OPTIONAL | NON-SECRET | `15m` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh TTL | OPTIONAL | NON-SECRET | default | default |
| `PLATFORM_JWT_EXPIRES_IN` | Platform access TTL | OPTIONAL | NON-SECRET | `10m` | `10m` |
| `PLATFORM_JWT_REFRESH_EXPIRES_IN` | Platform refresh | OPTIONAL | NON-SECRET | `8h` | `8h` |
| `PLATFORM_ELEVATION_MINUTES` | Step-up window | OPTIONAL | NON-SECRET | 5–15 | 15 max |
| `ENCRYPTION_KEY` | MFA secret box | REQUIRED | SECRET | set on hosted | new ≥32 non-placeholder |
| `CORS_ORIGIN` | Browser allowlist | REQUIRED | NON-SECRET | staging origin | `https://app.supremerisk.com,https://admin.supremerisk.com` |
| `FRONTEND_URL` | Fallback origin | REQUIRED | NON-SECRET | staging FE | `https://app.supremerisk.com` |
| `FRONTEND_BASE_URL` | Link fallback | OPTIONAL | NON-SECRET | staging FE | `https://app.supremerisk.com` |
| `CUSTOMER_FRONTEND_URL` | Customer portal links | REQUIRED | NON-SECRET | staging FE | `https://app.supremerisk.com` |
| `ADMIN_FRONTEND_URL` | Admin portal links | REQUIRED | NON-SECRET | staging FE | `https://admin.supremerisk.com` |
| `APP_BASE_URL` | API public URL | REQUIRED | NON-SECRET | staging API | `https://api.supremerisk.com` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Resend/SMTP | REQUIRED for mail | NON-SECRET | hosted (email up at rehearsal) | verified sending domain |
| `SMTP_USER` | SMTP auth | OPTIONAL | SECRET | set if used | set |
| `SMTP_PASSWORD` / `SMTP_PASS` | SMTP auth | OPTIONAL | SECRET | set if used | set |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | From | REQUIRED for mail | NON-SECRET | set | production From |
| `SENDGRID_API_KEY` | Alternate mail | OPTIONAL | SECRET | unset | only if chosen over SMTP |
| `DEMO_INQUIRY_EMAIL` | Sales/demo recipient | REQUIRED for sales ops | NON-SECRET | USER ACTION | designate mailbox |
| `ALERT_EMAIL_TO` | Fallback sales/alerts | OPTIONAL | NON-SECRET | fallback | designate |
| `ALERT_WEBHOOK_URL` | Ops webhook | OPTIONAL | SECRET | delivered in rehearsal | production webhook |
| Security contact | Public reporting mailbox | REQUIRED before public launch | NON-SECRET | NOT CONFIGURED | USER ACTION — do not invent |
| Support mailbox | Customer support | REQUIRED for launch ops | NON-SECRET | NOT designated | USER ACTION — do not invent |
| `STRIPE_SECRET_KEY` | Billing | REQUIRED for commercial checkout | SECRET | test mode CONNECTED | live only after catalog ready; `sk_live_` rejected until then is correct |
| `STRIPE_WEBHOOK_SECRET` | Webhook verify | REQUIRED with Stripe | SECRET | test `whsec_` | new live secret |
| `STRIPE_PUBLISHABLE_KEY` | Browser | OPTIONAL | NON-SECRET | test | live publishable |
| `STRIPE_PRICE_STARTER` | Monthly Starter | REQUIRED for Starter checkout | NON-SECRET id | staging test IDs | **new live IDs** — do not reuse staging |
| `STRIPE_PRICE_STARTER_ANNUAL` | Annual Starter | REQUIRED if annual sold | NON-SECRET id | staging test IDs | new live IDs |
| `STRIPE_PRICE_PROFESSIONAL` | Monthly Professional | REQUIRED | NON-SECRET id | staging test IDs | new live IDs |
| `STRIPE_PRICE_PROFESSIONAL_ANNUAL` | Annual Professional | REQUIRED if annual sold | NON-SECRET id | staging test IDs | new live IDs |
| `STRIPE_PRICE_BUSINESS` | Monthly Business | REQUIRED if Business self-serve | NON-SECRET id | add test IDs | new live IDs — do not reuse staging |
| `STRIPE_PRICE_BUSINESS_ANNUAL` | Annual Business | REQUIRED if annual Business sold | NON-SECRET id | add test IDs | new live IDs |
| `STRIPE_PRICE_ENTERPRISE` | Enterprise (if ever checkout) | OPTIONAL | NON-SECRET id | may be unset | sales-led; no auto Enterprise checkout |
| `STRIPE_PRICE_ENTERPRISE_ANNUAL` | Enterprise annual | OPTIONAL | NON-SECRET id | may be unset | sales-led |
| `CLAMAV_HOST` / `CLAMAV_PORT` / `CLAMAV_TIMEOUT_MS` | Malware | REQUIRED for CONNECTED | NON-SECRET | private pserv | private production scanner |
| `MALWARE_SCAN_DISABLED` | Kill switch | OPTIONAL | NON-SECRET | unset/false | false |
| `ALLOW_PENDING_DOWNLOADS` | Download policy | REQUIRED | NON-SECRET | `false` | `false` |
| `ALLOW_UNSCANNED_DOWNLOADS` | Download policy | REQUIRED | NON-SECRET | `false` | `false` |
| `S3_BUCKET` / `S3_ENDPOINT` / `S3_REGION` / `AWS_REGION` | Evidence store | REQUIRED | mix | hosted S3/MinIO | paid private bucket |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Storage creds | REQUIRED with S3 | SECRET | set | new production IAM |
| `S3_FORCE_PATH_STYLE` | MinIO/custom | OPTIONAL | NON-SECRET | true if custom endpoint | as required |
| `ALLOW_LOCAL_OBJECT_STORAGE` | Disk fallback | REQUIRED | NON-SECRET | `false` | `false` |
| `UPLOAD_DIR` | Local disk | STAGING/DEV ONLY | NON-SECRET | unused when S3 | do not use |
| `METRICS_TOKEN` | Authenticated `/metrics` | OPTIONAL | SECRET | NOT CONFIGURED (404) | high-entropy or leave unset (404) |
| `ENABLE_LEGACY_INMEMORY_APIS` | Legacy mocks | STAGING ONLY / never prod | NON-SECRET | must be unset | ignored when `NODE_ENV=production` |
| `PLATFORM_OWNER_BOOTSTRAP_ENABLED` | First owner | PRODUCTION ONLY (one-time) | NON-SECRET | disabled after cert | true once, then false |
| `PLATFORM_OWNER_BOOTSTRAP_TOKEN` | Bootstrap gate | PRODUCTION ONLY (one-time) | SECRET | n/a | generate ≥32; destroy after |
| `PLATFORM_OWNER_BOOTSTRAP_EMAIL` | First owner email | PRODUCTION ONLY | NON-SECRET | n/a | real operator |
| `VITE_ENVIRONMENT` | Frontend label/robots | REQUIRED | NON-SECRET | `staging` | `production` |
| `VITE_PREVIEW_LABEL` | Dev banner | STAGING/DEV | NON-SECRET | `false` | `false` |
| `VITE_API_URL` | Browser API | REQUIRED | NON-SECRET | staging API | production API |
| `OPENAI_API_KEY` / `AI_API_KEY` | AI | OPTIONAL | SECRET | unset / NOT_CONFIGURED | optional; not a ready gate |
| `MONGODB_URI` | Unused Mongo | OPTIONAL | SECRET | NOT_CONFIGURED | leave unset unless adopted |

## Fail-fast (production startup)

Refuses to start when:

- `DEV_MODE=true`
- `JWT_SECRET` missing, <32, or placeholder
- `JWT_REFRESH_SECRET` weak
- `DATABASE_URL` missing
- `ENCRYPTION_KEY` missing or weak
- `APP_ENVIRONMENT=production` with localhost `CUSTOMER_FRONTEND_URL` / `ADMIN_FRONTEND_URL`

Optional Stripe/email/AI/Mongo/ClamAV are **not** fatal. Live Stripe keys in a non-live configuration become billing `ERROR`. Missing ClamAV is fail-closed for downloads, not a crash.

## Secret handling

Generate with a CSPRNG. Store only in Render (or successor) env. Never commit. Rotate by replacing the env value and restarting. JWT rotation invalidates sessions. Do not print values in #10/#11 evidence.
