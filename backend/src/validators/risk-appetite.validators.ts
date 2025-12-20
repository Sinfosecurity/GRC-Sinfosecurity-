/**
 * Zod Validation Schemas for Risk Appetite
 */

import { z } from 'zod';

// Create Risk Appetite Schema
export const CreateRiskAppetiteSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    appetiteStatement: z.string().min(1, 'Appetite statement is required'),
    riskTolerance: z.number().min(0).max(100),
    earlyWarningThreshold: z.number().min(0).max(100),
    approvedBy: z.string().min(1, 'Approver is required'),
    approvalDate: z.string().datetime(),
    reviewDate: z.string().datetime().optional(),
    metrics: z.array(z.object({
        name: z.string(),
        threshold: z.number(),
        unit: z.string().optional()
    })).optional()
});

// Update Risk Appetite Schema
export const UpdateRiskAppetiteSchema = CreateRiskAppetiteSchema.partial();

// Resolve Breach Schema
export const ResolveBreachSchema = z.object({
    mitigationPlan: z.string().min(1, 'Mitigation plan is required'),
    mitigationOwner: z.string().min(1, 'Mitigation owner is required'),
    targetResolutionDate: z.string().datetime().optional(),
    notes: z.string().optional()
});
