# GRC Platform - AI Coding Agent Instructions

## Architecture Overview

This is a **multi-service GRC (Governance, Risk & Compliance) platform** with AI-powered compliance analysis:

- **Frontend**: React 18 + TypeScript + MUI + Redux Toolkit (Vite dev server on :3000)
- **Backend**: Node.js 20 + Express + TypeScript + Prisma ORM (REST + GraphQL on :4000)
- **AI Service**: Python 3.11 + FastAPI (ML/NLP services on :5000)
- **Databases**: PostgreSQL (compliance data), MongoDB (documents), Redis (cache)
- **Deployment**: Railway (production), Docker Compose (local), Vercel (frontend only)

### Service Boundaries
- **Backend** owns: auth (JWT + OAuth/SAML/OIDC), business logic, Prisma/Mongoose, Redis cache
- **AI Service** provides: gap analysis, risk prediction, document NLP, recommendations
- **Frontend** implements: Redux Toolkit state (slices with `createAsyncThunk`), Material-UI components, React Router v6

## Critical Developer Workflows

### Local Development Setup
```bash
# Start databases first
docker-compose up -d

# Backend (Terminal 1)
cd backend
npx prisma generate && npx prisma migrate dev
npm run dev  # ts-node-dev with hot reload on :4000

# Frontend (Terminal 2)
cd frontend
npm run dev  # Vite dev server on :3000

# AI Service (Terminal 3)
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 5000
```

### Database Operations
```bash
# Prisma workflow (PostgreSQL)
cd backend
npx prisma generate          # Generate client after schema changes
npx prisma migrate dev       # Create/apply migrations in dev
npx prisma migrate deploy    # Apply migrations in production
npx prisma db push          # Push schema without migration (prototyping only)

# Access Prisma client via: import { prisma } from '../config/database'
# MongoDB via: mongoose models in backend/src/models/
```

### Testing
```bash
npm run test              # Run all tests (frontend + backend + AI)
npm run test:backend      # Jest tests with coverage
npm run test:frontend     # Vitest
cd ai-service && pytest   # Python tests
```

## Project-Specific Conventions

### Backend Architecture Patterns

**Service Layer Pattern** (NOT repository pattern):
```typescript
// Services are classes with singleton exports
class VendorManagementService {
  async create(data: CreateVendorDto) {
    return await prisma.vendor.create({ data });
  }
}
export default new VendorManagementService();
```
- All business logic lives in `backend/src/services/*.ts` classes
- Controllers in `backend/src/controllers/` are thin wrappers calling services
- Routes in `backend/src/routes/*.routes.ts` define endpoints and validation

**Error Handling**:
- Use custom `ApiError` classes (see `backend/src/middleware/errorHandler.ts`)
- All routes wrapped by `errorHandler` middleware
- Prisma errors auto-transformed to HTTP responses

**Database Access**:
```typescript
import { prisma } from '../config/database';  // PostgreSQL
import { mongoose } from '../config/database'; // MongoDB
import { redisClient } from '../config/database'; // Redis
```

### Frontend State Management

**Redux Toolkit Slices** (see `frontend/src/store/slices/`):
```typescript
// Async actions with createAsyncThunk
export const fetchVendors = createAsyncThunk(
  'vendors/fetchAll',
  async (filters: VendorFilters) => {
    const response = await api.get('/api/vendors', { params: filters });
    return response.data;
  }
);

// Slice with extraReducers for async states
const vendorSlice = createSlice({
  name: 'vendors',
  initialState,
  reducers: { /* sync actions */ },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendors.pending, (state) => { state.loading = true; })
      .addCase(fetchVendors.fulfilled, (state, action) => { /* ... */ })
      .addCase(fetchVendors.rejected, (state, action) => { /* ... */ });
  }
});
```

**API Client** (`frontend/src/services/api.ts`):
- Centralized Axios instance with JWT interceptors
- Auto-retry on token refresh (401 handling)
- All API calls go through this client

### AI Service Integration

Backend calls AI service via `backend/src/services/aiServiceConnector.ts`:
```typescript
const AIServiceConnector = {
  async analyzeGaps(framework, controls) {
    return await axios.post(`${AI_SERVICE_URL}/api/gap-analysis`, { framework, controls });
  }
};
```

AI endpoints in `ai-service/main.py`:
- `/api/gap-analysis` - Compliance gap identification
- `/api/risk-assessment` - ML-based risk scoring
- `/api/document-analysis` - NLP for policy documents

## Environment Configuration

**Required Environment Variables**:
```bash
# backend/.env
DATABASE_URL="postgresql://grc_user:password@localhost:5434/grc_platform"
MONGODB_URI="mongodb://localhost:27017/grc_documents"
REDIS_URL="redis://localhost:6380"
JWT_SECRET="change-in-production"
DEV_MODE=true  # Disables auth checks for quick testing

# ai-service/.env
CORS_ORIGINS="http://localhost:3000,http://localhost:4000"
```

**Docker Compose Services** (see `docker-compose.yml`):
- PostgreSQL: port 5434 (not 5432 to avoid conflicts)
- MongoDB: port 27017
- Redis: port 6380 (not 6379 to avoid conflicts)

## Railway Deployment

Each service has `railway.json` + `nixpacks.toml`:
```bash
# Deploy services individually:
railway up --service backend
railway up --service frontend
railway up --service ai-service
```

See `RAILWAY-DEPLOYMENT.md` for full checklist. Never deploy monorepo root directly.

## Key Files Reference

**Critical Config Files**:
- `backend/prisma/schema.prisma` - Database schema (1922 lines, all models)
- `backend/src/server.ts` - Express app setup, middleware chain, route registration
- `backend/src/config/database.ts` - Prisma/Mongoose/Redis clients
- `frontend/src/App.tsx` - React Router setup with lazy loading
- `ai-service/main.py` - FastAPI app with CORS + endpoints

**Documentation**:
- `QUICK-START.md` - Post-implementation setup guide
- `DEPLOYMENT.md` - Vercel deployment (frontend-only)
- `RAILWAY-DEPLOYMENT.md` - Full Railway deployment
- `backend/docs/api-reference.md` - Backend API docs

## Common Pitfalls

1. **Don't run Prisma commands from root** - always `cd backend` first
2. **DEV_MODE=true bypasses auth** - useful for testing, dangerous in production
3. **Port conflicts** - databases use 5434/6380, not default ports
4. **Service dependencies** - Backend needs AI service running for gap analysis endpoints
5. **Frontend builds** - Always `cd frontend && npm run build` (not from root)
6. **Railway deploys** - Deploy services individually, NOT from monorepo root

## Testing New Features

When adding features:
1. Update Prisma schema → `npx prisma generate` → `npx prisma migrate dev`
2. Create service in `backend/src/services/` (class with singleton export)
3. Add controller in `backend/src/controllers/` calling service
4. Register routes in `backend/src/routes/*.routes.ts`
5. Add route to `backend/src/server.ts` route registration block
6. Create Redux slice with `createAsyncThunk` in `frontend/src/store/slices/`
7. Build UI component using MUI + React Hook Form + Zod validation

Always run tests after changes: `npm run test:backend` (Jest) or `npm run test:frontend` (Vitest).
