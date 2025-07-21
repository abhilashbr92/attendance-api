import { Router } from 'express';
import { UserFaceController } from '../controllers/userFaceController';
import { authenticateAdminToken } from '../middleware/authMiddleware';
import { uploadSingle, ensureS3Initialized } from '../middleware/uploadMiddleware';

const router = Router();

// POST /api/faces - Add user face (requires auth + file upload)
router.post('/',
    authenticateAdminToken,
    ensureS3Initialized,
    uploadSingle,
    UserFaceController.addUserFace
);

// POST /api/face/recognize - Recognize face from embedding
router.post('/recognize', authenticateAdminToken, UserFaceController.recognizeFace);

router.get('/user/:userId', authenticateAdminToken, UserFaceController.getUserFaceFromS3);

export default router;