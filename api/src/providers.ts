/**
 * 各供应商的接入细节。
 *
 * chat 都是统一的 OpenAI 兼容格式，差别只有 baseUrl 与 key，所以一张 map 足够，
 * 不做 provider 抽象层；生图各家各不相同，用 config 三元组
 * (endpoint / body / extractImages) 描述，不做策略类。
 */
import type { ImageRequest, ProviderKey, ProvidersResponse } from '@multi-model-chat/shared'
import { PROVIDER_KEYS } from '@multi-model-chat/shared'

import { env } from './env'

// ── BaseURL ─────────────────────────────────────────────────────────────
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const QWEN_IMAGE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1'
const DS_BASE_URL = 'https://api.deepseek.com'
const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1'
const MINIMAX_BASE_URL = 'https://api.minimaxi.com/v1'

/** 去掉末尾斜杠，便于拼接与比较 */
const trimSlash = (url: string) => url.replace(/\/+$/, '')

/** 各供应商的 baseUrl 与服务端 key（key 从 env 读取，浏览器拿不到） */
export const PROVIDER_API: Record<ProviderKey, { baseUrl: string; apiKey: string }> = {
  volcengine: { baseUrl: ARK_BASE_URL, apiKey: env.ARK_API_KEY },
  qwen: { baseUrl: QWEN_BASE_URL, apiKey: env.QWEN_API_KEY },
  deepseek: { baseUrl: DS_BASE_URL, apiKey: env.DEEPSEEK_API_KEY },
  zhipu: { baseUrl: ZHIPU_BASE_URL, apiKey: env.ZHIPU_API_KEY },
  kimi: { baseUrl: KIMI_BASE_URL, apiKey: env.KIMI_API_KEY },
  minimax: { baseUrl: MINIMAX_BASE_URL, apiKey: env.MINIMAX_API_KEY },
  custom: { baseUrl: trimSlash(env.CUSTOM_BASE_URL ?? ''), apiKey: env.CUSTOM_API_KEY },
}

/** GET /api/providers 的响应：只给布尔值，不暴露 key 和地址 */
export function providersStatus(): ProvidersResponse {
  const configured = {} as Record<ProviderKey, boolean>
  for (const key of PROVIDER_KEYS) {
    configured[key] = key === 'custom' ? Boolean(PROVIDER_API.custom.baseUrl) : Boolean(PROVIDER_API[key].apiKey)
  }
  return { configured, allowUserBaseUrl: env.ALLOW_USER_BASE_URL }
}

/** 一次上游调用的目标：接口地址 + 要带的 key（null 表示不带 Authorization，如本机 Ollama） */
export interface UpstreamTarget {
  baseUrl: string
  apiKey: string | null
}

/** 解析失败时直接回给前端的响应（路由直接 reply，不抛错，见 providerKeyMissing 的说明） */
export interface TargetError {
  status: number
  body: { error: string; message: string }
}

/**
 * 决定这次请求打到哪、带哪个 key。
 *
 * 固定供应商：地址写死，key 优先用请求里用户自填的，否则用服务端 env 的，都没有回 503。
 *
 * custom：
 *   - 请求带了和服务端不同的 baseUrl → 必须 ALLOW_USER_BASE_URL，且**只用请求自带的 key**，
 *     绝不把服务端 CUSTOM_API_KEY 发给用户指定的地址（否则任何人都能把 key 骗到自己的服务器上）。
 *   - 否则走服务端 CUSTOM_BASE_URL，key 规则同固定供应商，但允许没有 key（Ollama 等本地服务）。
 */
export function resolveTarget(
  provider: ProviderKey,
  req: { apiKey?: string; baseUrl?: string },
): UpstreamTarget | TargetError {
  const requestKey = req.apiKey?.trim() || null

  if (provider !== 'custom') {
    const apiKey = requestKey || PROVIDER_API[provider].apiKey || null
    if (!apiKey) return { status: 503, body: providerKeyMissing(provider) }
    return { baseUrl: PROVIDER_API[provider].baseUrl, apiKey }
  }

  const server = PROVIDER_API.custom
  const requested = trimSlash(req.baseUrl?.trim() ?? '')

  if (requested && requested !== server.baseUrl) {
    if (!env.ALLOW_USER_BASE_URL) {
      return {
        status: 403,
        body: {
          error: 'custom_base_url_forbidden',
          message: '服务端不允许自填接口地址（ALLOW_USER_BASE_URL=false），请清空 Base URL 改用服务端配置的地址',
        },
      }
    }
    let url: URL
    try {
      url = new URL(requested)
    } catch {
      return { status: 400, body: { error: 'invalid_base_url', message: `Base URL 格式不正确：${requested}` } }
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { status: 400, body: { error: 'invalid_base_url', message: 'Base URL 只支持 http:// 或 https://' } }
    }
    return { baseUrl: requested, apiKey: requestKey }
  }

  if (!server.baseUrl) {
    return {
      status: 503,
      body: {
        error: 'custom_base_url_missing',
        message: '该模型没有填写 Base URL，服务端也未配置 CUSTOM_BASE_URL',
      },
    }
  }
  return { baseUrl: server.baseUrl, apiKey: requestKey || server.apiKey || null }
}

export function isTargetError(t: UpstreamTarget | TargetError): t is TargetError {
  return 'status' in t
}

/** 上游请求头：有 key 才带 Authorization */
export function upstreamHeaders(apiKey: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  }
}

/**
 * 两处 key 都没有时的响应体。路由直接 reply 而不是抛错：共享错误处理器会把
 * 抛出的 5xx 统一替换成「服务器内部错误」，用户就看不到该去配哪个 key。
 */
export function providerKeyMissing(provider: ProviderKey) {
  return {
    error: 'provider_key_missing',
    message: `服务端未配置 ${provider} 的 API Key，且该模型未自带 key`,
  }
}

// ── 生图 ────────────────────────────────────────────────────────────────
/** 生图默认参数 */
export const IMAGE_DEFAULTS = {
  negativePrompt:
    '低分辨率，低画质，肢体畸形，手指畸形，构图混乱，文字模糊，扭曲，过度光滑，明显 AI 感。',
  size: '1024x1024',
  doubaoSize: '2048x2048',
  supportedText:
    '当前仅已接入 qwen-image、glm-image / CogView、doubao-seedream、image-01，以及 OpenAI 兼容接口的 gpt-image / dall-e 这类生图模型。',
}

/** 各家对尺寸写法的要求不同 */
function formatImageSizeForProvider(provider: ProviderKey): string {
  if (provider === 'qwen') return IMAGE_DEFAULTS.size.replace('x', '*')
  if (provider === 'volcengine') return IMAGE_DEFAULTS.doubaoSize
  return IMAGE_DEFAULTS.size
}

/** 裸 base64 → data URL */
function normalizeImageDataUrl(base64: unknown, mimeType = 'image/png'): string {
  if (typeof base64 !== 'string') return ''
  const trimmed = base64.trim()
  if (!trimmed) return ''
  if (/^data:image\//i.test(trimmed)) return trimmed
  return `data:${mimeType};base64,${trimmed}`
}

/**
 * 只放行 http(s) 和 data:image —— 结果会进前端 <a href> / <img src>，
 * javascript: 之类的协议一旦混进来就是 XSS。
 */
function safeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) return trimmed
  return ''
}

/** 从各家响应的图片项里取出可展示的 URL */
function normalizeImageUrl(item: unknown): string {
  if (!item) return ''
  if (typeof item === 'string') return safeImageUrl(item)
  if (typeof item !== 'object') return ''

  const o = item as Record<string, unknown>
  return (
    [
      o.url,
      o.image,
      o.image_url,
      o.imageUrl,
      normalizeImageDataUrl(o.b64_json, o.mime_type as string | undefined),
      normalizeImageDataUrl(o.image_base64, o.mime_type as string | undefined),
      normalizeImageDataUrl(o.base64, o.mime_type as string | undefined),
    ]
      .map(safeImageUrl)
      .find(Boolean) ?? ''
  )
}

/** 图片项列表 → URL 列表 */
function normalizeImageList(items: unknown): string[] {
  if (!Array.isArray(items)) return []
  return items.map(normalizeImageUrl).filter(Boolean)
}

/**
 * 部分厂商 HTTP 200 也可能在 body 里报错。
 */
export function extractImageApiError(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const p = payload as Record<string, any>

  const minimaxCode = p?.base_resp?.status_code
  if (!Number.isNaN(Number(minimaxCode)) && Number(minimaxCode) !== 0) {
    return p?.base_resp?.status_msg || `MiniMax 错误码 ${minimaxCode}`
  }

  const nestedError = p?.error?.message || p?.data?.error?.message
  if (nestedError) return nestedError

  const code = p?.code
  const message = p?.message
  if (code && `${code}` !== '200') return message ? `${code}: ${message}` : `${code}`

  if (p?.success === false) return message || '请求失败'

  return ''
}

export interface ImageGenerationConfig {
  endpoint: string
  body: Record<string, unknown>
  extractImages: (payload: unknown) => string[]
}

/**
 * 按 provider + 模型名选出生图接口、请求体和响应解析方式。
 * 返回 null 表示该模型不支持直接生图 —— 调用方据此给出「不支持」文案。
 *
 * customBaseUrl 只对 custom 生效：resolveTarget 解析出的接口地址。
 */
export function getImageGenerationConfig(
  req: Pick<ImageRequest, 'provider' | 'model' | 'prompt'>,
  customBaseUrl = '',
): ImageGenerationConfig | null {
  const { provider, model, prompt } = req
  const version = (model || '').trim()
  const versionLower = version.toLowerCase()

  if (provider === 'qwen' && /^qwen-image/.test(versionLower)) {
    return {
      endpoint: `${QWEN_IMAGE_BASE_URL}/services/aigc/multimodal-generation/generation`,
      body: {
        model: version,
        input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
        parameters: {
          size: formatImageSizeForProvider(provider),
          negative_prompt: IMAGE_DEFAULTS.negativePrompt,
          watermark: false,
          prompt_extend: true,
        },
      },
      extractImages(payload: any) {
        return normalizeImageList(
          payload?.output?.choices?.flatMap((choice: any) => choice?.message?.content || []) || [],
        )
      },
    }
  }

  if (provider === 'zhipu' && /^(glm-image|cogview-4)/i.test(version)) {
    return {
      endpoint: `${ZHIPU_BASE_URL}/images/generations`,
      body: { model: version, prompt, size: formatImageSizeForProvider(provider) },
      extractImages(payload: any) {
        return normalizeImageList(payload?.data || [])
      },
    }
  }

  if (provider === 'minimax' && /^image-01(?:-live)?$/i.test(version)) {
    return {
      endpoint: `${MINIMAX_BASE_URL}/image_generation`,
      body: {
        model: version,
        prompt,
        aspect_ratio: '1:1',
        response_format: 'base64',
        n: 1,
        prompt_optimizer: true,
      },
      extractImages(payload: any) {
        const urls = normalizeImageList(payload?.data?.image_urls || [])
        if (urls.length) return urls
        return normalizeImageList(
          (payload?.data?.image_base64 || []).map((image: string) => ({ image_base64: image })),
        )
      },
    }
  }

  // OpenAI 标准生图接口：gpt-image 默认返回 b64_json，dall-e 默认返回 url，两种都能解析
  if (provider === 'custom' && /^(gpt-image|dall-e)/i.test(version)) {
    return {
      endpoint: `${customBaseUrl}/images/generations`,
      body: { model: version, prompt, size: IMAGE_DEFAULTS.size, n: 1 },
      extractImages(payload: any) {
        return normalizeImageList(payload?.data || [])
      },
    }
  }

  if (provider === 'volcengine' && /^doubao-seedream/i.test(version)) {
    return {
      // 注意：生图走 operator.las 域名，与 chat 的 ark 域名不同 —— 原样保留
      endpoint: 'https://operator.las.cn-beijing.volces.com/api/v1/online/images/generations',
      body: {
        model: version,
        prompt,
        size: formatImageSizeForProvider(provider),
        response_format: 'url',
      },
      extractImages(payload: any) {
        return normalizeImageList(payload?.data || [])
      },
    }
  }

  return null
}
