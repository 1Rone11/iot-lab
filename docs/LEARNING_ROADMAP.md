# 按项目学习路线：从输入式学习转向输出式学习

## 1. 学习规则

你不是从零开始学编程。你需要重新梳理 JavaScript、补强 TypeScript / Node / SQL / 部署，再通过共享 Vue 客户端和 Electron 壳建立完整的工程经验。

每次学习 60–90 分钟建议：

- 10 分钟：不看笔记回忆上次原理。
- 15 分钟：只读当前阻塞点相关的官方文档。
- 30–45 分钟：自己实现一个小功能或修复问题。
- 10 分钟：测试正常、异常和边界路径。
- 10 分钟：写学习记录并口头解释。

避免连续看完教程才开始写代码，避免复制整份 AI 答案，避免只记 API 而不做实验。

## 2. JavaScript：通过设备模拟器练核心语义

| 主题 | 项目任务 | 验收 / 输出 |
|---|---|---|
| 原始值、引用、复制 | 创建和修改设备 payload | 解释浅拷贝、深拷贝和共享引用 |
| 作用域、闭包 | 设备模拟工厂和阈值函数 | 解释闭包变量与生命周期 |
| `this`、原型链、类 | 设计简单设备实体 | 解释原型委托与方法查找 |
| Promise / async | 网络上报、重试与超时 | 解释异常传播、并发和串行 |
| 事件循环 | 定时上报与异步日志实验 | 能预测同步代码、Promise 与定时器顺序 |
| ESM | 拆分模拟器模块 | 解释导入导出和模块边界 |
| `EventEmitter` | 模拟设备状态事件 | 识别监听器泄漏与清理方法 |
| 定时器资源清理 | 开始 / 停止模拟设备 | 重复启停不会创建多个计时器 |
| JSON 和时间 | 处理设备时间与接收时间 | 拒绝无效时间，区分设备报告时间和服务端接收时间 |
| 错误处理 | 模拟网络断开、配置错误 | 错误可定位，不以静默 catch 隐藏问题 |

每个主题写短记录：最小例子、观察到的输出、原先误解、项目中的使用位置和一个面试追问。

## 3. TypeScript：从类型保护到跨边界契约

学习顺序：基础类型 → 联合类型 → 类型收窄与守卫 → 泛型 → strict 配置 → Vue props / emits / composable 类型 → API DTO 和 MQTT payload → 共享 contracts → 运行时 schema 校验。

项目输出：

- 定义 `DeviceStatus`、`MetricName`、`AlertStatus` 等领域类型。
- 定义 API DTO、MQTT payload 和平台能力接口。
- 记录至少 3 次 TS 捕获问题的案例，以及 1 次类型设计过度复杂的反例。
- 理解 `as SomeType` 不会验证外部 JSON。

## 4. Vue 3：实现唯一共享客户端

学习主题：Composition API、组件边界、props/emits、路由、状态管理、请求状态、图表生命周期、WebSocket、可访问性和错误反馈。

项目任务：

1. `apps/client` 中建立作品集首页和设备控制台，不为 Electron 再复制页面。
2. 将设备列表、设备详情、告警和趋势图拆为职责清晰的页面与组件。
3. API client 统一处理 base URL、超时、错误格式与响应类型。
4. 通过平台适配层处理浏览器和 Electron 差异，Vue 页面不直接判断和调用 Electron API。
5. 对页面挂载/卸载、断网恢复、空结果、异常响应和图表销毁进行验证。

学习输出：一张组件 / 数据流图、一份 API 状态处理说明、一份平台适配设计记录。

## 5. Node.js / Express：把服务端从能跑做到可维护

学习顺序：运行时与事件循环、Promise、模块、文件与流、环境变量、HTTP、Express 路由、中间件、错误处理、请求校验、服务层边界、数据库连接池、日志、请求 ID、健康检查、限流、认证、授权和优雅退出。

项目输出：

- `GET /health`、设备列表、设备历史和告警 API。
- API 请求 / 响应示例与错误码表。
- 服务异常、数据库不可用和非法参数测试。
- 一篇说明：一次 API 请求如何经过路由、业务层、数据层并返回响应。

## 6. SQL / PostgreSQL：以真实查询为中心

学习顺序：表与约束、条件查询和分页、JOIN、聚合、事务、索引、`EXPLAIN ANALYZE`、迁移、备份恢复、数据保留和连接池。

最低数据模型：`devices`、`measurements`、`alerts`、`alert_events`；需要写权限时再加 `users` / `roles`。

必做实验：

- 查询某设备最近 100 条测点。
- 查询时间范围内温度最大值、平均值和最小值。
- 查询每台设备最近上报时间。
- 查询未关闭的高等级告警。
- 使用 `EXPLAIN ANALYZE` 观察加索引前后查询计划。
- 用唯一约束验证重复消息不会重复落库。

## 7. MQTT / WebSocket：理解消息生命周期

学习 Broker / client、Topic、QoS、retain、Last Will、keepalive、客户端 ID、重连、运行时校验、幂等和持久化。

Topic：

- `fieldlab/v1/devices/{deviceId}/telemetry`
- `fieldlab/v1/devices/{deviceId}/events`
- `fieldlab/v1/devices/{deviceId}/availability`

实验：重复发布同一个 `messageId`、停止并恢复 Broker、杀掉模拟器、发非法 JSON 和数值越界。不要把 MQTT QoS 当作业务 exactly-once。

WebSocket 用于状态推送，不作为历史消息存储。客户端断线后重新建立连接，并通过 REST 重新拉取状态快照。

## 8. Electron：让同一 Vue 界面拥有桌面能力

### 8.1 架构目标

- `apps/client` 继续是唯一 Vue 渲染界面。
- `apps/desktop` 只负责 main、preload、IPC、应用生命周期、安全配置和打包。
- 开发模式下 Electron 可以加载共享客户端的 Vite dev server；打包模式下加载共享客户端构建产物。
- 不在 `apps/desktop` 内另建一套设备列表、告警或图表 UI。

### 8.2 学习顺序

1. Electron 主进程与渲染进程的区别和应用生命周期。
2. `BrowserWindow` 加载共享客户端：开发 URL 与生产静态资源的区别。
3. preload 与 `contextBridge`：只暴露精简的命名能力，不暴露原始 IPC。
4. `ipcMain.handle` / `ipcRenderer.invoke` 的调用路径、错误传递和参数校验。
5. `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`、CSP、导航与外链限制。
6. 应用版本与桌面系统通知。
7. 通过保存对话框导出 CSV，理解主进程文件操作与渲染进程权限边界。
8. 打包、安装、启动、卸载及升级前的版本检查；自动更新不是 MVP 要求。

### 8.3 平台适配层

共享 Vue 客户端只调用自己定义的能力接口。Web 端使用浏览器通知、下载等能力或给出明确降级；Electron 端通过 `window.fieldlabDesktop` 调用白名单桥接方法。

API 地址也是运行配置的一部分：Web 使用同源 `/api`；Electron 通过 preload 提供公开的远程 API base URL。不能把 API secret 或数据库凭据放进客户端。

### 8.4 必做测试

- 浏览器中不存在桌面桥接对象时，页面仍能运行。
- IPC 输入非法、文件名异常、文件保存取消和写入失败都能安全处理。
- 远程页面不能通过 IPC 任意访问磁盘或执行系统命令。
- Web 与 Electron 的核心设备列表、趋势和告警行为一致。

## 9. Docker / Ubuntu / Nginx / 运维

学习容器、volume、bridge network、环境变量、健康检查、日志、Nginx 反向代理、HTTPS、进程与磁盘排障、备份恢复。

必做实验：重启服务、停止数据库观察错误处理、查看日志、备份并恢复测试数据库、检查 CPU / 内存 / 磁盘、验证公网无法访问 PostgreSQL 和未保护的 MQTT 端口。

Electron 不部署为服务器常驻服务。桌面安装包在本地或 CI 构建，作品集提供发布下载入口；服务器只运行 Web 静态资源、API、数据库、Broker 和受控的模拟器。

## 10. AI 故障助手：最后做

核心链路、权限与部署稳定后再学习 RAG、引用、结构化输出、只读工具调用和评测。AI 不执行设备控制，不暴露任意 SQL 执行接口。先实现基于手册的故障码查询，再考虑只读的历史数据工具。

## 11. 每周复盘问题

- 本周实现了哪个可运行功能？
- 我遇到最难的两个错误是什么，如何定位？
- 我能不看笔记解释哪些原理？
- 哪个测试暴露了设计问题？
- IDE 补全帮助了哪些代码？我能独立修改和解释吗？
- 如果功能涉及客户端平台差异，Web 和 Electron 是否都验证过？
- 哪个设计决定能作为面试案例？

## 12. 给 AI 导师的任务模板

> 我正在完成 FieldLab IoT 的【任务名称】。请先检查我的需求、数据流或伪代码，不要直接实现。请提出 3–5 个关键问题，指出要学习的概念，给出官方文档链接，列出正常、异常和边界测试。只有我贴出自己写的代码后，才进行代码审查。不要为 Electron 另建第二套 Vue UI，也不要替我生成整块实现。
