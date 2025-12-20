"use strict";
/**
 * API v1 Routes
 * Public REST API for external integrations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const risks_1 = __importDefault(require("./risks"));
const compliance_1 = __importDefault(require("./compliance"));
const tasks_1 = __importDefault(require("./tasks"));
const reports_1 = __importDefault(require("./reports"));
const router = (0, express_1.Router)();
// Mount API routes
router.use('/risks', risks_1.default);
router.use('/compliance', compliance_1.default);
router.use('/tasks', tasks_1.default);
router.use('/reports', reports_1.default);
// API Info endpoint
router.get('/', (req, res) => {
    res.json({
        version: 'v1',
        name: 'GRC Platform API',
        description: 'Public REST API for GRC Platform integrations',
        endpoints: {
            risks: '/api/v1/risks',
            compliance: '/api/v1/compliance',
            tasks: '/api/v1/tasks',
            reports: '/api/v1/reports',
        },
        documentation: '/api/docs',
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map