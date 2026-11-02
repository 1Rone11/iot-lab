/**
 * 扩展 Express 的 Request 类型，给请求 ID 一个落脚点。
 *
 * 为什么需要 `declare global`：
 * Express 的类型定义挂在全局命名空间 `Express` 下（不是模块导出），
 * 所以只能在 global 作用域里做接口合并。
 *
 * 为什么末尾必须有 `export {}`：
 * 没有它这个文件会被当作「全局脚本」，`declare global` 反而无效。
 */
declare global {
  namespace Express {
    interface Request {
      /** 由请求 ID 中间件注入；在中间件之前访问时为 undefined */
      id?: string
    }
  }
}

export {}
