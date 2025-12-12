import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

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

export default router;
