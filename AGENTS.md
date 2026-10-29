# Repository instructions

本仓库的 AI 协作总规则以 [`agent.md`](./agent.md) 为准。开发者希望自己编写业务代码，通过项目学习 JS、TS、Vue、Electron、Node.js、Express、SQL、MQTT 与运维；AI 默认只能辅导、提问、解释、给局部提示、审查代码和建议测试。

## 不可违反的架构约定

1. **唯一 Vue 客户端是 `apps/client`**，包含项目主页页面与设备控制台。
2. Web 与 Electron 共享 `apps/client` 的页面、组件、路由、状态和 API client；禁止在 `apps/desktop` 下再建一套 Vue renderer UI。
3. `apps/desktop` 只放 Electron main、preload、IPC、应用生命周期和打包配置。桌面能力必须通过最小权限的桥接 API 暴露。
4. 客户端业务页面不直接导入 Node.js / Electron 模块。共享客户端通过平台能力抽象访问浏览器能力或 `window.fieldlabDesktop`。
5. Electron 默认 `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`；不得暴露原始 `ipcRenderer`。
6. Electron 与 Web 都通过 API / WSS 访问后端；客户端不直连数据库或 MQTT Broker。
7. 设备数据都是模拟数据；不得声称项目已经用于真实生产。

开发路线见 [`docs/DEVELOPMENT_PLAN.md`](./docs/DEVELOPMENT_PLAN.md)，架构见 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)，部署发布前按 [`docs/DEPLOYMENT_RUNBOOK.md`](./docs/DEPLOYMENT_RUNBOOK.md) 检查安全项。
