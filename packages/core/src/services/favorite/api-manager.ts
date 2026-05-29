import type { IFavoriteManager } from './types';
import type { FavoritePrompt, FavoriteCategory, FavoriteStats, FavoriteTag } from './types';
import {
  FavoriteError,
  FavoriteNotFoundError,
  FavoriteValidationError,
  FavoriteStorageError,
  FavoriteImportExportError
} from './errors';

/**
 * 通过后端API实现的收藏管理器
 * 支持用户级数据隔离和跨设备同步
 */
export class ApiFavoriteManager implements IFavoriteManager {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || 'http://localhost:3001/api';
  }

  private getAuthorizationHeader(): Record<string, string> {
    const token = localStorage.getItem('token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  async initialize(): Promise<void> {
    // API模式不需要初始化
  }

  async ensureInitialized(): Promise<void> {
    // API模式不需要初始化
  }

  async addFavorite(favorite: Omit<FavoritePrompt, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>): Promise<string> {
    if (!favorite.content?.trim()) {
      throw new FavoriteValidationError('Prompt content cannot be empty');
    }

    if (!favorite.functionMode) {
      throw new FavoriteValidationError('Function mode (functionMode) cannot be empty');
    }

    // 验证功能模式分类的完整性
    if (favorite.functionMode === 'basic' || favorite.functionMode === 'context') {
      if (!favorite.optimizationMode) {
        throw new FavoriteValidationError(`${favorite.functionMode} mode must specify optimizationMode`);
      }
    }

    if (favorite.functionMode === 'image') {
      if (!favorite.imageSubMode) {
        throw new FavoriteValidationError('Image mode must specify imageSubMode');
      }
    }

    // report 模式不需要二级模式，但需要确保没有传入无效的二级模式
    if (favorite.functionMode === 'report') {
      if (favorite.optimizationMode) {
        throw new FavoriteValidationError('Report mode does not support optimizationMode');
      }
      if (favorite.imageSubMode) {
        throw new FavoriteValidationError('Report mode does not support imageSubMode');
      }
    }

    try {
      const headers = this.getAuthorizationHeader();
      const response = await fetch(`${this.baseUrl}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          title: favorite.title,
          content: favorite.content,
          description: favorite.description,
          category: favorite.category,
          tags: favorite.tags || [],
          functionMode: favorite.functionMode,
          optimizationMode: favorite.optimizationMode,
          imageSubMode: favorite.imageSubMode,
          metadata: favorite.metadata
        })
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => null);
        throw new FavoriteStorageError(errorResult?.message || `Failed to add favorite: ${response.status}`);
      }

      const result = await response.json();
      return result.data.id;
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      throw new FavoriteStorageError(`Failed to add favorite: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getFavorites(options: {
    categoryId?: string;
    tags?: string[];
    keyword?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'useCount' | 'title';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Promise<FavoritePrompt[]> {
    try {
      const headers = this.getAuthorizationHeader();
      const params = new URLSearchParams();

      if (options.categoryId) params.set('categoryId', options.categoryId);
      if (options.keyword) params.set('keyword', options.keyword);
      if (options.sortBy) params.set('sortBy', options.sortBy);
      if (options.sortOrder) params.set('sortOrder', options.sortOrder);
      if (options.limit !== undefined) params.set('limit', String(options.limit));
      if (options.offset !== undefined) params.set('offset', String(options.offset));

      const response = await fetch(`${this.baseUrl}/favorites?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new FavoriteStorageError(`Failed to get favorites: ${response.status}`);
      }

      const result = await response.json();
      return result.data.map((item: any) => this.transformToFavoritePrompt(item));
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      throw new FavoriteStorageError(`Failed to get favorites: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getFavorite(id: string): Promise<FavoritePrompt> {
    try {
      const headers = this.getAuthorizationHeader();
      const response = await fetch(`${this.baseUrl}/favorites/${id}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new FavoriteNotFoundError(id);
        }
        throw new FavoriteStorageError(`Failed to get favorite: ${response.status}`);
      }

      const result = await response.json();
      return this.transformToFavoritePrompt(result.data);
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      throw new FavoriteStorageError(`Failed to get favorite: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateFavorite(id: string, updates: Partial<FavoritePrompt>): Promise<void> {
    try {
      const headers = this.getAuthorizationHeader();
      const response = await fetch(`${this.baseUrl}/favorites/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          title: updates.title,
          content: updates.content,
          description: updates.description,
          category: updates.category,
          tags: updates.tags,
          functionMode: updates.functionMode,
          optimizationMode: updates.optimizationMode,
          imageSubMode: updates.imageSubMode,
          metadata: updates.metadata
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new FavoriteNotFoundError(id);
        }
        throw new FavoriteStorageError(`Failed to update favorite: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      throw new FavoriteStorageError(`Failed to update favorite: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async removeFavorite(id: string): Promise<void> {
    await this.deleteFavorite(id);
  }

  async deleteFavorite(id: string): Promise<void> {
    try {
      const headers = this.getAuthorizationHeader();
      const response = await fetch(`${this.baseUrl}/favorites/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new FavoriteNotFoundError(id);
        }
        throw new FavoriteStorageError(`Failed to delete favorite: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      throw new FavoriteStorageError(`Failed to delete favorite: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteFavorites(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.deleteFavorite(id);
    }
  }

  async incrementUseCount(id: string): Promise<void> {
    // 通过后端API更新使用次数
    try {
      const headers = this.getAuthorizationHeader();
      const response = await fetch(`${this.baseUrl}/favorites/${id}/increment`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new FavoriteNotFoundError(id);
        }
        throw new FavoriteStorageError(`Failed to increment use count: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      throw new FavoriteStorageError(`Failed to increment use count: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getStats(): Promise<FavoriteStats> {
    try {
      const headers = this.getAuthorizationHeader();
      const response = await fetch(`${this.baseUrl}/favorites/stats`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new FavoriteStorageError(`Failed to get stats: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      if (error instanceof FavoriteError) {
        throw error;
      }
      throw new FavoriteStorageError(`Failed to get stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async addCategory(_category: Omit<FavoriteCategory, 'id' | 'createdAt'>): Promise<string> {
    // 分类也需要后端支持，这里暂时返回空实现
    return `cat_${Date.now()}`;
  }

  async getCategories(): Promise<FavoriteCategory[]> {
    // 返回空数组，分类功能需要后端支持
    return [];
  }

  async updateCategory(_id: string, _updates: Partial<Pick<FavoriteCategory, 'name' | 'description' | 'color'>>): Promise<void> {
    // 暂时空实现
  }

  async removeCategory(_id: string): Promise<void> {
    // 暂时空实现
  }

  async deleteCategory(_id: string): Promise<number> {
    // 暂时空实现，返回删除的数量
    return 0;
  }

  async addTag(_tag: string): Promise<void> {
    // 标签功能需要后端支持
  }

  async getTags(): Promise<FavoriteTag[]> {
    return [];
  }

  async removeTag(_id: string): Promise<void> {
    // 暂时空实现
  }

  async searchFavorites(keyword: string, _options?: { categoryId?: string; tags?: string[] }): Promise<FavoritePrompt[]> {
    return this.getFavorites({ keyword });
  }

  async exportFavorites(_ids?: string[]): Promise<string> {
    const favorites = await this.getFavorites();
    return JSON.stringify(favorites, null, 2);
  }

  async getAllTags(): Promise<Array<{ tag: string; count: number }>> {
    return [];
  }

  async renameTag(_oldTag: string, _newTag: string): Promise<number> {
    return 0;
  }

  async mergeTags(_sourceTags: string[], _targetTag: string): Promise<number> {
    return 0;
  }

  async deleteTag(_tag: string): Promise<number> {
    return 0;
  }

  async reorderCategories(_categoryIds: string[]): Promise<void> {
    // 暂时空实现
  }

  async getCategoryUsage(_categoryId: string): Promise<number> {
    return 0;
  }

  async ensureDefaultCategories(_defaultCategories: Array<{ name: string; description?: string; color: string }>): Promise<void> {
    // 暂时空实现
  }

  async importFavorites(data: string, _options?: { mergeStrategy?: 'merge' | 'skip' | 'overwrite'; categoryMapping?: Record<string, string> }): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      const favorites = JSON.parse(data);
      if (!Array.isArray(favorites)) {
        throw new FavoriteImportExportError('Invalid import data format');
      }

      for (const favorite of favorites) {
        try {
          // 只导入内容相关字段，不导入ID和时间戳
          await this.addFavorite({
            title: favorite.title,
            content: favorite.content,
            description: favorite.description,
            category: favorite.category,
            tags: favorite.tags || [],
            functionMode: favorite.functionMode || 'basic',
            optimizationMode: favorite.optimizationMode,
            imageSubMode: favorite.imageSubMode,
            metadata: favorite.metadata
          });
          imported++;
        } catch (e) {
          errors.push(e instanceof Error ? e.message : 'Unknown error');
        }
      }
    } catch {
      throw new FavoriteImportExportError('Failed to parse import data');
    }

    return { imported, skipped, errors };
  }

  private transformToFavoritePrompt(item: any): FavoritePrompt {
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      description: item.description,
      category: item.category,
      tags: item.tags || [],
      functionMode: item.functionMode,
      optimizationMode: item.optimizationMode,
      imageSubMode: item.imageSubMode,
      metadata: item.metadata,
      useCount: item.useCount || 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }
}