import { Router } from 'express';
import { UserFaceController } from '../controllers/userFaceController';
import { authenticateUserToken } from '../middleware/authMiddleware';
import { uploadSingle, ensureS3Initialized } from '../middleware/uploadMiddleware';

const router = Router();

// POST /api/faces - Add user face (requires auth + file upload)
router.post('/', 
    authenticateUserToken, 
    ensureS3Initialized, 
    uploadSingle, 
    UserFaceController.addUserFace
);

export default router;