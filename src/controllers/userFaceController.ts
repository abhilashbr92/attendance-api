import { Request, Response, NextFunction } from 'express';
import { UserFace } from '../models/userFace';
import { User } from '../models/user';
import { Config } from '../models/config';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
export interface FaceRecognitionResult {
    userId: string;
    name: string;
    distance: number;
    confidence: number;
    imgName: string;
}
let s3Client: any = null;
let s3BucketName: string | null = null;
export class UserFaceController {

    private static readonly RECOGNITION_THRESHOLD = 0.6; // Adjust based on your needs

    static async addUserFace(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { entityId } = req.user!;
            let { userId, embedding } = req.body;
            embedding = embedding.split(',').map(Number); // Convert string to array of numbers
            const file = req.file as Express.MulterS3.File;
            // Validate required fields
            if (!userId || !embedding || !file) {
                res.status(400).json({
                    message: 'User ID, face embedding, and image file are required'
                });
                return;
            }
            // Validate embedding is an array of numbers
            if (!Array.isArray(embedding) || !embedding.every(num => typeof num === 'number')) {
                res.status(400).json({
                    message: 'Embedding must be an array of numbers'
                });
                return;
            }
            const savedUserFace = await UserFace.findOneAndUpdate({ UserId: userId, EId: entityId }, {
                EId: entityId,
                UserId: userId,
                Embedding: embedding,
                ImgName: file.key, // S3 object key
            }, { new: true, upsert: true });
            // Update user's FaceReg status
            const updatedUser = await User.findByIdAndUpdate(userId, { FaceReg: true }, { new: true });
            res.status(201).json(updatedUser);
        } catch (error) {
            next(error);
        }
    }

    static async getUserFaceFromS3(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { entityId } = req.user!;
            const { userId } = req.params;
            if (!entityId || !userId) {
                res.status(400).json({
                    message: 'Entity ID and User ID are required'
                });
                return;
            }
            if (s3Client === null || s3BucketName === null) {
                await UserFaceController.initializeS3();
            }
            const userFace = await UserFace.findOne({ UserId: userId, EId: entityId }).populate('UserId', '_id Name Del').exec();
            if (!userFace || userFace.UserId.Del) {
                res.status(404).json({
                    message: 'User face not found'
                });
                return;
            }
            const s3ImgUrl = await UserFaceController.getImageFromS3(userFace.ImgName);
            if (!s3ImgUrl) {
                res.status(500).json({
                    message: 'Failed to retrieve image from S3'
                });
                return;
            }
            res.status(200).json({
                userId: userFace.UserId._id,
                name: userFace.UserId.Name,
                imgUrl: s3ImgUrl
            });
        } catch (error) {
            console.error('Error getting user face from S3:', error);
            res.status(500).json({
                message: 'Internal server error while fetching user face image'
            });
        }
    }

    private static async initializeS3() {
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
            s3BucketName = bucketName;
            console.log('S3 configuration loaded successfully');
        } catch (error) {
            console.error('Failed to initialize S3 configuration:', error);
            throw error;
        }
    }

    private static async getImageFromS3(imgName: string): Promise<string | null> {
        try {
            const expiresIn = 15 * 60;
            if (!s3BucketName) {
                throw new Error('S3 bucket name is not initialized');
            }
            const command = new GetObjectCommand({ Bucket: s3BucketName, Key: imgName });
            const url = await getSignedUrl(s3Client, command, { expiresIn: expiresIn }); // expires in seconds
            return url;
        } catch (error) {
            console.error('Error getting image from S3:', error);
            return null;
        }
    }

    static async recognizeFace(req: Request, res: Response): Promise<void> {
        try {
            const { entityId } = req.user!;
            const { embedding } = req.body;
            if (!embedding || !Array.isArray(embedding) || !entityId) {
                res.status(400).json({
                    message: 'Missing required fields: embedding and entityId'
                });
                return;
            }
            const result = await UserFaceController.findNearest(embedding, entityId);
            if (!result) {
                res.status(404).json({
                    message: 'User face not found'
                });
                return;
            }
            if (s3Client === null || s3BucketName === null) {
                await UserFaceController.initializeS3();
            }
            const s3ImgUrl = await UserFaceController.getImageFromS3(result.imgName);
            console.log('S3 Image URL:', s3ImgUrl);
            if (s3ImgUrl) {
                result.imgName = s3ImgUrl; // Replace with base64 image
            }
            console.log('Recognition result:', result);
            res.status(200).json(result);
        } catch (error) {
            console.error('Face recognition error:', error);
            res.status(500).json({
                message: 'Internal server error during face recognition'
            });
        }
    }

    private static async findNearest(embedding: number[], entityId: string): Promise<FaceRecognitionResult | null> {
        try {
            const userFaces = await UserFace.find({ EId: entityId })
                .populate('UserId', '_id Name Del') // Assuming User model has name field
                .exec();
            if (userFaces.length === 0) {
                return null;
            }
            let bestMatch: FaceRecognitionResult | null = null;
            let minDistance = Number.MAX_VALUE;
            for (const userFace of userFaces) {
                if (!userFace.UserId.Del) {
                    const distance = UserFaceController.calculateDistance(embedding, userFace.Embedding);
                    if (distance < minDistance && distance < UserFaceController.RECOGNITION_THRESHOLD) {
                        minDistance = distance;
                        const confidence = Math.max(0, 1 - (distance / 2)); // Convert distance to confidence
                        bestMatch = {
                            userId: userFace.UserId._id.toString(),
                            name: userFace.UserId.Name,
                            distance: distance,
                            confidence: confidence,
                            imgName: userFace.ImgName
                        };
                    }
                }
            }
            return bestMatch;
        } catch (error) {
            console.error('Error in face recognition:', error);
            throw new Error('Face recognition failed');
        }
    }

    private static calculateDistance(embedding1: number[], embedding2: number[]): number {
        if (embedding1.length !== embedding2.length) {
            throw new Error('Embedding dimensions must match');
        }
        let distance = 0;
        for (let i = 0; i < embedding1.length; i++) {
            const diff = embedding1[i] - embedding2[i];
            distance += diff * diff;
        }
        return Math.sqrt(distance);
    }

}