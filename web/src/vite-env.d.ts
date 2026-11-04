/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 可选：feishu-sso 的地址前缀（如 /auth）。不设置为本地单用户模式 */
  readonly VITE_SSO_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
