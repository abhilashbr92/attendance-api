import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { LoginSession } from '../models/loginSession';

// Extend Request interface to include user data
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                entityId: string;
                isAdmin: boolean;
            };
        }
    }
}

export interface JWTPayload {
    id: string;
    entityId: string;
    isAdmin: boolean;
}

export const authenticateAdminToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({
            message: 'Access token is required'
        });
        return;
    }

    try {
        const jwtSecret: any = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        
        if (!decoded.isAdmin) {
            res.status(403).json({
                message: 'Access denied. Admins only.'
            });
            return;
        }

        // Check if token exists in database and has no Out timestamp
        const activeSession = await LoginSession.findOne({
            AccessToken: token,
            UserId: decoded.id,
            EId: decoded.entityId,
            Out: null
        });

        if (!activeSession) {
            res.status(401).json({
                message: 'Token is not active or session has expired'
            });
            return;
        }

        req.user = {
            id: decoded.id,
            entityId: decoded.entityId,
            isAdmin: decoded.isAdmin
        };

        next();
    } catch (error) {
        res.status(403).json({
            message: 'Invalid or expired token'
        });
        return;
    }
};

export const authenticateUserToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({
            message: 'Access token is required'
        });
        return;
    }

    try {
        const jwtSecret: any = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

        // Check if token exists in database and has no Out timestamp
        const activeSession = await LoginSession.findOne({
            AccessToken: token,
            UserId: decoded.id,
            EId: decoded.entityId,
            Out: null
        });

        if (!activeSession) {
            res.status(401).json({
                message: 'Token is not active or session has expired'
            });
            return;
        }

        req.user = {
            id: decoded.id,
            entityId: decoded.entityId,
            isAdmin: decoded.isAdmin
        };

        next();
    } catch (error) {
        res.status(403).json({
            message: 'Invalid or expired token'
        });
        return;
    }
};
