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
        name: string;
        threshold: number;
        unit?: string | undefined;
    }, {
        name: string;
        threshold: number;
        unit?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    category: string;
    approvedBy: string;
    appetiteStatement: string;
    riskTolerance: number;
    earlyWarningThreshold: number;
    approvalDate: string;
    reviewDate?: string | undefined;
    metrics?: {
        name: string;
        threshold: number;
        unit?: string | undefined;
    }[] | undefined;
}, {
    category: string;
    approvedBy: string;
    appetiteStatement: string;
    riskTolerance: number;
    earlyWarningThreshold: number;
    approvalDate: string;
    reviewDate?: string | undefined;
    metrics?: {
        name: string;
        threshold: number;
        unit?: string | undefined;
    }[] | undefined;
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
        name: string;
        threshold: number;
        unit?: string | undefined;
    }, {
        name: string;
        threshold: number;
        unit?: string | undefined;
    }>, "many">>>;
}, "strip", z.ZodTypeAny, {
    category?: string | undefined;
    reviewDate?: string | undefined;
    approvedBy?: string | undefined;
    appetiteStatement?: string | undefined;
    riskTolerance?: number | undefined;
    earlyWarningThreshold?: number | undefined;
    approvalDate?: string | undefined;
    metrics?: {
        name: string;
        threshold: number;
        unit?: string | undefined;
    }[] | undefined;
}, {
    category?: string | undefined;
    reviewDate?: string | undefined;
    approvedBy?: string | undefined;
    appetiteStatement?: string | undefined;
    riskTolerance?: number | undefined;
    earlyWarningThreshold?: number | undefined;
    approvalDate?: string | undefined;
    metrics?: {
        name: string;
        threshold: number;
        unit?: string | undefined;
    }[] | undefined;
}>;
export declare const ResolveBreachSchema: z.ZodObject<{
    mitigationPlan: z.ZodString;
    mitigationOwner: z.ZodString;
    targetResolutionDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mitigationPlan: string;
    mitigationOwner: string;
    notes?: string | undefined;
    targetResolutionDate?: string | undefined;
}, {
    mitigationPlan: string;
    mitigationOwner: string;
    notes?: string | undefined;
    targetResolutionDate?: string | undefined;
}>;
//# sourceMappingURL=risk-appetite.validators.d.ts.map