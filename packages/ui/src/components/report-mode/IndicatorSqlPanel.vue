<template>
  <NCard class="indicator-sql-card">
    <template #header>
      <NFlex align="center" justify="space-between">
        <NFlex align="center" :size="8">
          <span class="panel-accent"></span>
          <NText class="panel-title">指标 SQL 配置</NText>
          <NText depth="3" class="panel-count">
            {{ configuredCount }} / {{ indicators.length + customIndicators.length }} 已配置
          </NText>
        </NFlex>
      </NFlex>
    </template>

    <!-- 加载中：正在调用 /api/optimize -->
    <NFlex v-if="loading" vertical :size="10" style="padding: 8px 0;">
      <NSkeleton text :repeat="2" style="margin-bottom: 4px;" />
      <NSkeleton text :repeat="2" style="margin-bottom: 4px;" />
      <NSkeleton text :repeat="2" />
      <NText depth="3" style="font-size: 12px; text-align: center; margin-top: 8px;">
        正在生成指标配置，请稍候…
      </NText>
    </NFlex>

    <!-- 空态：未调用 /api/optimize 前没有 AI 指标（但可能有自定义指标） -->
    <NFlex
      v-else-if="indicators.length === 0 && customIndicators.length === 0"
      vertical
      align="center"
      :size="8"
      class="empty-state"
    >
      <div class="empty-illustration">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <NText depth="3" class="empty-copy">
        暂无指标配置<br />
        请先在左侧填写报告需求并点击"优化"，生成后将自动填充指标列表
      </NText>
      <!-- 空态下也允许新增自定义指标 -->
      <NButton size="small" type="primary" ghost @click="openAddModal">
        <template #icon><NIcon><PlusIcon /></NIcon></template>
        新增自定义指标
      </NButton>
    </NFlex>

    <NFlex v-else-if="!loading" vertical :size="16">
      <!-- 必填指标 -->
      <div v-if="requiredIndicators.length > 0">
        <NFlex align="center" :size="6" style="margin-bottom: 8px;">
          <NText style="font-size: 13px; font-weight: 600;">必填指标</NText>
          <NTag size="small" type="error" :bordered="false">{{ requiredIndicators.length }} 项</NTag>
        </NFlex>
        <div class="indicator-list">
          <IndicatorRow
            v-for="ind in requiredIndicators"
            :key="ind.id"
            :indicator="ind"
            :expanded="expandedId === ind.id"
            :data-source-options="dataSourceOptions"
            :default-data-source-id="activeDataSourceId"
            @toggle="toggleExpand(ind.id)"
            @save="(cfg) => saveSqlConfig(ind.id, cfg)"
            @test="(sql, dataSourceId) => testSql(ind.id, sql, dataSourceId)"
            @clear="clearSqlConfig(ind.id)"
            @remove="removeIndicator(ind.id)"
          />
        </div>
      </div>

      <NDivider v-if="requiredIndicators.length > 0 && optionalIndicators.length > 0" style="margin: 0;" />

      <!-- 可选指标 -->
      <div v-if="optionalIndicators.length > 0">
        <NFlex align="center" :size="6" style="margin-bottom: 8px;">
          <NText style="font-size: 13px; font-weight: 600;">可选指标</NText>
          <NTag size="small" :bordered="false">{{ optionalIndicators.length }} 项</NTag>
        </NFlex>
        <div class="indicator-list optional">
          <IndicatorRow
            v-for="ind in optionalIndicators"
            :key="ind.id"
            :indicator="ind"
            :expanded="expandedId === ind.id"
            :data-source-options="dataSourceOptions"
            :default-data-source-id="activeDataSourceId"
            @toggle="toggleExpand(ind.id)"
            @save="(cfg) => saveSqlConfig(ind.id, cfg)"
            @test="(sql, dataSourceId) => testSql(ind.id, sql, dataSourceId)"
            @clear="clearSqlConfig(ind.id)"
            @remove="removeIndicator(ind.id)"
          />
        </div>
      </div>

      <NDivider v-if="indicators.length > 0" style="margin: 0;" />

      <!-- 自定义指标区块 -->
      <div>
        <NFlex align="center" justify="space-between" style="margin-bottom: 8px;">
          <NFlex align="center" :size="6">
            <NText style="font-size: 13px; font-weight: 600;">自定义指标</NText>
            <NTag size="small" type="info" :bordered="false">{{ customIndicators.length }} 项</NTag>
          </NFlex>
          <NButton size="small" type="primary" ghost @click="openAddModal">
            <template #icon><NIcon><PlusIcon /></NIcon></template>
            新增指标
          </NButton>
        </NFlex>

        <!-- 自定义指标列表 -->
        <div v-if="customIndicators.length > 0" class="indicator-list">
          <CustomIndicatorRow
            v-for="ind in customIndicators"
            :key="ind.id"
            :indicator="ind"
            :expanded="expandedId === ind.id"
            :data-source-options="dataSourceOptions"
            :default-data-source-id="activeDataSourceId"
            @toggle="toggleExpand(ind.id)"
            @save="(cfg) => saveCustomSqlConfig(ind.id, cfg)"
            @test="(sql, dataSourceId) => testCustomSql(ind.id, sql, dataSourceId)"
            @remove="removeCustomIndicator(ind.id)"
          />
        </div>
        <NText v-else depth="3" style="font-size: 12px; padding: 4px 0;">
          暂无自定义指标，点击右上角"新增指标"添加
        </NText>
      </div>
    </NFlex>
  </NCard>

  <!-- 新增自定义指标 Modal -->
  <NModal v-model:show="showAddModal" preset="card" style="width: 460px;" title="新增自定义指标">
    <NFlex vertical :size="14">
      <!-- 指标名称 -->
      <NFlex align="center" :size="8">
        <NText class="form-label">指标名称</NText>
        <NInput
          v-model:value="form.name"
          placeholder="如：不良贷款率"
          style="flex: 1;"
          @input="autoFillVariable"
        />
      </NFlex>

      <!-- 变量名 -->
      <NFlex align="center" :size="8">
        <NText class="form-label">变量名</NText>
        <NFlex vertical style="flex: 1;" :size="4">
          <NInput
            v-model:value="form.variable"
            placeholder="如：npl_ratio（仅限英文字母、数字、下划线）"
            :status="variableError ? 'error' : undefined"
            @blur="validateVariable"
          />
          <NText v-if="variableError" style="font-size: 11px; color: var(--n-error-color);">
            {{ variableError }}
          </NText>
          <NText v-else depth="3" style="font-size: 11px;">
            将在左侧 prompt 中显示为 {{ '\u007B\u007B' + (form.variable || 'variable_name') + '\u007D\u007D' }}
          </NText>
        </NFlex>
      </NFlex>

      <!-- 单位 -->
      <NFlex align="center" :size="8">
        <NText class="form-label">单位</NText>
        <NInput v-model:value="form.unit" placeholder="如：%、亿元、户（可留空）" style="flex: 1;" />
      </NFlex>

      <!-- 说明 -->
      <NFlex align="center" :size="8">
        <NText class="form-label">指标说明</NText>
        <NInput
          v-model:value="form.description"
          placeholder="指标含义说明（可留空）"
          style="flex: 1;"
        />
      </NFlex>

      <NFlex justify="end" :size="8" style="margin-top: 4px;">
        <NButton @click="closeAddModal">取消</NButton>
        <NButton type="primary" :disabled="!canSubmit" @click="handleAddIndicator">确认添加</NButton>
      </NFlex>
    </NFlex>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'

const props = defineProps<{ loading?: boolean }>()
const loading = computed(() => props.loading ?? false)
import { NCard, NFlex, NText, NTag, NDivider, NButton, NIcon, NModal, NInput, NSkeleton } from 'naive-ui'
import { useReportDatabase } from './useReportDatabase'
import { sanitizeVariableName } from './reportTypes'
import IndicatorRow from './IndicatorRow.vue'
import CustomIndicatorRow from './CustomIndicatorRow.vue'

// 垂直加号图标
const PlusIcon = {
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
      [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M12 4v16m8-8H4' })]
    )
  }
}

const {
  indicators,
  activeDataSourceId,
  dataSourceOptions,
  requiredIndicators,
  optionalIndicators,
  configuredCount,
  saveSqlConfig,
  testSql,
  clearSqlConfig,
  removeIndicator,
  customIndicators,
  addCustomIndicator,
  removeCustomIndicator,
  isVariableNameTaken,
  saveCustomSqlConfig,
  testCustomSql,
} = useReportDatabase()

// ── 展开收起 ──
const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// ── 新增指标 Modal ──
const showAddModal = ref(false)
const form = ref({ name: '', variable: '', unit: '', description: '' })
const variableError = ref('')

function openAddModal() {
  form.value = { name: '', variable: '', unit: '', description: '' }
  variableError.value = ''
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

/** 根据指标名称自动填充变量名（仅当用户未手动修改时） */
function autoFillVariable() {
  if (!form.value.variable) {
    // 简单的拼音首字母映射不在前端做，只做格式清理
    form.value.variable = sanitizeVariableName(form.value.name)
  }
  variableError.value = ''
}

function validateVariable(): boolean {
  const v = form.value.variable
  if (!v) {
    variableError.value = '变量名不能为空'
    return false
  }
  if (!/^[a-z_][a-z0-9_]*$/.test(v)) {
    variableError.value = '只能包含小写字母、数字和下划线，且不能以数字开头'
    return false
  }
  if (isVariableNameTaken(v)) {
    variableError.value = '该变量名已被其他指标使用，请换一个'
    return false
  }
  variableError.value = ''
  return true
}

const canSubmit = computed(() =>
  !!form.value.name.trim() &&
  !!form.value.variable.trim() &&
  !variableError.value
)

function handleAddIndicator() {
  if (!validateVariable()) return
  const id = addCustomIndicator({
    name: form.value.name.trim(),
    variable: form.value.variable.trim(),
    unit: form.value.unit.trim(),
    description: form.value.description.trim(),
  })
  closeAddModal()
  // 新增后自动展开该指标的 SQL 配置区
  expandedId.value = id
}
</script>

<style scoped>
.indicator-sql-card {
  border-radius: 8px;
  border-color: rgba(111, 50, 155, 0.12);
  box-shadow: 0 12px 30px rgba(43, 27, 67, 0.07);
}

.panel-accent {
  width: 4px;
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(180deg, #7b3fb2, #c3262f);
}

.panel-title {
  color: #242832;
  font-size: 15px;
  font-weight: 700;
}

.panel-count {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(111, 50, 155, 0.08);
  color: #7b3fb2;
  font-size: 12px;
}

.empty-state {
  padding: 34px 12px 36px;
}

.empty-illustration {
  position: relative;
  width: 76px;
  height: 50px;
  margin-bottom: 8px;
}

.empty-illustration::before {
  position: absolute;
  inset: 4px 10px;
  border: 1px solid rgba(111, 50, 155, 0.18);
  border-radius: 8px;
  background: linear-gradient(180deg, #fff, #f7f2fb);
  content: '';
}

.empty-illustration span {
  position: absolute;
  left: 22px;
  right: 22px;
  height: 4px;
  border-radius: 999px;
  background: rgba(111, 50, 155, 0.18);
}

.empty-illustration span:nth-child(1) {
  top: 16px;
}

.empty-illustration span:nth-child(2) {
  top: 25px;
}

.empty-illustration span:nth-child(3) {
  top: 34px;
  right: 34px;
}

.empty-copy {
  text-align: center;
  line-height: 1.8;
  font-size: 13px;
  color: #a973c1;
}

.indicator-list {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(111, 50, 155, 0.12);
  border-radius: 6px;
  overflow: hidden;
}

.indicator-list .indicator-row:not(:last-child) {
  border-bottom: 1px solid var(--n-border-color);
}

.form-label {
  font-size: 12px;
  color: var(--n-text-color-3);
  width: 64px;
  flex-shrink: 0;
}
</style>
