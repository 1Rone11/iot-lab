# 本地开发环境记录

> Sprint 0 交付物之一：把工具版本落成文字，避免「我机器上能跑」的争议。  
> 最后更新：2026-10-29

## 1. 版本要求

| 工具 | 本项目要求 | 原因 |
|---|---|---|
| Node.js | 22 LTS | 后端与构建共用同一运行时；选偶数 LTS 而不是 Current，避免实验性 API 变动 |
| pnpm | 10.x | workspace 协议与严格依赖隔离；`packageManager` 字段已锁定版本 |
| Git | 2.40+ | 需要 `git init -b`、`switch`、`restore` 等现代子命令 |
| Docker | 20.10+ | 本地跑 PostgreSQL 与 Mosquitto；不装本机数据库客户端也能起库 |
| PostgreSQL | 16.x（容器内） | 与线上版本保持一致，避免本地能跑线上报错 |
| Mosquitto | 2.x（容器内） | MQTT 5 支持 |

## 2. 本机实测结果

> 用 `node -v`、`pnpm -v`、`git --version`、`docker --version` 自己复核一遍再打勾。

| 工具 | 本机版本 | 是否满足 |
|---|---|---|
| Node.js | v22.22.2 | ✅ |
| pnpm | 10.17.1 | ✅ |
| npm | 10.9.7 | ✅（仅用于少量 npx 场景） |
| git | 2.55.0 | ✅ |
| Docker | 20.10.24 | ✅（版本偏旧，第 7 周部署前建议升级到 24+） |
| Corepack | 0.34.6 | ✅ |

## 3. 版本切换与锁定

```bash
# Node 版本由 .nvmrc 声明，进目录直接切换
nvm use

# pnpm 版本由 package.json 的 packageManager 字段声明
corepack enable
corepack prepare pnpm@10.17.1 --activate
```

**为什么锁定版本**：`latest` 会在某天悄悄把你的构建链换掉，导致「昨天还好好的」。锁定的代价是升级要主动做，收益是可复现。

## 4. Git 身份与远程连接

```bash
# 提交身份（只影响 commit 里的作者信息，与本机登录无关）
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"

# 确认在本仓库生效（而不是只配了全局）
git config --get user.name
git config --get user.email

# 验证 GitHub SSH 通路，看到 "successfully authenticated" 即可
ssh -T git@github.com
```

**不要把私钥写进任何文档、issue、聊天或仓库**。公钥 `~/.ssh/id_ed25519.pub` 可以贴到 GitHub，私钥永远只留在本机。

## 5. 尚未安装 / 待确认

- [ ] Docker Desktop 是否已启动（`docker info` 能返回 Server 版本）
- [ ] 第 7 周部署前评估 Docker Engine 升级
- [ ] PostgreSQL 客户端 GUI（可选，命令行 `psql` 足够）
