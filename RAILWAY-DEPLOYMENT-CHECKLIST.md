# Railway Deployment Checklist

Use this checklist to ensure successful deployment of your GRC Platform to Railway.

## Pre-Deployment

### 1. Railway Account Setup
- [ ] Railway account created at [railway.app](https://railway.app)
- [ ] Railway CLI installed (`npm install -g @railway/cli`)
- [ ] Logged into Railway CLI (`railway login`)
- [ ] Verified login (`railway whoami`)

### 2. Repository Setup
- [ ] Code pushed to GitHub repository
- [ ] All railway.json files in place
- [ ] All nixpacks.toml files in place
- [ ] .railwayignore file configured
- [ ] Environment variable templates reviewed

### 3. Local Testing
- [ ] Backend builds successfully (`cd backend && npm run build`)
- [ ] Frontend builds successfully (`cd frontend && npm run build`)
- [ ] AI service runs locally (`cd ai-service && uvicorn main:app`)
- [ ] All tests passing

## Railway Project Setup

### 4. Create Railway Project
- [ ] New project created in Railway dashboard
- [ ] GitHub repository connected
- [ ] Project name set (e.g., "grc-platform")

### 5. Add PostgreSQL Database
- [ ] PostgreSQL addon added to project
- [ ] DATABASE_URL automatically generated
- [ ] Database accessible from project services

### 6. Deploy Backend Service
- [ ] Backend service created from GitHub repo
- [ ] Root directory set to `backend`
- [ ] Environment variables configured:
  - [ ] DATABASE_URL (auto-set)
  - [ ] JWT_SECRET
  - [ ] JWT_EXPIRES_IN
  - [ ] NODE_ENV=production
  - [ ] CORS_ORIGIN
  - [ ] AI_SERVICE_URL
- [ ] Service deployed successfully
- [ ] Health check endpoint accessible
- [ ] Database migrations run (`railway run npm run db:migrate`)

### 7. Deploy AI Service
- [ ] AI service created from GitHub repo
- [ ] Root directory set to `ai-service`
- [ ] Environment variables configured:
  - [ ] BACKEND_URL
  - [ ] PORT (auto-set)
  - [ ] ENVIRONMENT=production
- [ ] Service deployed successfully
- [ ] Health check endpoint accessible

### 8. Deploy Frontend Service
- [ ] Frontend service created from GitHub repo
- [ ] Root directory set to `frontend`
- [ ] Environment variables configured:
  - [ ] VITE_API_URL (backend URL)
  - [ ] VITE_AI_SERVICE_URL (AI service URL)
- [ ] Service deployed successfully
- [ ] Application accessible in browser

## Post-Deployment Verification

### 9. Service Health Checks
- [ ] Backend health: `https://[backend-url]/health`
- [ ] AI service health: `https://[ai-service-url]/health`
- [ ] Frontend loads: `https://[frontend-url]`
- [ ] All services returning 200 OK

### 10. Database Verification
- [ ] Database migrations applied
- [ ] Prisma client generated
- [ ] Database tables created
- [ ] Sample data accessible (if seeded)

### 11. API Testing
- [ ] Backend API endpoints responding
- [ ] Authentication working
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Error handling working

### 12. Frontend Integration
- [ ] Frontend connects to backend
- [ ] Login/authentication working
- [ ] Dashboard loads
- [ ] API calls successful
- [ ] No CORS errors in console

### 13. AI Service Integration
- [ ] Backend can reach AI service
- [ ] AI endpoints responding
- [ ] Gap analysis working
- [ ] Risk prediction working
- [ ] Recommendations generating

## Production Readiness

### 14. Security Configuration
- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS enabled (Railway default)
- [ ] CORS properly configured
- [ ] Rate limiting configured
- [ ] Helmet middleware active
- [ ] Input validation working

### 15. Monitoring Setup
- [ ] Railway metrics enabled
- [ ] Log streaming configured
- [ ] Health check intervals set
- [ ] Restart policies configured
- [ ] Error tracking setup (optional: Sentry)

### 16. Domain Configuration (Optional)
- [ ] Custom domain added to frontend
- [ ] DNS records configured
- [ ] SSL certificate provisioned
- [ ] Domain redirects working

### 17. Backup and Recovery
- [ ] Database backups enabled
- [ ] Backup schedule configured
- [ ] Recovery plan documented
- [ ] Rollback process tested

## Optimization

### 18. Performance Tuning
- [ ] Resource allocation reviewed
- [ ] Scaling settings configured
- [ ] CDN configured (if needed)
- [ ] Caching strategies implemented

### 19. Cost Management
- [ ] Current usage reviewed
- [ ] Billing alerts set
- [ ] Resource limits configured
- [ ] Unused services removed

### 20. Documentation
- [ ] Deployment documented
- [ ] Environment variables documented
- [ ] Runbook created
- [ ] Team access configured

## Going Live

### 21. Final Verification
- [ ] All services running
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security audit complete
- [ ] Backup tested
- [ ] Rollback plan ready

### 22. Team Communication
- [ ] Team notified of deployment
- [ ] Access credentials shared securely
- [ ] Documentation shared
- [ ] Support plan in place

### 23. Monitoring Post-Launch
- [ ] Monitor logs for errors
- [ ] Watch metrics dashboards
- [ ] Check user feedback
- [ ] Monitor costs
- [ ] Review performance

## Troubleshooting Reference

If issues occur, check:

1. **Build Failures**: Check Railway build logs
2. **Runtime Errors**: Check Railway service logs
3. **Database Issues**: Verify DATABASE_URL and migrations
4. **CORS Errors**: Check CORS_ORIGIN settings
5. **Port Issues**: Ensure using $PORT environment variable
6. **Service Communication**: Use Railway internal URLs

## Quick Commands

```bash
# View logs
railway logs

# Run migrations
railway run npm run db:migrate

# Check status
railway status

# Open service
railway open

# Connect to database
railway connect postgres
```

## Success Criteria

✅ All services deployed and healthy
✅ Database connected and migrated
✅ Frontend accessible and functional
✅ Backend API responding correctly
✅ AI service integrated successfully
✅ Authentication working
✅ No critical errors in logs
✅ Performance acceptable
✅ Security configured
✅ Team has access

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Railway Project**: _______________
**Production URL**: _______________

---

## Notes

Add any deployment-specific notes here:

___________________________________________________________________
___________________________________________________________________
___________________________________________________________________
