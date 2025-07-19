import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateAdminToken, authenticateUserToken } from '../middleware/authMiddleware';

const router = Router();

// POST /api/users/setup - Create entity and admin user (no auth required)
router.get('/setup', UserController.createEntityAndUser);

// POST /api/users/login - Login user (no auth required)
router.post('/login', UserController.loginUser);

// POST /api/users/logout - Logout user (requires auth)
router.post('/logout', authenticateUserToken, UserController.logoutUser);

// GET /api/users/info - Get user profile (requires auth)
router.get('/info', authenticateUserToken, UserController.getUserProfile);

// GET /api/users/list - Get all users (requires admin auth)
router.get('/list', authenticateAdminToken, UserController.getAllUsers);

// GET /api/users/:id - Get user by ID (requires admin auth)
router.get('/:id', authenticateAdminToken, UserController.getUserById);

// POST /api/users - Create new user (requires admin auth)
router.post('/', authenticateAdminToken, UserController.createUser);

// PUT /api/users/:id - Update user (requires admin auth)
router.put('/:id', authenticateAdminToken, UserController.updateUser);

// DELETE /api/users/:id - Delete user (requires admin auth)
router.delete('/:id', authenticateAdminToken, UserController.deleteUser);

export default router;