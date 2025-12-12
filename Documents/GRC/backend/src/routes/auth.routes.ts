import { Router } from 'express';
const router = Router();

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  res.json({ message: 'Register endpoint - Coming soon' });
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  res.json({ message: 'Login endpoint - Coming soon' });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
  res.json({ message: 'Refresh token endpoint - Coming soon'});
});

export default router;
