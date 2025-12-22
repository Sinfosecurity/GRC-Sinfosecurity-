# Railway Deployment Troubleshooting Checklist

If your GRC app is not opening or working in Railway, follow this checklist:

## 1. Deploy Each Service Individually
- Deploy **backend**, **ai-service**, and **frontend** as separate Railway services (not from the monorepo root).
- Set the correct root directory for each service in Railway (e.g., `backend`, `ai-service`, `frontend`).

## 2. Set All Required Environment Variables
- For **backend**:
   - `DATABASE_URL` (Railway PostgreSQL connection string)
   - `JWT_SECRET`, `NODE_ENV`, `CORS_ORIGIN`, `AI_SERVICE_URL`, etc.
- For **ai-service**:
   - `PORT` (Railway sets this automatically)
   - `CORS_ORIGINS`, `BACKEND_URL`, etc.
- For **frontend**:
   - `VITE_API_URL` (URL of your backend Railway service)
   - `VITE_AI_SERVICE_URL` (URL of your AI service Railway service)

## 3. Use the $PORT Variable
- All services must listen on `process.env.PORT` (Node) or `os.getenv("PORT")` (Python).
- Do **not** hardcode ports like 3000, 4000, or 5000.

## 4. Health Checks
- Backend: `/health/basic` or `/health`
- AI Service: `/health`
- Frontend: root URL should return the React app

## 5. Build and Start Commands
- Backend: `npm install --include=dev && npm run db:generate && npm run build` (build), `npm start` (start)
- AI Service: `pip install -r requirements.txt && python -m spacy download en_core_web_sm` (build), `uvicorn main:app --host 0.0.0.0 --port $PORT` (start)
- Frontend: `npm install && npm run build` (build), `node server.js` (start)

## 6. Check Logs and Health in Railway Dashboard
- Open each service in Railway, check the **Logs** and **Health** tabs for errors.
- Common issues: missing env vars, port not listening, build errors, database connection errors.

## 7. Service URLs
- Use Railway’s provided URLs for inter-service communication (e.g., `https://grc-backend.up.railway.app`).
- For internal calls, you can use `http://service-name:PORT` if in the same project.

## 8. Database and External Services
- Ensure Railway PostgreSQL, MongoDB, and Redis are provisioned and env vars are set.

## 9. Final Steps
- After fixing issues, redeploy the affected service.
- If you see a blank page or 502, check logs and health checks again.

---
For more details, see `RAILWAY-DEPLOYMENT.md` and Railway’s official docs.
# Railway Deployment Diagnostic

## Current Status (Dec 20, 2025)

### Observed Behavior
- ✅ grc-backend shows "Online" status
- ⚠️ grc-backend has warning icon (1)
- ❌ Backend API returns 404 errors
- ❌ Frontend page loads HTML but blank screen

### From Deploy Logs (Partial)
```
✅ PostgreSQL connected successfully
✅ Migrations ran: "No pending migrations to apply"  
✅ Server start command executed
```

### Likely Issues

#### 1. Backend Not Listening on Correct Port
**Symptom**: Server starts but Railway can't connect
**Check in logs for**: `Server running on port ${PORT}`
**Solution**: Ensure server.ts uses `process.env.PORT` (not hardcoded 4000)

#### 2. Server Crashed After Startup
**Symptom**: Shows "Online" briefly then fails silently
**Check in logs for**: Error messages after the start command
**Solution**: Look for uncaught exceptions or missing dependencies

#### 3. Frontend Missing Backend URL
**Symptom**: Frontend loads but blank screen
**Check**: grc-frontend Variables tab
**Required**: `VITE_API_URL=https://grc-backend-production-5586.up.railway.app`

### Diagnostic Steps

#### Step 1: Check Full Backend Logs
In Railway Dashboard → grc-backend → Logs:
1. Scroll to the BOTTOM (most recent)
2. Look for:
   - ✅ "Server running on port..."  
   - ❌ Any red error messages
   - ❌ "Exited with code 1"

#### Step 2: Check Environment Variables
In Railway Dashboard → grc-backend → Variables:
- [ ] `DATABASE_URL` is set (should be automatic)
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` is set
- [ ] No `PORT` variable (Railway sets this automatically)

#### Step 3: Check Frontend Configuration
In Railway Dashboard → grc-frontend → Variables:
- [ ] `VITE_API_URL` points to backend URL
- [ ] Frontend is rebuilt after adding VITE_API_URL

#### Step 4: Manual Trigger Redeploy
If logs show old deployment:
1. Go to grc-backend → Settings
2. Trigger manual redeploy
3. Watch logs for complete startup sequence

### Expected Successful Logs Should Show:
```
✅ PostgreSQL connected successfully
✅ Database connections established
✅ Cache service initialized (or warning if Redis missing - OK)
✅ Background jobs scheduled (or warning - OK)
✅ Health checks registered
🚀 Server running on port 3000 (or whatever Railway assigns)
💚 Health check: http://...
📚 API Docs: http://...
```

### Quick Test Commands
```bash
# Test backend health (update URL to your actual backend URL)
curl https://grc-backend-production-5586.up.railway.app/health

# Should return JSON like:
# {"status":"healthy","timestamp":"..."}

# Test frontend
curl -I https://grc1.up.railway.app
# Should return 200 OK with HTML
```

### Common Fixes

#### If backend keeps crashing:
1. Check for missing required env vars
2. Verify DATABASE_URL is correct
3. Check memory limits (free tier = 512MB)
4. Look for infinite restart loops

#### If frontend is blank:
1. Add `VITE_API_URL` to frontend variables
2. Trigger frontend redeploy after adding variable
3. Check browser console (F12) for errors
4. Verify CORS is configured in backend

### Next Steps
1. Screenshot the FULL backend logs (scroll to bottom)
2. Check and share frontend Variables tab
3. Share any error messages from browser console (F12)
