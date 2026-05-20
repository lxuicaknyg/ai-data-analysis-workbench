<template>
  <!-- 控制栏 -->
  <NCard size="small" class="execute-control-card" :style="{ flexShrink: 0 }">
    <div class="execute-controls">
      <NText class="control-title">报告生成模型</NText>
      <SelectWithConfig
        :model-value="selectedModelKey"
        :options="modelOptions"
        :get-primary="opt => String((opt as ModelSelectOption).primary ?? '')"
        :get-secondary="opt => String((opt as ModelSelectOption).secondary ?? '')"
        :get-value="opt => String((opt as ModelSelectOption).value ?? '')"
        :selected-tooltip="true"
        size="small"
        placeholder="选择模型"
        style="flex: 1; min-width: 0;"
        @update:model-value="updateSelectedModel"
      />
      <NTooltip trigger="hover">
        <template #trigger>
          <NButton
            type="primary"
            size="small"
            circle
            class="run-button"
            :loading="isRunning"
            :disabled="!canExecute"
            @click="handleExecute"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M8 5v14l11-7z" />
              </svg>
            </template>
          </NButton>
        </template>
        执行生成报告
      </NTooltip>
    </div>
  </NCard>

  <!-- 结果卡片 -->
  <NCard
    class="execute-result-card"
    content-style="padding: 0; height: 100%; max-height: 100%; overflow: hidden; display: flex; flex-direction: column;"
  >
    <!-- 空态 -->
    <NFlex
      v-if="!result && !isRunning && !error"
      vertical
      align="center"
      justify="center"
      class="report-empty-state"
    >
      <div class="report-empty-icon">
        <span class="doc-line wide"></span>
        <span class="doc-line"></span>
        <span class="doc-chart"></span>
      </div>
      <NText depth="3" class="report-empty-copy">
        配置好指标 SQL 后<br />点击 ▶ 生成报告内容
      </NText>
    </NFlex>

    <!-- 错误 -->
    <NFlex
      v-if="error && !isRunning"
      align="center"
      :size="6"
      style="padding: 8px 12px; background: color-mix(in srgb, #d03050 8%, transparent); flex-shrink: 0;"
    >
      <NText style="font-size: 12px; color: var(--n-error-color, #d03050);">
        执行失败：{{ error }}
      </NText>
    </NFlex>

    <!-- 结果（含渲染/原文 tab） -->
    <OutputDisplay
      v-if="result || isRunning"
      :content="result"
      :streaming="false"
      mode="readonly"
      :enable-copy="true"
      :enable-fullscreen="true"
      :enable-diff="false"
      :enable-edit="false"
      :enable-favorite="false"
      :enable-render="true"
      :style="{ height: '100%', minHeight: '0', flex: 1 }"
    />
  </NCard>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, watch, type Ref } from 'vue'
import { NCard, NFlex, NText, NButton, NTooltip } from 'naive-ui'
import type { AppServices } from '../../types/services'
import type { ModelSelectOption } from '../../types/select-options'
import type { TextModelConfig } from '@prompt-optimizer/core'
import { DataTransformer } from '../../utils/data-transformer'
import OutputDisplay from '../OutputDisplay.vue'
import SelectWithConfig from '../SelectWithConfig.vue'

const props = defineProps<{ 
  prompt: string 
  result?: string
}>()
const emit = defineEmits<{
  (e: 'report-generated', result: string): void
}>()
const STORAGE_KEY_REPORT_MODEL = 'report/v1/execute_model'

const services = inject<Ref<AppServices | null>>('services')

const selectedModelKey = ref(loadSavedModelKey())
const modelOptions = ref<ModelSelectOption[]>([])
const result = ref(props.result || '')
const isRunning = ref(false)
const error = ref('')

// 监听props.result变化，同步更新报告内容
watch(() => props.result, (newResult) => {
  if (newResult !== undefined) {
    result.value = newResult
  }
})

const canExecute = computed(() =>
  !!props.prompt.trim() && !!selectedModelKey.value && !isRunning.value
)

onMounted(async () => {
  const mgr = services?.value?.modelManager
  if (!mgr) return
  try {
    const m = mgr as { ensureInitialized?: () => Promise<void> }
    if (typeof m.ensureInitialized === 'function') await m.ensureInitialized()
    const models = await mgr.getEnabledModels()
    modelOptions.value = DataTransformer.modelsToSelectOptions(models)
    const selected = resolveInitialModelKey(models)
    if (selectedModelKey.value !== selected) {
      selectedModelKey.value = selected
    }
  } catch (e) {
    console.error('[ReportExecutePanel] Failed to load models:', e)
  }
})

function loadSavedModelKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_REPORT_MODEL) || ''
  } catch {
    return ''
  }
}

function saveSelectedModelKey(modelKey: string) {
  try {
    if (modelKey) localStorage.setItem(STORAGE_KEY_REPORT_MODEL, modelKey)
    else localStorage.removeItem(STORAGE_KEY_REPORT_MODEL)
  } catch {
    // ignore localStorage failures
  }
}

function updateSelectedModel(value: unknown) {
  selectedModelKey.value = String(value ?? '')
  saveSelectedModelKey(selectedModelKey.value)
}

function resolveInitialModelKey(models: TextModelConfig[]): string {
  const keys = new Set(models.map(model => model.id))
  if (selectedModelKey.value && keys.has(selectedModelKey.value)) {
    return selectedModelKey.value
  }

  const internalModel = models.find(model => isInternalModel(model))
  if (internalModel) {
    saveSelectedModelKey(internalModel.id)
    return internalModel.id
  }

  return ''
}

function isInternalModel(model: TextModelConfig): boolean {
  const baseURL = model.connectionConfig?.baseURL?.trim()
  if (!baseURL) return false
  if (baseURL.startsWith('/')) return true
  try {
    const url = new URL(baseURL)
    const host = url.hostname.toLowerCase()
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    )
  } catch {
    return false
  }
}

async function handleExecute() {
  if (!canExecute.value) return
  const ps = services?.value?.promptService
  if (!ps) { error.value = '服务未初始化'; return }

  isRunning.value = true
  result.value = ''
  error.value = ''

  try {
    await ps.testCustomConversationStream(
      {
        modelKey: selectedModelKey.value,
        messages: [{ role: 'user', content: props.prompt }],
        variables: {},
      },
      {
        onToken: (token: string) => { result.value += token },
        onComplete: () => {
          // Strip wrapping code fence (e.g. ```markdown\n...\n```) that LLMs sometimes add
          const trimmed = result.value.trim()
          const fenceMatch = trimmed.match(/^```(?:\w*)\n([\s\S]*?)\n?```\s*$/)
          if (fenceMatch) result.value = fenceMatch[1]
          isRunning.value = false
          // 触发报告生成完成事件
          emit('report-generated', result.value)
        },
        onError: (e: Error) => { error.value = e.message; isRunning.value = false },
      }
    )
  } catch (e) {
    error.value = e instanceof Error ? e.message : '执行失败'
    isRunning.value = false
  }
}
</script>

<style scoped>
.execute-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.execute-control-card,
.execute-result-card {
  border-radius: 8px;
  border-color: rgba(111, 50, 155, 0.12);
  box-shadow: 0 12px 30px rgba(43, 27, 67, 0.07);
}

.control-title {
  flex-shrink: 0;
  color: #424858;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.run-button {
  background: linear-gradient(135deg, #7b3fb2, #8f4fc5);
  border-color: #7b3fb2;
}

.execute-result-card {
  flex: 1;
  min-height: 300px;
  overflow: hidden;
}

.report-empty-state {
  flex: 1;
  padding: 44px 12px;
}

.report-empty-icon {
  position: relative;
  width: 88px;
  height: 92px;
  margin-bottom: 12px;
  border: 1px solid rgba(111, 50, 155, 0.16);
  border-radius: 8px;
  background: linear-gradient(180deg, #fff, #f8f4fc);
  box-shadow: 0 10px 22px rgba(43, 27, 67, 0.08);
}

.doc-line {
  position: absolute;
  left: 18px;
  width: 34px;
  height: 4px;
  border-radius: 999px;
  background: rgba(111, 50, 155, 0.22);
}

.doc-line.wide {
  top: 22px;
  width: 52px;
}

.doc-line:not(.wide) {
  top: 34px;
}

.doc-chart {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  height: 24px;
  border-radius: 5px;
  background:
    linear-gradient(90deg, rgba(123, 63, 178, 0.55) 0 24%, transparent 24% 36%, rgba(195, 38, 47, 0.5) 36% 60%, transparent 60% 72%, rgba(123, 63, 178, 0.32) 72% 100%);
}

.report-empty-copy {
  font-size: 13px;
  text-align: center;
  line-height: 1.8;
}
</style>
