"""
Risk Prediction Service
ML-based risk scoring and prediction
"""

from typing import Dict, List
from datetime import datetime, timedelta
import random  # In production, replace with actual ML model

class RiskPredictionService:
    def __init__(self):
        self.risk_factors = {
            'likelihood_factors': [
                'historical_incidents',
                'threat_landscape',
                'control_maturity',
                'external_vulnerabilities'
            ],
            'impact_factors': [
                'data_sensitivity',
                'business_criticality',
                'regulatory_requirements',
                'financial_exposure'
            ]
        }
    
    def calculate_risk_score(self, risk_data: Dict) -> Dict:
        """
        Calculate risk score using ML model
        
        Args:
            risk_data: Risk information including likelihood and impact factors
            
        Returns:
            Risk score and classification
        """
        # In production, this would use a trained ML model
        # For now, using weighted calculation based on ISO 31000
        
        likelihood = risk_data.get('likelihood', 3)  # 1-5 scale
        impact = risk_data.get('impact', 3)  # 1-5 scale
        
        # Apply weights based on historical data
        control_effectiveness = risk_data.get('control_effectiveness', 70) / 100
        threat_level = risk_data.get('threat_level', 'medium')
        
        # Adjust likelihood based on controls
        adjusted_likelihood = likelihood * (1 - (control_effectiveness * 0.4))
        
        # Threat level multiplier
        threat_multipliers = {'low': 0.8, 'medium': 1.0, 'high': 1.3, 'critical': 1.5}
        threat_multiplier = threat_multipliers.get(threat_level, 1.0)
        
        # Calculate final score
        base_score = adjusted_likelihood * impact
        final_score = base_score * threat_multiplier
        
        # Classify risk
        if final_score >= 15:
            classification = 'Critical'
            priority = 1
        elif final_score >= 10:
            classification = 'High'
            priority = 2
        elif final_score >= 5:
            classification = 'Medium'
            priority = 3
        else:
            classification = 'Low'
            priority = 4
        
        return {
            'risk_score': round(final_score, 2),
            'classification': classification,
            'priority': priority,
            'likelihood': round(adjusted_likelihood, 2),
            'impact': impact,
            'confidence': round(control_effectiveness * 100, 1)
        }
    
    def predict_emerging_risks(self, industry: str, current_risks: List[Dict]) -> List[Dict]:
        """
        Predict emerging risks based on industry trends and current risk profile
        
        Args:
            industry: Organization's industry
            current_risks: Current identified risks
            
        Returns:
            List of predicted emerging risks
        """
        # Industry-specific emerging risks
        emerging_risks_db = {
            'technology': [
                {
                    'name': 'AI/ML Security Vulnerabilities',
                    'category': 'Cybersecurity',
                    'probability': 0.75,
                    'description': 'Risks from AI model poisoning and adversarial attacks'
                },
                {
                    'name': 'Supply Chain Software Risks',
                    'category': 'Third Party',
                    'probability': 0.68,
                    'description': 'Vulnerabilities in dependencies and open-source components'
                }
            ],
            'finance': [
                {
                    'name': 'Regulatory Compliance Changes',
                    'category': 'Compliance',
                    'probability': 0.80,
                    'description': 'New financial regulations and reporting requirements'
                },
                {
                    'name': 'Digital Payment Fraud',
                    'category': 'Operational',
                    'probability': 0.72,
                    'description': 'Sophisticated fraud schemes targeting digital transactions'
                }
            ],
            'healthcare': [
                {
                    'name': 'Ransomware Targeting Healthcare',
                    'category': 'Cybersecurity',
                    'probability': 0.85,
                    'description': 'Increased ransomware attacks on healthcare systems'
                },
                {
                    'name': 'Medical Device Security',
                    'category': 'Cybersecurity',
                    'probability': 0.70,
                    'description': 'Vulnerabilities in connected medical devices'
                }
            ]
        }
        
        base_risks = emerging_risks_db.get(industry.lower(), [])
        
        # Filter out risks that are already identified
        current_risk_names = {risk['name'].lower() for risk in current_risks}
        new_risks = [
            risk for risk in base_risks 
            if risk['name'].lower() not in current_risk_names
        ]
        
        # Add prediction metadata
        for risk in new_risks:
            risk['predicted_on'] = datetime.now().isoformat()
            risk['time_horizon'] = '6-12 months'
            risk['predicted_likelihood'] = int(risk['probability'] * 5)  # Convert to 1-5 scale
            risk['predicted_impact'] = 4  # Default high impact for emerging risks
        
        return new_risks
    
    def analyze_risk_trends(self, historical_risks: List[Dict]) -> Dict:
        """
        Analyze risk trends over time
        
        Args:
            historical_risks: Historical risk data
            
        Returns:
            Trend analysis results
        """
        if not historical_risks:
            return {'trend': 'insufficient_data'}
        
        # Group risks by month
        risk_counts_by_month = {}
        for risk in historical_risks:
            month = risk.get('identified_date', '')[:7]  # YYYY-MM
            risk_counts_by_month[month] = risk_counts_by_month.get(month, 0) + 1
        
        # Calculate trend
        months = sorted(risk_counts_by_month.keys())
        if len(months) >= 2:
            recent_avg = sum(risk_counts_by_month[m] for m in months[-3:]) / min(3, len(months[-3:]))
            older_avg = sum(risk_counts_by_month[m] for m in months[:3]) / min(3, len(months[:3]))
            
            if recent_avg > older_avg * 1.2:
                trend = 'increasing'
            elif recent_avg < older_avg * 0.8:
                trend = 'decreasing'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'
        
        return {
            'trend': trend,
            'total_risks': len(historical_risks),
            'monthly_data': risk_counts_by_month,
            'analysis_date': datetime.now().isoformat()
        }

# Example usage
if __name__ == "__main__":
    service = RiskPredictionService()
    
    # Calculate risk score
    risk_data = {
        'likelihood': 4,
        'impact': 5,
        'control_effectiveness': 75,
        'threat_level': 'high'
    }
    score = service.calculate_risk_score(risk_data)
    print(f"Risk Score: {score['risk_score']} ({score['classification']})")
    
    # Predict emerging risks
    emerging = service.predict_emerging_risks('technology', [])
    print(f"\\nEmerging Risks: {len(emerging)}")
    for risk in emerging:
        print(f"- {risk['name']}: {risk['probability']*100}% probability")
