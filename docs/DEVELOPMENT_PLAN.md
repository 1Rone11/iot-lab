# 开发路线图与里程碑

> 按 Sprint 推进，每个 Sprint 聚焦一个可验证的交付物。范围外的增强项（AI 助手等）不阻塞核心链路。

## 1. 开发原则

1. **共享 UI，不重复开发**：`apps/client` 是唯一 Vue 应用；Web 与 Electron 共享页面和核心业务逻辑。
2. **先闭环，再完善**：设备数据能进入数据库并在控制台展示，是第一优先级。
3. **先本地，再上云**：本地流程稳定后再配置公网部署。
4. **先可靠性，后 AI**：消息幂等、权限、日志、测试和备份优先于 AI 对话功能。
5. **桌面能力必须真实**：Electron 不只是开网页，要理解 main/preload/IPC，并实现至少两项桌面能力。
6. **每个 Sprint 输出证据**：代码提交、测试、截图/演示、文档和学习复盘都要留下。

## 2. 里程碑

| Sprint | 里程碑 | 核心交付物 | 通过标准 |
|---|---|---|---|
| Sprint 0 | 环境准备和架构确认 | 仓库、文档、工具版本记录、任务看板 | 明确唯一 `apps/client` 与 Electron 壳边界 |
| Sprint 1 | 共享客户端骨架 | Vue app、项目主页占位页、控制台占位页、API health | Web 本地启动，页面可以读取 API 状态 |
| Sprint 2 | Express + SQL | 设备表、迁移、设备 API、测试 | API 正常与错误路径有验证 |
| Sprint 3 | MQTT 接入 | 模拟器、Broker、消息入库 | 去重、非法消息与断线恢复可验证 |
| Sprint 4 | 共享客户端监控 MVP | 设备列表、实时指标、历史趋势 | 实时数据与 REST 快照可恢复 |
| Sprint 5 | 告警与可靠性 | 告警状态、操作记录、日志和测试 | 状态机与核心错误路径有测试 |
| Sprint 6 | Electron 壳与桥接 | 同一客户端加载、preload、IPC、桌面能力 | 没有复制 UI，桌面通知 / 导出可用 |
| Sprint 7 | 部署与运维 | Docker Compose、Nginx、HTTPS、备份恢复 | 公网入口最小化且备份恢复演练通过 |
| Sprint 8 | 项目主页与 CI | 项目介绍、截图/视频、CI 检查 | 访问者可在线访问并了解项目 |
| Sprint 9 | 可选 AI 与项目复盘 | RAG 小功能、评测集、ADR、讲解提纲 | AI 有引用和只读边界；核心项目可独立讲解 |

## 3. Sprint 0：准备环境

- [ ] 建立 Git 仓库并加入 README、PRD、架构、ADR、学习日志模板和 `agent.md`。
- [ ] 安装 Git、Node.js 官方 LTS、pnpm、Docker Desktop / Docker Engine 与数据库客户端。
- [ ] 记录工具版本，确认 SSH 连接方式；不要把密钥写进文档或仓库。
- [ ] 创建看板：Backlog / Ready / Doing / Verify / Done。
- [ ] 阅读 `docs/ADR/0001-shared-vue-client.md`，能解释为什么不维护两套 Vue UI。

学习重点：JS 模块、pnpm workspace、Git、环境变量和安全管理。

## 4. Sprint 1：唯一 Vue 客户端 + API 健康检查

- [ ] 初始化 `apps/client`、`apps/api`、`apps/device-simulator` 和 `packages/contracts`。
- [ ] 在 `apps/client` 中创建项目主页根页面和控制台路由；先用 hash router 降低 Web / `file://` 的路由差异。
- [ ] 让 Express 提供 `/health`；前端显示 loading、成功和失败状态。
- [ ] 在客户端设计平台能力抽象的接口边界，但此时只实现 Web adapter；不急着写完整 Electron 功能。
- [ ] 设备模拟器先用 JavaScript 生成命令行数据，练习 ESM、对象、数组、函数、错误、定时器与模块。
- [ ] 添加 `.env.example`、`.gitignore` 和本地启动说明。

交付：只有一套 Vue 页面源代码；本地 Web 客户端能读取 API health；第一篇学习日志。

## 5. Sprint 2：Node.js / Express / PostgreSQL

- [ ] 学路由、中间件、错误处理中间件与请求生命周期。
- [ ] 建立 PostgreSQL 迁移流程和本地开发数据库。
- [ ] 实现设备列表、详情和创建接口。
- [ ] 练 `SELECT`、`JOIN`、`GROUP BY`、`ORDER BY`、分页、约束、索引和事务。
- [ ] 加入外部输入运行时校验；TS 类型不能替代 JSON 校验。
- [ ] 测试正常、无数据、非法参数、未知设备和数据库不可用场景。

交付：ER 图、迁移脚本、API 契约、测试记录。

## 6. Sprint 3：MQTT 与数据入库

- [ ] 用 Docker Compose 运行 Mosquitto；Broker 只在内部网络可访问。
- [ ] 模拟 3–5 台设备，每 3–10 秒发布一条带 `messageId` 的数据。
- [ ] 后端订阅 Topic、校验 payload、更新最近上报时间并保存测点。
- [ ] 通过数据库唯一约束实现持久化幂等。
- [ ] 测试 Broker 重启、消息重复、非法 JSON、异常值与设备离线。

交付：Topic / payload 文档、消息样例、故障注入记录。

## 7. Sprint 4：同一 Vue 客户端实现监控 MVP

- [ ] 在共享 `apps/client` 中实现设备列表、详情和告警页面骨架。
- [ ] 用 ECharts 展示历史趋势，支持时间范围和分页。
- [ ] WebSocket 推送最新状态，断线后重新连接。
- [ ] 重连后通过 REST 拉取最新快照，不把 WebSocket 当历史消息队列。
- [ ] 处理页面卸载时的监听器、定时器和图表清理。
- [ ] 验证页面在浏览器运行时不依赖 Electron API。

交付：浏览器可演示的共享控制台、实时通信学习记录。

## 8. Sprint 5：告警、授权与测试

- [ ] 定义 `open -> acknowledged -> resolved` 告警状态机。
- [ ] 记录阈值、触发值、时间、处理备注和操作历史。
- [ ] 服务端为写操作做授权；演示用户保持只读。
- [ ] 为消息校验、告警状态转换、阈值判断与去重写单元测试。
- [ ] 使用测试数据库做 API / SQL 集成测试。

交付：告警流程图、测试报告、最小权限说明。

## 9. Sprint 6：Electron 壳，不复制 Vue UI

- [ ] 建立 `apps/desktop`，其中只放 main、preload、IPC、安全设置、生命周期和打包配置。
- [ ] Electron 开发时加载共享客户端的 Vite dev server；打包时加载 `apps/client` 的构建产物。
- [ ] 定义并实现最小 `window.fieldlabDesktop` 桥接 API，不暴露原始 `ipcRenderer`。
- [ ] 保持 `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`。
- [ ] 实现系统通知与受控 CSV 导出；应用版本或本地诊断日志作为额外功能。
- [ ] 桌面端通过 HTTPS / WSS 使用服务端；API base URL 来自公开运行配置，不包含密钥。
- [ ] 验证非法 IPC 参数、取消保存对话框、文件写入失败、外链和导航限制。

交付：桌面构建包或可运行版本；一份 IPC 安全自检记录；明确说明页面代码与 Web 共用。

## 10. Sprint 7：部署与运维

- [ ] 用 Docker Compose 部署 API、数据库、Broker 和小规模模拟器。
- [ ] Web 客户端本地构建，由 Nginx 提供静态资源；生产环境不运行 Vite dev server。
- [ ] 仅 Nginx 对外提供必要的 HTTP / HTTPS 入口；PostgreSQL 和 MQTT 不映射公网。
- [ ] 配置域名、HTTPS 与 WebSocket 反向代理；核实服务器地域对应的备案要求。
- [ ] 添加健康检查、日志轮转、保留期与资源检查。
- [ ] 完成 `pg_dump` 备份与恢复演练，并记录结果。
- [ ] Electron 安装包优先在开发机打包，通过项目主页下载链接或 Release 发布。

交付：部署手册、端口表、备份恢复记录和故障排查笔记。

## 11. Sprint 8：项目主页与 CI

- [ ] 共享客户端首页展示背景、产品目标、架构图、截图、已知限制和演示链接。
- [ ] 展示 Web 在线控制台；提供 Electron 安装包 / Release 链接（仅在确实成功构建后）。
- [ ] CI 运行 lint、类型检查、测试与构建。
- [ ] 公开演示使用模拟数据，写清楚数据来源和系统边界。
- [ ] 写 3 篇短技术输出：MQTT 幂等、Electron IPC 安全、SQL 索引 / 分页。

交付：可供公开访问的演示环境与说明。

## 12. Sprint 9：可选 AI 与项目复盘

- [ ] 准备模拟设备手册、故障码与维修 SOP。
- [ ] 先做检索，再做带引用回答；不开放任意 SQL 执行。
- [ ] 只允许 AI 调用只读工具，并设调用超时和成本限制。
- [ ] 准备至少 20 个评测问题，记录正确、缺证据、错误引用和拒答。
- [ ] 整理 ADR、部署复盘和 10 分钟项目讲解提纲。

交付：AI 演示、评测表、项目复盘。若时间紧张，可直接跳过 AI 阶段。

## 13. Definition of Done

任务只有同时满足以下条件才可标记 Done：

- [ ] 功能符合明确的验收条件。
- [ ] 正常、异常与边界路径已测试或记录手工验证方法。
- [ ] lint、类型检查、测试与构建按当前阶段要求通过。
- [ ] 没有提交密钥、临时日志、无关构建产物或敏感数据。
- [ ] 开发者能用自己的话解释关键逻辑与至少一种替代方案。
- [ ] 更新必要文档与学习日志。
- [ ] 如果影响 Web / Electron 共用行为，两种运行目标都验证或明确记录尚未覆盖的一方。

## 14. 范围裁剪原则

1. 优先保证 JS/TS、Vue、Node API、SQL、MQTT 数据链路和部署可讲清楚。
2. Electron 必须保留，但只完成最小、可信的安全桥接与两项桌面能力。
3. AI 是加分项；时间紧张时可推迟。
4. 不为赶进度复制粘贴无法解释的实现。
