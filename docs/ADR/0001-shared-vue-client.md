# ADR-0001：Web 与 Electron 共用一套 Vue 客户端

- 状态：Accepted（项目基线）
- 日期：2026-10-29
- 决策范围：前端代码组织、客户端运行目标和桌面能力边界

## 背景

项目既要提供可公开访问的项目站点和 Web 控制台，又要展示 Electron 桌面开发能力。完全独立开发两个前端会重复实现设备列表、图表、告警、状态管理和 API 调用，超出单人可维护的合理投入。

## 决策

使用一个唯一的 Vue 3 + TypeScript 客户端 `apps/client`。它包含项目主页和设备控制台，并输出两类运行目标：

1. Web：Vite 构建为静态资源，由 Nginx 提供。
2. Electron：加载同一客户端构建产物；Electron 只增加 main、preload、IPC、安全策略、应用生命周期和打包配置。

客户端通过平台能力抽象访问浏览器或桌面功能。Electron preload 只暴露白名单方法，例如通知、应用版本、受控文件导出与运行时 API 地址，不暴露 Node.js 任意能力。

## 运行时差异

- Web 使用同源 `/api` 和同源 WebSocket / WSS 路径。
- Electron 本地文件页面不能依赖相对 URL 访问云端 API，因此由受信任的 preload 配置提供 API base URL。该 URL 是公开服务地址，不是密钥。
- Web 使用浏览器通知/下载或降级行为；Electron 使用原生通知和系统保存对话框。
- 设备业务、数据校验、接口契约和核心页面行为保持共享。

## 路由决策

第一版使用 hash 路由，以降低同一静态 bundle 在 Web 和 `file://` Electron 场景下的路由差异。Web 项目主页以根路由呈现，控制台通过客户端路由访问；Electron 默认打开控制台路由。若未来明确需要 SEO，再单独评估 Web history 路由和服务器 fallback。

## 仓库边界

```text
apps/
├── client/       # 唯一 Vue 应用、router、pages、components、API client、platform adapter
├── desktop/      # Electron main、preload、IPC、生命周期、打包配置；没有独立 Vue UI
├── api/          # Express、REST、WebSocket、MQTT consumer
└── device-simulator/  # JavaScript 优先的设备数据生成器
packages/contracts/    # 共用类型和数据契约
```

## 考虑过的替代方案

### A. 纯 Electron

优点是聚焦桌面能力；缺点是访问者不容易即时体验，服务器也缺少浏览器演示入口，不符合项目公开展示目标。

### B. 两套完全独立的 Web 和 Electron 前端

优点是运行目标完全隔离；缺点是 UI、业务逻辑和 API 层重复，学习与维护成本高。当前不采用。

### C. 一套共享 Vue 客户端，Web + Electron 两种目标

兼顾在线演示、桌面能力和学习效率，采用此方案。

## 后果与约束

- 所有核心页面只在 `apps/client` 实现一次。
- 共享客户端不得导入 Electron 或 Node.js 特权模块。
- 平台差异集中在 `platform` adapter 和 Electron preload 桥接接口。
- Electron 必须测试桌面能力、IPC 安全和打包启动；Web 必须测试浏览器 fallback。
- 共用渲染层不意味着完全没有双目标配置；构建、资源路径和 API base URL 仍需分别验证。
- 不因共享 UI 而让 Electron 失去学习价值：系统通知、文件导出、应用生命周期和 IPC 是桌面端必做内容。
