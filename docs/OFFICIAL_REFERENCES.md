# 官方文档与学习入口

> 根据当前任务查阅，不必一次性读完整站点。开始项目时按官方当前版本、支持状态、兼容说明和安全建议确认技术细节。

## JavaScript 与 Node.js

- MDN JavaScript Guide：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide
- MDN Event Loop：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop
- Node.js Learn：https://nodejs.org/en/learn
- Node.js Releases / LTS：https://nodejs.org/en/about/previous-releases
- Node.js API：https://nodejs.org/api/

## TypeScript、Vue 与 Vite

- TypeScript Handbook：https://www.typescriptlang.org/docs/handbook/intro.html
- Vue + TypeScript：https://vuejs.org/guide/typescript/overview.html
- Vue Guide：https://vuejs.org/guide/introduction.html
- Vue Router：https://router.vuejs.org/
- Vite Guide：https://vite.dev/guide/

## Express 与 API

- Express 5 Guide：https://expressjs.com/en/5x/api.html
- Express 5 Migration Guide：https://expressjs.com/en/guide/migrating-5.html
- Express Production Best Practices：https://expressjs.com/en/advanced/best-practice-performance.html
- HTTP Semantics (RFC 9110)：https://www.rfc-editor.org/rfc/rfc9110

## SQL / PostgreSQL

- PostgreSQL Tutorial：https://www.postgresql.org/docs/current/tutorial.html
- SQL Commands：https://www.postgresql.org/docs/current/sql-commands.html
- EXPLAIN：https://www.postgresql.org/docs/current/using-explain.html
- pg_dump：https://www.postgresql.org/docs/current/app-pgdump.html

## MQTT / 消息

- Eclipse Mosquitto Documentation：https://mosquitto.org/documentation/
- MQTT.js：https://github.com/mqttjs/MQTT.js
- MQTT 5.0 Standard：https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html

## Electron

- Electron Process Model：https://www.electronjs.org/docs/latest/tutorial/process-model
- Electron IPC：https://www.electronjs.org/docs/latest/tutorial/ipc
- Electron Preload：https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
- Electron Security Checklist：https://www.electronjs.org/docs/latest/tutorial/security
- Electron Context Isolation：https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Electron `BrowserWindow` API：https://www.electronjs.org/docs/latest/api/browser-window
- electron-builder：https://www.electron.build/

## Docker / Nginx / 阿里云

- Docker Compose：https://docs.docker.com/compose/
- Docker Compose Production：https://docs.docker.com/compose/how-tos/production/
- Nginx Documentation：https://nginx.org/en/docs/
- Alibaba Cloud Security Group Guidance：https://www.alibabacloud.com/help/en/ecs/user-guide/security-groups-for-different-use-cases
- 备案：部署前从阿里云控制台和属地管理要求核实当前规则。

## 版本选择

- Node.js 选官方当前 LTS，不以 Current 作为生产版本。
- Electron 选当前受支持的稳定版本，检查 release 与安全公告。
- PostgreSQL 选择仍受支持的主版本，并固定 Docker 镜像主版本。
- 在锁定工具链时验证 Vite、Electron、Node 与打包器的兼容性；升级时查看 breaking changes、更新锁文件并执行测试和双目标构建。
