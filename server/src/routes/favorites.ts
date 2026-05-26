import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { FavoriteService } from '../services/favoriteService';
import type { AuthRequest } from '../middleware/authMiddleware';
import type { CreateFavoriteRequest, UpdateFavoriteRequest } from '../types/favorite';

const router = express.Router();

/**
 * 获取用户收藏列表
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const options = {
      categoryId: req.query.categoryId as string | undefined,
      keyword: req.query.keyword as string | undefined,
      sortBy: (req.query.sortBy as 'createdAt' | 'updatedAt' | 'useCount' | 'title') || undefined,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const favorites = await FavoriteService.getFavorites(userId, options);
    res.json({ success: true, data: favorites });
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json({ success: false, message: '获取收藏列表失败' });
  }
});

/**
 * 获取单个收藏
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const favorite = await FavoriteService.getFavorite(userId, id);
    if (!favorite) {
      return res.status(404).json({ success: false, message: '收藏不存在' });
    }

    res.json({ success: true, data: favorite });
  } catch (error) {
    console.error('获取收藏失败:', error);
    res.status(500).json({ success: false, message: '获取收藏失败' });
  }
});

/**
 * 创建收藏
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const request: CreateFavoriteRequest = req.body;

    if (!request.content?.trim()) {
      return res.status(400).json({ success: false, message: '内容不能为空' });
    }

    const favorite = await FavoriteService.create(userId, request);
    res.status(201).json({ success: true, data: favorite });
  } catch (error) {
    console.error('创建收藏失败:', error);
    res.status(500).json({ success: false, message: '创建收藏失败' });
  }
});

/**
 * 更新收藏
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const request: UpdateFavoriteRequest = req.body;

    const updatedFavorite = await FavoriteService.update(userId, id, request);
    if (!updatedFavorite) {
      return res.status(404).json({ success: false, message: '收藏不存在' });
    }

    res.json({ success: true, data: updatedFavorite });
  } catch (error) {
    console.error('更新收藏失败:', error);
    res.status(500).json({ success: false, message: '更新收藏失败' });
  }
});

/**
 * 删除收藏
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await FavoriteService.delete(userId, id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: '收藏不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除收藏失败:', error);
    res.status(500).json({ success: false, message: '删除收藏失败' });
  }
});

/**
 * 获取收藏统计
 */
router.get('/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const stats = await FavoriteService.getStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取收藏统计失败:', error);
    res.status(500).json({ success: false, message: '获取收藏统计失败' });
  }
});

export default router;