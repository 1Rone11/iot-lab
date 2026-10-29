# FieldLab IoT：同一套 Vue 客户端的 Web + Electron 全栈项目

> ⚠️ **数据声明**：本项目所有设备、测点、告警数据均由本地设备模拟器生成，**不连接真实工厂、不控制真实设备、不含任何真实用户数据**。它用于技术验证与演示，请勿作为真实工业系统的参考实现或用于生产环境。

> 文档版本：v1.1  
> 更新日期：2026-10-29  
> 项目定位：工业设备监控场景的技术验证项目；全部设备数据为模拟数据  
> 开发原则：**业务代码由项目所有者亲自编写；AI 只负责解释、提问、提示、局部补全审查与测试建议。**

## 1. 项目是什么

FieldLab IoT 是一个模拟工业设备运行的技术验证项目。它不连接真实工厂、不控制真实设备，最终提供三种交付成果：

1. **项目主页**：项目介绍、系统架构、技术决策、演示视频、技术文章和源码链接。
2. **浏览器控制台**：设备列表、实时指标、历史趋势、告警和维修记录。
3. **Electron 桌面运维工作台**：复用浏览器控制台的 Vue 界面，并额外提供系统通知、受控文件导出和应用版本等桌面能力。

Web 和 Electron **不是两套独立前端**。二者共用 `apps/client` 中的同一套 Vue 3 + TypeScript 页面、路由、组件、状态和 API client。Electron 应用只额外维护主进程、preload、安全 IPC 与打包配置。

项目后端包含 Node.js / Express API、MQTT 消息消费、WebSocket 实时推送、PostgreSQL，以及用于生成模拟数据的设备模拟器。AI 故障助手是后置增强，不阻塞核心项目。

## 2. 核心架构决策

- `apps/client` 是唯一的 Vue 渲染应用，包含项目主页和设备控制台。
- Web 构建时由 Nginx 提供静态资源；Electron 构建时将同一客户端构建产物打包进桌面安装包。
- 允许不同运行目标使用不同的**运行时配置**，例如 Web 使用同源 `/api`，Electron 通过安全的桌面桥接配置远程 API 地址；这不意味着复制一套页面。
- `apps/desktop` 不创建第二份 Vue 页面，不维护重复的设备列表、图表或告警 UI。
- Vue 渲染层不直接导入 Node.js `fs`、`child_process`、数据库驱动或 Electron 模块。
- Electron 的原生能力通过 `contextBridge` 暴露最小化、类型化的 `window.fieldlabDesktop` API；不暴露原始 `ipcRenderer`。
- Electron 通过 HTTPS / WSS 访问服务端，不直连 PostgreSQL，不将 MQTT Broker 凭据打包到客户端。
- MQTT Broker 和 PostgreSQL 只在内部网络通信，不直接对公网开放。

## 3. 技术栈

| 层 | 选择 | 学习目标 |
|---|---|---|
| 共享客户端 | Vue 3、TypeScript、Vite、Vue Router、ECharts | 页面、组件、路由、状态、类型、实时可视化 |
| Electron 壳 | Electron、TypeScript、preload、IPC、electron-builder | 生命周期、进程边界、桌面能力、安全与打包 |
| 后端 | Node.js LTS、Express 5、TypeScript | HTTP、服务分层、校验、错误处理、日志 |
| 数据库 | PostgreSQL | SQL、约束、索引、事务、迁移、备份恢复 |
| 消息 | Mosquitto、MQTT.js、WebSocket | 设备消息接入、去重、重连、实时更新 |
| 模拟器 | Node.js ESM，前期以 JavaScript 编写 | JavaScript 核心语义、定时器、事件、异步、模块 |
| 部署 | Docker Compose、Nginx、HTTPS | 服务器、容器、反向代理、安全和排障 |
| 测试 | 依据项目工具链选择 Vitest、Node 测试工具与 API 集成测试 | 单元、集成、冒烟与回归 |
| AI 增强 | 云端模型 API + 文档检索 | 引用、评测、只读工具和成本控制 |

依赖版本在初始化项目时依据官方兼容说明选择，锁定到 lockfile。不要把不确定的 `latest` 当作生产版本策略。

## 4. 推荐仓库结构

```text
fieldlab-iot/
├── apps/
│   ├── client/                # 唯一 Vue 应用：项目主页 + 控制台，Web/Electron 共用
│   ├── desktop/               # 仅 Electron main、preload、IPC 与打包配置
│   ├── api/                   # Express API、WebSocket、MQTT consumer
│   └── device-simulator/      # JS 优先：设备模拟与 MQTT 发布
├── packages/
│   └── contracts/             # 共用领域类型、DTO、消息契约
├── database/
│   ├── migrations/
│   └── seeds/
├── infra/
│   ├── compose/
│   ├── mosquitto/
│   └── nginx/
├── docs/
│   ├── ADR/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT_PLAN.md
│   └── ...
├── .env.example
├── .gitignore
├── pnpm-workspace.yaml
├── AGENTS.md
└── agent.md
```

具体脚本和目录在 Sprint 0 由开发者亲自创建；不要为完全符合示例目录而过早抽象。

## 5. 文档导航

| 文件 | 用途 |
|---|---|
| `docs/PRD.md` | 产品目标、功能范围、需求和验收标准 |
| `docs/ARCHITECTURE.md` | 共享客户端、Electron 边界、数据流、数据模型、接口契约 |
| `docs/ADR/0001-shared-vue-client.md` | 为什么选择一套 Vue 客户端、两种运行目标 |
| `docs/DEVELOPMENT_PLAN.md` | Sprint 路线图、阶段任务与交付物 |
| `docs/LEARNING_ROADMAP.md` | JS、TS、Node、Express、SQL、MQTT、Electron 的项目式学习路线 |
| `docs/DEVELOPMENT_STANDARDS.md` | 编码、平台适配、测试、安全和提交规范 |
| `docs/DEPLOYMENT_RUNBOOK.md` | 阿里云 Ubuntu 22.04 / 2 vCPU / 2 GiB / 40 GiB 部署方案 |
| `docs/LEARNING_LOG_TEMPLATE.md` | 每个功能的学习与复盘模板 |
| `docs/OFFICIAL_REFERENCES.md` | 官方文档索引 |
| `docs/ENVIRONMENT.md` | 本机工具版本记录与 Git / SSH 配置说明 |
| `agent.md`、`AGENTS.md` | AI 导师约定和仓库规则入口 |

## 6. 本地开发

### 6.1 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Node.js | 22 LTS | 见 `.nvmrc`，进目录后 `nvm use` |
| pnpm | 10.x | 由 `package.json` 的 `packageManager` 锁定，`corepack enable` 即可 |
| Git | 2.40+ | 需要 `git init -b main` |
| Docker | 20.10+ | 本地跑 PostgreSQL 与 Mosquitto，不污染本机环境 |

本机实测版本记录见 [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md)。

### 6.2 首次拉取与安装

```bash
# 换一台机器时用 clone；本机已有目录则跳过这行
git clone git@github.com:1Rone11/fieldlab-iot.git
cd fieldlab-iot
nvm use
corepack enable
pnpm install
cp .env.example .env   # 再按本机情况改 .env，真实值不入库
```

### 6.3 当前进度

Sprint 0 只包含文档、仓库规则与工程配置，还没有可运行的应用。`apps/` 与 `packages/` 会在 Sprint 1 由 `pnpm create vue` 等命令逐个创建，届时本节会补上 `pnpm dev` 等脚本说明。

> 本地目录名与 GitHub 仓库名不同不影响使用。仓库名为 `fieldlab-iot`，与项目正式名称一致，便于检索。

## 7. 学习方法

每个任务按以下流程执行：

1. 阅读需求和验收条件。
2. 自己画数据流，写接口草稿或伪代码。
3. 只阅读当前任务所需的官方文档。
4. 自己编写代码；允许使用 IDE 行内补全，但不允许无理解地接受整段实现。
5. 主动验证正常、异常和边界场景。
6. 写学习日志：原理、取舍、问题、测试与技术讲解要点。
7. 能不看 AI 输出解释实现后才合并。

## 8. 第一项任务

阅读 `docs/PRD.md`、`docs/ARCHITECTURE.md` 和 `docs/ADR/0001-shared-vue-client.md`。接着执行 `docs/DEVELOPMENT_PLAN.md` 的 Sprint 0：初始化仓库、唯一的 `apps/client`、API 健康检查和本地开发说明。

第一周先把 Web 版本跑起来，并从设计上预留平台能力适配接口；不要在第一天就同时实现完整 Electron、MQTT、AI 和线上部署。
