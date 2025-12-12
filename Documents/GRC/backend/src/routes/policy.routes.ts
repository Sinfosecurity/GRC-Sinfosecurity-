import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /policys
router.get('/', async (req, res) => {
  res.json({ message: 'List policys - Coming soon', data: [] });
});

// GET /policys/:id
router.get('/:id', async (req, res) => {
  res.json({ message: 'Get policy details - Coming soon', id: req.params.id });
});

// POST /policys
router.post('/', async (req, res) => {
  res.json({ message: 'Create policy - Coming soon', data: req.body });
});

// PUT /policys/:id
router.put('/:id', async (req, res) => {
  res.json({ message: 'Update policy - Coming soon', id: req.params.id, data: req.body });
});

// DELETE /policys/:id
router.delete('/:id', async (req, res) => {
  res.json({ message: 'Delete policy - Coming soon', id: req.params.id });
});

export default router;
