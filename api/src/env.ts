import { z } from 'zod'

// TRUST_PROXY：true / false，或 proxy-addr 支持的 loopback / IP / 网段列表（逗号分隔）。
// 留空按默认 loopback。原样把 "true" 交给 Fastify 会被当成 IP 地址而不生效。
// 纯数字（跳数）不接受：Fastify 5.12 起跳数信任一律按「不信任」处理（无法校验直连方，
// 客户端可伪造 XFF），静默失效比启动报错更难排查，所以在这里直接拒绝。
export function parseTrustProxy(v: string): boolean | string {
  const s = v.trim() || 'loopback'
  if (/^(true|false)$/i.test(s)) return s.toLowerCase() === 'true'
  if (/^\d+$/.test(s)) {
    throw new Error(
      `TRUST_PROXY=${s}: hop counts are not supported, use the proxy IP / CIDR instead (e.g. loopback or 10.0.0.0/8)`,
    )
  }
  return s
}

/** 空串按未设置处理：.env 里写 `KEY=` 与不写等价 */
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v)

/** 'true' / 'false' / 空 → boolean | undefined（空表示按其它配置推导默认值） */
const optionalBool = z.preprocess(
  emptyToUndefined,
  z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
)

const Env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4060),
  // 默认只监听本机：本地模式不鉴权，监听 0.0.0.0 等于把服务端 key 借给整个局域网。
  HOST: z.string().default('127.0.0.1'),

  // 信任的反向代理地址（Fastify trustProxy，proxy-addr 语法：loopback / IP / CIDR，逗号分隔）。
  // 默认只信任本机回环（同机 nginx 反代）。不要设为 true：那样任何客户端都能伪造来源 IP 绕过限流。
  TRUST_PROXY: z.string().default('loopback').transform(parseTrustProxy),

  // 可选登录：feishu-sso 的 whoami 端点。不设置或留空（`WHOAMI_URL=`）→ 本地单用户模式。
  WHOAMI_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  // 同源访问（vite 代理 / 反向代理）留空即可；需要跨源直连时填显式白名单。
  CORS_ORIGINS: z.string().default(''),

  // 本地模式额外允许的 Host（逗号或空格分隔）。本地模式不鉴权，只接受 localhost / 127.0.0.1 / ::1
  // 的 Host，防止恶意网页用 DNS 重绑定借用本机的 key；用自定义域名或局域网 IP 访问时在这里加上。
  ALLOWED_HOSTS: z.string().default(''),

  // 设置后 api 同时托管前端静态文件（Docker 单镜像部署用）；nginx 部署时留空。
  WEB_DIST_DIR: z.preprocess(emptyToUndefined, z.string().optional()),

  // ── 六家供应商 API Key ────────────────────────────────────────────────
  // 只存在于服务端：浏览器永远拿不到，请求由 /api/chat、/api/image 代发。
  //
  // 允许缺省（默认空串）：某家没配时，该供应商只能用「模型自带 key」调用，
  // 两处都没有时由路由回 503 provider_key_missing，少配一家不会导致服务起不来。
  ARK_API_KEY: z.string().default(''),
  QWEN_API_KEY: z.string().default(''),
  DEEPSEEK_API_KEY: z.string().default(''),
  ZHIPU_API_KEY: z.string().default(''),
  KIMI_API_KEY: z.string().default(''),
  MINIMAX_API_KEY: z.string().default(''),

  // ── 自定义 OpenAI 兼容接口（OpenAI / OpenRouter / Ollama / vLLM 等）──────
  // 管理员在服务端配置的默认地址与 key，例如 https://api.openai.com/v1、http://127.0.0.1:11434/v1。
  CUSTOM_BASE_URL: z.preprocess(emptyToUndefined, z.url({ protocol: /^https?$/ }).optional()),
  CUSTOM_API_KEY: z.string().default(''),
  // 是否允许浏览器为 custom 模型自填接口地址。留空：本地模式允许、登录模式禁止
  // （多人共用的服务器上，任意地址等于让用户借服务器访问内网，即 SSRF）。
  ALLOW_USER_BASE_URL: optionalBool,
})

const parsed = Env.parse(process.env)

export const env = {
  ...parsed,
  ALLOW_USER_BASE_URL: parsed.ALLOW_USER_BASE_URL ?? !parsed.WHOAMI_URL,
}
export type Env = typeof env
