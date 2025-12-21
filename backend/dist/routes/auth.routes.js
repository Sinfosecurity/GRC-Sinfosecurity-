"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = (0, express_1.Router)();
const DEV_MODE = process.env.DEV_MODE === 'true';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
// Mock users for DEV_MODE - passwords are bcrypt hashed
// admin@sinfosecurity.com: demo123
// demo: demo
const mockUsers = [
    {
        id: 'user-1',
        email: 'admin@sinfosecurity.com',
        hashedPassword: '$2b$10$08OU9WS/bk6Gun6J2/5ooOjD/oY9sUeyG94bR47dnciRxtBbM1Es6', // demo123
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        organizationId: 'org-1',
        organization: {
            id: 'org-1',
            name: 'Sinfosecurity',
        },
    },
    {
        id: 'user-2',
        email: 'demo',
        hashedPassword: '$2b$10$9O7Jhiani1rWIc6s4sTC9OTOmcfkoJHm5YY1rroB2NvZ3P79blQHO', // demo
        firstName: 'Demo',
        lastName: 'User',
        role: 'USER',
        organizationId: 'org-1',
        organization: {
            id: 'org-1',
            name: 'Sinfosecurity',
        },
    },
];
// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
    if (!DEV_MODE) {
        return res.status(501).json({
            success: false,
            error: 'Registration requires database configuration. Set DEV_MODE=false and configure DATABASE_URL.'
        });
    }
    const { email, password, firstName, lastName } = req.body;
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({
            success: false,
            error: 'User already exists'
        });
    }
    // Hash password before storing
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    // Create new mock user
    const newUser = {
        id: `user-${mockUsers.length + 1}`,
        email,
        hashedPassword,
        firstName,
        lastName,
        role: 'USER',
        organizationId: 'org-1',
        organization: {
            id: 'org-1',
            name: 'Sinfosecurity',
        },
    };
    mockUsers.push(newUser);
    // Generate token
    const token = jsonwebtoken_1.default.sign({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        organizationId: newUser.organizationId,
    }, JWT_SECRET, { expiresIn: '24h' });
    // Set token in httpOnly cookie for security
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    res.json({
        success: true,
        data: {
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role,
                organizationId: newUser.organizationId,
            },
        },
    });
});
// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email and password are required',
        });
    }
    if (DEV_MODE) {
        // DEV_MODE: Use mock authentication
        const user = mockUsers.find((u) => u.email === email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }
        // Verify password using bcrypt
        const isValidPassword = await bcrypt_1.default.compare(password, user.hashedPassword);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
        }, JWT_SECRET, { expiresIn: '24h' });
        // Set token in httpOnly cookie for security
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
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
    }
    // Production mode requires database
    return res.status(501).json({
        success: false,
        error: 'Authentication requires database configuration. Set DEV_MODE=false and configure DATABASE_URL.',
    });
});
// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
    // Get token from cookie or body
    const token = req.cookies?.token || req.body.token;
    if (!token) {
        return res.status(400).json({
            success: false,
            error: 'Token is required',
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Generate new token
        const newToken = jsonwebtoken_1.default.sign({
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            organizationId: decoded.organizationId,
        }, JWT_SECRET, { expiresIn: '24h' });
        // Set token in httpOnly cookie
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        res.json({
            success: true,
            data: { message: 'Token refreshed successfully' },
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
        });
    }
});
// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
    // Clear the token cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({
        success: true,
        data: { message: 'Logged out successfully' },
    });
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map