# 🚀 GRC Platform Backend

Enterprise-grade GRC (Governance, Risk, and Compliance) platform backend API built with Node.js, TypeScript, Express, and PostgreSQL.

## ⚡ Quick Start

### Option 1: Development Mode (No Database Required)
```bash
cd backend
chmod +x scripts/quickstart.sh
./scripts/quickstart.sh
npm run dev
```

### Option 2: With PostgreSQL Database
```bash
cd backend
cp .env.example .env
# Edit .env and set your DATABASE_URL
npm install
npx prisma generate
npx prisma migrate dev
npx ts-node prisma/seed.ts
npm run dev
```

🎉 **Backend running at**: `http://localhost:4000`  
💚 **Health check**: `http://localhost:4000/health`  
📊 **API docs**: `http://localhost:4000/api/v1`

---

## 📦 Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Caching**: Redis (optional)
- **Authentication**: JWT
- **Validation**: Zod
- **Logging**: Winston
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting

---

## 🗄️ Database Options

### Neon (Recommended for Serverless)
```bash
# Sign up at https://neon.tech
# Copy connection string to .env:
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/grc?sslmode=require
```

### Railway (Easiest Full Stack)
```bash
railway login
railway init
railway add --plugin postgres
railway run npx prisma migrate deploy
```

### Supabase
```bash
# Sign up at https://supabase.com
# Get connection string from Settings > Database
DATABASE_URL=postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres
```

### Docker (Local Development)
```bash
docker-compose up -d
npx prisma migrate dev
```

---

## 🚀 Deployment

### Railway (One Command!)
```bash
cd backend
chmod +x scripts/deploy-railway.sh
./scripts/deploy-railway.sh
```

### Render
```bash
# Push to GitHub
# Connect repo at https://render.com
# render.yaml will auto-configure everything
```

### Docker
```bash
docker build -t grc-backend .
docker run -p 4000:4000 --env-file .env grc-backend
```

📖 **Full deployment guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📚 API Documentation

### Base URL
```
Production: https://your-domain.com/api/v1
Development: http://localhost:4000/api/v1
```

### Authentication
```bash
# Login
POST /api/v1/auth/login
Body: { "email": "user@example.com", "password": "password" }

# Get JWT token, then use in headers:
Authorization: Bearer <token>
```

### Core Endpoints
```
GET  /api/v1/risks              # List all risks
POST /api/v1/risks              # Create risk
GET  /api/v1/compliance         # Compliance status
POST /api/v1/compliance/analyze # Run gap analysis
GET  /api/v1/controls           # List controls
POST /api/v1/incidents          # Report incident
GET  /api/v1/policies           # List policies
GET  /api/v1/users              # List users (admin)
```

📖 **Full API reference**: [docs/api-reference.md](./docs/api-reference.md)

---

## 🧪 Testing

```bash
# Run health check
curl http://localhost:4000/health

# Test API endpoint
curl http://localhost:4000/api/v1/risks \
  -H "Authorization: Bearer YOUR_TOKEN"

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

## 🔒 Security

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation (Zod)
- ✅ SQL injection protection (Prisma)
- ✅ Audit logging

---

## 🛠️ Development

### Project Structure
```
backend/
├── src/
│   ├── config/          # Configuration (DB, Logger)
│   ├── middleware/      # Auth, Error Handling, Rate Limiting
│   ├── routes/          # API Routes
│   ├── services/        # Business Logic
│   ├── types/           # TypeScript Types
│   ├── utils/           # Utilities
│   └── server.ts        # Entry Point
├── prisma/
│   ├── schema.prisma    # Database Schema
│   ├── seed.ts          # Seed Data
│   └── migrations/      # Database Migrations
├── scripts/             # Deployment Scripts
├── .env.example         # Environment Template
└── Dockerfile           # Docker Configuration
```

### Available Scripts
```bash
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm start                # Run production server
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema without migration
npm run db:migrate       # Run migrations
```

### Environment Variables
```bash
# See .env.example for full list
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
DEV_MODE=true  # Set to false for production
```

---

## 📊 Database Management

### Create Migration
```bash
npx prisma migrate dev --name add_new_feature
```

### Reset Database (⚠️ Destructive)
```bash
npx prisma migrate reset
```

### View Data
```bash
npx prisma studio  # Opens at http://localhost:5555
```

### Backup Database
```bash
pg_dump $DATABASE_URL > backup.sql
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env
PORT=4001
```

### Database Connection Failed
```bash
# Test connection
npx prisma db pull

# Verify DATABASE_URL format
echo $DATABASE_URL
```

### Prisma Client Not Generated
```bash
npx prisma generate
```

### Build Errors
```bash
rm -rf node_modules dist
npm install
npm run build
```

---

## 📈 Monitoring

### Logs
```bash
# Development
npm run dev  # Logs to console

# Production
tail -f logs/all.log
tail -f logs/error.log
```

### Health Check
```bash
curl http://localhost:4000/health
```

### Metrics
- Request logging via Morgan
- Error tracking via Winston
- Database monitoring via Prisma
- (Optional) Sentry for error tracking

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file

---

## 🆘 Support

- 📖 [Full Documentation](./docs/)
- 🚀 [Deployment Guide](./DEPLOYMENT.md)
- 🔗 [API Reference](./docs/api-reference.md)
- 🐛 [Report Issues](https://github.com/Sinfosecurity/GRC-Sinfosecurity-/issues)

---

## ✅ Production Checklist

Before deploying to production:

- [ ] Set `DEV_MODE=false` in .env
- [ ] Change default `JWT_SECRET` to secure random string
- [ ] Configure production `DATABASE_URL`
- [ ] Set proper `CORS_ORIGIN`
- [ ] Enable HTTPS only
- [ ] Configure error monitoring (Sentry)
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Review security headers
- [ ] Test all API endpoints
- [ ] Run database migrations
- [ ] Seed initial data
- [ ] Change default admin password

---

**🎉 Ready to deploy your GRC platform backend!**

For questions or support, contact: support@sinfosecurity.com

