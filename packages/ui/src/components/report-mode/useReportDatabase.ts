/**
 * 数据库配置 & 指标SQL映射 状态管理
 *
 * 持久化：localStorage
 * SQL 试运行：调用后端 POST /api/sql/test
 * 指标列表：由 /api/optimize 返回的 metrics_config 动态驱动
 */
import { ref, computed } from 'vue'
import {
  DEFAULT_DATASOURCE,
  DB_DEFAULT_PORTS,
  indicatorFromMetric,
  generateId,
  type DataSourceConfig,
  type Indicator,
  type SqlConfig,
  type DbType,
  type MetricConfigFromApi,
  type CustomIndicator,
} from './reportTypes'

const STORAGE_KEY_DATASOURCE = 'report/v1/datasource'
const STORAGE_KEY_DATASOURCES = 'report/v1/datasources'
const STORAGE_KEY_ACTIVE_DATASOURCE = 'report/v1/active_datasource'
const STORAGE_KEY_INDICATORS = 'report/v1/indicators'
const STORAGE_KEY_RAW_PROMPT = 'report/v1/raw_prompt'
const STORAGE_KEY_CUSTOM_INDICATORS = 'report/v1/custom_indicators'
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
const SQL_TEST_API = `${BANK_AGENT_BASE}/api/sql/test`
const DB_TEST_API = `${BANK_AGENT_BASE}/api/db/test`

// ─── 持久化工具 ───────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('[useReportDatabase] localStorage write failed:', e)
  }
}

// ─── 模块级单例（跨组件共享同一份状态）──────────

function isSupportedDbType(type: unknown): type is DbType {
  return type === 'mysql' || type === 'gaussdb'
}

function createDataSourceId(): string {
  return `ds_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function normalizeDataSourceConfig(config: Partial<DataSourceConfig> & { type?: unknown }, fallbackId = 'default'): DataSourceConfig {
  const rawType = config.type
  const type: DbType = isSupportedDbType(rawType)
    ? rawType
    : rawType === 'postgresql'
      ? 'gaussdb'
      : DEFAULT_DATASOURCE.type

  return {
    ...DEFAULT_DATASOURCE,
    ...config,
    id: config.id || fallbackId,
    name: config.name || config.database || '默认数据源',
    type,
    port: config.port || DB_DEFAULT_PORTS[type],
    status: isSupportedDbType(rawType) ? (config.status ?? 'unconfigured') : 'unconfigured',
    testError: isSupportedDbType(rawType) ? config.testError : undefined,
    lastTestedAt: isSupportedDbType(rawType) ? config.lastTestedAt : undefined,
    savedAt: config.savedAt ?? (config.status === 'connected' ? config.lastTestedAt : undefined),
  }
}

function loadInitialDataSources(): DataSourceConfig[] {
  const savedList = loadFromStorage<Array<Partial<DataSourceConfig> & { type?: unknown }> | null>(
    STORAGE_KEY_DATASOURCES,
    null
  )
  if (Array.isArray(savedList) && savedList.length > 0) {
    return savedList.map((item, index) => normalizeDataSourceConfig(item, item.id || `ds_${index + 1}`))
  }

  const legacy = loadFromStorage<Partial<DataSourceConfig> & { type?: unknown }>(
    STORAGE_KEY_DATASOURCE,
    DEFAULT_DATASOURCE
  )
  return [normalizeDataSourceConfig(legacy, legacy.id || 'default')]
}

const dataSources = ref<DataSourceConfig[]>(loadInitialDataSources())
const activeDataSourceId = ref<string>(
  loadFromStorage<string>(STORAGE_KEY_ACTIVE_DATASOURCE, dataSources.value[0]?.id ?? DEFAULT_DATASOURCE.id)
)

if (!dataSources.value.some(ds => ds.id === activeDataSourceId.value)) {
  activeDataSourceId.value = dataSources.value[0]?.id ?? DEFAULT_DATASOURCE.id
}

const dataSource = computed<DataSourceConfig>(() =>
  dataSources.value.find(ds => ds.id === activeDataSourceId.value) ?? dataSources.value[0] ?? DEFAULT_DATASOURCE
)

/** 指标列表：初始为空，由 /api/optimize 返回的 metrics_config 填充 */
const indicators = ref<Indicator[]>(
  loadFromStorage<Indicator[]>(STORAGE_KEY_INDICATORS, [])
)

/** 优化后的原始 prompt（含 {{variable_name}} 占位符），持久化保证刷新后与指标列表同步 */
const rawPromptResult = ref<string>(
  loadFromStorage<string>(STORAGE_KEY_RAW_PROMPT, '')
)

/** 用户自定义指标列表，独立持久化，重新优化时不清空 */
const customIndicators = ref<CustomIndicator[]>(
  loadFromStorage<CustomIndicator[]>(STORAGE_KEY_CUSTOM_INDICATORS, [])
)

// ─── 启动时一致性检查 ──────────────────────────
// 若 raw_prompt 为空但 indicators 有数据（旧版本遗留 / 数据不一致），清空孤儿指标
if (!rawPromptResult.value && indicators.value.length > 0) {
  indicators.value = []
  saveToStorage(STORAGE_KEY_INDICATORS, [])
}

// ─── 自定义指标追加段（自动生成，实时同步到左侧 prompt）─────────
/**
 * 根据自定义指标列表生成追加文本段
 * 格式：每个指标一行，使用 {{variable}} 占位符
 * 当用户为指标配置 SQL 并成功试运行后，占位符会被替换为真实数值
 */
const customSection = computed(() => {
  if (customIndicators.value.length === 0) return ''
  const lines = customIndicators.value.map(i => {
    const unit = i.unit ? `（单位：${i.unit}）` : ''
    return `- ${i.name}：{{${i.variable}}}${unit}`
  })
  return '\n\n【补充指标】\n以下为自定义补充数据指标，请在报告中体现：\n' + lines.join('\n')
})

/**
 * 最终用于左侧展示的原始 prompt = AI生成的卷子 + 用户追加的填空题
 * 只有 AI 已生成内容时才追加自定义段，避免空状态或重新优化时出现孤立的自定义指标文字
 */
const finalRawPrompt = computed(() =>
  rawPromptResult.value ? rawPromptResult.value + customSection.value : ''
)

// ─── 变量替换：{{variable_name}} → SQL 结果 ──

/** 收集所有已成功试运行的指标值，构成变量映射表（兼容 Indicator 和 CustomIndicator） */
function collectVariableValues(list: Array<{ variable: string; sqlConfig: SqlConfig | null }>): Record<string, string> {
  const map: Record<string, string> = {}
  for (const ind of list) {
    const cfg = ind.sqlConfig
    if (cfg?.testStatus === 'success' && cfg.testResult !== undefined && cfg.testResult !== null) {
      map[ind.variable] = cfg.testResult
    }
  }
  return map
}

/** 替换 prompt 中所有 {{variable_name}}，未配置的保持原样 */
export function renderPromptWithVariables(
  rawPrompt: string,
  variables: Record<string, string>
): string {
  if (!rawPrompt) return ''
  return rawPrompt.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, name) => {
    return Object.prototype.hasOwnProperty.call(variables, name) ? variables[name] : match
  })
}

/**
 * 从文本中移除含有指定变量占位符的行
 * 例如：removeVariableLine(text, 'npl_ratio') 会删除含有 {{npl_ratio}} 的行
 */
function removeVariableLine(text: string, variable: string): string {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`)
  return text
    .split('\n')
    .filter(line => !pattern.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── 清除报告状态（用于登出时重置）─────────────

/**
 * 清除所有报告相关状态（用户登出时调用）
 * - 清空指标列表、自定义指标、原始prompt
 * - 清空对应的 localStorage 存储
 */
export function clearReportState() {
  indicators.value = []
  rawPromptResult.value = ''
  customIndicators.value = []
  
  saveToStorage(STORAGE_KEY_INDICATORS, [])
  saveToStorage(STORAGE_KEY_RAW_PROMPT, '')
  saveToStorage(STORAGE_KEY_CUSTOM_INDICATORS, [])
  
  console.log('[useReportDatabase] 报告状态已清空')
}

// ─── Composable ───────────────────────────────

function createReportDatabase() {
  // ── 数据源 ──────────────────────────────────

  const isDataSourceSaving = ref(false)
  const isDataSourceTesting = ref(false)

  const dataSourceOptions = computed(() =>
    dataSources.value
      .filter(ds => ds.savedAt && ds.status === 'connected')
      .map(ds => ({
        value: ds.id,
        label: ds.name || ds.database || `${ds.host || '未命名数据源'}:${ds.port}`,
      }))
  )

  const savedDataSources = computed(() =>
    dataSources.value.filter(ds => ds.savedAt)
  )

  function persistDataSources() {
    saveToStorage(STORAGE_KEY_DATASOURCES, dataSources.value)
    saveToStorage(STORAGE_KEY_ACTIVE_DATASOURCE, activeDataSourceId.value)
  }

  function selectDataSource(id: string) {
    if (!dataSources.value.some(ds => ds.id === id)) return
    activeDataSourceId.value = id
    saveToStorage(STORAGE_KEY_ACTIVE_DATASOURCE, id)
  }

  function addDataSource() {
    const id = createDataSourceId()
    dataSources.value = [
      ...dataSources.value,
      {
        ...DEFAULT_DATASOURCE,
        id,
        name: `数据源 ${dataSources.value.length + 1}`,
      },
    ]
    activeDataSourceId.value = id
    persistDataSources()
  }

  function removeDataSource(id: string) {
    if (dataSources.value.length <= 1) return
    dataSources.value = dataSources.value.filter(ds => ds.id !== id)
    if (activeDataSourceId.value === id) {
      activeDataSourceId.value = dataSources.value[0]?.id ?? DEFAULT_DATASOURCE.id
    }
    indicators.value = indicators.value.map(ind =>
      ind.sqlConfig?.dataSourceId === id
        ? { ...ind, sqlConfig: { ...ind.sqlConfig, dataSourceId: activeDataSourceId.value } }
        : ind
    )
    customIndicators.value = customIndicators.value.map(ind =>
      ind.sqlConfig?.dataSourceId === id
        ? { ...ind, sqlConfig: { ...ind.sqlConfig, dataSourceId: activeDataSourceId.value } }
        : ind
    )
    persistDataSources()
    saveToStorage(STORAGE_KEY_INDICATORS, indicators.value)
    saveToStorage(STORAGE_KEY_CUSTOM_INDICATORS, customIndicators.value)
  }

  function updateDataSource(patch: Partial<DataSourceConfig>) {
    dataSources.value = dataSources.value.map(ds =>
      ds.id === activeDataSourceId.value
        ? normalizeDataSourceConfig({
          ...ds,
          ...patch,
          status: shouldResetDataSourceStatus(patch) ? 'unconfigured' : patch.status ?? ds.status,
          testError: shouldResetDataSourceStatus(patch) ? undefined : patch.testError ?? ds.testError,
          lastTestedAt: shouldResetDataSourceStatus(patch) ? undefined : patch.lastTestedAt ?? ds.lastTestedAt,
          savedAt: patch.savedAt ?? ds.savedAt,
        }, ds.id)
        : ds
    )
  }

  function shouldResetDataSourceStatus(patch: Partial<DataSourceConfig>): boolean {
    return ['type', 'host', 'port', 'database', 'username', 'password'].some(
      key => Object.prototype.hasOwnProperty.call(patch, key)
    )
  }

  function onDbTypeChange(type: DbType) {
    updateDataSource({
      type,
      port: DB_DEFAULT_PORTS[type],
    })
  }

  function saveDataSource() {
    if (dataSource.value.status !== 'connected') return
    isDataSourceSaving.value = true
    updateDataSource({ savedAt: new Date().toISOString() })
    persistDataSources()
    setTimeout(() => { isDataSourceSaving.value = false }, 400)
  }

  async function testDataSourceConnection(): Promise<void> {
    isDataSourceTesting.value = true
    const target = dataSource.value
    try {
      const res = await fetch(DB_TEST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: target.type,
          host: target.host,
          port: target.port,
          database: target.database,
          username: target.username,
          password: target.password,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { success?: boolean; message?: string }
      if (data.success === false) throw new Error(data.message || '连接失败')
      updateDataSource({
        status: 'connected',
        lastTestedAt: new Date().toISOString(),
        testError: undefined,
      })
    } catch (e) {
      updateDataSource({
        status: 'error',
        testError: e instanceof Error ? e.message : '连接失败',
      })
    } finally {
      isDataSourceTesting.value = false
    }
  }

  // ── 指标列表填充（来自 API 的 metrics_config）──

  /**
   * 根据 /api/optimize 返回的 metrics_config 刷新指标列表
   * - 新指标：按 metrics_config 顺序创建
   * - 已有指标：保留用户已配置的 sqlConfig（通过 variable_name 匹配）
   * - 本次未出现的旧指标：移除
   */
  function setIndicatorsFromMetricsConfig(metricsConfig: MetricConfigFromApi[]) {
    const prevMap = new Map(indicators.value.map(i => [i.variable, i.sqlConfig]))
    indicators.value = metricsConfig.map(m => {
      const ind = indicatorFromMetric(m)
      const existingCfg = prevMap.get(m.variable_name)
      if (existingCfg) ind.sqlConfig = existingCfg
      return ind
    })
    saveToStorage(STORAGE_KEY_INDICATORS, indicators.value)
  }

  // ── 指标 SQL 操作 ──────────────────────────

  const requiredIndicators = computed(() =>
    indicators.value.filter(i => i.required)
  )
  const optionalIndicators = computed(() =>
    indicators.value.filter(i => !i.required)
  )
  const configuredCount = computed(() =>
    indicators.value.filter(i => i.sqlConfig?.sql.trim()).length +
    customIndicators.value.filter(i => i.sqlConfig?.sql.trim()).length
  )

  /**
   * 已试运行成功的指标值映射，用于渲染 prompt
   * 同时包含 AI 返回的指标 + 用户自定义指标
   */
  const variableValues = computed(() => ({
    ...collectVariableValues(indicators.value),
    ...collectVariableValues(customIndicators.value),
  }))

  function saveSqlConfig(indicatorId: string, config: Pick<SqlConfig, 'sql' | 'description' | 'dataSourceId'>) {
    const idx = indicators.value.findIndex(i => i.id === indicatorId)
    if (idx === -1) return
    const existing = indicators.value[idx].sqlConfig
    indicators.value[idx] = {
      ...indicators.value[idx],
      sqlConfig: {
        sql: config.sql,
        dataSourceId: config.dataSourceId ?? existing?.dataSourceId ?? activeDataSourceId.value,
        description: config.description,
        testStatus: existing?.testStatus ?? 'untested',
        testResult: existing?.testResult,
        testError: existing?.testError,
        savedAt: new Date().toISOString(),
      },
    }
    saveToStorage(STORAGE_KEY_INDICATORS, indicators.value)
  }

  async function testSql(indicatorId: string, sql: string, dataSourceId?: string): Promise<void> {
    const idx = indicators.value.findIndex(i => i.id === indicatorId)
    if (idx === -1) return

    // 标记为 testing
    const current = indicators.value[idx].sqlConfig
    indicators.value[idx] = {
      ...indicators.value[idx],
      sqlConfig: {
        sql: current?.sql ?? sql,
        dataSourceId: dataSourceId ?? current?.dataSourceId ?? activeDataSourceId.value,
        description: current?.description ?? '',
        ...current,
        testStatus: 'testing',
      },
    }

    try {
      const res = await fetch(SQL_TEST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql,
          datasource: {
            type: dataSource.value.type,
            host: dataSource.value.host,
            port: dataSource.value.port,
            database: dataSource.value.database,
            username: dataSource.value.username,
            password: dataSource.value.password,
          },
        }),
      })
      // 解析响应体（包括 403 安全拦截），以便显示真实错误信息
      const data = await res.json() as {
        success?: boolean
        result?: string
        columns?: string[]
        rows?: string[][]
        execute_time_ms?: number
        error?: string
      }
      if (!res.ok || data.success === false) {
        throw new Error(data.error || `请求失败 (HTTP ${res.status})`)
      }
      const updated = indicators.value[idx].sqlConfig!
      const rawRows = data.rows ?? []
      indicators.value[idx] = {
        ...indicators.value[idx],
        sqlConfig: {
          ...updated,
          testStatus: 'success',
          testResult: String(data.result ?? ''),
          testError: undefined,
          testColumns: data.columns,
          testRows: rawRows.slice(0, 5),      // 只保留前 5 行，避免撑爆 localStorage
          testRowCount: rawRows.length,
          executeTimeMs: data.execute_time_ms,
        },
      }
    } catch (e) {
      const updated = indicators.value[idx].sqlConfig!
      indicators.value[idx] = {
        ...indicators.value[idx],
        sqlConfig: {
          ...updated,
          testStatus: 'error',
          testError: e instanceof Error ? e.message : '试运行失败',
          testResult: undefined,
          testColumns: undefined,
          testRows: undefined,
          testRowCount: undefined,
          executeTimeMs: undefined,
        },
      }
    } finally {
      saveToStorage(STORAGE_KEY_INDICATORS, indicators.value)
    }
  }

  function clearSqlConfig(indicatorId: string) {
    const idx = indicators.value.findIndex(i => i.id === indicatorId)
    if (idx === -1) return
    indicators.value[idx] = { ...indicators.value[idx], sqlConfig: null }
    saveToStorage(STORAGE_KEY_INDICATORS, indicators.value)
  }

  /** 删除 AI 返回的指标（必填或可选），同步从 rawPromptResult 移除对应行 */
  function removeIndicator(indicatorId: string) {
    const indicator = indicators.value.find(i => i.id === indicatorId)
    indicators.value = indicators.value.filter(i => i.id !== indicatorId)
    saveToStorage(STORAGE_KEY_INDICATORS, indicators.value)
    if (indicator) {
      const updated = removeVariableLine(rawPromptResult.value, indicator.variable)
      rawPromptResult.value = updated
      saveToStorage(STORAGE_KEY_RAW_PROMPT, updated)
    }
  }

  // ── 自定义指标 CRUD ────────────────────────

  /**
   * 新增一个自定义指标
   * @returns 新指标的 id，用于后续定位
   */
  function addCustomIndicator(params: { name: string; variable: string; unit: string; description: string }): string {
    const id = generateId()
    customIndicators.value = [
      ...customIndicators.value,
      { id, ...params, sqlConfig: null },
    ]
    saveToStorage(STORAGE_KEY_CUSTOM_INDICATORS, customIndicators.value)
    return id
  }

  /** 删除自定义指标 */
  function removeCustomIndicator(id: string) {
    customIndicators.value = customIndicators.value.filter(i => i.id !== id)
    saveToStorage(STORAGE_KEY_CUSTOM_INDICATORS, customIndicators.value)
  }

  /** 检查变量名是否与现有指标冲突（AI指标 + 自定义指标） */
  function isVariableNameTaken(variable: string, excludeId?: string): boolean {
    const inApiIndicators = indicators.value.some(i => i.variable === variable)
    const inCustomIndicators = customIndicators.value.some(
      i => i.variable === variable && i.id !== excludeId
    )
    return inApiIndicators || inCustomIndicators
  }

  /** 保存自定义指标的 SQL 配置 */
  function saveCustomSqlConfig(indicatorId: string, config: Pick<SqlConfig, 'sql' | 'description' | 'dataSourceId'>) {
    const idx = customIndicators.value.findIndex(i => i.id === indicatorId)
    if (idx === -1) return
    const existing = customIndicators.value[idx].sqlConfig
    customIndicators.value[idx] = {
      ...customIndicators.value[idx],
      sqlConfig: {
        sql: config.sql,
        dataSourceId: config.dataSourceId ?? existing?.dataSourceId ?? activeDataSourceId.value,
        description: config.description,
        testStatus: existing?.testStatus ?? 'untested',
        testResult: existing?.testResult,
        testError: existing?.testError,
        savedAt: new Date().toISOString(),
      },
    }
    saveToStorage(STORAGE_KEY_CUSTOM_INDICATORS, customIndicators.value)
  }

  /** 对自定义指标执行 SQL 试运行 */
  async function testCustomSql(indicatorId: string, sql: string, dataSourceId?: string): Promise<void> {
    const idx = customIndicators.value.findIndex(i => i.id === indicatorId)
    if (idx === -1) return

    const current = customIndicators.value[idx].sqlConfig
    customIndicators.value[idx] = {
      ...customIndicators.value[idx],
      sqlConfig: {
        sql: current?.sql ?? sql,
        dataSourceId: dataSourceId ?? current?.dataSourceId ?? activeDataSourceId.value,
        description: current?.description ?? '',
        ...current,
        testStatus: 'testing',
      },
    }

    try {
      const res = await fetch(SQL_TEST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql,
          datasource: {
            type: dataSource.value.type,
            host: dataSource.value.host,
            port: dataSource.value.port,
            database: dataSource.value.database,
            username: dataSource.value.username,
            password: dataSource.value.password,
          },
        }),
      })
      const data = await res.json() as {
        success?: boolean
        result?: string
        columns?: string[]
        rows?: string[][]
        execute_time_ms?: number
        error?: string
      }
      if (!res.ok || data.success === false) {
        throw new Error(data.error || `请求失败 (HTTP ${res.status})`)
      }
      const updated = customIndicators.value[idx].sqlConfig!
      const rawRows = data.rows ?? []
      customIndicators.value[idx] = {
        ...customIndicators.value[idx],
        sqlConfig: {
          ...updated,
          testStatus: 'success',
          testResult: String(data.result ?? ''),
          testError: undefined,
          testColumns: data.columns,
          testRows: rawRows.slice(0, 5),
          testRowCount: rawRows.length,
          executeTimeMs: data.execute_time_ms,
        },
      }
    } catch (e) {
      const updated = customIndicators.value[idx].sqlConfig!
      customIndicators.value[idx] = {
        ...customIndicators.value[idx],
        sqlConfig: {
          ...updated,
          testStatus: 'error',
          testError: e instanceof Error ? e.message : '试运行失败',
          testResult: undefined,
          testColumns: undefined,
          testRows: undefined,
          testRowCount: undefined,
          executeTimeMs: undefined,
        },
      }
    } finally {
      saveToStorage(STORAGE_KEY_CUSTOM_INDICATORS, customIndicators.value)
    }
  }

  /** 清除自定义指标的 SQL 配置 */
  function clearCustomSqlConfig(indicatorId: string) {
    const idx = customIndicators.value.findIndex(i => i.id === indicatorId)
    if (idx === -1) return
    customIndicators.value[idx] = { ...customIndicators.value[idx], sqlConfig: null }
    saveToStorage(STORAGE_KEY_CUSTOM_INDICATORS, customIndicators.value)
  }

  // ── 原始 prompt 持久化（与指标列表保持同步）──

  /**
   * 设置优化后的原始 prompt（含 {{variable_name}} 占位符）并持久化
   * 调用方应在调用 setIndicatorsFromMetricsConfig 的同时调用此方法，
   * 保证刷新后两者同步恢复
   */
  function setRawPromptResult(raw: string) {
    rawPromptResult.value = raw
    saveToStorage(STORAGE_KEY_RAW_PROMPT, raw)
    // 若 raw 为空则同步清空指标列表，保证两者始终一致
    if (!raw) {
      indicators.value = []
      saveToStorage(STORAGE_KEY_INDICATORS, [])
    }
  }

  /**
   * 从历史记录恢复指标配置
   * @param data 从数据库读取的指标数据
   */
  function setIndicatorsFromHistory(data: unknown[]) {
    if (!Array.isArray(data)) return
    indicators.value = data.map(item => {
      const record = item as Record<string, unknown>
      return {
        id: String(record.id ?? ''),
        name: String(record.name ?? ''),
        variable: String(record.variable ?? ''),
        unit: String(record.unit ?? ''),
        required: Boolean(record.required ?? false),
        description: String(record.description ?? ''),
        sqlConfig: (record.sqlConfig && typeof record.sqlConfig === 'object')
          ? {
              sql: String((record.sqlConfig as Record<string, unknown>).sql ?? ''),
              dataSourceId: String((record.sqlConfig as Record<string, unknown>).dataSourceId ?? ''),
              description: String((record.sqlConfig as Record<string, unknown>).description ?? ''),
              testStatus: String((record.sqlConfig as Record<string, unknown>).testStatus ?? 'untested'),
              testResult: (record.sqlConfig as Record<string, unknown>).testResult as string | undefined,
              testError: (record.sqlConfig as Record<string, unknown>).testError as string | undefined,
              testColumns: ((record.sqlConfig as Record<string, unknown>).testColumns as string[]) || undefined,
              testRows: ((record.sqlConfig as Record<string, unknown>).testRows as string[][]) || undefined,
              testRowCount: Number((record.sqlConfig as Record<string, unknown>).testRowCount) || undefined,
              executeTimeMs: Number((record.sqlConfig as Record<string, unknown>).executeTimeMs) || undefined,
              savedAt: String((record.sqlConfig as Record<string, unknown>).savedAt ?? ''),
            }
          : null,
      } as Indicator
    })
    saveToStorage(STORAGE_KEY_INDICATORS, indicators.value)
  }

  /**
   * 从历史记录恢复自定义指标配置
   * @param data 从数据库读取的自定义指标数据
   */
  function setCustomIndicatorsFromHistory(data: unknown[]) {
    if (!Array.isArray(data)) return
    customIndicators.value = data.map(item => {
      const record = item as Record<string, unknown>
      return {
        id: String(record.id ?? ''),
        name: String(record.name ?? ''),
        variable: String(record.variable ?? ''),
        unit: String(record.unit ?? ''),
        description: String(record.description ?? ''),
        sqlConfig: (record.sqlConfig && typeof record.sqlConfig === 'object')
          ? {
              sql: String((record.sqlConfig as Record<string, unknown>).sql ?? ''),
              dataSourceId: String((record.sqlConfig as Record<string, unknown>).dataSourceId ?? ''),
              description: String((record.sqlConfig as Record<string, unknown>).description ?? ''),
              testStatus: String((record.sqlConfig as Record<string, unknown>).testStatus ?? 'untested'),
              testResult: (record.sqlConfig as Record<string, unknown>).testResult as string | undefined,
              testError: (record.sqlConfig as Record<string, unknown>).testError as string | undefined,
              testColumns: ((record.sqlConfig as Record<string, unknown>).testColumns as string[]) || undefined,
              testRows: ((record.sqlConfig as Record<string, unknown>).testRows as string[][]) || undefined,
              testRowCount: Number((record.sqlConfig as Record<string, unknown>).testRowCount) || undefined,
              executeTimeMs: Number((record.sqlConfig as Record<string, unknown>).executeTimeMs) || undefined,
              savedAt: String((record.sqlConfig as Record<string, unknown>).savedAt ?? ''),
            }
          : null,
      } as CustomIndicator
    })
    saveToStorage(STORAGE_KEY_CUSTOM_INDICATORS, customIndicators.value)
  }

  return {
    // 数据源
    dataSource,
    dataSources,
    savedDataSources,
    activeDataSourceId,
    dataSourceOptions,
    selectDataSource,
    addDataSource,
    removeDataSource,
    isDataSourceSaving,
    isDataSourceTesting,
    updateDataSource,
    onDbTypeChange,
    saveDataSource,
    testDataSourceConnection,
    // 原始 prompt（持久化）
    rawPromptResult,
    finalRawPrompt,
    setRawPromptResult,
    // AI 返回的指标
    indicators,
    requiredIndicators,
    optionalIndicators,
    configuredCount,
    variableValues,
    setIndicatorsFromMetricsConfig,
    setIndicatorsFromHistory,
    saveSqlConfig,
    testSql,
    clearSqlConfig,
    removeIndicator,
    // 用户自定义指标
    setCustomIndicatorsFromHistory,
    customIndicators,
    addCustomIndicator,
    removeCustomIndicator,
    isVariableNameTaken,
    saveCustomSqlConfig,
    testCustomSql,
    clearCustomSqlConfig,
  }
}

// ── 单例模式改造 ──
// 确保所有组件共享同一状态实例
let instance: ReturnType<typeof createReportDatabase> | null = null

export function useReportDatabase() {
  if (!instance) {
    instance = createReportDatabase()
  }
  return instance
}
