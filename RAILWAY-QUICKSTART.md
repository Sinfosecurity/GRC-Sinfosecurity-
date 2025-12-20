# Railway Quick Start Guide

## 🚀 Deploy to Railway in 5 Minutes

### Step 1: Install Railway CLI

```bash
# Using npm
npm install -g @railway/cli

# Or using Homebrew (macOS)
brew install railway
```

### Step 2: Login to Railway

```bash
railway login
```

### Step 3: Create New Project

```bash
railway init
```

### Step 4: Deploy via Dashboard

1. Go to [railway.app/new](https://railway.app/new)
2. Connect your GitHub repository
3. Add PostgreSQL database
4. Deploy three services (backend, frontend, ai-service)

### Step 5: Set Environment Variables

Copy values from:
- `.env.railway.backend` → Backend service variables
- `.env.railway.frontend` → Frontend service variables  
- `.env.railway.ai-service` → AI service variables

### Step 6: Deploy!

Railway auto-deploys on git push to your connected branch.

---

## 📋 Deployment Checklist

- [ ] Railway account created
- [ ] Railway CLI installed and authenticated
- [ ] PostgreSQL database added
- [ ] Backend deployed
- [ ] AI service deployed
- [ ] Frontend deployed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Health checks passing

---

## 🔧 Quick Commands

```bash
# View deployment logs
railway logs

# Run database migrations
railway run npm run db:migrate

# Check service status
railway status

# Open in browser
railway open

# Connect to database
railway connect postgres
```

---

## 📚 Documentation

- **Full Guide**: [RAILWAY-DEPLOYMENT.md](RAILWAY-DEPLOYMENT.md)
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Support**: [Discord](https://discord.gg/railway)

---

## 💡 Pro Tips

1. **Use Railway's PostgreSQL** - Automatic DATABASE_URL configuration
2. **Enable Auto-Deploy** - Push to git = automatic deployment
3. **Monitor Costs** - Check usage in Railway dashboard
4. **Set Up Staging** - Create separate project for testing
5. **Use Internal URLs** - For service-to-service communication

---

## 🆘 Need Help?

Run the preparation script:
```bash
chmod +x deploy-railway.sh
./deploy-railway.sh
```

Or check the full deployment guide in [RAILWAY-DEPLOYMENT.md](RAILWAY-DEPLOYMENT.md)
