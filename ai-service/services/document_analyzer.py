"""
Document Analyzer Service
NLP-powered document analysis for compliance
"""

from typing import Dict, List
import re

class DocumentAnalyzerService:
    def __init__(self):
        self.compliance_keywords = {
            'iso27001': [
                'information security', 'risk assessment', 'access control',
                'cryptography', 'physical security', 'incident management'
            ],
            'gdpr': [
                'personal data', 'data subject', 'processing', 'consent',
                'data protection', 'privacy', 'controller', 'processor'
            ],
            'soc2': [
                'security', 'availability', 'processing integrity',
                'confidentiality', 'privacy', 'trust services'
            ]
        }
    
    def analyze_document(self, document_text: str, document_type: str = 'policy') -> Dict:
        """
        Analyze document for compliance requirements
        
        Args:
            document_text: Text content of the document
            document_type: Type of document ('policy', 'procedure', 'contract')
            
        Returns:
            Analysis results including compliance coverage
        """
        # Basic text analysis
        word_count = len(document_text.split())
        sentences = document_text.split('.')
        sentence_count = len([s for s in sentences if s.strip()])
        
        # Extract key sections
        sections = self._extract_sections(document_text)
        
        # Identify compliance frameworks mentioned
        frameworks_mentioned = self._identify_frameworks(document_text)
        
        # Check for required elements
        completeness = self._check_completeness(document_text, document_type)
        
        # Extract requirements
        requirements = self._extract_requirements(document_text)
        
        return {
            'document_type': document_type,
            'word_count': word_count,
            'sentence_count': sentence_count,
            'sections_found': len(sections),
            'sections': sections,
            'frameworks_mentioned': frameworks_mentioned,
            'completeness_score': completeness['score'],
            'missing_elements': completeness['missing'],
            'requirements_identified': len(requirements),
            'requirements': requirements,
            'quality_score': self._calculate_quality_score(
                word_count, sections, completeness['score']
            )
        }
    
    def _extract_sections(self, text: str) -> List[str]:
        """Extract section headings from document"""
        # Look for common heading patterns
        section_patterns = [
            r'^\d+\.\s+([A-Z][^\n]+)',  # 1. Section Title
            r'^([A-Z][A-Z\s]+)$',  # ALL CAPS TITLE
            r'^#+\s+(.+)$'  # Markdown headers
        ]
        
        sections = []
        for line in text.split('\n'):
            for pattern in section_patterns:
                match = re.match(pattern, line.strip())
                if match:
                    sections.append(match.group(1).strip())
                    break
        
        return sections
    
    def _identify_frameworks(self, text: str) -> List[str]:
        """Identify mentioned compliance frameworks"""
        text_lower = text.lower()
        frameworks = []
        
        framework_identifiers = {
            'iso27001': ['iso 27001', 'iso27001', 'iso/iec 27001'],
            'soc2': ['soc 2', 'soc2', 'soc ii'],
            'gdpr': ['gdpr', 'general data protection regulation'],
            'hipaa': ['hipaa', 'health insurance portability'],
            'pci_dss': ['pci dss', 'pci-dss', 'payment card industry']
        }
        
        for framework, identifiers in framework_identifiers.items():
            if any(identifier in text_lower for identifier in identifiers):
                frameworks.append(framework)
        
        return frameworks
    
    def _check_completeness(self, text: str, doc_type: str) -> Dict:
        """Check if document contains required elements"""
        text_lower = text.lower()
        
        required_elements = {
            'policy': [
                'purpose', 'scope', 'responsibilities', 'policy statement',
                'compliance', 'review', 'effective date'
            ],
            'procedure': [
                'purpose', 'scope', 'procedure steps', 'responsibilities',
                'references', 'records'
            ],
            'contract': [
                'parties', 'term', 'obligations', 'confidentiality',
                'liability', 'termination'
            ]
        }
        
        required = required_elements.get(doc_type, [])
        missing = []
        found = 0
        
        for element in required:
            if element.lower() in text_lower:
                found += 1
            else:
                missing.append(element)
        
        score = (found / len(required)) * 100 if required else 100
        
        return {
            'score': round(score, 1),
            'found': found,
            'total_required': len(required),
            'missing': missing
        }
    
    def _extract_requirements(self, text: str) -> List[Dict]:
        """Extract compliance requirements from text"""
        requirements = []
        
        # Look for requirement patterns
        requirement_patterns = [
            r'must\s+([^.]+)',
            r'shall\s+([^.]+)',
            r'required to\s+([^.]+)',
            r'mandatory\s+([^.]+)'
        ]
        
        for pattern in requirement_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                req_text = match.group(1).strip()
                if len(req_text) > 10:  # Filter out very short matches
                    requirements.append({
                        'text': req_text,
                        'type': 'mandatory',
                        'position': match.start()
                    })
        
        # Remove duplicates
        seen = set()
        unique_reqs = []
        for req in requirements:
            if req['text'] not in seen:
                seen.add(req['text'])
                unique_reqs.append(req)
        
        return unique_reqs[:10]  # Return top 10
    
    def _calculate_quality_score(self, word_count: int, sections: List, completeness: float) -> float:
        """Calculate overall document quality score"""
        # Scoring factors
        length_score = min(100, (word_count / 1000) * 100)  # Expect ~1000 words
        structure_score = min(100, (len(sections) / 5) * 100)  # Expect ~5 sections
        
        # Weighted average
        quality = (
            completeness * 0.5 +
            length_score * 0.25 +
            structure_score * 0.25
        )
        
        return round(quality, 1)
    
    def extract_clauses(self, contract_text: str) -> List[Dict]:
        """Extract key clauses from contracts"""
        clauses = []
        
        # Common contract clause types
        clause_keywords = {
            'confidentiality': ['confidential', 'non-disclosure', 'proprietary'],
            'data_protection': ['personal data', 'data processing', 'gdpr', 'privacy'],
            'liability': ['liability', 'indemnification', 'damages'],
            'termination': ['termination', 'cancellation', 'end of agreement'],
            'security': ['security measures', 'safeguards', 'protection']
        }
        
        for clause_type, keywords in clause_keywords.items():
            for keyword in keywords:
                if keyword.lower() in contract_text.lower():
                    # Extract surrounding text
                    pattern = rf'.{{0,200}}{re.escape(keyword)}.{{0,200}}'
                    matches = re.finditer(pattern, contract_text, re.IGNORECASE)
                    for match in matches:
                        clauses.append({
                            'type': clause_type,
                            'keyword': keyword,
                            'excerpt': match.group().strip()
                        })
                        break  # One example per keyword
        
        return clauses

# Example usage
if __name__ == "__main__":
    service = DocumentAnalyzerService()
    
    sample_policy = """
    1. Purpose
    This Information Security Policy defines the security requirements.
    
    2. Scope
    This policy applies to all employees and must be followed.
    
    3. Responsibilities
    Management shall ensure compliance with ISO 27001.
    """
    
    result = service.analyze_document(sample_policy, 'policy')
    print(f"Quality Score: {result['quality_score']}")
    print(f"Completeness: {result['completeness_score']}%")
    print(f"Requirements Found: {result['requirements_identified']}")
