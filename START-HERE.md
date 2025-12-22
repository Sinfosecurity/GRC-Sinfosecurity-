# 🚀 GRC Platform - Quick Start Guide

## Prerequisites Installed ✅
- Node.js 20+
- Python 3.11+
- Docker Desktop
- PostgreSQL, MongoDB, Redis, Elasticsearch (running in Docker)

## Start the Platform (3 Commands)

### 1️⃣ Start Databases (if not running)
```bash
docker-compose up -d
```
**Status**: All databases are healthy and running ✅

### 2️⃣ Start Backend API
```bash
cd backend
npm run dev
```
**Runs on**: http://localhost:4000  
**Health Check**: http://localhost:4000/health  
**API Docs**: http://localhost:4000/api-docs  
**Metrics**: http://localhost:4000/metrics

### 3️⃣ Start Frontend
```bash
cd frontend
npm run dev
```
**Runs on**: http://localhost:3000  
**Login**: Use demo credentials or create account

### 4️⃣ (Optional) Start AI Service
```bash
cd ai-service
uvicorn main:app --reload --port 5000
```
**Runs on**: http://localhost:5000

## 🎯 First Login

1. Open: http://localhost:3000
2. Click "Register" or use demo account
3. Explore:
   - **Dashboard** - Executive overview
   - **Risk Management** - Risk assessment & tracking
   - **Compliance** - GDPR, HIPAA, ISO27001, TISAX
   - **Vendor Management** - Third-party risk (TPRM)
   - **Controls** - Security controls library
   - **Incidents** - Incident tracking
   - **Reports** - Executive reporting

## 🔧 Configuration Files

### Backend Environment (.env already exists)
```bash
DEV_MODE=true                    # Quick start without full DB setup
DATABASE_URL=postgresql://...    # PostgreSQL connection
MONGODB_URI=mongodb://...         # MongoDB connection  
REDIS_URL=redis://...             # Redis connection
JWT_SECRET=<secure-token>         # Authentication
```

### AI Service Environment (.env created)
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:4000
PORT=5000
```

## 📊 Monitoring (Optional)

### Start Prometheus + Grafana
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

## 🧪 Run Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test

# AI service tests
cd ai-service && pytest
```

## 📁 Project Structure

```
GRC/
├── backend/          # Node.js + Express + Prisma
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── services/ # Business logic
│   │   ├── models/   # Database models
│   │   └── middleware/ # Auth, rate limiting
│   └── prisma/       # Database schema
├── frontend/         # React + TypeScript + MUI
│   └── src/
│       ├── pages/    # App screens
│       ├── components/ # Reusable UI
│       └── store/    # Redux state
└── ai-service/       # Python + FastAPI
    └── services/     # ML/NLP services
```

## 🔑 Key Features Ready to Use

### ✅ Compliance Management
- GDPR, HIPAA, CCPA, LGPD, APPI support
- ISO 27001 & TISAX frameworks
- Automated gap analysis
- Evidence collection

### ✅ Third-Party Risk Management (TPRM)
- Vendor onboarding & assessment
- Risk scoring (1-100 scale)
- Contract management
- Continuous monitoring
- Concentration risk analysis

### ✅ Risk Management
- Risk identification & assessment
- Risk heat maps
- Mitigation tracking
- Risk appetite configuration

### ✅ Security & Authentication
- JWT authentication
- OAuth/SAML/OIDC SSO support
- Multi-factor authentication (TOTP/SMS)
- Role-based access control

### ✅ AI-Powered Features
- Automated compliance gap analysis
- Predictive risk analytics
- Document NLP analysis
- Smart recommendations

## 🛠️ Common Tasks

### Add a New Vendor
1. Navigate to **Vendor Management**
2. Click **Add Vendor**
3. Fill in vendor details
4. Click **Create**

### Create a Risk Assessment
1. Go to **Risk Management**
2. Click **Add Risk**
3. Fill in risk details
4. Assign mitigation controls

### Run Compliance Check
1. Go to **Compliance**
2. Select framework (GDPR/HIPAA/ISO27001)
3. Click **Run Gap Analysis**
4. View results and recommendations

### Generate Executive Report
1. Navigate to **Reports**
2. Select report type
3. Choose date range
4. Click **Generate**
5. Export as PDF/Excel

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Check databases are running
docker-compose ps

# Restart databases
docker-compose restart

# View logs
docker-compose logs postgres
```

### Backend Won't Start
```bash
# Regenerate Prisma client
cd backend
npx prisma generate

# Check environment variables
cat .env

# View logs
npm run dev
```

### Frontend Build Errors
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📚 Documentation

- **API Docs**: http://localhost:4000/api-docs (Swagger UI)
- **GraphQL**: http://localhost:4000/graphql (GraphQL Playground)
- **Architecture**: See [docs/architecture.md](docs/architecture.md)
- **Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md) and [RAILWAY-DEPLOYMENT.md](RAILWAY-DEPLOYMENT.md)

## 🎓 Next Steps

1. ✅ **Explore the dashboard** - Get familiar with the interface
2. ✅ **Add sample data** - Create vendors, risks, controls
3. ✅ **Run compliance checks** - Test gap analysis
4. ✅ **Configure settings** - Set up your organization
5. ✅ **Invite team members** - Add users with roles

## 🌟 Production Deployment

When ready for production:

1. Set `DEV_MODE=false` in backend/.env
2. Generate secure JWT secrets
3. Configure production databases
4. Set up SSL/TLS certificates
5. Configure email (SMTP)
6. Deploy to Railway or Vercel
7. Set up monitoring alerts

See [RAILWAY-DEPLOYMENT.md](RAILWAY-DEPLOYMENT.md) for detailed steps.

---

**Need Help?**
- Check [WORLD-CLASS-STATUS-REPORT.md](WORLD-CLASS-STATUS-REPORT.md) for system status
- Review logs in `backend/logs/`
- API documentation at `/api-docs`

**Status**: 🟢 All systems operational and world-class ready!
