# GRC Platform - Vercel Deployment Guide

## Quick Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy from project root**:
```bash
cd /Users/tahirah-macmini/Documents/GRC
vercel
```

4. **Follow the prompts**:
   - Set up and deploy? **Yes**
   - Which scope? *Choose your account*
   - Link to existing project? **No** (for new project)
   - Project name: `sinfosecurity-grc`
   - In which directory is your code located? **`.`** (current directory)
   - Want to override settings? **Yes**
   - Build Command? **Leave as detected OR use**: `cd frontend && npm run build`
   - Output Directory? **`frontend/dist`**
   - Development Command? `cd frontend && npm run dev`

5. **Done!** Vercel will provide you with a URL.

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and login
2. Click "Add New Project"
3. Import your GitHub repository: `Sinfosecurity/GRC-Sinfosecurity-`
4. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: Leave as `.` (we use vercel.json)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `cd frontend && npm install`

5. Click "Deploy"

## Project Structure

```
GRC/
├── vercel.json          ← Vercel configuration
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   └── dist/           ← Build output
└── backend/
    └── (not deployed to Vercel)
```

## Environment Variables (if needed)

If you need to add environment variables in Vercel:

1. Go to Project Settings → Environment Variables
2. Add:
   - `VITE_API_URL` = Your backend API URL (when deployed separately)
   - Any other required variables

## Troubleshooting

### Issue: "Nothing shows on Vercel"

**Solution**: Make sure:
- `vercel.json` is in the project root
- Build command includes `cd frontend &&`
- Output directory is `frontend/dist`

### Issue: "404 on routes"

**Solution**: The `vercel.json` includes rewrites for SPA routing. Make sure it's deployed correctly.

### Issue: "Build fails"

**Solution**: Check that:
1. All dependencies are in `frontend/package.json`
2. Build command runs successfully locally: `cd frontend && npm run build`
3. Check Vercel build logs for specific errors

## Testing Locally Before Deploy

```bash
cd frontend
npm install
npm run build
npm run preview
```

This will start a local preview server on port 4173.

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow Vercel's DNS configuration instructions

---

**Note**: The backend (`backend/` directory) should be deployed separately to a Node.js hosting service like:
- Heroku
- Railway
- AWS EC2/ECS
- DigitalOcean App Platform
- Or any Node.js hosting provider
