"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// GET /incidents
router.get('/', async (req, res) => {
    res.json({ message: 'List incidents - Coming soon', data: [] });
});
// GET /incidents/:id
router.get('/:id', async (req, res) => {
    res.json({ message: 'Get incident details - Coming soon', id: req.params.id });
});
// POST /incidents
router.post('/', async (req, res) => {
    res.json({ message: 'Create incident - Coming soon', data: req.body });
});
// PUT /incidents/:id
router.put('/:id', async (req, res) => {
    res.json({ message: 'Update incident - Coming soon', id: req.params.id, data: req.body });
});
// DELETE /incidents/:id
router.delete('/:id', async (req, res) => {
    res.json({ message: 'Delete incident - Coming soon', id: req.params.id });
});
exports.default = router;
//# sourceMappingURL=incident.routes.js.map