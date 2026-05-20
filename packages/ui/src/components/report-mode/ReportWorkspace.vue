<template>
    <!--
        智能报告模式工作区

        职责:
        - 左侧: 报告需求输入 + 银行报告 Agent 优化结果（与"基础"模式左侧保持一致）
        - 右侧: 数据管理（预留）+ 数据库接入（预留）
    -->
    <div class="report-workspace" data-testid="workspace" data-mode="report-analyze" :class="{ 'sidebar-open': showSidebar }">
        <!-- 侧边栏按钮 -->
        <button
            class="sidebar-toggle-btn"
            @click="toggleSidebar"
            :class="{ 'open': showSidebar }"
            :title="showSidebar ? '收起侧边栏' : '展开侧边栏'"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path v-if="!showSidebar" stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
        </button>

        <!-- 侧边栏 -->
        <Transition name="sidebar">
            <div v-if="showSidebar" class="sidebar-panel">
                <div class="sidebar-header">
                    <h3>历史会话</h3>
                </div>
                <div class="sidebar-content">
                    <div v-if="isLoadingHistory" class="loading-hint">
                        <NSpin size="small" />
                        <span>加载中...</span>
                    </div>
                    <div v-else-if="chatHistoryList.length === 0" class="empty-hint">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p>暂无历史记录</p>
                    </div>
                    <NScrollbar v-else style="height: calc(100% - 40px);">
                        <div class="history-list">
                            <div
                                v-for="item in chatHistoryList"
                                :key="item.id"
                                class="history-item"
                                :class="{ 'active': selectedHistoryId === item.id }"
                                @click="selectHistory(item)"
                            >
                                <div class="history-title">{{ item.user_input.slice(0, 30) }}{{ item.user_input.length > 30 ? '...' : '' }}</div>
                                <div class="history-meta">
                                    <span class="history-date">{{ formatDate(item.created_at) }}</span>
                                    <span v-if="item.generated_report" class="history-has-report">已生成报告</span>
                                </div>
                            </div>
                        </div>
                    </NScrollbar>
                </div>
            </div>
        </Transition>

        <div class="workspace-head">
            <div>
                <h1>智能数据分析报告</h1>
            </div>
        </div>

        <div
            ref="splitRootRef"
            class="report-split"
            :style="{ gridTemplateColumns: `${splitLeftPct}% 12px 1fr` }"
        >
            <!-- 左侧：优化区域 -->
            <div class="split-pane" style="min-width: 0; height: 100%; overflow: hidden;">
                <NFlex
                    vertical
                    :style="{ overflow: 'auto', height: '100%', minHeight: 0 }"
                    size="medium"
                >
                    <!-- 输入控制区域（可折叠） -->
                    <NCard class="bank-panel requirement-panel" :style="{ flexShrink: 0 }">
                        <!-- 折叠态：只显示标题栏 -->
                        <NFlex
                            v-if="isInputPanelCollapsed"
                            justify="space-between"
                            align="center"
                        >
                            <NFlex align="center" :size="8">
                                <NText :depth="1" style="font-size: 18px; font-weight: 500">
                                    报告需求
                                </NText>
                                <NText
                                    v-if="prompt.trim()"
                                    depth="3"
                                    style="font-size: 12px;"
                                >
                                    {{ prompt.slice(0, 40) }}{{ prompt.length > 40 ? '...' : '' }}
                                </NText>
                            </NFlex>
                            <NButton
                                type="tertiary"
                                size="small"
                                ghost
                                round
                                @click="isInputPanelCollapsed = false"
                                :title="t('common.expand')"
                            >
                                <template #icon>
                                    <NIcon>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </NIcon>
                                </template>
                            </NButton>
                        </NFlex>

                        <!-- 展开态：完整输入面板（与"基础"模式保持一致） -->
                        <InputPanelUI
                            v-else
                            v-model="prompt"
                            test-id-prefix="report-analyze"
                            :selected-model="selectedAgent"
                            label="报告需求"
                            placeholder="请输入需要优化的报告需求，例如：生成光大银行普惠金融业务月度经营分析报告"
                            model-label="优化类型"
                            :button-text="t('promptOptimizer.optimize')"
                            :loading-text="t('common.loading')"
                            :loading="isLoading"
                            :disabled="isLoading"
                            :show-preview="false"
                            :show-analyze-button="false"
                            @submit="handleOptimize"
                        >
                            <!-- 模型选择：固定显示数据分析报告Agent -->
                            <template #model-select>
                                <NSelect
                                    v-model:value="selectedAgent"
                                    :options="agentOptions"
                                    :consistent-menu-width="false"
                                />
                            </template>

                            <!-- 标题栏折叠按钮 -->
                            <template #header-extra>
                                <NButton
                                    type="tertiary"
                                    size="small"
                                    ghost
                                    round
                                    @click="isInputPanelCollapsed = true"
                                    :title="t('common.collapse')"
                                >
                                    <template #icon>
                                        <NIcon>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                                            </svg>
                                        </NIcon>
                                    </template>
                                </NButton>
                            </template>
                        </InputPanelUI>
                    </NCard>

                    <!-- 追问卡片：从输入卡片下方平滑下滑展示 -->
                    <Transition name="clarification-slide">
                        <NCard
                            v-if="showClarification"
                            class="bank-panel clarification-panel"
                            :style="{ flexShrink: 0, borderLeft: '3px solid var(--n-color-target, #18a058)' }"
                            content-style="padding: 16px;"
                        >
                            <NFlex vertical :size="12">
                                <!-- 追问标题 -->
                                <NFlex align="center" :size="8">
                                    <div class="clarification-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                            <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 8.625a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zM7.5 15.75a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM8.25 9a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6A.75.75 0 018.25 9z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <NText style="font-size: 13px; font-weight: 600; color: var(--n-color-target, #18a058);">需要补充信息</NText>
                                </NFlex>

                                <!-- 追问内容 -->
                                <NText
                                    depth="1"
                                    style="font-size: 14px; white-space: pre-wrap; line-height: 1.7; background: var(--n-color, #fafafa); padding: 10px 12px; border-radius: 6px; display: block;"
                                >{{ clarificationQuestion }}</NText>

                                <!-- 回复输入框 -->
                                <NInput
                                    ref="followupInputRef"
                                    v-model:value="followupAnswer"
                                    type="textarea"
                                    :autosize="{ minRows: 2, maxRows: 5 }"
                                    placeholder="请在此输入补充信息..."
                                    @keydown.ctrl.enter="handleFollowup"
                                />

                                <!-- 操作栏 -->
                                <NFlex justify="space-between" align="center">
                                    <NText depth="3" style="font-size: 12px;">Ctrl+Enter 快速提交</NText>
                                    <NFlex :size="8">
                                        <NButton size="small" @click="cancelClarification">取消</NButton>
                                        <NButton
                                            type="primary"
                                            size="small"
                                            :disabled="!followupAnswer.trim()"
                                            :loading="isLoading"
                                            @click="handleFollowup"
                                        >
                                            提交
                                        </NButton>
                                    </NFlex>
                                </NFlex>
                            </NFlex>
                        </NCard>
                    </Transition>

                    <!-- 优化结果面板（与"基础"模式保持一致） -->
                    <NCard
                        class="bank-panel optimize-panel"
                        :style="{ flex: 1, minHeight: '200px', overflow: 'hidden' }"
                        content-style="height: 100%; max-height: 100%; overflow: hidden;"
                    >
                        <PromptPanelUI
                            test-id="report-analyze"
                            v-model:optimized-prompt="editableResult"
                            :reasoning="''"
                            :original-prompt="prompt"
                            :is-optimizing="isLoading"
                            :is-iterating="false"
                            :versions="[]"
                            current-version-id=""
                            optimization-mode="user"
                            :advanced-mode-enabled="false"
                            :show-preview="false"
                            :show-render-tab="false"
                            :show-iterate-button="false"
                        />
                    </NCard>
                </NFlex>
            </div>

            <!-- 分割线 -->
            <div
                class="split-divider"
                role="separator"
                tabindex="0"
                :aria-valuemin="25"
                :aria-valuemax="70"
                :aria-valuenow="splitLeftPct"
                @pointerdown="onSplitPointerDown"
                @keydown="onSplitKeydown"
            />

            <!-- 右侧：指标SQL配置 + 执行面板 -->
            <div class="split-pane right-pane">
                <IndicatorSqlPanel :loading="isLoading" class="bank-panel" style="flex-shrink: 0;" />
                <ReportExecutePanel :prompt="editableResult" :result="selectedReportResult" style="flex: 1; min-height: 0; display: flex; flex-direction: column;" @report-generated="handleReportGenerated" />
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
/**
 * 智能报告模式工作区
 *
 * 功能：
 * - 调用银行报告 Agent API（http://localhost:8001/api/optimize）
 * - 支持追问流程（API 返回 type=clarification 时弹出追问弹窗）
 * - 预留数据管理、数据库接入功能位置
 * - 左侧布局与"基础"模式保持一致（InputPanelUI + PromptPanelUI）
 *
 * 注意：所有状态（包括 showClarificationModal）使用组件本地 ref，
 * 确保 NModal 的 v-model 绑定到本地 ref，避免响应式失效问题。
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NFlex, NText, NButton, NIcon, NInput, NSelect, NScrollbar, NSpin } from 'naive-ui'
import { useToast } from '../../composables/ui/useToast'
import InputPanelUI from '../InputPanel.vue'
import PromptPanelUI from '../PromptPanel.vue'
import IndicatorSqlPanel from './IndicatorSqlPanel.vue'
import ReportExecutePanel from './ReportExecutePanel.vue'
import { useReportDatabase, renderPromptWithVariables } from './useReportDatabase'
import type { MetricConfigFromApi } from './reportTypes'

const { t } = useI18n()
function getRuntimeConfigValue(key: string): string {
    const runtimeConfig = (globalThis as unknown as {
        window?: { runtime_config?: Record<string, unknown> }
    }).window?.runtime_config
    const value = runtimeConfig?.[key]
    return value === undefined || value === null ? '' : String(value).trim()
}

function getBankAgentBaseUrl(): string {
    const configuredBase = (
        getRuntimeConfigValue('VITE_BANK_AGENT_BASE_URL') ||
        getRuntimeConfigValue('BANK_AGENT_BASE_URL') ||
        (import.meta.env.VITE_BANK_AGENT_BASE_URL as string) ||
        ''
    ).replace(/\/+$/, '')

    if (configuredBase) return configuredBase

    if (typeof window !== 'undefined' && window.location?.hostname) {
        const protocol = window.location.protocol || 'http:'
        return `${protocol}//${window.location.hostname}:8001`
    }

    return 'http://localhost:8001'
}

const BANK_AGENT_BASE = getBankAgentBaseUrl()
const BANK_REPORT_AGENT_URL = `${BANK_AGENT_BASE}/api/optimize`

const toast = useToast()

// 固定的 Agent 选项
const agentOptions = [{ label: '数据分析报告Agent', value: 'bank-report-agent' }]
const selectedAgent = ref('bank-report-agent')

// ========================
// 本地状态（全部使用组件内 ref，确保响应式正常）
// ========================
const prompt = ref('')
const isLoading = ref(false)
const isInputPanelCollapsed = ref(false)

// 指标 SQL 状态 + 持久化原始 prompt（刷新后与指标列表同步）
const {
  setIndicatorsFromMetricsConfig,
  variableValues,
  finalRawPrompt,
  setRawPromptResult,
} = useReportDatabase()

/**
 * 渲染后的 prompt（只读计算属性）：
 * - finalRawPrompt = AI生成的原始prompt + 自定义指标追加段
 * - 其中所有 {{variable_name}} 被 SQL 试运行结果替换
 */
const result = computed(() => renderPromptWithVariables(finalRawPrompt.value, variableValues.value))

/**
 * 用户可编辑的展示内容：
 * - 初始值 / 每次优化完成后 由 result 自动填入
 * - SQL 试运行成功后（variableValues 变化）同步更新，将新数值替换进已编辑文本
 * - 用户可直接在工作区手动修改此内容
 */
const editableResult = ref('')

watch(result, (newVal) => {
    editableResult.value = newVal
}, { immediate: true })

// 追问内联卡片状态
const showClarification = ref(false)
const clarificationQuestion = ref('')
const followupAnswer = ref('')
const followupInputRef = ref<InstanceType<typeof NInput> | null>(null)
/**
 * 已回复的追问答案历史（按顺序）。
 * 每轮 handleFollowup 成功收到后端响应后，把本轮 answer push 进来。
 * 每次调用 /api/optimize 时把这个数组整体传回后端（followup_answers），
 * 避免后端多轮丢失前面已澄清的信息。
 */
const followupHistory = ref<string[]>([])

// 会话ID - 每次新会话生成一个唯一ID
const currentSessionId = ref('')

const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// 后端认证服务基础URL
const AUTH_SERVER_BASE = 'http://localhost:3001'

// 保存聊天历史记录
const saveChatHistory = async (data: {
  userInput: string
  sessionId: string
  optimizedPrompt: string
  executionPrompt?: string
  generatedReport?: string
}): Promise<number | null> => {
  try {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      console.warn('用户未登录，无法保存聊天历史')
      return null
    }
    
    const userInfo = JSON.parse(storedUser)
    const token = userInfo.token
    
    if (!token) {
      console.warn('没有token，无法保存聊天历史')
      return null
    }

    const response = await fetch(`${AUTH_SERVER_BASE}/api/chat-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: String(userInfo.id),
        session_id: data.sessionId,
        user_input: data.userInput,
        optimized_prompt: data.optimizedPrompt,
        execution_prompt: data.executionPrompt || null,
        generated_report: data.generatedReport || null,
        status: 'completed'
      })
    })

    if (response.ok) {
      const result = await response.json()
      // 保存历史记录ID，用于后续更新
      if (result.id) {
        currentHistoryId.value = result.id
      }
      return result.id || null
    }
    return null
  } catch (err) {
    console.error('保存历史记录失败', err)
    return null
  }
}

// 侧边栏状态
const showSidebar = ref(false)
const chatHistoryList = ref<ChatHistoryItem[]>([])
const selectedHistoryId = ref<number | null>(null)
const isLoadingHistory = ref(false)

// 历史记录类型
interface ChatHistoryItem {
  id: number
  user_id: string
  session_id: string
  user_input: string
  optimized_prompt?: string
  execution_prompt?: string
  generated_report?: string
  status: string
  created_at: string
  updated_at: string
}

// 切换侧边栏
const toggleSidebar = async () => {
  showSidebar.value = !showSidebar.value
  if (showSidebar.value) {
    await loadChatHistory()
  }
}

// 刷新历史列表
const refreshHistoryList = async () => {
  await loadChatHistory()
}

// 加载历史记录列表
const loadChatHistory = async () => {
  try {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      console.warn('用户未登录，无法加载聊天历史')
      return
    }
    
    const userInfo = JSON.parse(storedUser)
    const token = userInfo.token
    
    if (!token) {
      console.warn('没有token，无法加载聊天历史')
      return
    }

    isLoadingHistory.value = true
    
    const response = await fetch(`${AUTH_SERVER_BASE}/api/chat-history/user/${userInfo.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      // 按创建时间倒序排列
      chatHistoryList.value = data.sort((a: ChatHistoryItem, b: ChatHistoryItem) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } else {
      console.error('加载历史记录失败')
    }
  } catch (err) {
    console.error('加载历史记录失败', err)
  } finally {
    isLoadingHistory.value = false
  }
}

// 选择历史记录
// 当前选中的报告内容
const selectedReportResult = ref('')

const selectHistory = (item: ChatHistoryItem) => {
  selectedHistoryId.value = item.id
  // 填充到输入框和结果区域
  prompt.value = item.user_input || ''
  editableResult.value = item.optimized_prompt || ''
  // 如果有执行prompt，也显示
  if (item.execution_prompt) {
    editableResult.value = item.execution_prompt
  }
  // 恢复报告内容
  selectedReportResult.value = item.generated_report || ''
}

// 更新聊天历史记录（用于保存执行prompt和生成的报告）
const updateChatHistory = async (historyId: number, data: {
  executionPrompt?: string
  generatedReport?: string
}) => {
  try {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      console.warn('用户未登录，无法更新聊天历史')
      return
    }
    
    const userInfo = JSON.parse(storedUser)
    const token = userInfo.token
    
    if (!token) {
      console.warn('没有token，无法更新聊天历史')
      return
    }

    await fetch(`${AUTH_SERVER_BASE}/api/chat-history/${historyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        execution_prompt: data.executionPrompt || null,
        generated_report: data.generatedReport || null
      })
    })
  } catch (err) {
    console.error('更新历史记录失败', err)
  }
}

// 当前会话的历史记录ID（用于后续更新）
const currentHistoryId = ref<number | null>(null)

// 设置当前历史记录ID
const setCurrentHistoryId = (id: number) => {
  currentHistoryId.value = id
}

// 报告生成完成后的处理
const handleReportGenerated = async (reportContent: string) => {
  // 如果有当前会话的历史记录ID，更新执行prompt和生成的报告
  if (currentHistoryId.value) {
    await updateChatHistory(currentHistoryId.value, {
      executionPrompt: editableResult.value,
      generatedReport: reportContent
    })
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  // 小于24小时
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  // 今年
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  // 其他年份
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

// 组件挂载时尝试加载历史记录（如果侧边栏已打开）
onMounted(() => {
  if (showSidebar.value) {
    loadChatHistory()
  }
})

// ========================
// 分割线拖拽
// ========================
const splitRootRef = ref<HTMLElement | null>(null)
const splitLeftPct = ref(40)

const onSplitPointerDown = (e: PointerEvent) => {
    const startX = e.clientX
    const startPct = splitLeftPct.value
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    const onMove = (ev: PointerEvent) => {
        const container = splitRootRef.value
        if (!container) return
        const containerWidth = container.offsetWidth
        const delta = ev.clientX - startX
        const deltaPct = (delta / containerWidth) * 100
        splitLeftPct.value = Math.min(70, Math.max(25, startPct + deltaPct))
    }

    const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp, { once: true })
}

const onSplitKeydown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') splitLeftPct.value = Math.max(25, splitLeftPct.value - 1)
    if (e.key === 'ArrowRight') splitLeftPct.value = Math.min(70, splitLeftPct.value + 1)
}

// ========================
// 银行报告 Agent 逻辑
// ========================

type OptimizeResponse = {
    type: 'result' | 'clarification'
    optimized_prompt?: string | null
    question?: string | null
    metrics_config?: MetricConfigFromApi[] | null
}

const applyOptimizeResult = (data: OptimizeResponse) => {
    const raw = data.optimized_prompt || ''
    setRawPromptResult(raw)
    if (Array.isArray(data.metrics_config) && data.metrics_config.length > 0) {
        setIndicatorsFromMetricsConfig(data.metrics_config)
    }
}

const handleOptimize = async () => {
    if (!prompt.value.trim() || isLoading.value) return

    isLoading.value = true
    setRawPromptResult('')
    // 新一次会话，清空上一次残留的追问历史
    followupHistory.value = []
    // 生成新的会话ID
    currentSessionId.value = generateSessionId()

    try {
        const res = await fetch(BANK_REPORT_AGENT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt.value }),
        })

        if (!res.ok) throw new Error(`API 请求失败: ${res.status}`)

        const data = await res.json() as OptimizeResponse

        if (data.type === 'clarification') {
            clarificationQuestion.value = data.question || '请补充更多信息。'
            followupAnswer.value = ''
            isLoading.value = false
            showClarification.value = true
            // 下一帧自动聚焦到回复输入框
            await nextTick()
            followupInputRef.value?.focus()
        } else {
            applyOptimizeResult(data)
            isLoading.value = false
            toast.success('报告 Prompt 生成成功')
            // 保存聊天历史记录
            await saveChatHistory({
                userInput: prompt.value,
                sessionId: currentSessionId.value,
                optimizedPrompt: data.optimized_prompt || ''
            })
            // 刷新历史列表
            await refreshHistoryList()
        }
    } catch (e) {
        isLoading.value = false
        toast.error(`生成失败：${e instanceof Error ? e.message : '未知错误'}`)
        console.error('[ReportWorkspace] handleOptimize 失败:', e)
    }
}

const handleFollowup = async () => {
    if (!followupAnswer.value.trim() || isLoading.value) return

    isLoading.value = true
    const answer = followupAnswer.value
    // 本轮回复先合成到"候选历史"，发给后端；后端认可（无论又追问还是出结果）后再落盘
    const nextAnswers = [...followupHistory.value, answer]
    showClarification.value = false

    try {
        const res = await fetch(BANK_REPORT_AGENT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt.value,
                followup_answers: nextAnswers,
            }),
        })

        if (!res.ok) throw new Error(`API 请求失败: ${res.status}`)

        const data = await res.json() as OptimizeResponse

        if (data.type === 'clarification') {
            // 后端又要追问，本轮答案算有效，落盘到历史
            followupHistory.value = nextAnswers
            clarificationQuestion.value = data.question || '请补充更多信息。'
            followupAnswer.value = ''
            isLoading.value = false
            showClarification.value = true
            await nextTick()
            followupInputRef.value?.focus()
        } else {
            applyOptimizeResult(data)
            // 优化完成，清空历史
            followupHistory.value = []
            showClarification.value = false
            isLoading.value = false
            toast.success('报告 Prompt 生成成功')
            // 保存聊天历史记录（追问流程完成后）
            await saveChatHistory({
                userInput: prompt.value,
                sessionId: currentSessionId.value,
                optimizedPrompt: data.optimized_prompt || ''
            })
            // 刷新历史列表
            await refreshHistoryList()
        }
    } catch (e) {
        isLoading.value = false
        toast.error(`提交失败：${e instanceof Error ? e.message : '未知错误'}`)
        console.error('[ReportWorkspace] handleFollowup 失败:', e)
    }
}

const cancelClarification = () => {
    showClarification.value = false
    isLoading.value = false
    clarificationQuestion.value = ''
    followupAnswer.value = ''
    // 取消本轮澄清流程，清空已累积的历史
    followupHistory.value = []
}
</script>

<style scoped>
.report-workspace {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    gap: 14px;
    color: #242832;
    transition: margin-left 0.3s ease;
}

.report-workspace.sidebar-open {
    margin-left: 280px;
}

.workspace-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    padding: 0 2px;
}

.workspace-head h1 {
    margin: 0;
    color: #20242d;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.25;
}

.report-split {
    display: grid;
    height: 100%;
    overflow: hidden;
    min-height: 0;
}

.split-pane {
    overflow: hidden;
}

.split-divider {
    width: 12px;
    cursor: col-resize;
    background: transparent;
    transition: background 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.split-divider:hover,
.split-divider:active {
    background: var(--n-border-color, #e0e0e6);
}

.split-divider::after {
    content: '';
    display: block;
    width: 4px;
    height: 40px;
    border-radius: 2px;
    background: rgba(111, 50, 155, 0.18);
}

.right-pane {
    min-width: 0;
    height: 100%;
    overflow: hidden auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 16px;
}

.bank-panel {
    border-radius: 8px;
    border-color: rgba(111, 50, 155, 0.12);
    box-shadow: 0 12px 30px rgba(43, 27, 67, 0.07);
}

.bank-panel :deep(.n-card-header) {
    padding: 16px 18px 8px;
}

.bank-panel :deep(.n-card__content) {
    padding: 14px 18px 18px;
}

.requirement-panel :deep(.n-input),
.optimize-panel :deep(.n-input) {
    background: #faf9fc;
}

.requirement-panel :deep([data-testid="report-analyze-optimize-button"]) {
    min-width: 72px;
    border-color: #6f329b !important;
    background: #6f329b !important;
    color: #ffffff !important;
}

.requirement-panel :deep([data-testid="report-analyze-optimize-button"]:hover),
.requirement-panel :deep([data-testid="report-analyze-optimize-button"]:focus) {
    border-color: #5b2585 !important;
    background: #5b2585 !important;
    color: #ffffff !important;
}

.requirement-panel :deep([data-testid="report-analyze-optimize-button"].n-button--disabled) {
    border-color: rgba(111, 50, 155, 0.28) !important;
    background: rgba(111, 50, 155, 0.42) !important;
    color: rgba(255, 255, 255, 0.86) !important;
}

.optimize-panel {
    min-height: 0;
}

/* 追问卡片下滑动画 */
.clarification-slide-enter-active {
    transition: opacity 0.25s ease, transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.clarification-slide-leave-active {
    transition: opacity 0.2s ease, transform 0.22s ease;
}
.clarification-slide-enter-from {
    opacity: 0;
    transform: translateY(-10px);
}
.clarification-slide-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}

/* 追问图标 */
.clarification-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: color-mix(in srgb, #18a058 15%, transparent);
    color: #18a058;
    flex-shrink: 0;
}

@media (max-width: 980px) {
    .report-split {
        grid-template-columns: 1fr !important;
        gap: 12px;
        overflow: auto;
    }

    .split-divider {
        display: none;
    }

    .workspace-head {
        align-items: flex-start;
        flex-direction: column;
        gap: 8px;
    }
}

/* 侧边栏按钮 */
.sidebar-toggle-btn {
    position: fixed;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 100;
    width: 36px;
    height: 64px;
    background: rgba(111, 50, 155, 0.9);
    color: #fff;
    border: none;
    border-radius: 0 8px 8px 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.15);
}

.sidebar-toggle-btn:hover {
    background: rgba(111, 50, 155, 1);
    width: 40px;
}

.sidebar-toggle-btn.open {
    left: 280px;
}

.sidebar-toggle-btn svg {
    width: 18px;
    height: 18px;
    transition: transform 0.3s ease;
}

/* 侧边栏面板 */
.sidebar-panel {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    background: #fff;
    box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
    z-index: 99;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.sidebar-header {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(111, 50, 155, 0.1);
    flex-shrink: 0;
}

.sidebar-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #20242d;
}

.sidebar-content {
    flex: 1;
    overflow: hidden;
    padding: 12px;
}

/* 侧边栏动画 */
.sidebar-enter-active,
.sidebar-leave-active {
    transition: transform 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
    transform: translateX(-100%);
}

/* 加载提示 */
.loading-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 8px;
    padding: 40px 20px;
    color: #999;
    font-size: 13px;
}

/* 空提示 */
.empty-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #999;
}

.empty-hint svg {
    color: #ddd;
    margin-bottom: 12px;
}

.empty-hint p {
    margin: 0;
    font-size: 13px;
}

/* 历史列表 */
.history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.history-item {
    padding: 12px 14px;
    background: #f8f7fa;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
}

.history-item:hover {
    background: #f0edf5;
    border-color: rgba(111, 50, 155, 0.15);
}

.history-item.active {
    background: rgba(111, 50, 155, 0.08);
    border-color: rgba(111, 50, 155, 0.3);
}

.history-title {
    font-size: 13px;
    color: #20242d;
    font-weight: 500;
    line-height: 1.5;
    margin-bottom: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.history-meta {
    display: flex;
    align-items: center;
    gap: 8px;
}

.history-date {
    font-size: 11px;
    color: #999;
}

.history-has-report {
    font-size: 10px;
    color: #18a058;
    background: rgba(24, 160, 88, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 6px;
}
</style>
