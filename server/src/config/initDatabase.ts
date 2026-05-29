import { pool } from './database';

/**
 * 初始化数据库表结构
 */
export async function initDatabase(): Promise<void> {
  try {
    console.log(' 开始初始化数据库表...');

    // 创建收藏表
    await createFavoritesTable();
    
    console.log('✅ 数据库表初始化完成');
  } catch (error) {
    console.error('❌ 数据库表初始化失败:', error);
    process.exit(1);
  }
}

/**
 * 创建收藏表
 */
async function createFavoritesTable(): Promise<void> {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS favorites (
      id VARCHAR(50) PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      description TEXT,
      category VARCHAR(50),
      tags TEXT,
      function_mode VARCHAR(20) NOT NULL,
      optimization_mode VARCHAR(20),
      image_sub_mode VARCHAR(20),
      metadata JSON,
      use_count INT DEFAULT 0,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_favorites_user_id (user_id),
      INDEX idx_favorites_function_mode (function_mode),
      INDEX idx_favorites_created_at (created_at),
      INDEX idx_favorites_updated_at (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.execute(createTableSQL);
  console.log('✅ favorites 表创建/检查完成');
}