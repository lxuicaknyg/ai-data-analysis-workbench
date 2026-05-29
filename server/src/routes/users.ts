import express from 'express';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from '../services/userService';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/authMiddleware';
import { CreateUserRequest, UpdateUserRequest } from '../types/user';

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  const users = await getAllUsers();
  res.status(200).json({ success: true, data: users });
});

router.get('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: '无效的用户ID' });
  }

  const user = await getUserById(id);

  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  res.status(200).json({ success: true, data: { id: user.id, username: user.username, role: user.role } });
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, role }: CreateUserRequest = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }

  try {
    const newUser = await createUser({ username, password, role });
    res.status(201).json({ success: true, message: '用户创建成功', data: newUser });
  } catch (error: any) {
    console.error('创建用户失败:', error);
    // 如果是用户名重复错误，返回409状态码
    if (error.message && error.message.includes('已存在')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: '创建用户失败' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: '无效的用户ID' });
  }

  const { username, password, role }: UpdateUserRequest = req.body;

  if (!username && !password && !role) {
    return res.status(400).json({ success: false, message: '至少需要提供一个更新字段' });
  }

  const updatedUser = await updateUser(id, { username, password, role });

  if (!updatedUser) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  res.status(200).json({ success: true, message: '用户更新成功', data: updatedUser });
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: '无效的用户ID' });
  }

  const deleted = await deleteUser(id);

  if (!deleted) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  res.status(200).json({ success: true, message: '用户删除成功' });
});

export default router;
