"""
Gap Analysis Service
Analyzes compliance gaps between current state and framework requirements
"""

from typing import Dict, List
from datetime import datetime

class GapAnalysisService:
    def __init__(self):
        self.frameworks = {
            'iso27001': self._load_iso27001_controls(),
            'soc2': self._load_soc2_controls(),
            'gdpr': self._load_gdpr_requirements()
        }
    
    def _load_iso27001_controls(self) -> List[Dict]:
        """Load ISO 27001 control requirements"""
        return [
            {
                'id': 'A.5.1',
                'name': 'Information Security Policies',
                'category': 'Organizational Controls',
                'description': 'Policies for information security',
                'priority': 'Critical'
            },
            {
                'id': 'A.5.2',
                'name': 'Roles and Responsibilities',
                'category': 'Organizational Controls',
                'description': 'Define and communicate security roles',
                'priority': 'High'
            },
            {
                'id': 'A.8.1',
                'name': 'User Endpoint Devices',
                'category': 'Technological Controls',
                'description': 'Protect information on endpoint devices',
                'priority': 'High'
            },
            # Add more controls as needed
        ]
    
    def _load_soc2_controls(self) -> List[Dict]:
        """Load SOC 2 Trust Service Criteria"""
        return [
            {
                'id': 'CC1.1',
                'name': 'Control Environment',
                'category': 'Common Criteria',
                'description': 'Demonstrates commitment to integrity and ethical values',
                'priority': 'Critical'
            },
            {
                'id': 'CC6.1',
                'name': 'Logical and Physical Access Controls',
                'category': 'Common Criteria',
                'description': 'Restrict access to authorized users',
                'priority': 'Critical'
            },
            # Add more criteria
        ]
    
    def _load_gdpr_requirements(self) -> List[Dict]:
        """Load GDPR requirements"""
        return [
            {
                'id': 'Art.32',
                'name': 'Security of Processing',
                'category': 'Security',
                'description': 'Implement appropriate technical and organizational measures',
                'priority': 'Critical'
            },
            {
                'id': 'Art.33',
                'name': 'Breach Notification',
                'category': 'Incident Management',
                'description': 'Notify supervisory authority of data breaches',
priority': 'High'
            },
        ]
    
    def analyze_gaps(self, framework: str, current_controls: List[Dict]) -> Dict:
        """
        Analyze gaps between current controls and framework requirements
        
        Args:
            framework: Target framework ('iso27001', 'soc2', 'gdpr')
            current_controls: List of implemented controls
            
        Returns:
            Dict containing gap analysis results
        """
        if framework not in self.frameworks:
            raise ValueError(f"Unknown framework: {framework}")
        
        required_controls = self.frameworks[framework]
        implemented_ids = {ctrl['id'] for ctrl in current_controls}
        
        gaps = []
        for req_ctrl in required_controls:
            if req_ctrl['id'] not in implemented_ids:
                gaps.append({
                    'control_id': req_ctrl['id'],
                    'control_name': req_ctrl['name'],
                    'category': req_ctrl['category'],
                    'description': req_ctrl['description'],
                    'priority': req_ctrl['priority'],
                    'status': 'Missing'
                })
        
        # Calculate completion percentage
        total_required = len(required_controls)
        total_implemented = total_required - len(gaps)
        completion_rate = (total_implemented / total_required) * 100 if total_required > 0 else 0
        
        # Prioritize gaps
        critical_gaps = [g for g in gaps if g['priority'] == 'Critical']
        high_gaps = [g for g in gaps if g['priority'] == 'High']
        
        return {
            'framework': framework,
            'analysis_date': datetime.now().isoformat(),
            'completion_rate': round(completion_rate, 2),
            'total_required': total_required,
            'total_implemented': total_implemented,
            'total_gaps': len(gaps),
            'critical_gaps': len(critical_gaps),
            'high_priority_gaps': len(high_gaps),
            'gaps': gaps,
            'recommendations': self._generate_recommendations(gaps)
        }
    
    def _generate_recommendations(self, gaps: List[Dict]) -> List[str]:
        """Generate remediation recommendations"""
        recommendations = []
        
        if gaps:
            # Prioritize critical gaps
            critical = [g for g in gaps if g['priority'] == 'Critical']
            if critical:
                recommendations.append(
                    f"URGENT: Address {len(critical)} critical gaps immediately to meet compliance requirements."
                )
            
            # Category-based recommendations
            categories = {}
            for gap in gaps:
                cat = gap['category']
                categories[cat] = categories.get(cat, 0) + 1
            
            for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
                recommendations.append(
                    f"Focus on {category}: {count} gap(s) identified in this area."
                )
        else:
            recommendations.append("Great! No gaps identified. Continue monitoring and maintaining controls.")
        
        return recommendations

# Example usage
if __name__ == "__main__":
    service = GapAnalysisService()
    
    # Example current controls
    current_controls = [
        {'id': 'A.5.1', 'name': 'Info Sec Policy', 'status': 'Implemented'},
        {'id': 'CC1.1', 'name': 'Control Environment', 'status': 'Implemented'}
    ]
    
    # Analyze ISO 27001 gaps
    result = service.analyze_gaps('iso27001', current_controls)
    print(f"Completion: {result['completion_rate']}%")
    print(f"Gaps: {result['total_gaps']}")
    print(f"Critical: {result['critical_gaps']}")
