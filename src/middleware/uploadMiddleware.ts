import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { Request, Response, NextFunction } from 'express';
import { Config } from '../models/s3Config';

let s3Client: S3Client | null = null;
let upload: multer.Multer | null = null;

// Initialize S3 client from database config
async function initializeS3() {
    try {
        // Fetch S3 configuration from database
        const s3Config = await Config.findById('s3-config');

        if (!s3Config) {
            throw new Error('S3 configuration not found in database');
        }

        const { accessKeyId, secretAccessKey, region, bucketName } = s3Config.Config;

        // Configure AWS S3 Client (SDK v3)
        s3Client = new S3Client({
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            },
            region: region
        });

        // Configure multer with S3
        upload = multer({
            storage: multerS3({
                s3: s3Client,
                bucket: bucketName,
                key: function (req: Request, file: Express.Multer.File, cb: Function) {
                    // Generate unique filename with timestamp
                    const fileName = `faces/${Date.now()}-${Math.round(Math.random() * 1E9)}.${file.originalname.split('.').pop()}`;
                    cb(null, fileName);
                },
                contentType: multerS3.AUTO_CONTENT_TYPE,
                metadata: function (req: Request, file: Express.Multer.File, cb: Function) {
                    cb(null, { fieldName: file.fieldname });
                }
            }),
            limits: {
                fileSize: 5 * 1024 * 1024 // 5MB limit
            },
            fileFilter: function (req: Request, file: Express.Multer.File, cb: Function) {
                // Accept only image files
                if (file.mimetype.startsWith('image/')) {
                    cb(null, true);
                } else {
                    cb(new Error('Only image files are allowed!'), false);
                }
            }
        });

        console.log('S3 configuration loaded successfully');
    } catch (error) {
        console.error('Failed to initialize S3 configuration:', error);
        throw error;
    }
}

// Middleware to ensure S3 is initialized
export const ensureS3Initialized = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!s3Client || !upload) {
            await initializeS3();
        }
        next();
    } catch (error) {
        res.status(500).json({
            message: 'S3 configuration error'
        });
    }
};

// Export upload middleware
export const uploadSingle = (req: Request, res: Response, next: NextFunction) => {
    if (!upload) {
        return res.status(500).json({
            message: 'Upload service not initialized'
        });
    }

    return upload.single('faceImage')(req, res, next);
};

// Function to manually refresh S3 config
export const refreshS3Config = async () => {
    s3Client = null;
    upload = null;
    await initializeS3();
};

// Initialize on module load
initializeS3().catch(console.error);