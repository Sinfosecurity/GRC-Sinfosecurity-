import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { JwtClaims } from '../middleware/auth';

const router = Router();
const DEV_MODE = process.env.DEV_MODE === 'true';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const mockUsers = [
  {
    id: 'user-1', email: 'admin@sinfosecurity.com',
    hashedPassword: '$2b$10$08OU9WS/bk6Gun6J2/5ooOjD/oY9sUeyG94bR47dnciRxtBbM1Es6',
    firstName: 'Admin', lastName: 'User', role: 'ADMIN' as const, organizationId: 'org-1',
  },
  {
    id: 'user-2', email: 'demo',
    hashedPassword: '$2b$10$9O7Jhiani1rWIc6s4sTC9OTOmcfkoJHm5YY1rroB2NvZ3P79blQHO',
    firstName: 'Demo', lastName: 'User', role: 'USER' as const, organizationId: 'org-1',
  },
];

const signToken = (user: { id: string; email: string; role: any; organizationId: string }) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId } satisfies JwtClaims,
    JWT_SECRET,
    { expiresIn: '24h' }
  );

const setAuthCookie = (res: Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });
};

router.post('/register', async (req: Request, res: Response) => {
  if (!DEV_MODE) {
    return res.status(403).json({
      success: false,
      error: 'Public registration is disabled. Users must be provisioned by an authorized administrator.',
    });
  }

  const { email, password, firstName, lastName } = req.body;
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ success: false, error: 'email, password, firstName, and lastName are required' });
  }

  if (mockUsers.some(u => u.email === email)) {
    return res.status(400).json({ success: false, error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: `user-${mockUsers.length + 1}`,
    email,
    hashedPassword,
    firstName,
    lastName,
    role: 'USER' as const,
    organizationId: 'org-1',
  };
  mockUsers.push(newUser);

  const token = signToken(newUser);
  setAuthCookie(res, token);
  return res.status(201).json({
    success: true,
    data: { token, user: { id: newUser.id, email, firstName, lastName, role: newUser.role, organizationId: newUser.organizationId } },
  });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    if (DEV_MODE) {
      const user = mockUsers.find(u => u.email === email);
      if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const token = signToken(user);
      setAuthCookie(res, token);
      return res.json({
        success: true,
        data: { token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, organizationId: user.organizationId } },
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        },
      },
    });
  } catch {
    return res.status(503).json({ success: false, error: 'Authentication service unavailable' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.token || req.body.token;
  if (!token) return res.status(400).json({ success: false, error: 'Token is required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtClaims;
    if (!decoded.id || !decoded.organizationId) {
      return res.status(401).json({ success: false, error: 'Invalid token claims' });
    }

    const user = DEV_MODE
      ? mockUsers.find(u => u.id === decoded.id && u.organizationId === decoded.organizationId)
      : await prisma.user.findFirst({ where: { id: decoded.id, organizationId: decoded.organizationId } });

    if (!user) return res.status(401).json({ success: false, error: 'Invalid user or organization membership' });

    const newToken = signToken(user);
    setAuthCookie(res, newToken);
    return res.json({ success: true, data: { message: 'Token refreshed successfully' } });
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

export default router;
