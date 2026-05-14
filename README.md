# AI数据分析工作台

AI数据分析工作台是一个面向数据分析、经营分析和智能报告生成的多端应用。项目基于 Vue 3、TypeScript、Vite、Electron 和 pnpm workspace 构建，当前重点提供智能报告工作区、数据源配置、指标 SQL 管理、模型配置、历史记录与数据导入导出能力。

## 快速开始

环境要求：

- Node.js 22.x
- pnpm 10.x

安装依赖：

```bash
pnpm install
```

启动 Web 应用：

```bash
pnpm dev
```

启动桌面应用：

```bash
pnpm dev:desktop
```

构建全部包：

```bash
pnpm build
```

运行测试：

```bash
pnpm test
```

## 项目结构

- `packages/core`：核心服务、模型适配、模板和通用逻辑。
- `packages/ui`：Vue 3 组件库和主要业务界面。
- `packages/web`：Web 入口应用。
- `packages/desktop`：Electron 桌面应用。
- `packages/extension`：浏览器扩展。
- `packages/mcp-server`：MCP 服务端。
- `api`：Vercel serverless API。
- `docs`、`mkdocs`：项目文档。
- `scripts`：构建、测试和辅助脚本。

## 使用手册

完整使用和协作说明见 [USER_MANUAL.md](USER_MANUAL.md)。

## 多人协作约定

- 使用 `pnpm`，不要提交 `package-lock.json` 或 `yarn.lock`。
- 开发前从主分支拉取最新代码，并基于功能创建分支。
- 提交信息遵循 Conventional Commits，例如 `feat(report): add datasource panel`。
- 提交前至少运行与改动相关的测试；较大改动建议运行 `pnpm test`。
- 不提交 `.env.local`、构建产物、临时目录、日志、密钥和本地缓存。

## 许可证

本项目基于 AGPL-3.0-only 许可证。
