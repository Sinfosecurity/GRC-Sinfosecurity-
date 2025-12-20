"use strict";
/**
 * Zod Validation Schemas for Risk Appetite
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolveBreachSchema = exports.UpdateRiskAppetiteSchema = exports.CreateRiskAppetiteSchema = void 0;
const zod_1 = require("zod");
// Create Risk Appetite Schema
exports.CreateRiskAppetiteSchema = zod_1.z.object({
    category: zod_1.z.string().min(1, 'Category is required'),
    appetiteStatement: zod_1.z.string().min(1, 'Appetite statement is required'),
    riskTolerance: zod_1.z.number().min(0).max(100),
    earlyWarningThreshold: zod_1.z.number().min(0).max(100),
    approvedBy: zod_1.z.string().min(1, 'Approver is required'),
    approvalDate: zod_1.z.string().datetime(),
    reviewDate: zod_1.z.string().datetime().optional(),
    metrics: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        threshold: zod_1.z.number(),
        unit: zod_1.z.string().optional()
    })).optional()
});
// Update Risk Appetite Schema
exports.UpdateRiskAppetiteSchema = exports.CreateRiskAppetiteSchema.partial();
// Resolve Breach Schema
exports.ResolveBreachSchema = zod_1.z.object({
    mitigationPlan: zod_1.z.string().min(1, 'Mitigation plan is required'),
    mitigationOwner: zod_1.z.string().min(1, 'Mitigation owner is required'),
    targetResolutionDate: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().optional()
});
//# sourceMappingURL=risk-appetite.validators.js.map