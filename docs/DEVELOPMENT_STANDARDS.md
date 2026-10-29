# 开发规范

## 1. 总原则

- 优先可读、可测试、易解释的实现，不追求炫技。
- 开发者必须能用自己的话解释重要设计。
- 不提交无法解释的自动生成代码；IDE 补全后必须阅读和验证。
- 外部输入始终运行时校验；TS 类型不能取代运行时校验。
- **只有一个 Vue 客户端：`apps/client`。** Web 和 Electron 共享页面与核心业务逻辑。

## 2. JavaScript / TypeScript

- 业务层使用 TypeScript strict；`apps/device-simulator` 初期使用 JavaScript 作为语义练习区。
- 使用 ESM，避免无原因混用 CommonJS。
- 不用 `any` 逃避类型错误；优先 `unknown` + 类型收窄。
- 不用类型断言替代运行时验证。
- 异步函数明确处理错误；避免未处理 Promise。
- 定时器、事件监听器、WebSocket 和 ECharts 实例必须有资源释放逻辑。
- 时间以 ISO 8601 / UTC 交换，UI 按用户本地时区显示。

## 3. 共享 Vue 客户端规范

- 页面、路由、组件、共享状态和 API client 只维护在 `apps/client`。
- `apps/desktop` 不创建第二套 Vue 页面或业务组件。
- 使用 Composition API 与 `<script setup lang="ts">`。
- 组件负责展示和交互；API 请求放在 service 层；跨页面状态按需求抽 composable/store。
- 不在 Vue SFC 里导入 `electron`、`fs`、`child_process` 或数据库驱动。
- 页面通过平台能力抽象访问通知、导出和应用版本；不直接操作 `window.fieldlabDesktop` 的底层细节。
- API base URL 与 WebSocket URL 通过运行目标配置决定，不在各组件里硬编码。
- 列表处理 loading / empty / error / retry；表单做客户端与服务端双重校验。
- ECharts 在卸载时销毁；实时图表限制显示窗口与刷新频率。
- 基础无障碍：输入具备 label，按钮语义明确，状态不只依赖颜色。

## 4. 平台能力与共享代码边界

- 在共享客户端内定义高层能力接口，例如通知、CSV 导出、应用版本和运行配置。
- Web adapter 使用浏览器 API 或明确降级。
- Electron adapter 只调用 `window.fieldlabDesktop` 暴露的白名单能力。
- `window.fieldlabDesktop` 类型声明放在共享客户端的类型目录，但接口实现只存在于 Electron preload。
- preload 只暴露最小能力；禁止暴露整个 `ipcRenderer`、任意 IPC channel、任意文件系统或系统命令接口。
- 对 API base URL 做协议和来源约束；不得从不可信页面或 URL 参数接受任意后端地址。

## 5. Node.js / Express

- 路由层解析 HTTP 请求，业务规则放服务层，数据存取由 repository 或明确的数据库模块负责。
- 不把所有逻辑堆进一个 `app.ts`，也不为了分层制造空壳抽象。
- 中间件顺序清楚：安全 headers、请求 ID、日志、JSON 解析、路由、404、错误处理。
- 外部请求设置输入校验、大小限制、超时和速率限制。
- 错误响应不返回 stack、SQL、环境变量或内部路径。
- 服务退出时停止接收新请求，关闭 MQTT / WebSocket 并释放数据库连接。
- 重试与重连必须有上限和退避，避免重试风暴。

## 6. SQL / PostgreSQL

- Schema 变更必须有 migration，禁止依赖手工改生产库。
- 使用主键、外键、唯一和非空约束表达数据完整性。
- 查询有条数上限；历史数据限制时间范围。
- 仅对真实查询需要的字段建索引，用 `EXPLAIN ANALYZE` 验证。
- 使用参数化 SQL；多步状态更新使用事务并明确边界。
- 备份不放公开 Web 目录或代码仓库。

## 7. MQTT / 实时消息

- Topic、payload、QoS、retain 与连接参数写入文档。
- 校验 Topic 设备 ID 与 payload 设备 ID 一致。
- 使用消息 ID + 数据库唯一约束或 ingestion 表处理重复消息。
- 分别保存 `reportedAt` 与 `receivedAt`。
- 重连后恢复订阅；在线状态由心跳、最后上报时间和模拟遗嘱事件综合判断。
- MQTT Broker 不直接对公网匿名开放；不把 Broker 密钥打包进 Electron。

## 8. Electron 安全规范

- `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`。
- preload 仅通过 `contextBridge` 暴露少量、命名明确的 API。
- 禁止暴露原始 `ipcRenderer` 或任意 `send/invoke` 通道。
- 主进程校验 IPC 参数、调用来源、文件名与内容大小；外部 URL 使用允许列表。
- 不拼接用户输入执行 shell 命令；当前项目不需要任意 `child_process`。
- 不给不可信远程页面 Node 特权；限制导航、弹窗与协议。
- 打包前对照 Electron 官方安全清单记录自检结果。

## 9. API 与错误格式

- 成功响应和分页格式保持稳定。
- 错误包含稳定 `code`、可理解的 `message` 和 `requestId`。
- 不把底层异常原样返回；内部日志脱敏。
- 按语义返回 400、401、403、404、409、429、500 等 HTTP 状态码。

## 10. 测试规范

最低要求：

- 单元测试：测点校验、阈值判断、告警状态转换、消息去重、平台适配逻辑。
- 集成测试：API + 测试数据库，验证 SQL 与事务。
- 客户端测试：关键 composable / component，以及 loading、error、empty 状态。
- Web 冒烟：页面加载、API URL、WSS 和通知/下载 fallback。
- Electron 冒烟：应用启动、IPC 白名单、桌面通知、保存取消、非法输入和构建产物加载。
- 每次 bug 修复至少新增一个复现旧问题的测试；不能自动化时写清理由与手工步骤。

## 11. Git 与提交规范

分支：`main`、`feat/<topic>`、`fix/<topic>`、`docs/<topic>`。

示例：

- `feat(api): add device history endpoint`
- `fix(mqtt): deduplicate repeated telemetry`
- `feat(desktop): add safe csv export bridge`
- `test(client): cover reconnect fallback`
- `docs(architecture): clarify shared client targets`

一个提交尽量只包含一个逻辑变更。提交前执行对应 lint、typecheck、test 和 build。

## 12. Done 定义

- 验收条件通过，正常 / 异常 / 边界路径已验证。
- lint、类型检查、测试与构建符合当前阶段要求。
- 文档、环境变量示例和学习日志已更新。
- 未提交密钥、真实数据、日志 dump 或临时文件。
- 开发者能够解释实现与至少一种替代方案。
- 改动影响两个运行目标时，Web 与 Electron 都已测试，或记录未测试项。
