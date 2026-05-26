export interface Favorite {
  id: string;
  userId: number;
  title: string;
  content: string;
  description?: string;
  category?: string;
  tags: string[];
  functionMode: string;
  optimizationMode?: string;
  imageSubMode?: string;
  metadata?: Record<string, any>;
  useCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateFavoriteRequest {
  title?: string;
  content: string;
  description?: string;
  category?: string;
  tags?: string[];
  functionMode: string;
  optimizationMode?: string;
  imageSubMode?: string;
  metadata?: Record<string, any>;
}

export interface UpdateFavoriteRequest {
  title?: string;
  content?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface GetFavoritesOptions {
  categoryId?: string;
  tags?: string[];
  keyword?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'useCount' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}