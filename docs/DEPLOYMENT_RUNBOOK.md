# 部署与运维手册：Ubuntu 22.04 / 2 vCPU / 2 GiB / 40 GiB

> 本文是部署目标，不代表服务已经部署。执行前确认阿里云安全组、Ubuntu 防火墙、域名、HTTPS 和适用备案要求。不要把服务器密码、私钥、Token 或完整生产 `.env` 放进文档或聊天。

## 1. 部署原则

**只有服务端与 Web 静态资源运行在云服务器上；Electron 桌面应用不作为服务器服务运行。**

- Web：`apps/client` 构建后的静态资源，由 Nginx 提供。
- Electron：在开发机或 CI 构建安装包，加载同一 `apps/client` 构建产物；桌面安装包可以通过 GitHub Releases 或网站的下载链接分发。
- API：Node.js / Express，处理 REST、WebSocket、MQTT 消费和告警规则。
- 数据层：PostgreSQL、Mosquitto 只在内部 Docker 网络。
- 模拟器：初期运行 3–5 台设备，控制上报频率；不需要时可以暂停。

当前服务器规格：Ubuntu 22.04 64 位、2 vCPU、2 GiB RAM、40 GiB ESSD Entry。适合小规模演示，不适合本地大模型、高频数据压测或高可用生产部署。

## 2. 网络暴露策略

| 入口 | 策略 | 说明 |
|---|---|---|
| TCP 22 SSH | 仅允许可信来源；使用密钥 | 不建议长期对所有地址开放 |
| TCP 80 | 按证书签发和 HTTP 跳转需要开放 | Nginx 入口 |
| TCP 443 | 对外开放 | HTTPS 网站、REST API 和 WSS |
| PostgreSQL 5432 | 不开放公网 | 仅内部容器网络 / 受限管理通道 |
| MQTT 1883 | 不开放公网 | 内部 Broker |
| Vite 开发端口 / 调试端口 | 不开放公网 | 仅本地或受限网络使用 |
| Electron IPC | 不适用公网开放 | 仅应用进程间通道，不通过网络暴露 |

云安全组和 Ubuntu 主机防火墙都要核对。不要因为临时调试就把数据库或无认证 Broker 暴露在公网。

## 3. 共享客户端的构建与部署

### Web 目标

1. 在开发机执行客户端构建。
2. 将构建后的静态资源部署到服务器的 Nginx 静态目录。
3. Nginx 提供作品集首页与控制台客户端路由，并将 `/api` 与 WebSocket 路径反向代理到 API。
4. Web 客户端使用同源 `/api` 和 WSS；避免在前端组件中硬编码线上地址。

第一版建议使用 hash router，以避免静态托管路由回退与 Electron `file://` 路由行为不同。如果后续改用 history router，必须补充 Nginx fallback 规则和 Electron 路由测试。

### Electron 目标

1. 同样以 `apps/client` 作为唯一渲染 UI 来源。
2. Electron 开发模式加载 Vite dev server；生产包加载打包进去的 `apps/client` 构建产物。
3. `apps/desktop` 只负责 main、preload、IPC 和安装包配置。
4. Electron 通过 preload 提供受信任的 API base URL，例如公开服务域名；该值不是密钥。
5. 安装包在开发机或 CI 构建，不在 2 GiB 服务器上执行重型打包。
6. 桌面端不携带数据库密码、MQTT 凭据或模型 API Key。

注意：共享的是前端源代码和业务界面，不要求 Web 与 Electron 使用完全相同的运行配置。必须分别验证静态资源路径、API base URL、WSS 和桌面桥接。

## 4. 容量与资源策略

- PostgreSQL、Mosquitto、API、Nginx 使用少量容器管理，按实际内存占用检查是否需要限制容器资源。
- 本地构建前端和 Electron，不在服务器常驻 Vite dev server。
- 3–5 台模拟设备每 3–10 秒上报；上报频率和历史保留期可配置。
- 设定日志轮转和历史数据保留期（例如演示环境 7–30 天，按实际写入和磁盘调整）。
- 每次部署后检查 `free -h`、`df -h`、`docker stats`、容器日志与 OOM 记录。
- 不在服务器运行本地大模型。AI 请求走云端 API，模型密钥只保存在 API 服务端环境变量中。

## 5. 环境与密钥

- `.env.example` 只放变量名与非敏感示例值。
- 生产 `.env` 独立保存并限制文件权限，不提交 Git，也不放静态 Web 目录。
- 为应用创建最小权限数据库账号，不使用数据库管理员账号连接 API。
- 不把 API Key 打包进共享客户端、Web、Electron renderer 或 preload。
- Electron 内需要的公开服务地址可以配置，但不能配置数据库或 MQTT 凭据。
- 日志不输出 Token、Cookie、密码、内部环境变量或完整敏感用户数据。

## 6. 推荐运行拓扑

- Nginx：唯一公开入口，负责静态资源、HTTPS、REST 和 WSS 反向代理。
- `client`：静态资源，通过 Nginx 提供；不是一套常驻 Node.js 前端服务器。
- `api`：只对内部网络可达，由 Nginx 代理。
- `postgres`：内部网络 + 持久化卷，不映射公网端口。
- `mosquitto`：内部网络，不允许匿名公网访问。
- `device-simulator`：演示环境按配置运行，可暂停或限制频率。
- Electron：在用户设备本地运行，通过 HTTPS / WSS 连接 API。

## 7. 发布检查

### 发布前

- [ ] lint、类型检查、测试和构建通过。
- [ ] lockfile 已提交，生产依赖版本受控。
- [ ] `.env.example` 无真实密钥；检查 Git diff 和仓库历史。
- [ ] 数据库迁移已在测试环境验证。
- [ ] Web 同源 API / WSS 正常；Electron 的 API base URL 正确。
- [ ] Electron 安全设置已核对；IPC 未暴露通用系统能力。
- [ ] 公网页面明确说明数据为模拟数据。

### 发布时

- [ ] 备份数据库或确认最近备份成功。
- [ ] 部署 API 与静态客户端，执行兼容的数据库迁移。
- [ ] 检查健康状态、API 日志、WebSocket 代理和 MQTT 消费。
- [ ] 验证浏览器控制台主要功能。
- [ ] 验证 Electron 安装包启动、连接线上 API、桌面通知和导出。
- [ ] 检查内存、磁盘、容器重启和 OOM 记录。

### 发布后

- [ ] 记录版本、时间、变更内容与回滚方式。
- [ ] 测试重启 API 或 Broker 后系统恢复。
- [ ] 演示用户不能执行未授权写操作。
- [ ] 检查日志中无明显凭据泄漏或异常扫描。

## 8. 数据库备份与恢复

用 PostgreSQL 官方工具 `pg_dump` 备份至权限受限目录并轮转旧文件；备份不能放在公开 Web 根目录。

恢复演练必须实际执行：

1. 创建备份并检查退出码、文件大小。
2. 恢复到单独的测试数据库。
3. 核对设备、测点、告警数据数量与一致性。
4. 记录恢复耗时、错误及改进项。

## 9. 监控与故障排查

- `docker ps`：容器是否退出或反复重启。
- `docker logs --tail=200 <service>`：应用、数据库连接、MQTT 重连、迁移日志。
- `free -h` / `docker stats`：内存压力。
- `df -h` / `du -sh`：磁盘与日志膨胀。
- Nginx access/error logs：502、TLS、WSS 代理和路由问题。
- PostgreSQL：连接池耗尽、迁移失败、慢查询。
- MQTT：连接、订阅、非法 payload 和消息积压。
- Electron：应用是否加载正确的共享客户端构建产物，API base URL 是否正确，IPC 是否被拒绝。

## 10. 回滚策略

- 应用回滚：保留上一个经过验证的镜像标签和前端构建产物。
- 数据库迁移优先保持向后兼容；破坏性迁移分阶段执行。
- 回滚前确认旧 API 版本与当前数据库兼容。
- 重大变更前备份并记录恢复步骤。
- Electron 安装包版本需与 API 兼容；若接口发生破坏性变更，应通过 API 版本或兼容策略处理。

## 11. 公开网站与区域要求

若服务器位于中国大陆，公开提供网站服务前，核实并完成适用的 ICP 备案及云厂商要求。配置 HTTPS；数据库和 MQTT 不出现在公开端口。公开页面清楚标注模拟数据，AI 建议属于辅助信息，不代表真实设备诊断。
