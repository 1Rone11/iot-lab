# 系统架构与技术契约

## 1. 核心决策

本项目采用**一套 Vue 3 + TypeScript 客户端、两种运行目标、一个云端 API**：

- `apps/client` 是唯一 Vue 应用，包含项目主页与设备控制台。
- Web 通过 Vite 构建为静态资源，由 Nginx 托管。
- Electron 加载同一客户端构建产物。`apps/desktop` 只包含 Electron main、preload、IPC、安全配置、应用生命周期与打包配置，不包含第二套 Vue 页面。
- 运行目标的差异通过运行时配置和平台适配层处理，不允许在各个 Vue 组件里散落 `isElectron` 分支。
- 所有设备数据由模拟器产生；不接真实工厂、不控制真实设备。
- 后端是模块化单体；当前不拆微服务。
- PostgreSQL 和 Mosquitto 只在内部网络中可访问，不直接对公网开放。
- Web 与 Electron 均通过 REST API 和 WebSocket / WSS 与服务端交互；客户端不直连数据库或 MQTT Broker。

详细的架构取舍见 [`ADR/0001-shared-vue-client.md`](./ADR/0001-shared-vue-client.md)。

## 2. 逻辑架构

```text
┌──────────────────────────────────────────────────────────┐
│                    apps/client                            │
│     唯一 Vue 3 + TypeScript 应用 / ECharts / Router       │
│       项目主页 + 设备控制台 + API client + 平台适配       │
└────────────────┬─────────────────────────┬───────────────┘
                 │ Web target              │ Electron target
                 ▼                         ▼
       ┌──────────────────┐      ┌──────────────────────────┐
       │ Nginx 静态托管   │      │ Electron BrowserWindow   │
       │ 浏览器运行       │      │ main + preload + IPC     │
       └────────┬─────────┘      └────────────┬─────────────┘
                │ HTTPS / WSS                 │ HTTPS / WSS
                └──────────────┬──────────────┘
                               ▼
                 ┌───────────────────────────┐
                 │ apps/api                  │
                 │ Node.js + Express         │
                 │ REST / auth / validation  │
                 │ WebSocket / MQTT consumer │
                 └────────┬─────────┬────────┘
                          │         │
                     SQL  │         │ MQTT subscribe
                          ▼         ▼
                 ┌─────────────┐  ┌────────────┐
                 │ PostgreSQL  │  │ Mosquitto  │
                 │ private net │  │ private net│
                 └─────────────┘  └─────▲──────┘
                                        │ publish
                                ┌───────┴─────────┐
                                │ device-simulator│
                                │ Node.js / JS    │
                                └─────────────────┘
```

Electron 主进程不能直接绕过 API 访问数据库。preload 仅提供客户端确实需要的桌面能力，例如原生通知、应用版本和受控文件导出。

## 3. 技术栈基线

| 层 | 技术 | 约束 / 用途 |
|---|---|---|
| 唯一共享客户端 | Vue 3、TypeScript、Vite、Vue Router、ECharts | 项目主页和设备控制台；只写一套 UI |
| Web 目标 | Nginx 静态资源、HTTPS | 同源访问 REST / WSS |
| Electron 壳 | Electron、TypeScript、electron-builder | main / preload / IPC / 系统能力 / 打包；不复制 Vue UI |
| 平台桥接 | 自定义窄接口 + `window.fieldlabDesktop` 类型声明 | 浏览器 fallback 与桌面能力隔离 |
| API | Node.js LTS、Express 5、TypeScript | 模块化单体、REST、WebSocket、MQTT consumer |
| Shared contracts | TypeScript 类型与运行时 schema | DTO、设备消息、告警状态；外部数据必须 runtime validate |
| Simulator | Node.js ESM；第一阶段以 JavaScript 编写 | 专门练习 JS 核心语义 |
| Messaging | Eclipse Mosquitto、MQTT.js | 内部网络、Topic 与 payload 契约 |
| Database | PostgreSQL | SQL、迁移、约束、索引、备份恢复 |
| Infra | Docker Compose、Nginx、HTTPS | 适配 2 GiB 轻量服务器 |
| Tests | 与初始化版本兼容的测试工具 | 单元、API 集成、共享客户端和 Electron 冒烟测试 |
| AI extension | 云端模型 API + 文档检索 | 可选增强，不依赖服务器本地模型 |

安装时选择官方兼容的稳定版本并提交 lockfile。不要仅依赖 `latest` 作为生产版本约束。

## 4. 目录建议

```text
fieldlab-iot/
├── apps/
│   ├── client/                    # 唯一 Vue app：Portfolio + Console
│   │   └── src/
│   │       ├── pages/              # Portfolio、Dashboard、Device、Alerts
│   │       ├── components/         # 复用 UI 组件
│   │       ├── router/             # 共享路由
│   │       ├── services/           # REST / WebSocket client
│   │       ├── platform/           # 浏览器/桌面能力适配
│   │       └── types/              # window.fieldlabDesktop 类型声明
│   ├── desktop/                    # main/preload/IPC/打包配置；没有第二套 Vue 页面
│   │   └── src/
│   │       ├── main/
│   │       └── preload/
│   ├── api/                        # Express、REST、WebSocket、MQTT consumer
│   └── device-simulator/           # JS 优先的模拟设备
├── packages/
│   └── contracts/                  # 共用 DTO / 类型 / schema
├── database/
│   ├── migrations/
│   └── seeds/
├── infra/
│   ├── compose/
│   ├── mosquitto/
│   └── nginx/
├── docs/
│   ├── ADR/
│   └── ...
├── pnpm-workspace.yaml
├── .env.example
├── AGENTS.md
└── agent.md
```

路径只是建议，具体脚本、Vite 构建与 Electron 打包流程在 Sprint 0 经由最小实验确定。关键约束不是工具名字，而是 Vue UI 的唯一来源。

## 5. 两种运行目标如何共用客户端

### 5.1 Web

- `apps/client` 构建成静态资源，由 Nginx 提供。
- 页面请求使用同源 `/api`，实时连接使用同源 WebSocket / WSS 路径。
- 浏览器平台适配实现浏览器通知或下载，并允许部分桌面功能不可用。

### 5.2 Electron

- Electron 主进程启动 `BrowserWindow` 并加载客户端构建产物；开发期间可以加载本地 Vite dev server。
- `apps/desktop` 只包含 main、preload、IPC、安全设置和打包配置。
- preload 通过 `contextBridge` 暴露精简接口，例如 `getRuntimeConfig`、`notifyAlert`、`exportCsv`、`getAppVersion`。不暴露任意 IPC 通道或原始 `ipcRenderer`。
- Electron 本地页面不能默认依赖相对 `/api` 路径。桌面端通过 preload 提供公开的 API base URL（例如 `https://example.com`）；该地址不是密钥。Web 则使用同源路径。
- 页面只调用 `platform` 抽象，不直接 import Electron API。
- Electron 默认 `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`，且限制导航、弹窗、外链和 IPC 参数。

### 5.3 路由

初期采用 hash router，降低 Web 静态托管与 Electron `file://` 路由的差异：Web 根页面展示项目主页，控制台通过客户端路由访问；Electron 默认打开控制台路由。SEO 不属于 MVP 目标。将来如需搜索引擎优化，再单独评估 history router 和服务器 fallback。

## 6. 核心数据流

1. Simulator 生成 payload，包含设备 ID、唯一消息 ID、设备报告时间与测点数据。
2. Simulator 将数据发布到 `fieldlab/v1/devices/{deviceId}/telemetry`。
3. API MQTT consumer 校验 Topic 与 payload 的设备 ID 一致性，并进行运行时 schema 校验。
4. consumer 更新设备最近上报时间并保存测点；数据库唯一约束协助去重。
5. 告警规则判断是否创建、更新或恢复告警；同一持续异常不得每个采样周期都产生重复告警。
6. API 通过 WebSocket 广播前端需要的精简事件。
7. 共享 Vue 客户端更新 UI。断线重连后先通过 REST 获取最新快照，再接收实时事件。
8. Electron 的桌面通知由客户端检测新告警后调用白名单桥接方法触发；浏览器端使用浏览器通知或仅显示站内告警。

## 7. MQTT 契约

### 7.1 Topic

- Telemetry：`fieldlab/v1/devices/{deviceId}/telemetry`
- Availability：`fieldlab/v1/devices/{deviceId}/availability`
- Event：`fieldlab/v1/devices/{deviceId}/events`

### 7.2 Payload 示例

```json
{
  "messageId": "sim-001-000042",
  "deviceId": "sim-001",
  "reportedAt": "2026-10-29T04:00:00.000Z",
  "metrics": [
    { "name": "temperature", "value": 42.7, "unit": "C" },
    { "name": "pressure", "value": 1.2, "unit": "bar" }
  ],
  "status": "running"
}
```

该消息仅用于模拟环境。真实设备接入需要另行设计身份认证、TLS、权限、密钥轮换与审计。

### 7.3 消息处理规则

- 限制 payload 大小；拒绝非法 JSON、未知测点名、NaN / Infinity 和不合理时间。
- 用 `(device_id, message_id, metric_name)` 或 ingestion 表实现持久化层去重。
- 同时保存 `reported_at` 与 `received_at`。
- 重连后恢复订阅；Broker 连接状态不等于设备在线状态。
- QoS 不等于业务 exactly-once；需要应用层幂等和数据库约束。

## 8. 数据模型建议

### devices

- `id`：内部主键 / UUID。
- `device_key`：模拟设备唯一标识，唯一索引。
- `name`、`device_type`、`location_label`。
- `status`：`online | offline | alarm | unknown`。
- `last_seen_at`、`created_at`、`updated_at`。

### measurements

- `id`、`device_id`、`message_id`、`metric_name`、`value_numeric`、`unit`。
- `reported_at`、`received_at`。
- 唯一约束建议：`(device_id, message_id, metric_name)`。
- 候选索引：`(device_id, metric_name, reported_at DESC)`；最终用 `EXPLAIN ANALYZE` 验证。

### alerts / alert_events

- `alerts`：设备、测点、严重程度、阈值、当前值、状态、打开/确认/关闭时间。
- `alert_events`：告警 ID、事件类型、操作者、备注、创建时间。

### users / roles

第二阶段再加入。密码不得明文存储；服务端必须做认证和授权，不能只依赖前端隐藏按钮。

## 9. API 契约初版

统一错误响应：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request parameters are invalid",
    "requestId": "..."
  }
}
```

初始端点：

- `GET /health`：服务健康状态，不包含密钥或敏感配置。
- `GET /api/devices?cursor=&limit=`：分页设备列表。
- `GET /api/devices/:id`：设备详情。
- `GET /api/devices/:id/measurements?from=&to=&limit=`：历史测点，限制时间跨度与条数。
- `GET /api/alerts?status=&severity=&limit=`：告警列表。
- `PATCH /api/alerts/:id/acknowledge`：确认告警（需要写权限）。
- `PATCH /api/alerts/:id/resolve`：关闭告警（需要写权限）。
- WebSocket endpoint：由实现阶段写入 API 契约并通过测试固定。

Web 与 Electron 共用 API DTO 和错误格式，但 API base URL 根据客户端运行目标配置。写操作必须服务端授权。

## 10. 平台能力接口约定

共享 Vue 客户端定义高层能力，不直接访问系统 API。例如：

- 获取运行目标及公开运行配置。
- 显示告警通知。
- 导出 CSV（仅接受文件名建议和导出内容；Electron 主进程弹出保存对话框并校验内容）。
- 获取桌面应用版本（Web 返回不支持或版本信息）。

Web adapter 使用浏览器 API 或安全降级。Electron adapter 调用 `window.fieldlabDesktop`。IPC 不允许任意路径写入、任意 shell 命令或通用文件系统访问。

## 11. 服务器约束

服务器：Ubuntu 22.04 64 位、2 vCPU、2 GiB RAM、40 GiB ESSD Entry。

- 服务器运行 Nginx、轻量 API、PostgreSQL、Mosquitto 与小规模模拟数据；Electron 应用不在服务器运行。
- 前端和桌面端优先在本地构建，避免服务器进行重型打包。
- PostgreSQL / MQTT 不映射公网端口；外部仅开放必要的 HTTPS，SSH 限制来源。
- 不在服务器运行本地大模型；限制日志、连接池与数据保留期。
- 公开演示数据必须明确标注为模拟数据。
