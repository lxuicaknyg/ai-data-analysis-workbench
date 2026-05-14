<template>
  <NCard>
    <template #header>
      <NFlex align="center" justify="space-between">
        <NFlex align="center" :size="8">
          <NText style="font-size: 15px; font-weight: 600;">数据源接入</NText>
          <NTag size="small" :type="statusTagType" :bordered="false">{{ statusLabel }}</NTag>
        </NFlex>
        <NButton size="small" type="primary" ghost @click="handleAddDataSource">新增</NButton>
      </NFlex>
    </template>

    <NFlex vertical :size="14">
      <div v-if="savedDataSources.length > 0" class="saved-source-list">
        <div
          v-for="source in savedDataSources"
          :key="source.id"
          class="saved-source-item"
          :class="{ active: source.id === activeDataSourceId }"
        >
          <NFlex justify="space-between" align="start" :wrap="false" :size="8">
            <NFlex vertical :size="4" style="min-width: 0;">
              <NFlex align="center" :size="6">
                <NText strong style="font-size: 13px;">{{ source.name }}</NText>
                <NTag
                  size="tiny"
                  :type="source.status === 'connected' ? 'success' : 'warning'"
                  :bordered="false"
                >
                  {{ source.status === 'connected' ? '已保存' : '待重新测试' }}
                </NTag>
              </NFlex>
              <NText depth="3" class="source-meta">
                {{ DB_TYPE_LABELS[source.type] }} · {{ source.host }}:{{ source.port }} / {{ source.database }}
              </NText>
              <NText depth="3" class="source-meta">用户：{{ source.username }}</NText>
            </NFlex>
            <NFlex :size="6" style="flex-shrink: 0;">
              <NButton size="tiny" @click="selectDataSource(source.id)">编辑</NButton>
              <NPopconfirm
                positive-text="确认删除"
                negative-text="取消"
                :disabled="dataSources.length <= 1"
                @positive-click="handleRemoveDataSource(source.id)"
              >
                <template #trigger>
                  <NButton size="tiny" type="error" ghost :disabled="dataSources.length <= 1">删除</NButton>
                </template>
                删除该数据源后，已绑定它的指标 SQL 会自动回退到当前可用数据源。
              </NPopconfirm>
            </NFlex>
          </NFlex>
        </div>
      </div>
      <NText v-else depth="3" style="font-size: 12px;">
        暂无已保存数据源，请先填写连接信息并测试通过后保存。
      </NText>

      <NDivider style="margin: 0;" />

      <NFlex align="center" :size="0" style="gap: 0;">
        <NText class="field-label">名称</NText>
        <NInput
          :value="dataSource.name"
          size="small"
          placeholder="如：生产库、风控库"
          style="flex: 1;"
          @update:value="v => updateDataSource({ name: v })"
        />
      </NFlex>

      <NFlex align="center" :size="0" style="gap: 0;">
        <NText class="field-label">数据库类型</NText>
        <NSelect
          :value="dataSource.type"
          :options="dbTypeOptions"
          size="small"
          style="flex: 1;"
          @update:value="onDbTypeChange"
        />
      </NFlex>

      <NFlex :size="8">
        <NFlex align="center" :size="0" style="flex: 2; gap: 0;">
          <NText class="field-label">Host</NText>
          <NInput
            :value="dataSource.host"
            size="small"
            placeholder="127.0.0.1"
            style="flex: 1;"
            @update:value="v => updateDataSource({ host: v })"
          />
        </NFlex>
        <NFlex align="center" :size="0" style="flex: 1; gap: 0;">
          <NText class="field-label" style="width: 44px;">端口</NText>
          <NInput
            :value="dataSource.port"
            size="small"
            :placeholder="dataSource.port"
            style="flex: 1;"
            @update:value="v => updateDataSource({ port: v })"
          />
        </NFlex>
      </NFlex>

      <NFlex align="center" :size="0" style="gap: 0;">
        <NText class="field-label">数据库名</NText>
        <NInput
          :value="dataSource.database"
          size="small"
          placeholder="数据库名称"
          style="flex: 1;"
          @update:value="v => updateDataSource({ database: v })"
        />
      </NFlex>

      <NFlex :size="8">
        <NFlex align="center" :size="0" style="flex: 1; gap: 0;">
          <NText class="field-label">用户名</NText>
          <NInput
            :value="dataSource.username"
            size="small"
            placeholder="用户名"
            style="flex: 1;"
            @update:value="v => updateDataSource({ username: v })"
          />
        </NFlex>
        <NFlex align="center" :size="0" style="flex: 1; gap: 0;">
          <NText class="field-label" style="width: 44px;">密码</NText>
          <NInput
            :value="dataSource.password"
            type="password"
            size="small"
            placeholder="密码"
            show-password-on="click"
            style="flex: 1;"
            @update:value="v => updateDataSource({ password: v })"
          />
        </NFlex>
      </NFlex>

      <NText
        v-if="dataSource.status === 'error' && dataSource.testError"
        style="font-size: 12px; color: var(--n-error-color, #d03050);"
      >
        连接失败：{{ dataSource.testError }}
      </NText>

      <NFlex justify="end" :size="8">
        <NButton
          size="small"
          :loading="isDataSourceTesting"
          :disabled="!canTest"
          @click="testDataSourceConnection"
        >
          测试连接
        </NButton>
        <NButton
          type="primary"
          size="small"
          :loading="isDataSourceSaving"
          :disabled="!canSave"
          @click="saveDataSource"
        >
          保存
        </NButton>
      </NFlex>
    </NFlex>
  </NCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NFlex, NText, NTag, NInput, NSelect, NButton, NPopconfirm, NDivider } from 'naive-ui'
import { useReportDatabase } from './useReportDatabase'
import { DB_TYPE_LABELS, type DbType } from './reportTypes'
import { useToast } from '../../composables/ui/useToast'

const toast = useToast()

const {
  dataSource,
  dataSources,
  savedDataSources,
  activeDataSourceId,
  selectDataSource,
  addDataSource,
  removeDataSource,
  isDataSourceSaving,
  isDataSourceTesting,
  updateDataSource,
  onDbTypeChange,
  saveDataSource: _saveDataSource,
  testDataSourceConnection: _testDataSourceConnection,
} = useReportDatabase()

function handleAddDataSource() {
  addDataSource()
  toast.success('已新增数据源，请填写连接信息')
}

function handleRemoveDataSource(id = activeDataSourceId.value) {
  removeDataSource(id)
  toast.success('数据源已删除')
}

async function testDataSourceConnection() {
  await _testDataSourceConnection()
  if (dataSource.value.status === 'connected') {
    toast.success('数据库连接成功')
  } else {
    toast.error(dataSource.value.testError || '连接失败，请检查配置')
  }
}

function saveDataSource() {
  if (dataSource.value.status !== 'connected') {
    toast.error('请先测试连接，通过后再保存')
    return
  }
  _saveDataSource()
  toast.success('数据源配置已保存')
}

const dbTypeOptions = (['mysql', 'gaussdb'] as DbType[]).map(value => ({
  value,
  label: DB_TYPE_LABELS[value],
}))

const statusTagType = computed(() => {
  if (dataSource.value.status === 'connected') return 'success' as const
  if (dataSource.value.status === 'error') return 'error' as const
  return 'default' as const
})

const statusLabel = computed(() => {
  if (dataSource.value.status === 'connected') return '已连接'
  if (dataSource.value.status === 'error') return '连接失败'
  return '未配置'
})

const canTest = computed(() =>
  !!(dataSource.value.host && dataSource.value.database && dataSource.value.username)
)

const canSave = computed(() => canTest.value && dataSource.value.status === 'connected')
</script>

<style scoped>
.field-label {
  font-size: 12px;
  color: var(--n-text-color-3);
  white-space: nowrap;
  width: 68px;
  flex-shrink: 0;
}

.saved-source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.saved-source-item {
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  padding: 10px;
  background: var(--n-color);
}

.saved-source-item.active {
  border-color: var(--n-primary-color);
  background: color-mix(in srgb, var(--n-primary-color) 5%, transparent);
}

.source-meta {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
