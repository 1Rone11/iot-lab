/// <reference types="vite/client" />

/**
 * 声明自定义环境变量的类型。
 * Vite 只注入 .env 里 VITE_ 开头的变量，但类型是 any，拼错了不会报错。
 * 声明之后 `import.meta.env.VITE_API_BASE_URL` 就有了 string | undefined 类型，
 * 打错成 VITE_API_BASE_UR 会立刻被类型检查抓住。
 */
interface ImportMetaEnv {
  /** API 域名，开发期留空表示同源（走 Vite proxy） */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
