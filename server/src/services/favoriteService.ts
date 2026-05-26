import { pool } from '../config/database';
import type { Favorite, CreateFavoriteRequest, UpdateFavoriteRequest, GetFavoritesOptions } from '../types/favorite';

export class FavoriteService {
  /**
   * 创建收藏
   */
  static async create(userId: number, request: CreateFavoriteRequest): Promise<Favorite> {
    const now = Date.now();
    const id = `fav_${now}_${Math.random().toString(36).substr(2, 9)}`;

    const favorite: Favorite = {
      id,
      userId,
      title: request.title?.trim() || request.content.slice(0, 50) + (request.content.length > 50 ? '...' : ''),
      content: request.content,
      description: request.description,
      category: request.category,
      tags: request.tags || [],
      functionMode: request.functionMode,
      optimizationMode: request.optimizationMode,
      imageSubMode: request.imageSubMode,
      metadata: request.metadata,
      useCount: 0,
      createdAt: now,
      updatedAt: now
    };

    await pool.execute({
      sql: `INSERT INTO favorites 
       (id, user_id, title, content, description, category, tags, function_mode, optimization_mode, image_sub_mode, metadata, use_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values: [
        favorite.id,
        favorite.userId,
        favorite.title,
        favorite.content,
        favorite.description ?? null,
        favorite.category ?? null,
        JSON.stringify(favorite.tags),
        favorite.functionMode,
        favorite.optimizationMode ?? null,
        favorite.imageSubMode ?? null,
        favorite.metadata ? JSON.stringify(favorite.metadata) : null,
        favorite.useCount,
        favorite.createdAt,
        favorite.updatedAt
      ]
    });

    return favorite;
  }

  /**
   * 获取用户的所有收藏（带筛选和排序）
   */
  static async getFavorites(userId: number, options: GetFavoritesOptions = {}): Promise<Favorite[]> {
    let query = `SELECT * FROM favorites WHERE user_id = ?`;
    const params: any[] = [userId];

    // 分类筛选
    if (options.categoryId) {
      query += ` AND category = ?`;
      params.push(options.categoryId);
    }

    // 关键词搜索
    if (options.keyword) {
      query += ` AND (title LIKE ? OR content LIKE ? OR description LIKE ?)`;
      const likeKeyword = `%${options.keyword}%`;
      params.push(likeKeyword, likeKeyword, likeKeyword);
    }

    // 排序
    const sortBy = options.sortBy || 'updatedAt';
    const sortOrder = options.sortOrder || 'desc';
    const sortMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      useCount: 'use_count',
      title: 'title'
    };
    query += ` ORDER BY ${sortMap[sortBy]} ${sortOrder.toUpperCase()}`;

    // 分页
    if (options.offset !== undefined) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }
    if (options.limit !== undefined) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    const [rows] = await pool.query({
      sql: query,
      values: params
    });
    return (rows as any[]).map(this.rowToFavorite);
  }

  /**
   * 获取单个收藏
   */
  static async getFavorite(userId: number, id: string): Promise<Favorite | null> {
    const [rows] = await pool.query({
      sql: `SELECT * FROM favorites WHERE id = ? AND user_id = ?`,
      values: [id, userId]
    });
    const row = (rows as any[])[0];
    return row ? this.rowToFavorite(row) : null;
  }

  /**
   * 更新收藏
   */
  static async update(userId: number, id: string, request: UpdateFavoriteRequest): Promise<Favorite | null> {
    const now = Date.now();
    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (request.title !== undefined) {
      updateFields.push('title = ?');
      updateParams.push(request.title);
    }
    if (request.content !== undefined) {
      updateFields.push('content = ?');
      updateParams.push(request.content);
    }
    if (request.description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(request.description);
    }
    if (request.category !== undefined) {
      updateFields.push('category = ?');
      updateParams.push(request.category);
    }
    if (request.tags !== undefined) {
      updateFields.push('tags = ?');
      updateParams.push(JSON.stringify(request.tags));
    }

    updateFields.push('updated_at = ?');
    updateParams.push(now);

    updateParams.push(id);
    updateParams.push(userId);

    const [result] = await pool.execute({
      sql: `UPDATE favorites SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      values: updateParams
    });

    const affectedRows = (result as any).affectedRows;
    if (affectedRows === 0) {
      return null;
    }

    return this.getFavorite(userId, id);
  }

  /**
   * 删除收藏
   */
  static async delete(userId: number, id: string): Promise<boolean> {
    const [result] = await pool.execute({
      sql: `DELETE FROM favorites WHERE id = ? AND user_id = ?`,
      values: [id, userId]
    });
    const affectedRows = (result as any).affectedRows;
    return affectedRows > 0;
  }

  /**
   * 增加使用次数
   */
  static async incrementUseCount(userId: number, id: string): Promise<void> {
    await pool.execute({
      sql: `UPDATE favorites SET use_count = use_count + 1, updated_at = ? WHERE id = ? AND user_id = ?`,
      values: [Date.now(), id, userId]
    });
  }

  /**
   * 获取收藏统计
   */
  static async getStats(userId: number): Promise<{ total: number; categories: Record<string, number> }> {
    const [totalRows] = await pool.query({
      sql: `SELECT COUNT(*) as count FROM favorites WHERE user_id = ?`,
      values: [userId]
    });
    const total = (totalRows as any[])[0]?.count || 0;

    const [categoryRows] = await pool.query({
      sql: `SELECT category, COUNT(*) as count FROM favorites WHERE user_id = ? AND category IS NOT NULL GROUP BY category`,
      values: [userId]
    });
    const categories: Record<string, number> = {};
    (categoryRows as any[]).forEach((row: any) => {
      categories[row.category] = row.count;
    });

    return { total, categories };
  }

  /**
   * 数据库行转Favorite对象
   */
  private static rowToFavorite(row: any): Favorite {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      description: row.description,
      category: row.category,
      tags: row.tags ? (typeof row.tags === 'object' ? row.tags : JSON.parse(row.tags)) : [],
      functionMode: row.function_mode,
      optimizationMode: row.optimization_mode,
      imageSubMode: row.image_sub_mode,
      metadata: row.metadata ? (typeof row.metadata === 'object' ? row.metadata : JSON.parse(row.metadata)) : undefined,
      useCount: row.use_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}