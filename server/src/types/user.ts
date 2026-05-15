export interface User {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'user';
  created_at?: Date;
  updated_at?: Date;
}

export interface UserResponse {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: UserResponse;
  token?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role?: 'admin' | 'user';
}
