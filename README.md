# GRC Platform - Sinfosecurity

A comprehensive AI-powered Governance, Risk, and Compliance (GRC) platform supporting global regulations (GDPR, HIPAA, CCPA, LGPD, APPI), ISO 27001, and TISAX.

## Project Structure

```
GRC/
├── frontend/           # React TypeScript frontend
├── backend/            # Node.js Express backend
├── ai-service/         # Python AI/ML microservice
├── database/           # Database schemas and migrations
├── docs/              # Documentation
└── shared/            # Shared types and utilities
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: Redux Toolkit
- **Charts**: Recharts + D3.js
- **Forms**: React Hook Form with Zod validation
- **Routing**: React Router v6

### Backend
- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js
- **API**: REST + GraphQL (Apollo Server)
- **Authentication**: JWT + OAuth 2.0
- **ORM**: Prisma (PostgreSQL) + Mongoose (MongoDB)

### Database
- **Relational**: PostgreSQL 15 (compliance data, users, risk assessments)
- **Document Store**: MongoDB 7 (policies, documents, unstructured data)
- **Cache**: Redis 7
- **Search**: Elasticsearch 8

### AI/ML
- **Language**: Python 3.11
- **Framework**: FastAPI
- **ML Libraries**: scikit-learn, TensorFlow, Hugging Face Transformers
- **NLP**: spaCy for text analysis

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Testing**: Jest, Cypress, pytest
- **Code Quality**: ESLint, Prettier, Black

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker Desktop
- PostgreSQL 15
- MongoDB 7

### Installation

```bash
# Install all dependencies
npm run install:all

# Set up databases
docker-compose up -d

# Run migrations
npm run db:migrate

# Start development servers
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- AI Service: http://localhost:5000
- GraphQL Playground: http://localhost:4000/graphql

## Features

### Core Modules
- ✅ Risk Management
- ✅ Controls Management
- ✅ Compliance Management (GDPR, HIPAA, CCPA, LGPD, APPI)
- ✅ ISO 27001 Integration
- ✅ TISAX Integration
- ✅ Incident Management
- ✅ Policy Management
- ✅ Document Management

### AI-Powered Features
- ✅ Automated Gap Analysis
- ✅ Compliance Scoring
- ✅ Predictive Risk Analytics
- ✅ Intelligent Audit Preparation
- ✅ Smart Recommendations

### Enterprise Features
- ✅ Multi-tenancy
- ✅ Role-Based Access Control (RBAC)
- ✅ Multi-language Support
- ✅ API Integration
- ✅ Custom Reporting
- ✅ Audit Trails

## Development

```bash
# Frontend development
cd frontend && npm run dev

# Backend development
cd backend && npm run dev

# AI service development
cd ai-service && python -m uvicorn main:app --reload

# Run tests
npm run test

# Run linting
npm run lint
```

## Documentation

- [Architecture Documentation](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [User Guide](./docs/user-guide.md)
- [Deployment Guide](./docs/deployment.md)

## License

Proprietary - Sinfosecurity © 2024
