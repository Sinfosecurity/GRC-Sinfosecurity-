import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /risks
router.get('/', async (req, res) => {
  res.json({ message: 'List risks - Coming soon', data: [] });
});

// GET /risks/:id
router.get('/:id', async (req, res) => {
  res.json({ message: 'Get risk details - Coming soon', id: req.params.id });
});

// POST /risks
router.post('/', async (req, res) => {
  res.json({ message: 'Create risk - Coming soon', data: req.body });
});

// PUT /risks/:id
router.put('/:id', async (req, res) => {
  res.json({ message: 'Update risk - Coming soon', id: req.params.id, data: req.body });
});

// DELETE /risks/:id
router.delete('/:id', async (req, res) => {
  res.json({ message: 'Delete risk - Coming soon', id: req.params.id });
});

export default router;
