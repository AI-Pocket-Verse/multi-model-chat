/**
 * 错误分类与排查建议（文字模型与生图）。
 *
 * 这些文案是这个页面最有价值的部分之一：各家厂商各自的排查路径。
 * 文案本身在 i18n/zh.ts、i18n/en.ts 的 errors 段，这里只做分类。
 */
import { t } from '../i18n'
import type { ModelConfig } from './catalog'

/** 各供应商对应的服务端环境变量名（与 api/src/env.ts 一致） */
const PROVIDER_KEY_ENV: Record<ModelConfig['provider'], string> = {
  volcengine: 'ARK_API_KEY',
  qwen: 'QWEN_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  zhipu: 'ZHIPU_API_KEY',
  kimi: 'KIMI_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  custom: 'CUSTOM_API_KEY',
}

function isNetworkFailure(message: string): boolean {
  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('CORS')
  )
}

/**
 * 登录过期与「厂商 key 无效」都是 401，但处置方式完全不同，必须分开说。
 * 文案要同时覆盖「从未登录」和「登录已过期」两种情况，并直接指向右上角的登录入口。
 */
function isSessionExpired(err: unknown): boolean {
  return (err as { sessionExpired?: boolean })?.sessionExpired === true
}

/** 流式回复中途失败但已收到部分文本时，附在末尾的标记（取调用时的语言） */
export function streamInterruptedMark(): string {
  return t().errors.interruptedMark
}

/**
 * 自家 api 的错误码 → 当前语言的原因说明；没有对应翻译时用 api 返回的原文。
 * api 的 message 是中文，英文界面靠这里换成英文。
 */
function localizeApiMessage(code: unknown, provider: string, fallback: string): string {
  if (typeof code !== 'string') return fallback
  return t().errors.apiMessages[code]?.(provider) ?? fallback
}

/** 文字模型的错误文案 */
export function buildChatErrorText(model: ModelConfig, err: unknown): string {
  const m = t().errors
  const e = err as { message?: string; status?: number; timeout?: boolean; interrupted?: boolean }
  const message = e?.message ?? ''

  if (isSessionExpired(err)) return m.sessionExpired
  if (e?.timeout) return m.streamTimeout
  if (e?.interrupted) return m.streamInterrupted
  if (isNetworkFailure(message)) return m.network

  let parsed: any = null
  try {
    parsed = JSON.parse(message)
  } catch {
    /* 上游返回的可能就是纯文本 */
  }

  // 上游错误形如 {error:{message}}；自家 api 的错误形如 {error:'code', message}
  const rawMsg = parsed?.error?.message || parsed?.message || message
  const apiMsg = localizeApiMessage(parsed?.error, model.provider, rawMsg)
  const reqId = parsed?.request_id || parsed?.error?.request_id || ''
  const status = e?.status || ''

  const isOverdue = /overdue|balance|insufficient|欠费|余额/i.test(rawMsg)
  const isAuthError = status === 401 || /unauthorized|invalid.*key|auth/i.test(rawMsg)
  const isRateLimit = status === 429 || /rate.?limit|too many/i.test(rawMsg)

  let tips: string
  if (parsed?.error === 'provider_key_missing') {
    tips = m.keyMissing(PROVIDER_KEY_ENV[model.provider])
  } else if (typeof parsed?.error === 'string' && m.configTips[parsed.error]) {
    tips = m.configTips[parsed.error]!
  } else if (isOverdue) {
    tips = m.overdue
  } else if (isAuthError) {
    tips = m.auth
  } else if (isRateLimit) {
    tips = m.rateLimit
  } else {
    tips = m.providerTips[model.provider] || m.volcengineTips
  }

  return (
    `${m.apiFailed}\n\n` +
    `${m.errorMessage}${apiMsg}\n` +
    (status ? `${m.httpStatus}${status}\n` : '') +
    (reqId ? `${m.requestId}${reqId}\n` : '') +
    `${m.currentModel}${model.version}\n` +
    `\n${m.suggestions}\n` +
    tips
  )
}

/** 生图失败文案 */
export function buildImageErrorText(model: ModelConfig, err: unknown): string {
  const m = t().errors
  const e = err as { message?: string; status?: number; apiMessage?: string; code?: string }
  if (isSessionExpired(err)) return m.sessionExpired
  if (isNetworkFailure(e?.message ?? '')) return m.imageNetwork

  const raw = e?.apiMessage || e?.message || m.imageFailedDefault
  const apiMsg = localizeApiMessage(e?.code, model.provider, raw)
  const status = e?.status ? `\n${m.httpStatus}${e.status}` : ''
  return `${m.imageFailedTitle}\n\n${m.errorMessage}${apiMsg}${status}\n${m.currentModel}${model.version}`
}

/** 模型不支持生图时的提示 */
export function buildImageUnsupportedText(model: ModelConfig): string {
  return t().errors.imageUnsupported(model.label)
}
