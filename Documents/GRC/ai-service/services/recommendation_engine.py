"""
Recommendation Engine
Intelligent recommendations for compliance and security
"""

from typing import Dict, List

class RecommendationEngine:
    def __init__(self):
        self.control_library = self._load_control_library()
        self.framework_mappings = self._load_framework_mappings()
    
    def _load_control_library(self) -> Dict:
        """Load control library with best practices"""
        return {
            'access_control': [
                {
                    'id': 'AC-001',
                    'name': 'Multi-Factor Authentication',
                    'description': 'Implement MFA for all user accounts',
                    'effectiveness': 95,
                    'complexity': 'Medium',
                    'cost': 'Low'
                },
                {
                    'id': 'AC-002',
                    'name': 'Role-Based Access Control',
                    'description': 'Implement RBAC for least privilege',
                    'effectiveness': 90,
                    'complexity': 'Medium',
                    'cost': 'Medium'
                }
            ],
            'data_protection': [
                {
                    'id': 'DP-001',
                    'name': 'Data Encryption at Rest',
                    'description': 'Encrypt sensitive data in storage',
                    'effectiveness': 92,
                    'complexity': 'Low',
                    'cost': 'Low'
                },
                {
                    'id': 'DP-002',
                    'name': 'Data Encryption in Transit',
                    'description': 'Use TLS 1.3 for all data transmission',
                    'effectiveness': 94,
                    'complexity': 'Low',
                    'cost': 'Low'
                }
            ],
            'incident_response': [
                {
                    'id': 'IR-001',
                    'name': 'Incident Response Plan',
                    'description': 'Documented IR procedures',
                    'effectiveness': 88,
                    'complexity': 'Medium',
                    'cost': 'Medium'
                }
            ]
        }
    
    def _load_framework_mappings(self) -> Dict:
        """Load framework control mappings"""
        return {
            'iso27001': {
                'A.9': 'access_control',
                'A.10': 'data_protection',
                'A.16': 'incident_response'
            },
            'soc2': {
                'CC6': 'access_control',
                'CC7': 'data_protection',
                'CC8': 'incident_response'
            }
        }
    
    def recommend_controls(self, risk_profile: Dict) -> List[Dict]:
        """
        Recommend controls based on risk profile
        
        Args:
            risk_profile: Organization's risk profile
            
        Returns:
            List of recommended controls
        """
        recommendations = []
        
        # Analyze risk categories
        high_risk_categories = [
            cat for cat, level in risk_profile.get('risk_levels', {}).items()
            if level in ['High', 'Critical']
        ]
        
        # Get controls for high-risk areas
        for category in high_risk_categories:
            controls = self.control_library.get(category, [])
            for control in controls:
                # Calculate recommendation score
                score = self._calculate_recommendation_score(
                    control, risk_profile
                )
                recommendations.append({
                    **control,
                    'category': category,
                    'recommendation_score': score,
                    'rationale': f"Addresses {category} risks"
                })
        
        # Sort by recommendation score
        recommendations.sort(key=lambda x: x['recommendation_score'], reverse=True)
        
        return recommendations[:10]  # Top 10 recommendations
    
    def _calculate_recommendation_score(self, control: Dict, risk_profile: Dict) -> float:
        """Calculate how well a control matches the risk profile"""
        # Score based on effectiveness, complexity, and cost
        effectiveness = control['effectiveness']
        
        # Prefer low complexity
        complexity_scores = {'Low': 100, 'Medium': 75, 'High': 50}
        complexity_score = complexity_scores.get(control['complexity'], 50)
        
        # Prefer low cost
        cost_scores = {'Low': 100, 'Medium': 75, 'High': 50}
        cost_score = cost_scores.get(control['cost'], 50)
        
        # Weighted score
        score = (
            effectiveness * 0.5 +
            complexity_score * 0.3 +
            cost_score * 0.2
        )
        
        return round(score, 2)
    
    def suggest_framework_alignment(self, current_controls: List[Dict], target_framework: str) -> Dict:
        """
        Suggest how to align current controls with target framework
        
        Args:
            current_controls: List of implemented controls
            target_framework: Target compliance framework
            
        Returns:
            Alignment suggestions
        """
        if target_framework not in self.framework_mappings:
            return {'error': 'Unknown framework'}
        
        framework_map = self.framework_mappings[target_framework]
        suggestions = []
        
        # Identify control gaps per framework requirement
        for req_id, category in framework_map.items():
            # Check if category is covered
            category_controls = [
                ctrl for ctrl in current_controls
                if ctrl.get('category') == category
            ]
            
            if not category_controls:
                # Suggest controls for this category
                recommended = self.control_library.get(category, [])
                if recommended:
                    suggestions.append({
                        'requirement': req_id,
                        'category': category,
                        'status': 'Gap',
                        'recommended_controls': recommended[:2]  # Top 2
                    })
            else:
                suggestions.append({
                    'requirement': req_id,
                    'category': category,
                    'status': 'Covered',
                    'existing_controls': len(category_controls)
                })
        
        coverage = sum(1 for s in suggestions if s['status'] == 'Covered')
        total = len(suggestions)
        coverage_percentage = (coverage / total) * 100 if total > 0 else 0
        
        return {
            'framework': target_framework,
            'coverage_percentage': round(coverage_percentage, 1),
            'total_requirements': total,
            'covered_requirements': coverage,
            'gap_count': total - coverage,
            'suggestions': suggestions
        }
    
    def smart_control_mapping(self, source_framework: str, target_framework: str) -> List[Dict]:
        """
        Map controls between frameworks
        
        Args:
            source_framework: Source compliance framework
            target_framework: Target compliance framework
            
        Returns:
            Control mapping suggestions
        """
        source_map = self.framework_mappings.get(source_framework, {})
        target_map = self.framework_mappings.get(target_framework, {})
        
        mappings = []
        
        # Find equivalent controls
        for source_req, source_cat in source_map.items():
            for target_req, target_cat in target_map.items():
                if source_cat == target_cat:
                    mappings.append({
'source_requirement': source_req,
                        'target_requirement': target_req,
                        'category': source_cat,
                        'mapping_confidence': 'High'
                    })
        
        return mappings
    
    def prioritize_remediation(self, gaps: List[Dict]) -> List[Dict]:
        """
        Prioritize remediation activities
        
        Args:
            gaps: List of identified gaps
            
        Returns:
            Prioritized remediation plan
        """
        # Score each gap
        for gap in gaps:
            priority_score = 0
            
            # Factor 1: Severity
            if gap.get('priority') == 'Critical':
                priority_score += 100
            elif gap.get('priority') == 'High':
                priority_score += 75
            elif gap.get('priority') == 'Medium':
                priority_score += 50
            else:
                priority_score += 25
            
            # Factor 2: Ease of implementation
            complexity = gap.get('complexity', 'Medium')
            if complexity == 'Low':
                priority_score += 30
            elif complexity == 'Medium':
                priority_score += 15
            
            # Factor 3: Cost effectiveness
            cost = gap.get('cost', 'Medium')
            if cost == 'Low':
                priority_score += 20
            elif cost == 'Medium':
                priority_score += 10
            
            gap['priority_score'] = priority_score
            
            # Add recommended action
            if priority_score >= 150:
                gap['action'] = 'Immediate - Start within 1 week'
            elif priority_score >= 100:
                gap['action'] = 'High Priority - Start within 1 month'
            elif priority_score >= 50:
                gap['action'] = 'Medium Priority - Plan for next quarter'
            else:
                gap['action'] = 'Low Priority - Address as resources allow'
        
        # Sort by priority score
        gaps.sort(key=lambda x: x['priority_score'], reverse=True)
        
        return gaps

# Example usage
if __name__ == "__main__":
    engine = RecommendationEngine()
    
    # Get control recommendations
    risk_profile = {
        'risk_levels': {
            'access_control': 'High',
            'data_protection': 'Critical'
        }
    }
    
    recommendations = engine.recommend_controls(risk_profile)
    print(f"Top Recommendations: {len(recommendations)}")
    for rec in recommendations[:3]:
        print(f"- {rec['name']}: Score {rec['recommendation_score']}")
    
    # Check framework alignment
    current_controls = [
        {'category': 'access_control', 'name': 'MFA'}
    ]
    
    alignment = engine.suggest_framework_alignment(current_controls, 'iso27001')
    print(f"\\nFramework Coverage: {alignment['coverage_percentage']}%")
