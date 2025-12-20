from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="GRC AI Service",
    description="AI-powered compliance gap analysis, risk assessment, and recommendations",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ComplianceFramework(BaseModel):
    framework_type: str
    current_controls: List[Dict[str, Any]]
    requirements: List[Dict[str, Any]]

class GapAnalysisRequest(BaseModel):
    framework: ComplianceFramework
    organization_data: Dict[str, Any]

class GapAnalysisResponse(BaseModel):
    score: int
    gaps: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    priority_actions: List[str]

class RiskAssessmentRequest(BaseModel):
    risk_description: str
    category: str
    existing_controls: List[str]

class RiskAssessmentResponse(BaseModel):
    likelihood: int
    impact: int
    risk_score: int
    recommended_controls: List[Dict[str, Any]]
    mitigation_strategies: List[str]

# Routes
@app.get("/")
async def root():
    return {
        "service": "GRC AI Service",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": [
            "/gap-analysis",
            "/risk-assessment",
            "/compliance-recommendations",
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "ml_models_loaded": True,
        "service": "ai-service"
    }

@app.post("/gap-analysis", response_model=GapAnalysisResponse)
async def analyze_compliance_gaps(request: GapAnalysisRequest):
    """
    AI-powered compliance gap analysis
    Analyzes current state vs requirements and identifies gaps
    """
    # Mock implementation - will be replaced with actual ML model
    try:
        gaps = [
            {
                "requirement_id": "GDPR-ART-5",
                "title": "Data Processing Principles",
                "gap_description": "Missing documented data processing procedures",
                "severity": "high",
                "effort": "medium"
            },
            {
                "requirement_id": "GDPR-ART-30",
                "title": "Records of Processing Activities",
                "gap_description": "Incomplete processing activity records",
                "severity": "high",
                "effort": "high"
            },
            {
                "requirement_id": "GDPR-ART-25",
                "title": "Data Protection by Design",
                "gap_description": "Privacy impact assessments not conducted",
                "severity": "medium",
                "effort": "medium"
            }
        ]
        
        recommendations = [
            {
                "action": "Implement data processing register",
                "priority": "high",
                "timeline": "2 weeks",
                "resources_needed": ["Documentation", "Training"]
            },
            {
                "action": "Conduct privacy impact assessments",
                "priority": "medium",
                "timeline": "4 weeks",
                "resources_needed": ["Legal consultation", "Technical assessment"]
            }
        ]
        
        score = 72 # 72% compliant
        
        return GapAnalysisResponse(
            score=score,
            gaps=gaps,
            recommendations=recommendations,
            priority_actions=[
                "Document all data processing activities",
                "Establish data subject request procedures",
                "Implement privacy by design principles"
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/risk-assessment", response_model=RiskAssessmentResponse)
async def assess_risk(request: RiskAssessmentRequest):
    """
    AI-powered risk assessment
    Analyzes risk description and recommends likelihood, impact, and controls
    """
    # Mock implementation - will be replaced with actual ML model
    try:
        # Simple keyword-based analysis (placeholder for ML model)
        likelihood = 3
        impact = 4
        
        if "critical" in request.risk_description.lower() or "severe" in request.risk_description.lower():
            impact = 5
        if "unlikely" in request.risk_description.lower():
            likelihood = 2
            
        recommended_controls = [
            {
                "name": "Multi-Factor Authentication",
                "type": "preventive",
                "effectiveness": 4
            },
            {
                "name": "Security Monitoring",
                "type": "detective",
                "effectiveness": 4
            },
            {
                "name": "Incident Response Plan",
                "type": "corrective",
                "effectiveness": 3
            }
        ]
        
        mitigation_strategies = [
            "Implement technical controls to reduce attack surface",
            "Establish monitoring and alerting mechanisms",
            "Create incident response procedures",
            "Conduct regular security awareness training"
        ]
        
        return RiskAssessmentResponse(
            likelihood=likelihood,
            impact=impact,
            risk_score=likelihood * impact,
            recommended_controls=recommended_controls,
            mitigation_strategies=mitigation_strategies
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compliance-recommendations")
async def get_compliance_recommendations(framework_type: str, industry: str):
    """
    Get AI-powered compliance recommendations based on framework and industry
    """
    try:
        recommendations = [
            {
                "category": "Data Protection",
                "actions": [
                    "Implement data encryption at rest and in transit",
                    "Establish data retention policies",
                    "Create data subject rights procedures"
                ],
                "priority": "high"
            },
            {
                "category": "Access Control",
                "actions": [
                    "Implement role-based access control (RBAC)",
                    "Enable multi-factor authentication",
                    "Establish periodic access reviews"
                ],
                "priority": "high"
            },
            {
                "category": "Monitoring",
                "actions": [
                    "Deploy security information and event management (SIEM)",
                    "Enable audit logging",
                    "Create security incident alerts"
                ],
                "priority": "medium"
            }
        ]
        
        return {
            "framework": framework_type,
            "industry": industry,
            "recommendations": recommendations,
            "estimated_timeline": "12-16 weeks",
            "priority_sequence": ["Data Protection", "Access Control", "Monitoring"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
