<template>
  <div class="login-container">
    <div class="login-box">
      <!-- 标题 -->
      <h2 class="login-title">AI数据分析工作台</h2>
      <p class="login-sub-title">账号登录</p>

      <!-- 登录表单 -->
      <div class="login-form">
        <input
          v-model="username"
          type="text"
          placeholder="请输入账号"
          class="login-input"
        />

        <input
          v-model="password"
          type="password"
          placeholder="请输入密码"
          class="login-input"
        />

        <button
          @click="handleLogin"
          class="login-btn"
          :disabled="isLoading"
        >
          {{ isLoading ? '登录中...' : '登录' }}
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth/useAuthStore'
import { router } from '../../router'
import { StorageFactory } from '@prompt-optimizer/core'

// 账号密码绑定
const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const authStore = useAuthStore()

/**
 * 迁移本地收藏数据到后端服务器
 */
async function migrateLocalFavoritesToServer() {
  try {
    // 创建本地存储提供器
    const storageProvider = StorageFactory.create('dexie')
    
    // 读取本地收藏数据
    const favoritesData = await storageProvider.getItem('favorites')
    if (!favoritesData) {
      console.log('[Migration] 没有本地收藏数据需要迁移')
      return
    }
    
    const favorites = JSON.parse(favoritesData)
    if (!Array.isArray(favorites) || favorites.length === 0) {
      console.log('[Migration] 本地收藏数据为空')
      return
    }
    
    console.log(`[Migration] 开始迁移 ${favorites.length} 条本地收藏数据`)
    
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未找到认证令牌')
    }
    
    const baseUrl = 'http://localhost:3001/api'
    
    // 逐条迁移收藏数据
    let successCount = 0
    let skipCount = 0
    
    for (const favorite of favorites) {
      try {
        const response = await fetch(`${baseUrl}/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
        })
        
        if (response.ok) {
          successCount++
        } else {
          const error = await response.json()
          console.warn(`[Migration] 迁移收藏失败:`, error.message)
          skipCount++
        }
      } catch (error) {
        console.warn(`[Migration] 迁移收藏时出错:`, error)
        skipCount++
      }
    }
    
    console.log(`[Migration] 迁移完成: 成功 ${successCount} 条，跳过 ${skipCount} 条`)
    
    // 可选：迁移成功后清除本地数据
    if (successCount > 0 && skipCount === 0) {
      console.log('[Migration] 所有数据迁移成功，清除本地数据')
      await storageProvider.removeItem('favorites')
    }
  } catch (error) {
    console.error('[Migration] 迁移过程中出错:', error)
    throw error
  }
}

// 登录点击事件
const handleLogin = async () => {
  errorMessage.value = ''

  if (!username.value || !password.value) {
    errorMessage.value = '请输入账号和密码'
    return
  }

  isLoading.value = true

  try {
    // 调用后端API进行登录验证
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })

    const result = await response.json()

    if (result.success) {
      authStore.login({
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
        token: result.token
      })
      
      // 登录成功后，尝试迁移本地收藏数据到后端
      try {
        await migrateLocalFavoritesToServer()
        console.log('[LoginPage] 本地收藏数据迁移完成')
      } catch (error) {
        console.warn('[LoginPage] 本地收藏数据迁移失败:', error)
      }
      
      // 登录成功后直接跳转到智能报告模式
      router.push('/report/analyze')
    } else {
      errorMessage.value = result.message || '账号或密码错误'
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = '登录失败，请稍后重试（请确保后端服务已启动）'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  width: 100%;
  height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  width: 420px;
  padding: 50px 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.login-title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
  text-align: center;
}

.login-sub-title {
  font-size: 14px;
  color: #666;
  text-align: center;
  margin-bottom: 36px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-input {
  height: 44px;
  padding: 0 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border 0.3s;
}

.login-input:focus {
  border-color: #a931c4;
}

.login-btn {
  height: 46px;
  background-color: #a931c4;
  color: #fff;
  font-size: 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.login-btn:hover:not(:disabled) {
  background-color: #9525ad;
}

.login-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 14px;
  text-align: center;
}
</style>
