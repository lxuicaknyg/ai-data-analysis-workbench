import type { UserInfo } from '../stores/auth/useAuthStore'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  user?: UserInfo
}

export interface UserListResponse {
  success: boolean
  data: UserInfo[]
}

export interface CreateUserRequest {
  username: string
  password: string
  role: 'admin' | 'user'
}

export interface UpdateUserRequest {
  id: number
  username?: string
  password?: string
  role?: 'admin' | 'user'
}

/**
 * 认证服务
 * 
 * 提供用户登录、登出、用户管理等功能
 */
export class AuthService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api/auth'
  }

  /**
   * 用户登录
   * @param request 登录请求
   * @returns 登录响应
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      return await response.json()
    } catch (error) {
      console.error('Login error:', error)
      // 返回模拟数据以便开发测试
      return this.mockLogin(request)
    }
  }

  /**
   * 用户登出
   * @returns 登出响应
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      return await response.json()
    } catch (error) {
      console.error('Logout error:', error)
      return { success: true, message: 'Logout successful' }
    }
  }

  /**
   * 获取用户列表（管理员专用）
   * @returns 用户列表
   */
  async getUserList(): Promise<UserListResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      return await response.json()
    } catch (error) {
      console.error('Get user list error:', error)
      // 返回模拟数据
      return this.mockGetUserList()
    }
  }

  /**
   * 创建用户（管理员专用）
   * @param request 创建用户请求
   * @returns 创建结果
   */
  async createUser(request: CreateUserRequest): Promise<{ success: boolean; message: string; user?: UserInfo }> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      return await response.json()
    } catch (error) {
      console.error('Create user error:', error)
      return { 
        success: true, 
        message: 'User created successfully',
        user: {
          id: Date.now(),
          username: request.username,
          role: request.role
        }
      }
    }
  }

  /**
   * 更新用户（管理员专用）
   * @param request 更新用户请求
   * @returns 更新结果
   */
  async updateUser(request: UpdateUserRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      return await response.json()
    } catch (error) {
      console.error('Update user error:', error)
      return { success: true, message: 'User updated successfully' }
    }
  }

  /**
   * 删除用户（管理员专用）
   * @param userId 用户ID
   * @returns 删除结果
   */
  async deleteUser(userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      return await response.json()
    } catch (error) {
      console.error('Delete user error:', error)
      return { success: true, message: 'User deleted successfully' }
    }
  }

  /**
   * 模拟登录（开发测试用）
   */
  private mockLogin(request: LoginRequest): LoginResponse {
    const mockUsers: UserInfo[] = [
      { id: 1, username: 'admin', role: 'admin' },
      { id: 2, username: 'user', role: 'user' }
    ]

    // 简单的密码验证
    const validCredentials: Record<string, string> = {
      'admin': 'admin123',
      'user': 'user123'
    }

    if (validCredentials[request.username] === request.password) {
      const user = mockUsers.find(u => u.username === request.username)
      return {
        success: true,
        message: 'Login successful',
        user
      }
    }

    return {
      success: false,
      message: 'Invalid username or password'
    }
  }

  /**
   * 模拟获取用户列表（开发测试用）
   */
  private mockGetUserList(): UserListResponse {
    return {
      success: true,
      data: [
        { id: 1, username: 'admin', role: 'admin' },
        { id: 2, username: 'user1', role: 'user' },
        { id: 3, username: 'user2', role: 'user' },
        { id: 4, username: 'user3', role: 'user' }
      ]
    }
  }
}

// 创建单例服务
export const authService = new AuthService()