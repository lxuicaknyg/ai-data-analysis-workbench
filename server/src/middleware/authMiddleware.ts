import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: 'admin' | 'user';
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({ success: false, message: '无效的认证令牌' });
  }
  
  req.user = decoded;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '需要管理员权限' });
  }
  next();
}
