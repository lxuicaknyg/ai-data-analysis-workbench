<template>
    <!--
        App 核心导航组件

        职责:
        - 功能模式选择器 (Basic / Pro / Image)
        - 各模式的子模式选择器

        🔧 路由架构：直接使用 router.push 进行导航
        - 从路由参数计算当前模式
        - 导航操作直接调用 router.push
    -->
    <nav class="bank-core-nav" data-testid="core-nav" aria-label="核心功能导航">
        <div
            v-for="item in navItems"
            :key="item.key"
            class="nav-group"
            :class="{ active: functionMode === item.key }"
        >
            <button
                type="button"
                class="nav-main"
                :aria-current="functionMode === item.key ? 'page' : undefined"
                @click="handleFunctionModeChange(item.key)"
            >
                <span class="nav-main-label">{{ item.label }}</span>
            </button>

            <div v-if="item.children.length > 0" class="nav-submenu">
                <button
                    v-for="child in item.children"
                    :key="child.path"
                    type="button"
                    class="nav-subitem"
                    :class="{ active: routerInstance.currentRoute.value.path === child.path }"
                    @click="routerInstance.push(child.path)"
                >
                    {{ child.label }}
                </button>
            </div>
        </div>
    </nav>
</template>

<script setup lang="ts">
/**
 * App 核心导航组件
 *
 * @description
 * 用于 MainLayoutUI 的 #core-nav slot。
 * 包含功能模式选择器和各模式的子模式选择器。
 *
 * @features
 * - 功能模式切换: Basic / Pro / Image
 * - 基础模式子模式: system / user
 * - Pro 模式子模式: multi / variable
 * - 图像模式子模式: text2image / image2image / multiimage
 *
 * 🔧 路由架构：直接使用 router.push 进行导航
 */
import { computed } from 'vue'
import { router as routerInstance } from '../../router'

type ExtendedFunctionMode = 'basic' | 'pro' | 'report'

const navItems: Array<{
    key: ExtendedFunctionMode
    label: string
    children: Array<{ label: string; path: string }>
}> = [
    {
        key: 'report',
        label: '智能报告',
        children: [],
    },
    {
        key: 'basic',
        label: '基础',
        children: [
            { label: '系统提示词优化', path: '/basic/system' },
            { label: '用户提示词优化', path: '/basic/user' },
        ],
    },
    {
        key: 'pro',
        label: '上下文',
        children: [
            { label: '系统优化', path: '/pro/multi' },
            { label: '用户提示词优化', path: '/pro/variable' },
        ],
    },
]

// ========================
// Router（使用 router 单例，避免注入失败/多实例）
// ========================
// 从当前路由计算模式
const functionMode = computed<ExtendedFunctionMode>(() => {
    const path = routerInstance.currentRoute.value.path
    if (path.startsWith('/basic')) return 'basic'
    if (path.startsWith('/pro')) return 'pro'
    if (path.startsWith('/report')) return 'report'
    return 'basic' // 默认
})

// ========================
// 导航处理
// ========================
// 🔧 各模式的默认子模式（避免跨模式污染）
const DEFAULT_SUB_MODES = {
    basic: 'system',
    pro: 'variable',
    report: 'analyze',
} as const

const handleFunctionModeChange = (mode: ExtendedFunctionMode) => {
    if (mode === 'report') {
        routerInstance.push('/report/analyze')
        return
    }
    const safeMode = mode as 'basic' | 'pro'
    const defaultSubMode = DEFAULT_SUB_MODES[safeMode]
    routerInstance.push(`/${safeMode}/${defaultSubMode}`)
}

</script>

<style scoped>
.bank-core-nav {
    display: inline-flex;
    align-items: stretch;
    gap: 12px;
    height: 36px;
}

.nav-group {
    position: relative;
    display: flex;
    align-items: stretch;
}

.nav-group::after {
    position: absolute;
    top: 100%;
    right: 0;
    left: 0;
    z-index: 19;
    height: 10px;
    content: '';
}

.nav-main {
    min-width: 96px;
    padding: 0 18px;
    border: 1px solid transparent;
    border-radius: 4px 4px 0 0;
    background: transparent;
    color: #5f6472;
    font-size: 14px;
    font-weight: 600;
    line-height: 34px;
    cursor: pointer;
    transition: color 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.nav-main:hover {
    color: #6f329b;
    background: rgba(111, 50, 155, 0.06);
}

.nav-group.active .nav-main {
    color: #ffffff;
    background: linear-gradient(180deg, #7b3fb2, #63308f);
    border-color: #4f2476;
    box-shadow: 0 4px 10px rgba(111, 50, 155, 0.22);
}

.nav-main-label {
    white-space: nowrap;
}

.nav-submenu {
    position: absolute;
    z-index: 20;
    top: calc(100% + 8px);
    left: 50%;
    display: flex;
    min-width: 184px;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    border: 1px solid rgba(111, 50, 155, 0.14);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 14px 32px rgba(47, 22, 82, 0.16);
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, -4px);
    transition: opacity 0.16s ease, transform 0.16s ease;
}

.nav-group:hover .nav-submenu {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, 0);
}

.nav-subitem {
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #4d5362;
    font-size: 13px;
    line-height: 1.2;
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
}

.nav-subitem:hover,
.nav-subitem.active {
    color: #6f329b;
    background: rgba(111, 50, 155, 0.08);
}

@media (max-width: 900px) {
    .bank-core-nav {
        height: auto;
        flex-wrap: wrap;
    }

    .nav-main {
        min-width: auto;
        padding: 8px 12px;
    }

    .nav-submenu {
        left: 0;
        transform: translate(0, -4px);
    }

    .nav-group:hover .nav-submenu {
        transform: translate(0, 0);
    }
}
</style>
