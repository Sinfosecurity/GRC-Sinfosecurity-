# Phase 2 Quick Start Guide

## 🚀 Getting Started with New Enterprise Features

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Git repository access

### 1. Deploy Phase 2 Updates

```bash
# Pull latest changes
cd /Users/tahirah-macmini/Documents/GRC
git pull origin main

# Install dependencies (if needed)
cd backend && npm install
cd ../frontend && npm install

# Run database migration
cd backend
npx prisma migrate dev --name phase2_enterprise_features
npx prisma generate

# Start services
cd backend && npm run dev
cd frontend && npm run dev
```

### 2. Configure Risk Appetite (5 minutes)

**Purpose:** Set board-approved risk tolerance thresholds

**Steps:**
1. Log in as Admin/Risk Manager
2. Navigate to **Risk Appetite** page
3. Click **"Create Risk Appetite"**
4. Fill in:
   - Category: "Third Party Risk"
   - Appetite Statement: "Accept moderate third-party risk with compensating controls"
   - Risk Tolerance: `75` (max acceptable score)
   - Early Warning: `65` (proactive alert threshold)
   - Approved By: Your name
   - Approval Date: Today
   - Review Frequency: `90` days
5. Upload board approval evidence (optional)
6. Click **"Create"**

**API Alternative:**
```bash
curl -X POST http://localhost:4000/api/v1/risk-appetite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Third Party Risk",
    "appetiteStatement": "Accept moderate third-party risk with compensating controls",
    "riskTolerance": 75,
    "earlyWarningThreshold": 65,
    "approvedBy": "Board of Directors",
    "approvalDate": "2024-01-15",
    "reviewFrequency": 90
  }'
```

### 3. Run Concentration Risk Analysis (2 minutes)

**Purpose:** Identify vendor concentration risks for board reporting

**Steps:**
1. Navigate to **Concentration Risk Dashboard**
2. View automatic analysis:
   - Spend concentration (HHI index)
   - Top 10 vendors
   - Category concentration
   - Geographic concentration
   - Single points of failure
3. Review regulatory status (PASS/WARNING/BREACH)
4. Click **"Export Board Report"** for PDF

**API Alternative:**
```bash
# Get concentration analysis
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/v1/vendors/concentration-risk

# Export board report
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/v1/vendors/concentration-risk/board-report?format=pdf \
  --output concentration-report.pdf
```

### 4. Set Up Approval Workflow (10 minutes)

**Purpose:** Create multi-level approval for vendor onboarding

**Steps:**
1. Navigate to **Vendor Management** → Select vendor
2. Click **"Initiate Approval Workflow"**
3. Select workflow type:
   - ONBOARDING (new vendor)
   - CONTRACT_RENEWAL
   - TIER_CHANGE
   - RISK_ACCEPTANCE
4. Add approval chain:
   - Step 1: Risk Manager
   - Step 2: Compliance Officer
   - Step 3: CFO/Executive
5. Add business justification
6. Click **"Submit for Approval"**

**API Alternative:**
```bash
curl -X POST http://localhost:4000/api/v1/vendors/approvals/workflows \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "vendor-uuid",
    "workflowType": "ONBOARDING",
    "businessJustification": "Critical payment processing vendor",
    "riskAssessmentSummary": "Medium risk - requires enhanced due diligence",
    "approvalChain": [
      {
        "approverRole": "Risk Manager",
        "approverUserId": "user-1-uuid",
        "approverName": "John Doe"
      },
      {
        "approverRole": "CFO",
        "approverUserId": "user-2-uuid",
        "approverName": "Jane Smith"
      }
    ]
  }'
```

### 5. Approve Pending Workflow (3 minutes)

**Purpose:** Review and approve vendor workflows

**Steps:**
1. Navigate to **Approval Workflows** page
2. View **"Pending Your Approval"** section (highlighted in yellow)
3. Click **"Review & Approve"** on a pending workflow
4. Review:
   - Vendor details
   - Business justification
   - Risk assessment
   - Previous approvals
5. Select decision:
   - APPROVED
   - REJECTED (requires comments)
   - CONDITIONALLY_APPROVED (requires conditions)
   - DEFERRED
6. Add comments (optional)
7. Click **"Submit Decision"**

**API Alternative:**
```bash
# Get pending approvals
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/v1/vendors/approvals/pending

# Submit approval decision
curl -X POST http://localhost:4000/api/v1/vendors/approvals/workflows/{workflowId}/steps/1/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "APPROVED",
    "comments": "Risk assessment is satisfactory. Approved for onboarding."
  }'
```

### 6. Monitor Risk Appetite (Daily)

**Purpose:** Automated monitoring of risk thresholds

**Steps:**
1. Navigate to **Risk Appetite Dashboard**
2. View summary:
   - Within Appetite: ✅ Green
   - Approaching Limit: ⚠️ Yellow
   - Breached: 🚨 Red
3. Click on any appetite to view details
4. For breaches:
   - Review trigger event
   - View contributing factors
   - Create mitigation plan
   - Assign owner

**API Alternative (Automated Cron Job):**
```bash
# Monitor all risk appetites (run daily)
curl -X POST http://localhost:4000/api/v1/risk-appetite/monitor-all \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get breaches
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/v1/risk-appetite/breaches?status=OPEN

# Resolve breach
curl -X POST http://localhost:4000/api/v1/risk-appetite/breaches/{breachId}/resolve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mitigationPlan": "Terminate 2 low-value vendors, diversify to 3 new vendors",
    "mitigationOwner": "Risk Manager",
    "resolutionNotes": "Reduced concentration from 82% to 68%"
  }'
```

### 7. Track Vendor Risk History (Ongoing)

**Purpose:** Automated risk score tracking and trending

**Steps:**
1. Navigate to **Vendor Profile** → **Risk History** tab
2. View chart:
   - Historical risk scores
   - Trend direction (↗️ Increasing, ↘️ Decreasing, → Stable)
   - Volatility indicator
3. Export trend report for board

**API Alternative:**
```bash
# Get risk history for vendor
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/v1/vendors/{vendorId}/risk-history?startDate=2024-01-01"

# Get all vendors with increasing risk
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/v1/vendors/risk-history/trends/increasing

# Export trends
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/v1/vendors/risk-history/trends/export?format=csv" \
  --output risk-trends.csv
```

### 8. Map Business Processes (One-time Setup)

**Purpose:** Identify critical vendor dependencies

**Steps:**
1. Navigate to **Vendor Profile** → **Business Process Mapping**
2. Click **"Add Process Mapping"**
3. Fill in:
   - Process Name: "Payment Processing"
   - Process Owner: Department head
   - Process Criticality: CRITICAL
   - Dependency Type: SOLE_PROVIDER
   - Usage %: 100%
   - RTO: 4 hours
   - RPO: 1 hour
   - Impact if unavailable: SEVERE
   - Revenue at risk: $1,000,000
4. Click **"Save"**

**API Alternative:**
```bash
curl -X POST http://localhost:4000/api/v1/vendors/{vendorId}/business-processes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "processName": "Payment Processing",
    "processOwner": "CFO",
    "processCategory": "Core",
    "processCriticality": "Critical",
    "dependencyType": "Sole Provider",
    "usagePercentage": 100,
    "rto": 4,
    "rpo": 1,
    "impactIfUnavailable": "Severe",
    "revenueAtRisk": 1000000
  }'
```

### 9. Track HIPAA BAAs (Healthcare Only)

**Purpose:** Manage Business Associate Agreements

**Steps:**
1. Navigate to **Vendor Profile** → **HIPAA Compliance**
2. Click **"Create BAA"**
3. Fill in:
   - BAA Required: Yes
   - Execution Date: Contract date
   - Expiration Date: 3 years from execution
   - PHI Access: Yes
   - PHI Types: ["Clinical Data", "Payment Info"]
   - Encryption Required: Yes
   - Breach Notification: 24 hours
4. Upload signed BAA
5. Set attestation frequency: 365 days
6. Click **"Save"**

**API Alternative:**
```bash
curl -X POST http://localhost:4000/api/v1/vendors/{vendorId}/baa \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "baaRequired": true,
    "baaStatus": "EXECUTED",
    "baaExecutionDate": "2024-01-01",
    "baaExpirationDate": "2027-01-01",
    "phiAccess": true,
    "phiTypes": ["Clinical Data", "Payment Info"],
    "encryptionRequired": true,
    "encryptionInTransit": true,
    "encryptionAtRest": true,
    "breachNotification24Hr": true
  }'
```

### 10. Map ISO Controls (ISO Certified Orgs)

**Purpose:** Track ISO 27001/27036 control implementation

**Steps:**
1. Navigate to **Vendor Profile** → **ISO Controls**
2. Click **"Add Control Mapping"**
3. Fill in:
   - ISO Standard: ISO 27001:2013
   - Control ID: A.15.1.2
   - Control Name: Addressing security within supplier agreements
   - Applicable: Yes
   - Implementation Status: IMPLEMENTED
   - Vendor Evidence: Link to SOC 2 report
   - Control Effectiveness: Effective
4. Click **"Save"**

**API Alternative:**
```bash
curl -X POST http://localhost:4000/api/v1/vendors/{vendorId}/iso-controls \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isoStandard": "ISO 27001:2013",
    "controlId": "A.15.1.2",
    "controlName": "Addressing security within supplier agreements",
    "applicable": true,
    "implementationStatus": "IMPLEMENTED",
    "vendorEvidence": "https://example.com/soc2-report.pdf",
    "evidenceType": "SOC 2 Report",
    "controlEffectiveness": "Effective"
  }'
```

## 🎯 Daily Workflows

### For Risk Managers
1. **Morning:** Check pending approvals (5 min)
2. **Daily:** Monitor risk appetite dashboard (3 min)
3. **Weekly:** Review increasing risk trends (10 min)
4. **Monthly:** Generate board reports (15 min)

### For Compliance Officers
1. **Daily:** Review new vendor onboarding (10 min)
2. **Weekly:** Check BAA expirations (5 min)
3. **Monthly:** Update ISO control mappings (20 min)
4. **Quarterly:** Risk appetite review (30 min)

### For Executives
1. **Weekly:** Review pending approvals (10 min)
2. **Monthly:** Concentration risk dashboard (15 min)
3. **Quarterly:** Risk appetite board presentation (30 min)

## 📊 Sample Dashboards

### Executive Dashboard
- Risk appetite status: ✅ Within appetite
- Open breaches: 0
- Pending approvals: 3
- Concentration risk: ⚠️ WARNING (approaching limit)
- Critical vendors: 12
- High-risk trends: 2 vendors

### Risk Manager Dashboard
- Total vendors: 145
- Assessments due: 8
- Workflows pending: 5
- Risk appetite compliance: 95%
- HHI index: 1,250 (moderate concentration)

### Compliance Dashboard
- BAAs executed: 23/25 (92%)
- BAAs expiring (90 days): 2
- ISO controls mapped: 156/180 (87%)
- Audit findings: 3 open

## 🔧 Troubleshooting

### Issue: Risk appetite not updating
**Solution:** Run manual monitor
```bash
curl -X POST http://localhost:4000/api/v1/risk-appetite/{id}/monitor \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: Concentration risk shows no data
**Solution:** Ensure vendors have:
1. Contract value populated
2. Tier classification
3. At least one assessment

### Issue: Approval workflow stuck
**Solution:** Check current step status
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/v1/vendors/approvals/workflows/{workflowId}
```

## 📚 Additional Resources

- [Full Implementation Report](FINAL-IMPLEMENTATION-REPORT.md)
- [Phase 2 Details](PHASE-2-COMPLETE.md)
- [Enterprise Audit Report](ENTERPRISE-TPRM-AUDIT-REPORT.md)
- [API Documentation](http://localhost:4000/api-docs)

## 🎉 You're Ready!

All Phase 2 features are now live and ready to use. Start with risk appetite configuration, then move to approval workflows and concentration risk analysis.

**Questions?** Check the API documentation at `http://localhost:4000/api-docs`

**Next Steps:**
1. ✅ Configure risk appetites
2. ✅ Set up approval workflows
3. ✅ Run concentration analysis
4. ✅ Map critical business processes
5. ✅ Schedule SOC 2 audit
