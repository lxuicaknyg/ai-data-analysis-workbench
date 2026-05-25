# GraphRAG 知识检索 Demo

基于知识图谱的智能检索演示，支持内存图谱和真实Neo4j图数据库两种模式。

## 📁 项目结构

```
src/
├── graphInterface.js      # 图谱接口抽象层
├── knowledgeGraph.js      # 内存图谱实现
├── neo4jAdapter.js        # Neo4j图谱实现
├── knowledgeExtractor.js  # 知识提取器（实体/关系提取）
├── dataFusion.js          # 数据融合器（报告融合）
└── testData.js            # 测试数据
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 运行 Demo

#### 模式一：内存图谱（默认）

无需安装数据库，直接运行：

```bash
npm start
```

#### 模式二：Neo4j图数据库

需要先安装并启动Neo4j：

```bash
# 设置环境变量（可选，使用默认配置可跳过）
set NEO4J_HOST=localhost
set NEO4J_PORT=7687
set NEO4J_USER=neo4j
set NEO4J_PASSWORD=password

# 运行Neo4j模式
node run-neo4j.js
```

或使用环境变量方式：

```bash
USE_NEO4J=true npm start
```

## 🔧 Neo4j配置

### 安装Neo4j

1. 下载：https://neo4j.com/download/
2. 安装并启动服务：
   - Windows: `neo4j.bat start`
   - Linux/Mac: `neo4j start`
3. 默认配置：
   - 主机: localhost:7687
   - 用户名: neo4j
   - 密码: password（首次登录需修改）
4. 访问管理界面: http://localhost:7474

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| NEO4J_HOST | localhost | Neo4j主机地址 |
| NEO4J_PORT | 7687 | Neo4j端口 |
| NEO4J_USER | neo4j | 用户名 |
| NEO4J_PASSWORD | password | 密码 |
| NEO4J_DB | neo4j | 数据库名称 |
| USE_NEO4J | false | 是否使用Neo4j |

## 📊 功能特性

### 1. 知识提取
- 实体提取（业务指标、客户类型、区域、风险类型、业务类型）
- 关系提取（业务包含、服务客户、风险关联等）
- 数值提取（金额、百分比等）

### 2. 图谱构建
- 增量融合多份报告
- 自动去重实体
- 建立实体关系

### 3. 知识检索
- 路径分析（BFS算法）
- 相关知识检索
- 子图查询

### 4. 双模式支持
- **内存模式**：适合开发测试，无需数据库
- **Neo4j模式**：生产环境，支持大规模数据

## 🧠 实体类型

| 类型 | 说明 | 示例 |
|------|------|------|
| business_metric | 业务指标 | 贷款余额、客户数、增长率 |
| customer_type | 客户类型 | 小微企业、大型企业、制造业客户 |
| region | 区域 | 长三角、珠三角、中西部 |
| risk_type | 风险类型 | 信用风险、市场风险、操作风险 |
| business_type | 业务类型 | 普惠金融、对公业务、零售业务 |

## 🔗 关系类型

| 类型 | 说明 | 示例 |
|------|------|------|
| has_metric | 包含指标 | 普惠金融 → 贷款余额 |
| serve | 服务客户 | 普惠金融 → 小微企业 |
| has_risk | 存在风险 | 普惠金融 → 信用风险 |
| distribute_in | 分布区域 | 贷款余额 → 长三角 |
| belong_to | 属于 | 小微企业 → 普惠金融 |

## 📝 示例输出

```
=== 图谱统计 ===
总节点数: 19
总边数: 5
节点类型分布: { business_metric: 6, customer_type: 5, region: 3, risk_type: 3, business_type: 2 }
关系类型分布: { has_risk: 2, serve: 1, has_business: 1, relate_to: 1 }

=== 路径分析 ===
路径分析: 普惠金融 -> 信用风险
  找到路径:
    普惠金融 -> 信用风险
```

## 🔄 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    DataFusion (数据融合器)               │
└─────────────────────────────┬───────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  GraphInterface (接口抽象层)             │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  MemoryGraph     │  │   Neo4jGraph     │            │
│  │  (内存图谱)       │  │   (Neo4j图数据库) │            │
│  └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

## 📌 设计模式

- **策略模式**：通过统一接口切换不同图谱实现
- **抽象工厂**：GraphInterface定义标准接口
- **依赖注入**：DataFusion依赖抽象接口而非具体实现

## 📄 许可证

MIT License
