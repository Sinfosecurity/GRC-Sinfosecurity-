# 🚀 GRC Platform Backend - Deployment Guide

Complete guide for deploying the GRC Platform backend to production.

---

## 📋 **Prerequisites**

- Node.js 18+ installed
- Git installed
- PostgreSQL database (Neon, Railway, or Supabase)
- Account on deployment platform (Railway, Render, or Vercel)

---

## 🎯 **Quick Start Options**

### **Option 1: Railway (Recommended) ⭐**

Railway provides the easiest deployment with built-in PostgreSQL.

#### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

#### Step 2: Login
```bash
railway login
```

#### Step 3: Create New Project
```bash
cd backend
railway init
```

#### Step 4: Add PostgreSQL
```bash
railway add --plugin postgres
```

#### Step 5: Set Environment Variables
```bash
# Railway will auto-set DATABASE_URL
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set CORS_ORIGIN=https://grc-sinfosecurity3.vercel.app
railway variables set DEV_MODE=false
```

#### Step 6: Deploy
```bash
railway up
```

#### Step 7: Run Migrations
```bash
railway run npx prisma migrate deploy
railway run npx ts-node prisma/seed.ts
```

✅ **Done! Your backend is live!**

Get your URL:
```bash
railway domain
```

---

### **Option 2: Render**

#### Step 1: Create `render.yaml` (already created)

#### Step 2: Connect Repository
1. Go to https://render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub repo
4. Select `backend/render.yaml`

#### Step 3: Set Environment Variables
Render will prompt you to set:
- `JWT_SECRET` (generate random string)
- `CORS_ORIGIN` (your frontend URL)
- Database is auto-created

#### Step 4: Deploy
Click "Apply" and Render will:
- Create PostgreSQL database
- Deploy your backend
- Run migrations automatically

✅ **Done!**

---

### **Option 3: Docker (Self-Hosted)**

#### Step 1: Install Docker & Docker Compose

#### Step 2: Configure Environment
```bash
cp .env.example .env
# Edit .env with your production values
nano .env
```

#### Step 3: Build and Run
```bash
docker-compose up -d
```

#### Step 4: Run Migrations
```bash
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx ts-node prisma/seed.ts
```

#### Step 5: Check Logs
```bash
docker-compose logs -f backend
```

✅ **Backend running on http://localhost:4000**

---

### **Option 4: AWS (Enterprise)**

#### Prerequisites
- AWS Account
- AWS CLI configured
- ECR repository created

#### Step 1: Build Docker Image
```bash
docker build -t grc-backend .
```

#### Step 2: Push to ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL
docker tag grc-backend:latest YOUR_ECR_URL/grc-backend:latest
docker push YOUR_ECR_URL/grc-backend:latest
```

#### Step 3: Create RDS PostgreSQL
```bash
# Via AWS Console or CLI
# Note the connection string
```

#### Step 4: Deploy to ECS/EKS
- Create ECS Task Definition
- Set environment variables
- Deploy service

---

## 🗄️ **Database Setup**

### **Neon (Serverless PostgreSQL)**

1. Sign up at https://neon.tech
2. Create new project
3. Copy connection string
4. Add to `.env`:
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/grc_platform?sslmode=require
   ```

### **Supabase**

1. Sign up at https://supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy connection string (Transaction mode)
5. Add to `.env`

### **Railway PostgreSQL**

Automatically configured when you run `railway add --plugin postgres`

---

## 🔧 **Environment Variables Reference**

### **Required**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://your-frontend.com
```

### **Optional but Recommended**
```bash
REDIS_URL=redis://...
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxx
AWS_S3_BUCKET=grc-files
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

---

## 🧪 **Testing Deployment**

### Health Check
```bash
curl https://your-backend-url.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-26T...",
  "uptime": 123.45,
  "environment": "production",
  "devMode": false
}
```

### Test API Endpoint
```bash
curl https://your-backend-url.com/api/v1/risks
```

---

## 📊 **Post-Deployment**

### 1. Run Database Migrations
```bash
npx prisma migrate deploy
```

### 2. Seed Demo Data
```bash
npx ts-node prisma/seed.ts
```

### 3. Create Admin User
Login with:
- Email: `admin@sinfosecurity.com`
- Password: `Admin@123`

**⚠️ Change this password immediately in production!**

### 4. Configure CORS
Update `CORS_ORIGIN` to match your frontend URL:
```bash
CORS_ORIGIN=https://grc-sinfosecurity3.vercel.app,https://*.grc-sinfosecurity.com
```

### 5. Update Frontend API URL
In your frontend `.env`:
```bash
VITE_API_URL=https://your-backend-url.com/api/v1
```

---

## 🔍 **Monitoring & Logging**

### Railway
```bash
railway logs
```

### Render
Check logs in Render dashboard

### Docker
```bash
docker-compose logs -f backend
```

### Database GUI
```bash
npx prisma studio
```

---

## 🚨 **Troubleshooting**

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Database Connection Error
```bash
# Test connection
npx prisma db pull

# Check DATABASE_URL format
echo $DATABASE_URL
```

### Prisma Errors
```bash
# Regenerate Prisma Client
npx prisma generate

# Reset database (⚠️ DESTRUCTIVE)
npx prisma migrate reset
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=4001
```

---

## 📈 **Scaling**

### Railway
```bash
railway up --replicas 3
```

### Docker Compose
```yaml
services:
  backend:
    deploy:
      replicas: 3
```

### Load Balancer
Use Nginx or AWS ALB to distribute traffic

---

## 🔒 **Security Checklist**

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS only
- [ ] Configure rate limiting
- [ ] Set up error monitoring (Sentry)
- [ ] Enable database backups
- [ ] Restrict CORS origins
- [ ] Use environment variables (never commit secrets)
- [ ] Enable audit logging
- [ ] Set up firewall rules

---

## 📞 **Support**

- **Railway**: https://railway.app/help
- **Render**: https://render.com/docs
- **Prisma**: https://www.prisma.io/docs
- **Docker**: https://docs.docker.com

---

## ✅ **Deployment Checklist**

- [ ] Database created and accessible
- [ ] Environment variables configured
- [ ] Migrations run successfully
- [ ] Seed data loaded
- [ ] Health check returns 200 OK
- [ ] API endpoints accessible
- [ ] CORS configured correctly
- [ ] Frontend connected to backend
- [ ] Admin login works
- [ ] Logs are accessible
- [ ] Backups scheduled
- [ ] Monitoring configured

---

**🎉 Your GRC Platform backend is now deployed and production-ready!**

