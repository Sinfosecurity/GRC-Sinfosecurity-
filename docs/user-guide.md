# Getting Started with GRC Platform

## Quick Start

### Prerequisites
- **Node.js**: 20.x or newer
- **Python**: 3.11 or newer
- **Docker Desktop**: Latest version
- **Git**: For version control

### Installation

1. **Clone or navigate to the GRC project:**
   ```bash
   cd /Users/tahirah-macmini/Documents/GRC
   ```

2. **Run the automated setup:**
   ```bash
   ./setup.sh
   ```

   This will:
   - Install all dependencies (frontend, backend, AI service)
   - Start database services with Docker
   - Set up environment variables
   - Run database migrations

3. **Start the development servers:**
   ```bash
   npm run dev
   ```

   Or start services individually:
   ```bash
   # Terminal 1 - Frontend
   cd frontend && npm run dev

   # Terminal 2 - Backend
   cd backend && npm run dev

   # Terminal 3 - AI Service
   cd ai-service && python3 main.py
   ```

4. **Access the application:**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:4000
   - **AI Service**: http://localhost:5000
   - **API Health Check**: http://localhost:4000/health

## Project Structure

```
GRC/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components (Dashboard, Risk, etc.)
│   │   ├── services/        # API service layer
│   │   ├── store/           # Redux state management
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── package.json
│
├── backend/                  # Node.js Express API
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Express middleware
│   │   ├── config/          # Configuration files
│   │   └── utils/           # Utility functions
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
│
├── ai-service/               # Python FastAPI AI service
│   ├── app/
│   │   ├── services/        # AI/ML services
│   │   ├── models/          # ML models
│   │   └── utils/           # Utility functions
│   ├── main.py              # FastAPI application
│   └── requirements.txt
│
├── docs/                     # Documentation
│   ├── architecture.md
│   ├── api.md
│   └── user-guide.md (this file)
│
├── docker-compose.yml        # Database services
├── package.json              # Root package.json
└── README.md
```

## Features Overview

### 1. Dashboard
The main dashboard provides:
- Overall compliance score
- Active risks overview
- Open incidents count
- Implemented controls
- Compliance framework scores (GDPR, HIPAA, CCPA, etc.)
- Risk trend analysis
- Incident distribution
- Quick action cards

### 2. Risk Management
- Create and track risks
- Categorize by type (Cybersecurity, Data Privacy, Operational, etc.)
- Assess likelihood and impact
- Calculate risk scores automatically
- Assign risk owners
- Link controls to risks
- Monitor mitigation progress

### 3. Compliance Management
- Support for multiple frameworks:
  - GDPR (EU)
  - HIPAA (US Healthcare)
  - CCPA (California)
  - LGPD (Brazil)
  - APPI (Japan)
  - ISO 27001
  - TISAX (Automotive)
  - Custom frameworks

- AI-powered gap analysis
- Compliance scoring
- Requirement tracking
- Evidence collection
- Audit preparation

### 4. Controls Management
- Define security controls
- Categorize by type (Preventive, Detective, Corrective)
- Track implementation status
- Test control effectiveness
- Link controls to compliance requirements
- Monitor control health

### 5. Incident Management
- Report security incidents
- Categorize by severity (Critical, High, Medium, Low)
- Track investigation progress
- Document root cause analysis
- Record resolution steps
- Generate incident reports

### 6. Policy Management
- Create and manage policies
- Version control
- Approval workflows
- Schedule policy reviews
- Publish to organization
- Track acknowledgments

### 7. Document Management
- Secure document storage
- Categorization and tagging
- Full-text search
- Version history
- Access controls
- Retention policies

### 8. ISO 27001 & TISAX
- Dedicated modules for these standards
- Control mapping
- Assessment workflows
- Certification tracking
- Evidence management

## User Roles & Permissions

### Superadmin
- Full system access
- Manage organizations
- System configuration

### Admin
- Manage organization settings
- Create and manage users
- Access all modules
- Approve policies

### Compliance Officer
- Manage compliance frameworks
- Run gap analyses
- Prepare for audits
- Track requirements

### Risk Manager
- Manage risks and assessments
- Assign controls
- Review risk reports
- Monitor risk trends

### Auditor
- Read-only access
- Generate reports
- Review audit trails
- Access all compliance data

### User
- Basic access
- Report incidents
- View assigned tasks
- Read policies

## Workflows

### Running a Compliance Gap Analysis

1. Navigate to **Compliance** section
2. Select a framework (e.g., GDPR)
3. Click **Run Gap Analysis**
4. Review identified gaps
5. View AI recommendations
6. Create remediation tasks
7. Track progress

### Creating a Risk Assessment

1. Navigate to **Risk Management**
2. Click **New Risk Assessment**
3. Enter risk details:
   - Title and description
   - Category
   - Likelihood (1-5)
   - Impact (1-5)
4. Assign risk owner
5. Define mitigation steps
6. Link relevant controls
7. Save and monitor

### Reporting an Incident

1. Navigate to **Incidents**
2. Click **Report Incident**
3. Fill in details:
   - Title and description
   - Severity level
   - Category
4. Submit report
5. Incident enters investigation workflow
6. Track to resolution

## API Integration

### Authentication

Get a JWT token:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
```

Use the token in subsequent requests:
```bash
curl -X GET http://localhost:4000/api/v1/risks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

See [api.md](./api.md) for full API documentation.

## Configuration

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://grc_user:grc_password@localhost:5432/grc_platform"
MONGODB_URI="mongodb://grc_user:grc_password@localhost:27017/grc_documents"
JWT_SECRET="your-secret-key"
```

**AI Service (.env):**
```env
PORT=5000
MODEL_PATH=./models
```

## Database Management

### View Database with Prisma Studio
```bash
cd backend
npx prisma studio
```

### Run Migrations
```bash
cd backend
npx prisma migrate dev --name your_migration_name
```

### Reset Database
```bash
cd backend
npx prisma migrate reset
```

## Testing

### Frontend Tests
```bash
cd frontend
npm test
```

### Backend Tests
```bash
cd backend
npm test
```

### AI Service Tests
```bash
cd ai-service
pytest
```

## Troubleshooting

### Docker Issues
If databases don't start:
```bash
docker-compose down
docker-compose up -d
docker-compose logs
```

### Port Already in Use
Change ports in:
- `frontend/vite.config.ts` (frontend port)
- `backend/.env` (backend port)
- `ai-service/.env` (AI service port)

### Prisma Client Issues
Regenerate Prisma client:
```bash
cd backend
npx prisma generate
```

### Node Modules Issues
Clean install:
```bash
./cleanup.sh
./setup.sh
```

## Best Practices

### Security
- Never commit `.env` files
- Use strong JWT secrets in production
- Enable rate limiting
- Implement MFA for admin accounts
- Regular security updates

### Performance
- Use Redis caching for frequent queries
- Implement pagination for large datasets
- Optimize database queries
- Enable compression for API responses

### Data Management
- Regular database backups
- Implement data retention policies
- Archive old records
- Monitor database growth

## Support & Resources

- **Architecture**: [architecture.md](./architecture.md)
- **API Documentation**: [api.md](./api.md)
- **GitHub Issues**: (Add your repository URL)
- **Email Support**: support@sinfosecurity.com

## Next Steps

1. **Customize the platform** for your organization
2. **Import existing data** using the API
3. **Configure compliance frameworks** for your jurisdiction
4. **Train users** on platform features
5. **Set up integrations** with existing tools
6. **Schedule regular reviews** of risks and compliance

## License

Proprietary - Sinfosecurity © 2024
