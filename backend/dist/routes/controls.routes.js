"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// GET /controlss
router.get('/', async (req, res) => {
    res.json({ message: 'List controlss - Coming soon', data: [] });
});
// GET /controlss/:id
router.get('/:id', async (req, res) => {
    res.json({ message: 'Get controls details - Coming soon', id: req.params.id });
});
// POST /controlss
router.post('/', async (req, res) => {
    res.json({ message: 'Create controls - Coming soon', data: req.body });
});
// PUT /controlss/:id
router.put('/:id', async (req, res) => {
    res.json({ message: 'Update controls - Coming soon', id: req.params.id, data: req.body });
});
// DELETE /controlss/:id
router.delete('/:id', async (req, res) => {
    res.json({ message: 'Delete controls - Coming soon', id: req.params.id });
});
exports.default = router;
//# sourceMappingURL=controls.routes.js.map