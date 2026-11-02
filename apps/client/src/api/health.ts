import { request } from './http'
import type { HealthResponse } from './types'

/**
 * 业务层：薄，但承担「语义」。
 *
 * 为什么不在这里 try/catch 兜底：
 * 一旦这层把错误吞掉，上层就永远拿不到失败原因，只能显示"加载失败"这种废话。
 * 错误应该往上抛，由最了解界面语境的那一层（组件）决定怎么展示。
 *
 * 路径注意：是 '/health' 而不是 '/api/health'——它是运维探针，不在 /api 前缀下。
 */
export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health', { method: 'GET' })
}
