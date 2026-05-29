import { IStorageProvider } from './types';
import { StorageError } from './errors';

/**
 * 通过后端API实现的存储提供者
 * 用于收藏数据的后端持久化
 */
export class ApiStorageProvider implements IStorageProvider {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api';
  }

  private getAuthorizationHeader(): Record<string, string> {
    const token = localStorage.getItem('token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  public async getItem(key: string): Promise<string | null> {
    try {
      const headers = this.getAuthorizationHeader();
      const response = await fetch(`${this.baseUrl}/favorites`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new StorageError('Unauthorized', 'read');
        }
        throw new StorageError(`Failed to get favorites: ${response.status}`, 'read');
      }

      const result = await response.json();
      if (result.success && result.data) {
        return JSON.stringify(result.data);
      }
      return null;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to get storage item: ${key}`, 'read');
    }
  }

  public async setItem(key: string, value: string): Promise<void> {
    try {
      const headers = this.getAuthorizationHeader();
      const favorites = JSON.parse(value);

      // 如果是数组，批量创建或更新
      if (Array.isArray(favorites)) {
        for (const favorite of favorites) {
          if (favorite.id) {
            // 更新现有收藏
            await fetch(`${this.baseUrl}/favorites/${favorite.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...headers
              },
              body: JSON.stringify({
                title: favorite.title,
                content: favorite.content,
                description: favorite.description,
                category: favorite.category,
                tags: favorite.tags
              })
            });
          }
        }
      }
    } catch (error) {
      throw new StorageError(`Failed to set storage item: ${key}`, 'write');
    }
  }

  public async removeItem(_key: string): Promise<void> {
    // 收藏数据通过专门的API删除，这里不需要实现
  }

  public async clearAll(): Promise<void> {
    // 不支持清空所有，需要逐个删除
  }

  public async updateData<T>(
    key: string,
    modifier: (currentValue: T | null) => T
  ): Promise<void> {
    try {
      const headers = this.getAuthorizationHeader();
      
      // 获取当前数据
      const currentData = await this.getItem(key);
      const currentValue: T | null = currentData ? JSON.parse(currentData) : null;
      
      // 应用修改
      const newValue = modifier(currentValue);
      
      // 如果是新增收藏
      if (Array.isArray(newValue) && Array.isArray(currentValue)) {
        const newItems = newValue.filter((item: any) => 
          !currentValue.some((existing: any) => existing.id === item.id)
        );
        
        for (const item of newItems) {
          // 移除数据库自动生成的字段
          const { id, userId, createdAt, updatedAt, useCount, ...createData } = item;
          
          const response = await fetch(`${this.baseUrl}/favorites`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: JSON.stringify({
              ...createData,
              functionMode: createData.functionMode || 'basic'
            })
          });

          if (!response.ok) {
            throw new StorageError(`Failed to create favorite: ${response.status}`, 'write');
          }
        }
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to update data: ${key}`, 'write');
    }
  }

  public async batchUpdate(operations: Array<{
    key: string;
    operation: 'set' | 'remove';
    value?: string;
  }>): Promise<void> {
    const headers = this.getAuthorizationHeader();

    for (const op of operations) {
      if (op.operation === 'set' && op.value) {
        await this.setItem(op.key, op.value);
      } else if (op.operation === 'remove') {
        // 删除操作需要知道具体ID
        if (op.key.startsWith('fav_')) {
          await fetch(`${this.baseUrl}/favorites/${op.key}`, {
            method: 'DELETE',
            headers
          });
        }
      }
    }
  }

  public getCapabilities() {
    return {
      supportsAtomic: true,
      supportsBatch: true,
      maxStorageSize: -1 // 无限制（由后端控制）
    };
  }
}