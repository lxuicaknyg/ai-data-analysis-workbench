/**
 * 智能报告模式 — 数据库接入 & 指标SQL管理 类型定义
 *
 * 数据流：
 * 1. 后端 /api/optimize 返回 optimized_prompt（含 {{variable_name}}）+ metrics_config
 * 2. 前端用 metrics_config 动态填充指标列表
 * 3. 用户为每个指标配置 SQL 并试运行，得到数值结果
 * 4. 前端将 {{variable_name}} 替换为对应 SQL 结果，渲染最终 Prompt
 */

// ────────────────────────────────────────────
// 数据源配置
// ────────────────────────────────────────────

export type DbType = 'mysql' | 'gaussdb'

export const DB_TYPE_LABELS: Record<DbType, string> = {
  mysql: 'MySQL',
  gaussdb: 'GaussDB',
}

export const DB_DEFAULT_PORTS: Record<DbType, string> = {
  mysql: '3306',
  gaussdb: '8000',
}

export type DataSourceStatus = 'unconfigured' | 'connected' | 'error'

export interface DataSourceConfig {
  id: string
  name: string
  type: DbType
  host: string
  port: string
  database: string
  username: string
  password: string
  status: DataSourceStatus
  lastTestedAt?: string
  savedAt?: string
  testError?: string
}

export const DEFAULT_DATASOURCE: DataSourceConfig = {
  id: 'default',
  name: '默认数据源',
  type: 'mysql',
  host: '',
  port: '3306',
  database: '',
  username: '',
  password: '',
  status: 'unconfigured',
}

// ────────────────────────────────────────────
// 后端 metrics_config 返回结构（对齐 /api/optimize）
// ────────────────────────────────────────────

export interface MetricConfigFromApi {
  name: string
  variable_name: string
  unit: string
  type: 'required' | 'optional'
  description: string
}

// ────────────────────────────────────────────
// 前端指标 & SQL 配置
// ────────────────────────────────────────────

export type SqlTestStatus = 'untested' | 'testing' | 'success' | 'error'

export interface SqlConfig {
  sql: string
  /** 当前 SQL 绑定的数据源 id */
  dataSourceId?: string
  /** 对查询语句的描述 */
  description: string
  testStatus: SqlTestStatus
  /** 试运行返回的结果字符串（第一行第一列）— 用于替换 prompt 中的 {{variable_name}} */
  testResult?: string
  testError?: string
  /** 查询返回的列名 */
  testColumns?: string[]
  /** 查询结果前 5 行（2D 字符串数组，避免撑爆 localStorage） */
  testRows?: string[][]
  /** 查询实际返回的总行数（截取前的完整行数） */
  testRowCount?: number
  /** 查询执行耗时（毫秒） */
  executeTimeMs?: number
  savedAt?: string
}

export interface Indicator {
  /** 稳定标识，使用 variable_name 作为 id */
  id: string
  /** 中文名称，如"规模余额" */
  name: string
  /** 模板变量名（不含花括号），如"loan_balance"，对应 prompt 中的 {{loan_balance}} */
  variable: string
  /** 单位说明 */
  unit: string
  /** true = 必填指标，false = 可选指标 */
  required: boolean
  /** 后端返回的指标定义说明，辅助用户编写 SQL */
  description: string
  /** null 表示尚未配置 SQL */
  sqlConfig: SqlConfig | null
}

// ────────────────────────────────────────────
// 用户自定义指标
// ────────────────────────────────────────────

/**
 * 用户在右侧面板手动新增的指标
 * 与 AI 返回的 Indicator 结构相同，但来源不同，单独存储
 */
export interface CustomIndicator {
  /** 稳定唯一标识（创建时生成的 UUID） */
  id: string
  /** 用户填写的中文名称，如"不良贷款率" */
  name: string
  /** 用户填写的变量名（英文/下划线），对应 prompt 中的 {{variable}} */
  variable: string
  /** 单位说明，如"%" */
  unit: string
  /** 用户填写的指标说明（可选） */
  description: string
  /** null 表示尚未配置 SQL */
  sqlConfig: SqlConfig | null
}

/** 生成简单 UUID（用于自定义指标 id） */
export function generateId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * 将变量名候选文本规范化为合法变量名
 * 中文/空格 → 去掉；大写 → 小写；连续非法字符 → 单个下划线
 * 例：" 不良 贷款率 " → "npl_ratio" 需用户手动填写，这里只做格式清洗
 */
export function sanitizeVariableName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// ────────────────────────────────────────────
// 工具函数
// ────────────────────────────────────────────

/** 将后端 metrics_config 转换为前端 Indicator */
export function indicatorFromMetric(m: MetricConfigFromApi): Indicator {
  return {
    id: m.variable_name,
    name: m.name,
    variable: m.variable_name,
    unit: m.unit,
    required: m.type === 'required',
    description: m.description,
    sqlConfig: null,
  }
}
