import type { ApiErrorBody, ApiErrorCode } from './types'

/**
 * 请求封装层：只关心「HTTP 这件事」，不认识任何具体接口。
 *
 * 它只解决四个问题：
 * 1. fetch 不会因为 4xx/5xx 抛错，必须手动判断 res.ok；
 * 2. 超时要自己实现，fetch 默认能挂到天荒地老；
 * 3. 网络层失败（断网、超时）和业务层失败（后端返回错误码）要能区分；
 * 4. 把各种失败统一成 HttpError 一种形状，调用方只需要 catch 一种异常。
 */

const DEFAULT_TIMEOUT_MS = 8000

/**
 * 为什么 baseURL 默认是空字符串（= 同源），而不是 '/api'：
 * 本项目的 /health 是运维探针，不在 /api 前缀下（见 vite.config.ts 的两条 proxy 规则）。
 * 如果把 baseURL 硬编成 '/api'，请求会变成 /api/health，直接吃 404。
 * 所以「前缀」交给调用方在 path 里写全，baseURL 只负责「域名」这一件事。
 * 开发期留空 → 走 Vite proxy；Electron/生产通过 VITE_API_BASE_URL 注入远程域名。
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export type HttpErrorKind =
  /** 超过 timeoutMs 仍未返回 */
  | 'timeout'
  /** DNS/连接失败、断网、CORS 被拦 */
  | 'network'
  /** 调用方主动中断（如组件卸载） */
  | 'aborted'
  /** 收到了响应但 body 不是合法 JSON */
  | 'parse'
  /** 收到了响应且 res.ok === false */
  | 'http'
  /** 不属于以上任何一种：通常是代码 bug */
  | 'unknown'

interface HttpErrorInit {
  kind: HttpErrorKind
  message: string
  status?: number
  code?: ApiErrorCode | string
  requestId?: string
  /** 原始异常，保留现场方便在控制台展开看 cause chain */
  original?: unknown
}

/**
 * 继承 Error 而不是直接 throw 字符串：
 * - 只有 Error 实例才有 stack，才进得了 Sentry 之类的错误上报；
 * - instanceof 判断比 message 字符串匹配可靠得多。
 */
export class HttpError extends Error {
  readonly kind: HttpErrorKind
  readonly status?: number
  readonly code?: string
  readonly requestId?: string
  readonly original?: unknown

  constructor(init: HttpErrorInit) {
    super(init.message)
    // 必须手动设 name，否则 status 里显示的是 'Error'，区分度低
    this.name = 'HttpError'
    this.kind = init.kind
    this.status = init.status
    this.code = init.code
    this.requestId = init.requestId
    this.original = init.original
  }

  /**
   * 「压根没连上」和「连上了但后端说不行」是两种完全不同的故障，
   * 前者大概率是服务没启动，后者要看后端日志。界面文案必须分开。
   */
  get isTransportFailure(): boolean {
    return this.kind === 'timeout' || this.kind === 'network' || this.kind === 'aborted'
  }

  /** 面向用户的中文描述集中放在这里，避免每个页面各写一套 if/else */
  describe(): string {
    switch (this.kind) {
      case 'timeout':
        return '请求超时，后端可能没在运行或响应过慢'
      case 'network':
        return '连不上服务，请确认后端已启动'
      case 'aborted':
        return '请求已取消'
      case 'parse':
        return '服务返回了无法解析的内容，可能被网关拦截了'
      case 'http':
        if (this.status === 404) return '接口不存在（404），检查请求路径是否正确'
        if (this.status === 401) return '未登录或登录已过期（401）'
        if (this.status === 500) return '服务端内部错误（500），请查看后端日志'
        return `请求失败（HTTP ${this.status ?? '未知'}）`
      default:
        return '发生未知错误，请查看浏览器控制台'
    }
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'signal'> {
  /** 传对象即可，序列化交给这里；传 undefined 表示无 body */
  body?: unknown
  /** 单次请求超时，默认 8 秒 */
  timeoutMs?: number
  /** 外部中断信号，会和内部超时信号叠加生效（不是覆盖） */
  signal?: AbortSignal
}

/**
 * 唯一的出口函数。所有接口都必须走这里，否则「统一」就失效了。
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, headers, ...rest } = options

  // 内部 controller 是必须的：fetch 的取消只有一个入口 —— signal。
  // 超时和外部取消都要能触发它，所以由这里统一持有，再由 timedOut 标记区分是谁触发的。
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const abortFromOutside = (): void => controller.abort()
  externalSignal?.addEventListener('abort', abortFromOutside, { once: true })

  try {
    let res: Response
    try {
      res = await fetch(buildUrl(path), {
        // rest 里是 method / credentials / cache 等原样透传的 RequestInit 字段
        ...rest,
        headers: buildHeaders(headers, body),
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (thrown) {
      // fetch 只在这一层 reject：网络失败、CORS、abort。
      // 注意 HTTP 500 不会走到这里 —— 那是 resolved，必须靠下面的 res.ok 判断。
      throw toTransportError(thrown, timedOut, externalSignal)
    }

    return await parseResponse<T>(res)
  } finally {
    // 不清 timer 的话，请求结束后计时器还在跑，测试里会报「定时器未清理」，
    // 长时间运行的页面则是持续泄漏句柄。
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', abortFromOutside)
  }
}

function buildUrl(path: string): string {
  // 允许传绝对 URL（比如直连第三方服务），此时忽略 baseURL
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path}`
}

function buildHeaders(headers: HeadersInit | undefined, body: unknown): Headers {
  // 用 Headers 而不是展开对象：它大小写不敏感，调用方传 'content-type' 也能正确去重
  const merged = new Headers(headers)
  if (!merged.has('Accept')) merged.set('Accept', 'application/json')
  // 只有真的带 body 时才声明 Content-Type，否则 GET 请求会多一个无意义的头
  if (body !== undefined && !merged.has('Content-Type')) {
    merged.set('Content-Type', 'application/json')
  }
  return merged
}

function toTransportError(
  thrown: unknown,
  timedOut: boolean,
  externalSignal: AbortSignal | undefined,
): HttpError {
  // 先判断外部取消：调用方主动取消是正常流程，不该被报成"网络故障"
  if (externalSignal?.aborted) {
    return new HttpError({ kind: 'aborted', message: 'Request aborted by caller', original: thrown })
  }
  if (timedOut) {
    return new HttpError({ kind: 'timeout', message: 'Request timed out', original: thrown })
  }
  return new HttpError({ kind: 'network', message: 'Network request failed', original: thrown })
}

async function parseResponse<T>(res: Response): Promise<T> {
  // 先取 text 再自己 JSON.parse，而不是直接 res.json()：
  // 因为错误响应体也需要被读出来（requestId 就在里面），而 res.json() 失败时你什么都拿不到。
  const raw = await res.text()

  let payload: unknown = null
  let parseFailed = false
  if (raw !== '') {
    try {
      payload = JSON.parse(raw)
    } catch {
      // 典型场景：Nginx 返回 502/504 的 HTML 错误页，JSON.parse 必然失败。
      // 这里不立刻抛，因为下面还要先处理 !res.ok —— 状态码比 body 格式更重要。
      parseFailed = true
    }
  }

  if (!res.ok) {
    const errorBody = isApiErrorBody(payload) ? payload.error : undefined
    throw new HttpError({
      kind: 'http',
      message: errorBody?.message ?? `HTTP ${res.status}`,
      status: res.status,
      code: errorBody?.code,
      // body 里没有就用响应头兜底：后端 app.ts 把 requestId 同时回写进了 X-Request-Id
      requestId: errorBody?.requestId ?? res.headers.get('X-Request-Id') ?? undefined,
    })
  }

  if (parseFailed) {
    throw new HttpError({
      kind: 'parse',
      message: 'Response body is not valid JSON',
      status: res.status,
    })
  }

  // 到这里 status 是 2xx 且 body 合法（或为空，如 204）。
  // 断言是必要的：调用方用类型参数 T 声明了期望形状，运行期我们无法逐字段校验。
  return payload as T
}

/**
 * 类型守卫而不是 as 断言：body 来自网络，字段可能缺、可能是 null。
 * 只有真的验证过，后面才能安全地读 payload.error.code。
 */
function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false
  const error = (value as { error?: unknown }).error
  if (typeof error !== 'object' || error === null) return false
  const { code, message, requestId } = error as {
    code?: unknown
    message?: unknown
    requestId?: unknown
  }
  return typeof code === 'string' && typeof message === 'string' && typeof requestId === 'string'
}
