import express from 'express';
import { login } from '../services/authService';
import { LoginRequest } from '../types/user';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password }: LoginRequest = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '请输入用户名和密码' });
  }
  
  const result = await login(username, password);
  
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(401).json(result);
  }
});

router.post('/logout', (req, res) => {
  res.status(200).json({ success: true, message: '登出成功' });
});

export default router;
