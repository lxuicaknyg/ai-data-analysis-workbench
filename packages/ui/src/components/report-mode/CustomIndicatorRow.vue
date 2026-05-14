<template>
  <div class="indicator-row">
    <!-- ── 指标摘要行 ── -->
    <div class="indicator-summary" :class="{ expanded }">
      <NFlex align="center" :size="6" style="flex: 1; min-width: 0;">
        <NFlex vertical :size="2" style="min-width: 0;">
          <NFlex align="center" :size="6" :wrap="false">
            <NText style="font-size: 13px; font-weight: 500; white-space: nowrap;">
              {{ indicator.name }}
            </NText>
            <NText depth="3" style="font-size: 11px; font-family: monospace; white-space: nowrap;">
              {{ variableLabel }}
            </NText>
          </NFlex>
          <NText depth="3" style="font-size: 11px;">单位：{{ indicator.unit || '未填写' }}</NText>
        </NFlex>
      </NFlex>

      <NFlex align="center" :size="6" style="flex-shrink: 0;">
        <!-- 自定义标签 -->
        <NTag size="small" type="info" :bordered="false">自定义</NTag>

        <!-- SQL 配置状态 badge -->
        <NTag size="small" :type="sqlStatusType" :bordered="false">
          {{ sqlStatusLabel }}
        </NTag>

        <!-- 配置/查看按钮 -->
        <NButton
          size="small"
          :type="indicator.sqlConfig?.sql ? 'default' : 'primary'"
          ghost
          style="min-width: 76px;"
          @click="$emit('toggle')"
        >
          {{ expanded ? '收起' : (indicator.sqlConfig?.sql ? '查看 SQL' : '配置 SQL') }}
          <template #icon>
            <NIcon v-if="!expanded && indicator.sqlConfig?.sql">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 17L17 7M17 7H7M17 7v10"/>
              </svg>
            </NIcon>
          </template>
        </NButton>

        <!-- 删除按钮 -->
        <NPopconfirm positive-text="确认删除" negative-text="取消" @positive-click="$emit('remove')">
          <template #trigger>
            <NButton size="small" type="error" ghost>
              <template #icon>
                <NIcon>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </NIcon>
              </template>
            </NButton>
          </template>
          确认删除该自定义指标？
        </NPopconfirm>
      </NFlex>
    </div>

    <!-- ── 内联SQL编辑器（展开态）── -->
    <Transition name="sql-slide">
      <div v-if="expanded" class="sql-editor-area">
        <NFlex vertical :size="10">
          <!-- 指标说明（用户填写的） -->
          <div v-if="indicator.description" class="indicator-description">
            <NText style="font-size: 11px; color: var(--n-text-color-3);">指标说明：</NText>
            <NText style="font-size: 12px; line-height: 1.6;">{{ indicator.description }}</NText>
          </div>

          <!-- 备注 -->
          <NFlex align="center" :size="6">
            <NText style="font-size: 12px; color: var(--n-text-color-3); flex-shrink: 0;">备注</NText>
            <NInput
              v-model:value="draftDescription"
              size="small"
              :placeholder="`查询语句（返回单一数值，单位：${indicator.unit || '-'}）`"
              style="flex: 1;"
            />
          </NFlex>

          <!-- 绑定数据源 -->
          <NFlex align="center" :size="6">
            <NText style="font-size: 12px; color: var(--n-text-color-3); flex-shrink: 0;">数据源</NText>
            <NSelect
              v-model:value="draftDataSourceId"
              :options="dataSourceOptions"
              size="small"
              placeholder="选择数据源"
              style="flex: 1;"
            />
          </NFlex>

          <!-- SQL编辑区 -->
          <div class="sql-editor-box">
            <NText class="sql-editor-hint">
              查询语句（{{ draftDescription || `返回单一数值，单位：${indicator.unit || '-'}` }}）
            </NText>
            <NInput
              v-model:value="draftSql"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 10 }"
              :placeholder="`SELECT ...\nFROM ...\nWHERE ...`"
              class="sql-textarea"
              style="font-family: 'Consolas', 'Monaco', monospace; font-size: 13px;"
            />
          </div>

          <!-- 试运行结果（成功） -->
          <div v-if="indicator.sqlConfig?.testStatus === 'success'" class="test-result-block">
            <NFlex align="center" :size="8">
              <NIcon size="14" color="#18a058">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd"/>
                </svg>
              </NIcon>
              <NText style="font-size: 12px; color: #18a058; font-weight: 500;">试运行成功</NText>
              <NTag v-if="indicator.sqlConfig.executeTimeMs != null" size="tiny" :bordered="false" type="info">
                耗时 {{ indicator.sqlConfig.executeTimeMs }}ms
              </NTag>
              <NTag size="tiny" :bordered="false">{{ resultShapeSummary }}</NTag>
            </NFlex>
            <NFlex align="center" :size="6" style="margin-top: 6px;">
              <NText depth="3" style="font-size: 11px; flex-shrink: 0;">变量替换值：</NText>
              <NText code style="font-size: 12px; font-weight: 600;">{{ indicator.sqlConfig.testResult }}</NText>
              <NText v-if="indicator.unit" depth="3" style="font-size: 11px;">{{ indicator.unit }}</NText>
            </NFlex>
            <!-- 单列多行列表 -->
            <div v-if="isSingleColumnList" class="result-preview">
              <NText depth="3" style="font-size: 11px;">查询返回 {{ indicator.sqlConfig.testRowCount }} 行：</NText>
              <div class="result-list">
                <NText v-for="(row, i) in indicator.sqlConfig.testRows" :key="i"
                  style="font-size: 12px; font-family: monospace;">{{ row[0] }}</NText>
                <NText v-if="(indicator.sqlConfig.testRowCount ?? 0) > 5" depth="3" style="font-size: 11px;">
                  … 仅显示前 5 行
                </NText>
              </div>
            </div>
            <!-- 多列表格 -->
            <div v-if="isTable" class="result-preview">
              <NText depth="3" style="font-size: 11px;">
                查询返回 {{ indicator.sqlConfig.testRowCount }} 行 × {{ indicator.sqlConfig.testColumns?.length }} 列：
              </NText>
              <NDataTable
                :columns="tableColumns"
                :data="tableData"
                :bordered="false"
                :single-line="false"
                size="small"
                :max-height="180"
                style="margin-top: 4px; font-size: 12px;"
              />
              <NText v-if="(indicator.sqlConfig.testRowCount ?? 0) > 5" depth="3"
                style="font-size: 11px; display: block; margin-top: 4px;">仅显示前 5 行</NText>
            </div>
          </div>

          <!-- 试运行结果（失败） -->
          <NFlex
            v-if="indicator.sqlConfig?.testStatus === 'error'"
            align="center" :size="6" class="test-result error"
          >
            <NText style="font-size: 12px; color: var(--n-error-color, #d03050);">
              试运行失败：{{ indicator.sqlConfig.testError }}
            </NText>
          </NFlex>

          <!-- 底部操作栏 -->
          <NFlex justify="space-between" align="center">
            <NText depth="3" style="font-size: 11px;">
              <span v-if="!draftSql.trim()">未填写</span>
              <span v-else-if="indicator.sqlConfig?.savedAt">
                已保存 {{ formatTime(indicator.sqlConfig.savedAt) }}
              </span>
            </NText>
            <NFlex :size="8">
              <NButton
                size="small"
                :loading="indicator.sqlConfig?.testStatus === 'testing'"
                :disabled="!draftSql.trim()"
                @click="handleTest"
              >
                试运行
              </NButton>
              <NButton
                type="primary"
                size="small"
                :disabled="!draftSql.trim()"
                @click="handleSave"
              >
                保存
              </NButton>
            </NFlex>
          </NFlex>
        </NFlex>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { NText, NFlex, NTag, NButton, NInput, NIcon, NDataTable, NPopconfirm, NSelect, type DataTableColumns } from 'naive-ui'
import type { CustomIndicator } from './reportTypes'

const props = defineProps<{
  indicator: CustomIndicator
  expanded: boolean
  dataSourceOptions: Array<{ label: string; value: string }>
  defaultDataSourceId: string
}>()

const emit = defineEmits<{
  toggle: []
  save: [{ sql: string; description: string; dataSourceId?: string }]
  test: [sql: string, dataSourceId?: string]
  remove: []
}>()

const draftSql = ref(props.indicator.sqlConfig?.sql ?? '')
const draftDescription = ref(props.indicator.sqlConfig?.description ?? '')
const draftDataSourceId = ref(props.indicator.sqlConfig?.dataSourceId ?? props.defaultDataSourceId)

watch(
  () => props.expanded,
  (open) => {
    if (open) {
      draftSql.value = props.indicator.sqlConfig?.sql ?? ''
      draftDescription.value = props.indicator.sqlConfig?.description ?? ''
      draftDataSourceId.value = props.indicator.sqlConfig?.dataSourceId ?? props.defaultDataSourceId
    }
  }
)

watch(
  () => props.indicator.sqlConfig,
  (cfg) => {
    if (props.expanded) {
      draftSql.value = cfg?.sql ?? ''
      draftDescription.value = cfg?.description ?? ''
      draftDataSourceId.value = cfg?.dataSourceId ?? props.defaultDataSourceId
    }
  }
)

const variableLabel = computed(() => `\u007B\u007B${props.indicator.variable}\u007D\u007D`)

const sqlStatusType = computed(() => {
  const cfg = props.indicator.sqlConfig
  if (!cfg?.sql) return 'warning' as const
  if (cfg.testStatus === 'success') return 'success' as const
  if (cfg.testStatus === 'error') return 'error' as const
  return 'warning' as const
})

const sqlStatusLabel = computed(() => {
  const cfg = props.indicator.sqlConfig
  if (!cfg?.sql) return '待配置'
  if (cfg.testStatus === 'success') return '已配置'
  if (cfg.testStatus === 'error') return '验证失败'
  return '待验证'
})

// ── 结果形状判断 ──
const cfg = computed(() => props.indicator.sqlConfig)

const isSingleColumnList = computed(() => {
  const c = cfg.value
  if (!c || c.testStatus !== 'success') return false
  return (c.testColumns?.length ?? 0) === 1 && (c.testRowCount ?? 0) > 1
})

const isTable = computed(() => {
  const c = cfg.value
  if (!c || c.testStatus !== 'success') return false
  return (c.testColumns?.length ?? 0) > 1
})

const resultShapeSummary = computed(() => {
  const c = cfg.value
  if (!c) return ''
  const rows = c.testRowCount ?? 0
  const cols = c.testColumns?.length ?? 0
  if (rows <= 1 && cols <= 1) return '单一数值'
  if (cols === 1) return `${rows} 行`
  return `${rows} 行 × ${cols} 列`
})

const tableColumns = computed<DataTableColumns>(() => {
  const cols = cfg.value?.testColumns ?? []
  return cols.map((col, i) => ({
    title: col,
    key: `col_${i}`,
    ellipsis: { tooltip: true },
    minWidth: 80,
  }))
})

const tableData = computed(() => {
  const rows = cfg.value?.testRows ?? []
  return rows.map((row, rowIdx) => {
    const obj: Record<string, string> = { key: String(rowIdx) }
    row.forEach((val, colIdx) => { obj[`col_${colIdx}`] = val })
    return obj
  })
})

function handleSave() {
  emit('save', {
    sql: draftSql.value,
    description: draftDescription.value,
    dataSourceId: draftDataSourceId.value,
  })
}

function handleTest() {
  emit('save', {
    sql: draftSql.value,
    description: draftDescription.value,
    dataSourceId: draftDataSourceId.value,
  })
  emit('test', draftSql.value, draftDataSourceId.value)
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
</script>

<style scoped>
.indicator-row {
  background: var(--n-color);
}

.indicator-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  gap: 8px;
  cursor: default;
  transition: background 0.15s;
}

.indicator-summary.expanded {
  background: var(--n-color-hover, rgba(0, 0, 0, 0.02));
}

.sql-editor-area {
  border-top: 1px dashed var(--n-border-color);
  background: var(--n-color-hover, #fafafa);
  padding: 12px 14px 14px;
}

.sql-editor-box {
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  overflow: hidden;
  background: var(--n-color);
}

.indicator-description {
  padding: 8px 10px;
  background: color-mix(in srgb, #2080f0 5%, transparent);
  border-left: 3px solid #2080f0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sql-editor-hint {
  display: block;
  font-size: 11px;
  color: var(--n-text-color-3);
  padding: 6px 10px 4px;
  background: var(--n-color-hover, #f6f6f9);
  border-bottom: 1px solid var(--n-border-color);
}

.sql-textarea :deep(.n-input__border),
.sql-textarea :deep(.n-input__state-border) {
  border: none !important;
  box-shadow: none !important;
}

.test-result-block {
  padding: 8px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, #18a058 6%, transparent);
}

.result-preview {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed color-mix(in srgb, #18a058 20%, transparent);
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.test-result {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.test-result.error {
  background: color-mix(in srgb, #d03050 8%, transparent);
}

.sql-slide-enter-active {
  transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.34, 1.1, 0.64, 1), max-height 0.25s ease;
  overflow: hidden;
}
.sql-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.18s ease, max-height 0.2s ease;
  overflow: hidden;
}
.sql-slide-enter-from {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}
.sql-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}
.sql-slide-enter-to,
.sql-slide-leave-from {
  max-height: 600px;
}
</style>
