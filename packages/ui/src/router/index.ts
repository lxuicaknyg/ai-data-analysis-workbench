import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { beforeRouteSwitch, requireAuth, requireAdmin } from './guards'
import RootBootstrapRoute from './RootBootstrapRoute'
import ContextSystemWorkspace from '../components/context-mode/ContextSystemWorkspace.vue'
import ContextUserWorkspace from '../components/context-mode/ContextUserWorkspace.vue'

/**
 * Vue Router 配置
 *
 * 设计说明：
 * - 使用 hash 模式（#/basic/system），Electron 兼容
 * - 路由懒加载，减少初始 bundle
 * - 路由守卫：监控导航事件和认证
 */

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    // 根路径重定向由 RootBootstrapRoute 处理：等待 globalSettings 恢复完成后决定初始工作区
    name: 'root',
    component: RootBootstrapRoute,
    meta: { requiresAuth: true }
  },
  // 🔐 登录页面
  {
    path: '/login',
    name: 'login',
    component: () => import('../components/auth/LoginPage.vue')
  },
  // 🔐 用户管理页面（管理员专用）
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('../components/auth/UserManagement.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  // ✨ Basic 模式重构：2 个独立路由
  {
    path: '/basic/system',
    name: 'basic-system',
    component: () => import('../components/basic-mode/BasicSystemWorkspace.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/basic/user',
    name: 'basic-user',
    component: () => import('../components/basic-mode/BasicUserWorkspace.vue'),
    meta: { requiresAuth: true }
  },
  // ✨ Pro 模式：2 个独立路由
  // - /pro/multi: 多消息模式（ContextSystemWorkspace）
  // - /pro/variable: 变量模式（ContextUserWorkspace）
  {
    path: '/pro/multi',
    name: 'pro-multi',
    component: ContextSystemWorkspace,
    meta: { requiresAuth: true }
  },
  {
    path: '/pro/variable',
    name: 'pro-variable',
    component: ContextUserWorkspace,
    meta: { requiresAuth: true }
  },
  // ✨ 智能报告模式
  {
    path: '/report/analyze',
    name: 'report-analyze',
    component: () => import('../components/report-mode/ReportWorkspace.vue'),
    meta: { requiresAuth: true }
  },
  // ✨ Image 模式重构：2 个独立路由
  {
    path: '/image/text2image',
    name: 'image-text2image',
    component: () => import('../components/image-mode/ImageText2ImageWorkspace.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/image/image2image',
    name: 'image-image2image',
    component: () => import('../components/image-mode/ImageImage2ImageWorkspace.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/image/multiimage',
    name: 'image-multiimage',
    component: () => import('../components/image-mode/ImageMultiImageWorkspace.vue'),
    meta: { requiresAuth: true }
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 挂载路由守卫
router.beforeEach(beforeRouteSwitch)
router.beforeEach(requireAuth)
router.beforeEach(requireAdmin)

export default router
