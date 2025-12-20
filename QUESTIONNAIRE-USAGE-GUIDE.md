# Questionnaire System - Usage Guide

## 🎯 Overview

Your GRC platform has a fully functional **Vendor Assessment Questionnaire System** with 20+ pre-built questions covering security, privacy, compliance, and operational risk.

## 📋 What's Included

### Pre-Built Questionnaire (20 Questions)

**Information Security (4 questions)**
1. ISO 27001/SOC 2 certification status
2. Data encryption methods (AES-256, TLS 1.3)
3. Incident response time SLA
4. Penetration testing frequency

**Data Privacy & Compliance (3 questions)**
5. GDPR compliance status
6. Data storage locations
7. Data Processing Agreement (DPA) status

**Business Continuity (3 questions)**
8. Uptime SLA (99.99%, 99.9%, etc.)
9. Business Continuity Plan (BCP) documentation
10. Recovery Time Objective (RTO)

**Vendor Management (4 questions)**
11. Years in business
12. Cyber insurance coverage
13. Security breach history
14. Third-party security audits

### Scoring System
- **Weighted questions** (1-10 points each)
- **Category scores**: Security, Privacy, Compliance, Operational, Financial
- **Overall score**: 0-100
- **Automatic risk rating**: Based on final score

---

## 🚀 Quick Start - Using the Questionnaire

### Step 1: Create a Vendor Assessment

**Via API:**
```bash
curl -X POST http://localhost:4000/api/v1/vendors/{vendorId}/assessments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentType": "INITIAL_DUE_DILIGENCE",
    "frameworkUsed": "Custom",
    "assignedTo": "risk-manager@company.com",
    "dueDate": "2025-12-31"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assessment-uuid",
    "vendorId": "vendor-uuid",
    "assessmentType": "INITIAL_DUE_DILIGENCE",
    "frameworkUsed": "Custom",
    "status": "NOT_STARTED",
    "overallScore": null,
    "dueDate": "2025-12-31T00:00:00.000Z",
    "createdAt": "2025-12-19T10:00:00.000Z"
  }
}
```

**What happens automatically:**
✅ 20 questions are generated based on the framework
✅ Assessment status set to "NOT_STARTED"
✅ Ready for responses

---

### Step 2: Get Assessment Questions

**Via API:**
```bash
curl -X GET http://localhost:4000/api/v1/vendors/assessments/{assessmentId} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assessment-uuid",
    "status": "NOT_STARTED",
    "responses": [
      {
        "id": "response-1",
        "questionId": "sec_1",
        "questionText": "Does the vendor maintain ISO 27001, SOC 2, or equivalent certification?",
        "questionCategory": "Security",
        "weight": 10,
        "maxScore": 10,
        "response": null,
        "score": null,
        "evidenceRequired": true
      },
      {
        "id": "response-2",
        "questionId": "sec_2",
        "questionText": "How does the vendor handle data encryption?",
        "questionCategory": "Security",
        "weight": 9,
        "maxScore": 10,
        "response": null,
        "score": null
      }
      // ... 18 more questions
    ]
  }
}
```

---

### Step 3: Submit Questionnaire Responses

**Answer Question 1 (ISO Certification):**
```bash
curl -X POST http://localhost:4000/api/v1/vendors/assessments/{assessmentId}/responses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "sec_1",
    "response": "Yes - SOC 2 Type II",
    "notes": "SOC 2 Type II report dated 2024-12-01, valid until 2025-12-01",
    "evidenceIds": ["doc-uuid-soc2-report"]
  }'
```

**Answer Question 2 (Encryption):**
```bash
curl -X POST http://localhost:4000/api/v1/vendors/assessments/{assessmentId}/responses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "sec_2",
    "response": "Encryption at rest and in transit (AES-256/TLS 1.3)",
    "notes": "Confirmed via security documentation review"
  }'
```

**What happens:**
✅ Status automatically changes to "IN_PROGRESS"
✅ Response scored based on answer quality
✅ Evidence linked if provided
✅ Timestamp recorded

---

### Step 4: View Progress

**Get Assessment Status:**
```bash
curl -X GET http://localhost:4000/api/v1/vendors/assessments/{assessmentId} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response shows:**
```json
{
  "status": "IN_PROGRESS",
  "completedResponses": 2,
  "totalQuestions": 20,
  "percentComplete": 10,
  "categoriesScored": {
    "Security": {
      "answered": 2,
      "total": 4,
      "currentScore": 95
    },
    "Privacy": {
      "answered": 0,
      "total": 3,
      "currentScore": null
    }
  }
}
```

---

### Step 5: Complete All Questions and Finalize

**Complete Assessment:**
```bash
curl -X POST http://localhost:4000/api/v1/vendors/assessments/{assessmentId}/complete \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**What happens:**
✅ Final scores calculated by category
✅ Overall risk score computed (0-100)
✅ Gaps identified (low-scoring areas)
✅ AI recommendations generated
✅ Vendor risk score updated
✅ Status set to "COMPLETED"

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assessment-uuid",
    "status": "COMPLETED",
    "overallScore": 82,
    "securityScore": 88,
    "privacyScore": 85,
    "complianceScore": 78,
    "operationalScore": 80,
    "financialScore": 75,
    "completedAt": "2025-12-19T15:30:00.000Z",
    "identifiedRisks": [
      {
        "category": "Compliance",
        "risk": "No cyber insurance coverage",
        "severity": "Medium",
        "recommendation": "Require $10M+ cyber insurance policy"
      },
      {
        "category": "Security",
        "risk": "Penetration testing only annual",
        "severity": "Low",
        "recommendation": "Request quarterly penetration tests"
      }
    ],
    "gapsIdentified": [
      {
        "question": "Does the vendor have cyber insurance?",
        "response": "No",
        "score": 0,
        "maxScore": 10,
        "gap": 10
      }
    ],
    "recommendations": [
      "Add cyber insurance requirement to contract",
      "Schedule quarterly security reviews",
      "Request more frequent penetration testing"
    ]
  }
}
```

---

## 💻 Frontend Usage (UI Example)

### VendorManagement.tsx already has the questionnaire UI:

```typescript
// The questionnaire is displayed in a wizard/stepper format
const assessmentQuestions = [
  {
    id: 'sec_1',
    question: 'Does the vendor maintain ISO 27001, SOC 2, or equivalent certification?',
    options: [
      'Yes - ISO 27001',
      'Yes - SOC 2 Type II',
      'Yes - Both',
      'No certification',
      'In progress'
    ],
    weight: 10
  },
  // ... more questions
];

// User selects answer from dropdown/radio buttons
// Submit button sends response to API
// Progress bar shows completion percentage
```

**UI Flow:**
1. Click **"Start Assessment"** button on vendor profile
2. **Wizard opens** with 20 questions in categories
3. **Answer each question** (dropdown/multiple choice)
4. **Attach evidence** (optional - SOC 2 reports, policies, etc.)
5. **View progress bar** (e.g., "8/20 questions answered - 40%")
6. Click **"Complete Assessment"** when all answered
7. **View results** - Overall score, category breakdown, identified gaps

---

## 📊 Scoring Logic

### How Scores Are Calculated

**Question Response Scoring:**
```typescript
// Best answer = 10 points
"Yes - ISO 27001" → 10 points
"Yes - SOC 2 Type II" → 10 points

// Good answer = 7-8 points
"Yes - Both" → 10 points
"Encryption at rest and in transit" → 9 points

// Moderate answer = 5-6 points
"Encryption at rest only" → 5 points

// Poor answer = 2-3 points
"No encryption" → 2 points

// Worst answer = 0 points
"Unknown" → 0 points
```

**Category Score Calculation:**
```
Category Score = (Sum of earned points / Sum of possible points) × 100

Example - Security Category:
- Question 1: 10/10 points
- Question 2: 9/10 points
- Question 3: 8/10 points
- Question 4: 7/10 points
Total: 34/40 = 85%
```

**Overall Score:**
```
Weighted average of all categories
Security (40%) + Privacy (20%) + Compliance (20%) + Operational (20%)
```

---

## 🎯 Assessment Types

Your system supports multiple assessment scenarios:

```typescript
enum AssessmentType {
  INITIAL_DUE_DILIGENCE,    // New vendor onboarding
  ANNUAL_REVIEW,             // Yearly reassessment
  TRIGGERED_REASSESSMENT,    // After incident/breach
  CONTRACT_RENEWAL,          // Before contract renewal
  POST_INCIDENT,             // After security incident
  CONTINUOUS_MONITORING,     // Ongoing monitoring
  FOURTH_PARTY_REVIEW        // Sub-vendor assessment
}
```

**Use Cases:**

**Initial Due Diligence:**
```bash
# When onboarding new vendor
POST /vendors/{vendorId}/assessments
{
  "assessmentType": "INITIAL_DUE_DILIGENCE",
  "frameworkUsed": "SIG",
  "assignedTo": "vendor-risk-analyst@company.com",
  "dueDate": "2025-12-31"
}
```

**Annual Review:**
```bash
# Yearly re-assessment for existing vendors
POST /vendors/{vendorId}/assessments
{
  "assessmentType": "ANNUAL_REVIEW",
  "frameworkUsed": "Custom",
  "assignedTo": "risk-manager@company.com",
  "dueDate": "2026-01-15"
}
```

**Post-Incident Assessment:**
```bash
# After vendor security breach
POST /vendors/{vendorId}/assessments
{
  "assessmentType": "POST_INCIDENT",
  "frameworkUsed": "CAIQ",
  "assignedTo": "ciso@company.com",
  "dueDate": "2025-12-25",
  "notes": "Emergency assessment following data breach notification"
}
```

---

## 🔍 Framework Mappings

Questions are mapped to industry frameworks:

```typescript
{
  question: "Does the vendor maintain ISO 27001, SOC 2, or equivalent certification?",
  frameworkMappings: [
    "ISO 27001:A.18.1.1",  // Compliance with legal requirements
    "SOC 2:CC1.1"          // Control environment
  ]
}

{
  question: "How does the vendor handle data encryption?",
  frameworkMappings: [
    "ISO 27001:A.10.1.1",  // Cryptographic controls
    "NIST 800-53:SC-8"     // Transmission confidentiality
  ]
}

{
  question: "Is the vendor GDPR compliant?",
  frameworkMappings: [
    "GDPR:Art.28",  // Processor requirements
    "GDPR:Art.32"   // Security of processing
  ]
}
```

**Benefits:**
- ✅ Automatic compliance coverage tracking
- ✅ Gap analysis by framework
- ✅ Audit-ready evidence mapping
- ✅ Regulator-friendly reports

---

## 📈 Advanced Features

### 1. Bulk Assessment Creation

Assess multiple vendors at once:

```bash
# Create assessments for all critical vendors
curl -X POST http://localhost:4000/api/v1/vendors/assessments/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorIds": ["vendor-1", "vendor-2", "vendor-3"],
    "assessmentType": "ANNUAL_REVIEW",
    "frameworkUsed": "Custom",
    "dueDate": "2025-12-31"
  }'
```

### 2. Assessment Templates

Switch between frameworks:

```bash
# Use SIG questionnaire
{ "frameworkUsed": "SIG" }

# Use CAIQ questionnaire
{ "frameworkUsed": "CAIQ" }

# Use custom questionnaire
{ "frameworkUsed": "Custom" }
```

### 3. Evidence Attachment

Link documents to answers:

```bash
POST /vendors/assessments/{id}/responses
{
  "questionId": "sec_1",
  "response": "Yes - SOC 2 Type II",
  "evidenceIds": [
    "doc-soc2-report-2024",
    "doc-iso-certificate"
  ]
}
```

### 4. AI-Powered Analysis

After completion, AI analyzes responses:

```json
{
  "aiInsights": {
    "riskSummary": "Vendor shows strong security posture with SOC 2 Type II certification. Primary concern is lack of cyber insurance.",
    "topRisks": [
      "No cyber insurance coverage",
      "Annual penetration testing (recommend quarterly)"
    ],
    "strengths": [
      "ISO 27001 certified",
      "Strong encryption standards",
      "Documented BCP/DR plans"
    ],
    "recommendations": [
      "Add cyber insurance requirement to contract",
      "Request quarterly penetration tests",
      "Validate GDPR compliance documentation"
    ]
  }
}
```

---

## 🎨 Customizing Questionnaires

### Add Your Own Questions

Edit `backend/src/services/vendorAssessmentService.ts`:

```typescript
private getAssessmentTemplate(frameworkUsed: string): AssessmentTemplate {
  return {
    name: 'Custom Company Questionnaire',
    type: 'Custom',
    sections: [
      {
        title: 'Your Custom Section',
        questions: [
          {
            id: 'custom_1',
            question: 'Your custom question here?',
            category: 'Security',
            weight: 10,
            options: [
              'Option 1',
              'Option 2',
              'Option 3'
            ],
            frameworkMappings: ['ISO 27001:A.X.X.X'],
            evidenceRequired: true
          }
        ]
      }
    ]
  };
}
```

### Industry-Specific Templates

Create templates for different industries:

```typescript
if (frameworkUsed === 'Healthcare') {
  return getHIPAAQuestionnaire();
}
if (frameworkUsed === 'Financial') {
  return getPCIDSSQuestionnaire();
}
if (frameworkUsed === 'Government') {
  return getFedRAMPQuestionnaire();
}
```

---

## 📋 Reporting

### Generate Assessment Report

```bash
curl -X GET http://localhost:4000/api/v1/vendors/assessments/{id}/report \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Report Includes:**
- Overall score and category breakdown
- All questions and responses
- Identified risks and gaps
- Recommendations
- Evidence attachments
- Framework compliance mapping
- Comparison to previous assessments

---

## 🚀 Next Steps

1. **Try it now:**
   ```bash
   # Create your first assessment
   curl -X POST http://localhost:4000/api/v1/vendors/{vendorId}/assessments \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"assessmentType": "INITIAL_DUE_DILIGENCE", "frameworkUsed": "Custom"}'
   ```

2. **View in UI:**
   - Navigate to Vendor Management
   - Select a vendor
   - Click "Start Assessment"
   - Answer 20 questions
   - View results

3. **Customize:**
   - Add industry-specific questions
   - Adjust scoring weights
   - Create custom templates

4. **Automate:**
   - Schedule annual assessments
   - Send reminder emails for overdue assessments
   - Generate board reports

---

## 📚 Related Documentation

- [Vendor Assessment Service Code](backend/src/services/vendorAssessmentService.ts)
- [Database Schema](backend/prisma/schema.prisma) - Search for "VendorAssessment"
- [Frontend UI](frontend/src/pages/VendorManagement.tsx) - Assessment wizard
- [API Documentation](http://localhost:4000/api-docs) - Full endpoint reference

---

## 💡 Pro Tips

✅ **Require evidence for critical questions** - Set `evidenceRequired: true`
✅ **Weight questions appropriately** - Critical questions get weight 10, nice-to-have get weight 3-5
✅ **Use framework mappings** - Helps with compliance coverage tracking
✅ **Schedule regular reassessments** - Annual for high-risk vendors, bi-annual for others
✅ **Compare assessment trends** - Track score changes over time
✅ **Export for auditors** - PDF reports with all evidence attached

---

**Your questionnaire system is production-ready and fully functional! Start assessing vendors today. 🚀**
