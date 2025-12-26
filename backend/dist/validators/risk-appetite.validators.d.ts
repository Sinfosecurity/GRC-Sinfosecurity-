/**
 * Zod Validation Schemas for Risk Appetite
 */
import { z } from 'zod';
export declare const CreateRiskAppetiteSchema: z.ZodObject<{
    category: z.ZodString;
    appetiteStatement: z.ZodString;
    riskTolerance: z.ZodNumber;
    earlyWarningThreshold: z.ZodNumber;
    approvedBy: z.ZodString;
    approvalDate: z.ZodString;
    reviewDate: z.ZodOptional<z.ZodString>;
    metrics: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        threshold: z.ZodNumber;
        unit: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        unit?: string;
        threshold?: number;
    }, {
        name?: string;
        unit?: string;
        threshold?: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    category?: string;
    reviewDate?: string;
    approvedBy?: string;
    appetiteStatement?: string;
    riskTolerance?: number;
    earlyWarningThreshold?: number;
    approvalDate?: string;
    metrics?: {
        name?: string;
        unit?: string;
        threshold?: number;
    }[];
}, {
    category?: string;
    reviewDate?: string;
    approvedBy?: string;
    appetiteStatement?: string;
    riskTolerance?: number;
    earlyWarningThreshold?: number;
    approvalDate?: string;
    metrics?: {
        name?: string;
        unit?: string;
        threshold?: number;
    }[];
}>;
export declare const UpdateRiskAppetiteSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    appetiteStatement: z.ZodOptional<z.ZodString>;
    riskTolerance: z.ZodOptional<z.ZodNumber>;
    earlyWarningThreshold: z.ZodOptional<z.ZodNumber>;
    approvedBy: z.ZodOptional<z.ZodString>;
    approvalDate: z.ZodOptional<z.ZodString>;
    reviewDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    metrics: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        threshold: z.ZodNumber;
        unit: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        unit?: string;
        threshold?: number;
    }, {
        name?: string;
        unit?: string;
        threshold?: number;
    }>, "many">>>;
}, "strip", z.ZodTypeAny, {
    category?: string;
    reviewDate?: string;
    approvedBy?: string;
    appetiteStatement?: string;
    riskTolerance?: number;
    earlyWarningThreshold?: number;
    approvalDate?: string;
    metrics?: {
        name?: string;
        unit?: string;
        threshold?: number;
    }[];
}, {
    category?: string;
    reviewDate?: string;
    approvedBy?: string;
    appetiteStatement?: string;
    riskTolerance?: number;
    earlyWarningThreshold?: number;
    approvalDate?: string;
    metrics?: {
        name?: string;
        unit?: string;
        threshold?: number;
    }[];
}>;
export declare const ResolveBreachSchema: z.ZodObject<{
    mitigationPlan: z.ZodString;
    mitigationOwner: z.ZodString;
    targetResolutionDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string;
    mitigationPlan?: string;
    mitigationOwner?: string;
    targetResolutionDate?: string;
}, {
    notes?: string;
    mitigationPlan?: string;
    mitigationOwner?: string;
    targetResolutionDate?: string;
}>;
//# sourceMappingURL=risk-appetite.validators.d.ts.map