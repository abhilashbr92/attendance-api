import { Request, Response, NextFunction } from 'express';
import { UserFace } from '../models/userFace';
import { User } from '../models/user';

export class UserFaceController {
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
            const user = await User.findOne({ _id: userId, EId: entityId });
            if (!user) {
                res.status(404).json({
                    message: 'User not found or access denied'
                });
                return;
            }
            // Check if user already has face registration
            const existingFace = await UserFace.findOne({ UserId: userId });
            if (existingFace) {
                res.status(409).json({
                    message: 'User already has face registration'
                });
                return;
            }
            // Create new face record
            const newUserFace = new UserFace({
                EId: user.EId,
                UserId: userId,
                Embedding: embedding,
                ImgName: file.key, // S3 object key
            });
            const savedUserFace = await newUserFace.save();
            // Update user's FaceReg status
            const updatedUser = await User.findByIdAndUpdate(userId, { FaceReg: true }, { new: true });
            res.status(201).json(updatedUser);
        } catch (error) {
            next(error);
        }
    }
}