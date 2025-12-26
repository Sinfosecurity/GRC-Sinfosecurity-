/**
 * Custom Framework Builder Service
 * Build custom compliance frameworks, control libraries, custom workflows
 */
export interface CustomFramework {
    id: string;
    name: string;
    description: string;
    industry?: string;
    basedOn?: string;
    version: string;
    status: 'draft' | 'active' | 'archived';
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    domains: CustomDomain[];
    totalControls: number;
}
export interface CustomDomain {
    id: string;
    name: string;
    description: string;
    controls: CustomControl[];
}
export interface CustomControl {
    id: string;
    code: string;
    title: string;
    description: string;
    category: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    testingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
    customFields?: Record<string, any>;
    mappings?: {
        framework: string;
        controlId: string;
    }[];
}
export interface ControlMapping {
    sourceFramework: string;
    sourceControl: string;
    targetFramework: string;
    targetControl: string;
    mappingType: 'equivalent' | 'partial' | 'related';
    verifiedBy?: string;
    verifiedAt?: Date;
}
declare class CustomFrameworkService {
    /**
     * Create custom framework
     */
    createFramework(data: Omit<CustomFramework, 'id' | 'createdAt' | 'updatedAt' | 'totalControls'>): CustomFramework;
    /**
     * Get all custom frameworks
     */
    getFrameworks(status?: CustomFramework['status']): CustomFramework[];
    /**
     * Get framework by ID
     */
    getFramework(frameworkId: string): CustomFramework | undefined;
    /**
     * Add domain to framework
     */
    addDomain(frameworkId: string, domain: Omit<CustomDomain, 'id'>): boolean;
    /**
     * Add control to domain
     */
    addControl(frameworkId: string, domainId: string, control: Omit<CustomControl, 'id'>): boolean;
    /**
     * Create control mapping between frameworks
     */
    createMapping(mapping: Omit<ControlMapping, 'verifiedAt'>): ControlMapping;
    /**
     * Get mappings for a framework
     */
    getMappings(frameworkName: string): ControlMapping[];
    /**
     * Clone existing framework as template
     */
    cloneFramework(sourceId: string, newName: string, createdBy: string): CustomFramework | null;
    /**
     * Export framework as JSON
     */
    exportFramework(frameworkId: string): CustomFramework | null;
    /**
     * Import framework from JSON
     */
    importFramework(frameworkData: any, importedBy: string): CustomFramework;
    /**
     * Get framework statistics
     */
    getStats(): {
        total: number;
        active: number;
        draft: number;
        totalControls: number;
        totalMappings: number;
        industries: string[];
    };
}
declare const _default: CustomFrameworkService;
export default _default;
//# sourceMappingURL=customFrameworkService.d.ts.map