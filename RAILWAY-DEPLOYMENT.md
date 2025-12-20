# Railway Deployment Guide - GRC Platform

## Overview

This guide will help you deploy the GRC Platform to Railway. The platform consists of three main services:
1. **Backend** (Node.js/Express + PostgreSQL)
2. **AI Service** (Python FastAPI)
3. **Frontend** (React/Vite)

## Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- Railway CLI (optional, but recommended)
- GitHub repository with your code

## Quick Start

### Option 1: Deploy via Railway Dashboard (Recommended for first-time)

#### Step 1: Create New Project

1. Go to [railway.app](https://railway.app) and login
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authenticate and select your repository

#### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL instance
4. Note: `DATABASE_URL` environment variable is auto-generated

#### Step 3: Deploy Backend Service

1. Click **"New"** → **"GitHub Repo"** (or use existing repo)
2. Select **"Add Service"**
3. Configure the service:
   - **Name**: `grc-backend`
   - **Root Directory**: `backend`
   - **Start Command**: (Auto-detected from railway.json)
4. Add environment variables (see Environment Variables section below)
5. Click **"Deploy"**

#### Step 4: Deploy AI Service

1. Click **"New"** → **"GitHub Repo"**
2. Add another service from the same repo:
   - **Name**: `grc-ai-service`
   - **Root Directory**: `ai-service`
   - **Start Command**: (Auto-detected from railway.json)
3. Add environment variables
4. Click **"Deploy"**

#### Step 5: Deploy Frontend

1. Click **"New"** → **"GitHub Repo"**
2. Add final service:
   - **Name**: `grc-frontend`
   - **Root Directory**: `frontend`
   - **Start Command**: (Auto-detected from railway.json)
3. Add environment variables:
   - `VITE_API_URL`: URL from your backend service
   - `VITE_AI_SERVICE_URL`: URL from your AI service
4. Click **"Deploy"**

### Option 2: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# or with homebrew on macOS
brew install railway

# Login
railway login

# Create new project
railway init

# Link to existing project (if already created)
railway link

# Deploy backend
cd backend
railway up

# Deploy AI service
cd ../ai-service
railway up

# Deploy frontend
cd ../frontend
railway up
```

## Environment Variables

### Backend Service Environment Variables

```bash
# Database (Auto-provided by Railway if using Railway PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server
NODE_ENV=production
PORT=3000

# CORS
CORS_ORIGIN=https://your-frontend-url.railway.app

# AI Service
AI_SERVICE_URL=https://your-ai-service.railway.app

# MongoDB (if using external MongoDB)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/grc

# Redis (if using external Redis)
REDIS_URL=redis://default:password@host:port

# Optional: External Services
SENDGRID_API_KEY=your-sendgrid-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

### AI Service Environment Variables

```bash
# Server
PORT=8000
ENVIRONMENT=production

# Backend API
BACKEND_URL=https://your-backend-url.railway.app

# Optional: Model Configuration
MODEL_PATH=/app/models
HUGGING_FACE_TOKEN=your-token
```

### Frontend Environment Variables

```bash
# API URLs
VITE_API_URL=https://your-backend-url.railway.app
VITE_AI_SERVICE_URL=https://your-ai-service.railway.app

# Optional: Feature Flags
VITE_ENABLE_ANALYTICS=true
```

## Post-Deployment Steps

### 1. Run Database Migrations

After deploying the backend, run migrations:

```bash
# Via Railway CLI
railway run npm run db:migrate

# Or in Railway Dashboard
# Go to backend service → Settings → Deploy → Add custom deploy command
# npm run db:migrate && npm start
```

### 2. Verify Health Checks

Check each service:
- Backend: `https://your-backend-url.railway.app/health`
- AI Service: `https://your-ai-service-url.railway.app/health`
- Frontend: `https://your-frontend-url.railway.app`

### 3. Set Up Custom Domains (Optional)

1. Go to service settings
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Update DNS records as instructed

## Service Configuration Details

### Backend (Node.js)

- **Build Command**: `npm install --include=dev && npm run db:generate && npm run build`
- **Start Command**: `npm start`
- **Port**: Uses `$PORT` environment variable (Railway auto-assigns)
- **Health Check**: `/health` endpoint

### AI Service (Python)

- **Build Command**: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Port**: Uses `$PORT` environment variable
- **Health Check**: `/health` endpoint

### Frontend (React/Vite)

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm install -g serve && serve -s dist -l $PORT`
- **Port**: Uses `$PORT` environment variable
- **Output Directory**: `dist/`

## Troubleshooting

### Build Fails

**Backend:**
```bash
# Check if Prisma generates correctly
railway run npx prisma generate

# Check Node version
railway run node --version  # Should be 20.x
```

**AI Service:**
```bash
# Check Python version
railway run python --version  # Should be 3.11

# Check if spaCy model downloads
railway run python -m spacy download en_core_web_sm
```

**Frontend:**
```bash
# Check if build works locally
npm run build

# Verify environment variables are set
railway variables
```

### Database Connection Issues

1. Verify `DATABASE_URL` is set correctly
2. Check if Prisma schema matches database
3. Run migrations: `railway run npm run db:migrate`

### Service Can't Connect to Each Other

1. Use Railway's internal service URLs (not public URLs)
2. Check environment variables are set correctly
3. Ensure services are in the same Railway project

### Port Issues

Railway automatically assigns a `$PORT` environment variable. Make sure your services use it:

**Backend (Express):**
```typescript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

**AI Service (FastAPI):**
```python
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

## Advanced Configuration

### Using Railway's Internal Network

For service-to-service communication within Railway:

1. Use internal URLs: `http://service-name.railway.internal:port`
2. No need for HTTPS between internal services
3. Faster and more secure

### Setting Up Monitoring

Railway provides:
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time log streaming
- **Deployments**: Version history and rollback

Access via: Project → Service → Metrics/Logs

### CI/CD with Railway

Railway auto-deploys on git push:

1. Connect GitHub repo
2. Select branch (e.g., `main`, `production`)
3. Railway auto-deploys on push
4. Optional: Add GitHub Actions for tests before deploy

### Scaling

1. Go to service **Settings** → **Resources**
2. Adjust:
   - **Memory**: 512MB - 32GB
   - **CPU**: Shared - Dedicated
   - **Replicas**: 1-10 instances

## Cost Optimization

1. **Start Small**: Begin with minimum resources
2. **Use Shared Resources**: Good for development
3. **Monitor Usage**: Check Railway dashboard for metrics
4. **Database Backups**: Enable for production
5. **Sleep Inactive Services**: Set in service settings

## Security Best Practices

1. **Environment Variables**: Never commit secrets
2. **CORS**: Set proper CORS_ORIGIN for backend
3. **HTTPS**: Railway provides free SSL for all services
4. **Database**: Use Railway PostgreSQL for easy management
5. **Secrets**: Use Railway's secret management

## Useful Railway CLI Commands

```bash
# Check project status
railway status

# View logs
railway logs

# Run commands in Railway environment
railway run <command>

# Set environment variable
railway variables set KEY=value

# Open service in browser
railway open

# Link to different project
railway link

# Connect to PostgreSQL
railway connect postgres
```

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Railway Status**: [status.railway.app](https://status.railway.app)

## Next Steps

After successful deployment:

1. ✅ Set up custom domain
2. ✅ Configure monitoring and alerts
3. ✅ Set up database backups
4. ✅ Configure auto-scaling if needed
5. ✅ Set up staging environment
6. ✅ Configure CI/CD pipeline
7. ✅ Review security settings
8. ✅ Monitor costs and usage

---

**Need Help?** Check Railway documentation or reach out to their support team!
