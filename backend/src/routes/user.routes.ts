import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import prisma from '../config/database';
import { AuthRequest, authenticate, requirePermission, requireRole } from '../middleware/auth';
import { Permission } from '../services/userService';

const router = Router();
const publicUserSelect = { id: true, email: true, firstName: true, lastName: true, role: true, organizationId: true, createdAt: true, updatedAt: true, lastLogin: true } as const;
const isAdmin = (role?: Role) => role === Role.SUPERADMIN || role === Role.ADMIN;

// Static routes must be declared before /:id.
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'No user session' });
  const user = await prisma.user.findFirst({ where: { id: req.user.id, organizationId: req.user.organizationId }, select: publicUserSelect });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  return res.json({ success: true, data: { user } });
});

// Fail closed until invitation records and token hashes are durable.
router.post('/invite', authenticate, requirePermission(Permission.INVITE_USERS), (_req, res) => res.status(501).json({ success: false, error: 'Invitations are disabled until durable, cryptographically secure invitation storage is implemented.' }));
router.get('/invitations', authenticate, requireRole(Role.SUPERADMIN, Role.ADMIN), (_req, res) => res.status(501).json({ success: false, error: 'Persistent invitation storage is not implemented.' }));
router.post('/accept-invitation', (_req, res) => res.status(501).json({ success: false, error: 'Invitation acceptance is disabled until persistent invitation storage is implemented.' }));

router.get('/', authenticate, requirePermission(Permission.VIEW_USERS), async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  const users = await prisma.user.findMany({ where: { organizationId: req.user.organizationId }, select: publicUserSelect, orderBy: { createdAt: 'asc' } });
  return res.json({ success: true, count: users.length, data: users });
});

router.post('/', authenticate, requireRole(Role.SUPERADMIN, Role.ADMIN), async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  const { email, password, firstName, lastName, role = Role.USER } = req.body;
  if (!email || !password || !firstName || !lastName) return res.status(400).json({ success: false, error: 'email, password, firstName, and lastName are required' });
  if (password.length < 12) return res.status(400).json({ success: false, error: 'Password must be at least 12 characters' });
  if (!Object.values(Role).includes(role)) return res.status(400).json({ success: false, error: 'Invalid role' });
  if (role === Role.SUPERADMIN && req.user.role !== Role.SUPERADMIN) return res.status(403).json({ success: false, error: 'Only SUPERADMIN can create another SUPERADMIN' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ success: false, error: 'User with this email already exists' });
  const user = await prisma.user.create({ data: { email, hashedPassword: await bcrypt.hash(password, 12), firstName, lastName, role, organizationId: req.user.organizationId }, select: publicUserSelect });
  return res.status(201).json({ success: true, data: user, message: 'User created successfully' });
});

router.get('/:id/permissions', authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (req.params.id !== req.user.id && !isAdmin(req.user.role)) return res.status(403).json({ success: false, error: 'Forbidden: Cannot view other user permissions' });
  const user = await prisma.user.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId }, select: { id: true, role: true } });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  return res.json({ success: true, data: { role: user.role } });
});

router.get('/:id', authenticate, requirePermission(Permission.VIEW_USERS), async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  const user = await prisma.user.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId }, select: publicUserSelect });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  return res.json({ success: true, data: user });
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  const target = await prisma.user.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
  if (!target) return res.status(404).json({ success: false, error: 'User not found' });
  const admin = isAdmin(req.user.role);
  if (target.id !== req.user.id && !admin) return res.status(403).json({ success: false, error: 'Forbidden: Cannot update other users' });
  const data: any = {};
  if (typeof req.body.firstName === 'string') data.firstName = req.body.firstName;
  if (typeof req.body.lastName === 'string') data.lastName = req.body.lastName;
  if (req.body.password !== undefined) {
    if (typeof req.body.password !== 'string' || req.body.password.length < 12) return res.status(400).json({ success: false, error: 'Password must be at least 12 characters' });
    data.hashedPassword = await bcrypt.hash(req.body.password, 12);
  }
  if (req.body.role !== undefined) {
    if (!admin) return res.status(403).json({ success: false, error: 'Only administrators can change roles' });
    if (!Object.values(Role).includes(req.body.role)) return res.status(400).json({ success: false, error: 'Invalid role' });
    if (req.body.role === Role.SUPERADMIN && req.user.role !== Role.SUPERADMIN) return res.status(403).json({ success: false, error: 'Only SUPERADMIN can grant SUPERADMIN' });
    data.role = req.body.role;
  }
  const user = await prisma.user.update({ where: { id: target.id }, data, select: publicUserSelect });
  return res.json({ success: true, data: user, message: 'User updated successfully' });
});

router.delete('/:id', authenticate, requireRole(Role.SUPERADMIN, Role.ADMIN), (_req, res) => res.status(501).json({ success: false, error: 'User deactivation is disabled until a persistent account-status field and migration are added.' }));

export default router;
