/**
 * 后端契约的前端镜像。
 *
 * 为什么前端要手写一遍而不是直接从 apps/api 里 import：
 * 1. 客户端和后端是两个独立的构建产物，`import` 后端源码会把 Node 侧依赖带进浏览器包；
 * 2. 现在只有一个接口，抽 packages/contracts 属于过早抽象（app.ts 里也留了同样的 TODO）；
 * 3. 手写一份会「写错」，而写错会被类型检查抓住——这正是我们希望暴露的，比悄悄共享更安全。
 *
 * 代价：后端改字段时前端不会自动报错。所以要靠「改后端必须同步改这里」的纪律，
 * 或者将来接口多了再抽共享包。
 */

/** GET /health 的成功响应，与 apps/api/src/app.ts 的 HealthResponse 逐字段对应 */
export interface HealthResponse {
  /** 字面量 "ok" 而不是 string：这样 `res.status === 'ok'` 才有类型收敛 */
  status: 'ok'
  /** 服务已运行的秒数（后端 floor 过，是整数） */
  uptimeSec: number
  /** 后端 package.json 的 version */
  version: string
  /** ISO 8601 字符串，永远是 UTC。JSON 没有 Date 类型，所以这里只能是 string */
  timestamp: string
}

/** 与后端 ApiErrorCode 保持一致 */
export type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR'

/** 后端统一错误响应体 */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    /** 和后端日志里的 requestId 是同一个值，用户报障时贴这个就能定位到日志行 */
    requestId: string
  }
}
