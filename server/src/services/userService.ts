import { pool } from '../config/database';
import { User, UserResponse, CreateUserRequest, UpdateUserRequest } from '../types/user';
import bcrypt from 'bcryptjs';

export async function getUserByUsername(username: string): Promise<User | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE username = ?',
    [username]
  );
  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
}

export async function getUserById(id: number): Promise<User | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
}

export async function getAllUsers(): Promise<UserResponse[]> {
  const [rows] = await pool.execute('SELECT id, username, role FROM users');
  return rows as UserResponse[];
}

export async function createUser(data: CreateUserRequest): Promise<UserResponse> {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const role = data.role || 'user';
  
  const [result] = await pool.execute(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [data.username, hashedPassword, role]
  );
  
  const insertResult = result as { insertId: number };
  return {
    id: insertResult.insertId,
    username: data.username,
    role: role as 'admin' | 'user'
  };
}

export async function updateUser(id: number, data: UpdateUserRequest): Promise<UserResponse | null> {
  const user = await getUserById(id);
  if (!user) return null;
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.username) {
    updates.push('username = ?');
    values.push(data.username);
  }
  
  if (data.password) {
    updates.push('password = ?');
    values.push(await bcrypt.hash(data.password, 10));
  }
  
  if (data.role) {
    updates.push('role = ?');
    values.push(data.role);
  }
  
  if (updates.length === 0) {
    return { id: user.id, username: user.username, role: user.role };
  }
  
  values.push(id);
  
  await pool.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
  
  const updatedUser = await getUserById(id);
  return updatedUser ? { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role } : null;
}

export async function deleteUser(id: number): Promise<boolean> {
  const [result] = await pool.execute(
    'DELETE FROM users WHERE id = ?',
    [id]
  );
  
  const deleteResult = result as { affectedRows: number };
  return deleteResult.affectedRows > 0;
}

export async function verifyPassword(inputPassword: string, storedPassword: string): Promise<boolean> {
  try {
    // 尝试用bcrypt验证（适用于哈希密码）
    const bcryptResult = await bcrypt.compare(inputPassword, storedPassword);
    if (bcryptResult) {
      return true;
    }
  } catch (error) {
    // bcrypt验证失败可能是因为存储的是明文密码
    console.log('bcrypt验证失败，尝试明文比对');
  }
  
  // 直接比较明文（适用于明文密码，测试用）
  return inputPassword === storedPassword;
}
