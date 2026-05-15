import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UserInfo {
  id: number
  username: string
  role: 'admin' | 'user'
  email?: string
  token?: string
}

export const useAuthStore = defineStore('auth', () => {
  // 用户信息
  const user = ref<UserInfo | null>(null)
  // 是否已登录
  const isLoggedIn = computed(() => !!user.value)
  // 是否是管理员
  const isAdmin = computed(() => user.value?.role === 'admin')

  // 登录
  const login = (userInfo: UserInfo) => {
    user.value = userInfo
    // 保存到本地存储
    localStorage.setItem('user', JSON.stringify(userInfo))
  }

  // 登出
  const logout = () => {
    user.value = null
    localStorage.removeItem('user')
  }

  // 从本地存储恢复登录状态
  const restoreSession = () => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        user.value = JSON.parse(storedUser)
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
      logout()
    }
  }

  return {
    user,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    restoreSession
  }
})