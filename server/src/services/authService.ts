import jwt, { Secret } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getUserByUsername, verifyPassword } from './userService';
import { User, UserResponse } from '../types/user';

dotenv.config();

const JWT_SECRET = (process.env.JWT_SECRET || 'fallback_secret_key') as Secret;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function login(username: string, password: string): Promise<{ success: boolean; message: string; user?: UserResponse; token?: string }> {
  // 硬编码的管理员账号
  if (username === 'admin' && password === 'admin123') {
    const token = generateToken({ id: 0, username: 'admin', password: '', role: 'admin' });
    return {
      success: true,
      message: '登录成功',
      user: { id: 0, username: 'admin', role: 'admin' },
      token
    };
  }

  const user = await getUserByUsername(username);
  
  if (!user) {
    return { success: false, message: '用户名或密码错误' };
  }
  
  const isPasswordValid = await verifyPassword(password, user.password);
  
  if (!isPasswordValid) {
    return { success: false, message: '用户名或密码错误' };
  }
  
  const token = generateToken(user);
  
  return {
    success: true,
    message: '登录成功',
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    },
    token
  };
}

export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7天过期
  };
  
  return jwt.sign(payload, JWT_SECRET);
}

export function verifyToken(token: string): { id: number; username: string; role: 'admin' | 'user' } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: 'admin' | 'user' };
    return decoded;
  } catch (error) {
    return null;
  }
}

export function decodeToken(token: string): { id: number; username: string; role: 'admin' | 'user' } | null {
  try {
    return jwt.decode(token) as { id: number; username: string; role: 'admin' | 'user' };
  } catch (error) {
    return null;
  }
}
