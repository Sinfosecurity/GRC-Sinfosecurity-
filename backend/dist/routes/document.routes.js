"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// GET /documents
router.get('/', async (req, res) => {
    res.json({ message: 'List documents - Coming soon', data: [] });
});
// GET /documents/:id
router.get('/:id', async (req, res) => {
    res.json({ message: 'Get document details - Coming soon', id: req.params.id });
});
// POST /documents
router.post('/', async (req, res) => {
    res.json({ message: 'Create document - Coming soon', data: req.body });
});
// PUT /documents/:id
router.put('/:id', async (req, res) => {
    res.json({ message: 'Update document - Coming soon', id: req.params.id, data: req.body });
});
// DELETE /documents/:id
router.delete('/:id', async (req, res) => {
    res.json({ message: 'Delete document - Coming soon', id: req.params.id });
});
exports.default = router;
//# sourceMappingURL=document.routes.js.map