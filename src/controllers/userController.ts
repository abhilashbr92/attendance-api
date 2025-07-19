import { User } from '../models/user';
import { Entity } from '../models/entity';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { LoginSession } from '../models/loginSession';
export class UserController {

  static async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityId } = req.user!;
      const usersList = await User.find({ EId: entityId, Admin: { $ne: true } });
      res.status(200).json(usersList);
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({
          message: 'User not found'
        });
        return;
      }
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Access decoded user info from JWT
      const { entityId } = req.user!;
      const { Name, UName } = req.body;
      if (!Name || !UName) {
        res.status(400).json({
          message: 'Name and Username are required'
        });
        return;
      }
      const saltRounds = 10;
      const Pwd = 'password';
      const hashedPassword = await bcrypt.hash(Pwd, saltRounds);
      let newUser: any = {
        Name: Name,
        UName: UName,
        Pwd: hashedPassword,
        EId: entityId
      };
      newUser = new User(newUser);
      const savedUser = await newUser.save();
      res.status(200).json(savedUser);
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Access decoded user info from JWT
      const { entityId } = req.user!;
      const { id } = req.params;
      const { Name, UName } = req.body;

      if (!Name || !UName) {
        res.status(400).json({
          message: 'Name and Username are required'
        });
        return;
      }

      const updatedUser = await User.findOneAndUpdate({ _id: id, EId: entityId }, { Name, UName }, { new: true });
      if (!updatedUser) {
        res.status(404).json({
          message: 'User not found'
        });
        return;
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Access decoded user info from JWT
      const { entityId } = req.user!;
      const { id } = req.params;
      const deletedUser = await User.findOneAndDelete({ _id: id, EId: entityId });
      if (!deletedUser) {
        res.status(404).json({
          message: 'User not found'
        });
        return;
      }
      res.status(200).json(true);
    } catch (error) {
      next(error);
    }
  }

  static async loginUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { EName, UName, Pwd } = req.body;

      if (!EName || !UName || !Pwd) {
        res.status(400).json({
          message: 'Entity name, Username and Password are required'
        });
        return;
      }

      // Find entity by EName first
      const entity = await Entity.findOne({ EName });
      console.log('Entity found:', entity);
      if (!entity) {
        res.status(401).json({
          message: 'Invalid credentials'
        });
        return;
      }

      // Find user by username within the entity
      const user = await User.findOne({ UName, EId: entity._id }).select('+Pwd');
      console.log('User found:', user);
      if (!user) {
        res.status(401).json({
          message: 'Invalid credentials'
        });
        return;
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(Pwd, user.Pwd);
      console.log('Password valid:', isPasswordValid);
      if (!isPasswordValid) {
        res.status(401).json({
          message: 'Invalid credentials'
        });
        return;
      }

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign(
        {
          id: user._id,
          entityId: user.EId,
          isAdmin: user.Admin
        },
        jwtSecret
      );

      const newLoginSession = new LoginSession({ EId: entity._id, UserId: user._id, In: new Date(), AccessToken: token });
      const savedLoginSession = await newLoginSession.save();

      res.status(200).json({
        user: user,
        token: token
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Access decoded user info from JWT
      const { id, entityId } = req.user!;
      const user = await User.findOne({ _id: id, EId: entityId }).populate('EId');
      if (!user) {
        res.status(404).json({
          message: 'User not found'
        });
        return;
      } else {
        res.status(200).json(user);
      }
    } catch (error) {
      next(error);
    }
  }

  static async logoutUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Access decoded user info from JWT
      const { id, entityId } = req.user!;

      // Get the token from the Authorization header
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(400).json({
          message: 'Access token is required'
        });
        return;
      }

      // Find and update the login session with matching user, entity, and access token
      const logoutSession = await LoginSession.findOneAndUpdate(
        {
          UserId: id,
          EId: entityId,
          AccessToken: token,
          Out: null
        },
        { Out: new Date() },
        { new: true }
      );

      if (!logoutSession) {
        res.status(404).json({
          message: 'No active session found or invalid token'
        });
        return;
      }

      res.status(200).json(true);
    } catch (error) {
      next(error);
    }
  }

  static async createEntityAndUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

      // Create entity first
      const newEntity = new Entity({
        Name: 'Abhilash Infra',
        EName: 'abhilash'
      });
      const savedEntity = await newEntity.save();

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('password', saltRounds);

      // Create admin user for the entity
      const newUser = new User({
        Name: 'admin',
        UName: 'admin',
        Pwd: hashedPassword,
        EId: savedEntity._id,
        Admin: true // First user is admin
      });
      const savedUser = await newUser.save();

      res.status(201).json({
        entity: savedEntity,
        user: savedUser
      });
    } catch (error) {
      next(error);
    }
  }
}