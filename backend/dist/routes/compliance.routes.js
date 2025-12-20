"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// GET /compliances
router.get('/', async (req, res) => {
    res.json({ message: 'List compliances - Coming soon', data: [] });
});
// GET /compliances/:id
router.get('/:id', async (req, res) => {
    res.json({ message: 'Get compliance details - Coming soon', id: req.params.id });
});
// POST /compliances
router.post('/', async (req, res) => {
    res.json({ message: 'Create compliance - Coming soon', data: req.body });
});
// PUT /compliances/:id
router.put('/:id', async (req, res) => {
    res.json({ message: 'Update compliance - Coming soon', id: req.params.id, data: req.body });
});
// DELETE /compliances/:id
router.delete('/:id', async (req, res) => {
    res.json({ message: 'Delete compliance - Coming soon', id: req.params.id });
});
exports.default = router;
//# sourceMappingURL=compliance.routes.js.map