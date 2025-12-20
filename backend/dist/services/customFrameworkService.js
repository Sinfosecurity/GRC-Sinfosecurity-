"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../config/logger"));
// In-memory storage
const customFrameworks = new Map();
const controlMappings = [];
// Initialize with a demo custom framework
customFrameworks.set('custom_1', {
    id: 'custom_1',
    name: 'SaaS Security Framework',
    description: 'Custom security framework for SaaS companies combining ISO 27001, SOC 2, and GDPR requirements',
    industry: 'Technology',
    basedOn: 'ISO 27001, SOC 2, GDPR',
    version: '1.0',
    status: 'active',
    createdBy: 'admin@sinfosecurity.com',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    totalControls: 45,
    domains: [
        {
            id: 'dom_1',
            name: 'Access Control & Authentication',
            description: 'Controls for identity, access management, and MFA',
            controls: [
                {
                    id: 'ctrl_1',
                    code: 'AC-001',
                    title: 'Multi-Factor Authentication Enforcement',
                    description: 'All user accounts must use MFA for access to production systems',
                    category: 'Access Control',
                    priority: 'critical',
                    testingFrequency: 'monthly',
                    mappings: [
                        { framework: 'ISO 27001', controlId: 'A.9.4.2' },
                        { framework: 'SOC 2', controlId: 'CC6.1' },
                    ],
                },
                {
                    id: 'ctrl_2',
                    code: 'AC-002',
                    title: 'Privileged Access Management',
                    description: 'Separate privileged accounts with just-in-time access provisioning',
                    category: 'Access Control',
                    priority: 'high',
                    testingFrequency: 'quarterly',
                    mappings: [
                        { framework: 'ISO 27001', controlId: 'A.9.2.3' },
                    ],
                },
            ],
        },
        {
            id: 'dom_2',
            name: 'Data Privacy & Protection',
            description: 'GDPR-aligned data privacy controls',
            controls: [
                {
                    id: 'ctrl_3',
                    code: 'DP-001',
                    title: 'Data Subject Rights Portal',
                    description: 'Automated portal for data subject requests (access, deletion, portability)',
                    category: 'Privacy',
                    priority: 'critical',
                    testingFrequency: 'monthly',
                    customFields: {
                        gdprArticle: 'Article 15-20',
                        responseTime: '30 days',
                    },
                    mappings: [
                        { framework: 'GDPR', controlId: 'Art.15-20' },
                    ],
                },
            ],
        },
    ],
});
class CustomFrameworkService {
    /**
     * Create custom framework
     */
    createFramework(data) {
        const totalControls = data.domains.reduce((sum, d) => sum + d.controls.length, 0);
        const framework = {
            id: `custom_${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            totalControls,
        };
        customFrameworks.set(framework.id, framework);
        logger_1.default.info(`🏗️ Custom framework created: ${framework.name}`);
        return framework;
    }
    /**
     * Get all custom frameworks
     */
    getFrameworks(status) {
        let frameworks = Array.from(customFrameworks.values());
        if (status) {
            frameworks = frameworks.filter(f => f.status === status);
        }
        return frameworks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    /**
     * Get framework by ID
     */
    getFramework(frameworkId) {
        return customFrameworks.get(frameworkId);
    }
    /**
     * Add domain to framework
     */
    addDomain(frameworkId, domain) {
        const framework = customFrameworks.get(frameworkId);
        if (!framework)
            return false;
        const newDomain = {
            id: `dom_${Date.now()}`,
            ...domain,
        };
        framework.domains.push(newDomain);
        framework.totalControls = framework.domains.reduce((sum, d) => sum + d.controls.length, 0);
        framework.updatedAt = new Date();
        return true;
    }
    /**
     * Add control to domain
     */
    addControl(frameworkId, domainId, control) {
        const framework = customFrameworks.get(frameworkId);
        if (!framework)
            return false;
        const domain = framework.domains.find(d => d.id === domainId);
        if (!domain)
            return false;
        const newControl = {
            id: `ctrl_${Date.now()}`,
            ...control,
        };
        domain.controls.push(newControl);
        framework.totalControls = framework.domains.reduce((sum, d) => sum + d.controls.length, 0);
        framework.updatedAt = new Date();
        return true;
    }
    /**
     * Create control mapping between frameworks
     */
    createMapping(mapping) {
        const newMapping = {
            ...mapping,
            verifiedAt: new Date(),
        };
        controlMappings.push(newMapping);
        logger_1.default.info(`🔗 Control mapping created: ${mapping.sourceFramework}.${mapping.sourceControl} → ${mapping.targetFramework}.${mapping.targetControl}`);
        return newMapping;
    }
    /**
     * Get mappings for a framework
     */
    getMappings(frameworkName) {
        return controlMappings.filter(m => m.sourceFramework === frameworkName || m.targetFramework === frameworkName);
    }
    /**
     * Clone existing framework as template
     */
    cloneFramework(sourceId, newName, createdBy) {
        const source = customFrameworks.get(sourceId);
        if (!source)
            return null;
        const cloned = {
            ...JSON.parse(JSON.stringify(source)), // Deep clone
            id: `custom_${Date.now()}`,
            name: newName,
            version: '1.0',
            status: 'draft',
            createdBy,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        customFrameworks.set(cloned.id, cloned);
        return cloned;
    }
    /**
     * Export framework as JSON
     */
    exportFramework(frameworkId) {
        const framework = customFrameworks.get(frameworkId);
        return framework ? JSON.parse(JSON.stringify(framework)) : null;
    }
    /**
     * Import framework from JSON
     */
    importFramework(frameworkData, importedBy) {
        const framework = {
            ...frameworkData,
            id: `custom_${Date.now()}`,
            createdBy: importedBy,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'draft',
        };
        customFrameworks.set(framework.id, framework);
        return framework;
    }
    /**
     * Get framework statistics
     */
    getStats() {
        const allFrameworks = Array.from(customFrameworks.values());
        return {
            total: allFrameworks.length,
            active: allFrameworks.filter(f => f.status === 'active').length,
            draft: allFrameworks.filter(f => f.status === 'draft').length,
            totalControls: allFrameworks.reduce((sum, f) => sum + f.totalControls, 0),
            totalMappings: controlMappings.length,
            industries: [...new Set(allFrameworks.map(f => f.industry).filter(Boolean))],
        };
    }
}
exports.default = new CustomFrameworkService();
//# sourceMappingURL=customFrameworkService.js.map