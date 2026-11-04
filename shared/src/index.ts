/**
 * 跨端契约 —— web 与 api 共用的唯一一份 DTO。
 *
 * 边界：这里**只**放前后端都要引用的请求/响应形状。
 * MODEL_CATALOG / MODEL_INFO / DEFAULT_MODELS / 生图判定只有前端用，留在 web/src/lib，
 * 不要塞进来 —— 原则是「跨端 DTO 不许两边各写一份」，不是「所有常量都建包」。
 */

/**
 * 已接入的供应商。与 api/src/providers.ts 的 PROVIDER_API 键一一对应。
 * custom 是任意 OpenAI 兼容接口（OpenAI、OpenRouter、Ollama、vLLM 等），baseUrl 可配置。
 */
export type ProviderKey = 'volcengine' | 'qwen' | 'deepseek' | 'zhipu' | 'kimi' | 'minimax' | 'custom'

export const PROVIDER_KEYS: readonly ProviderKey[] = [
  'volcengine',
  'qwen',
  'deepseek',
  'zhipu',
  'kimi',
  'minimax',
  'custom',
]

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * POST /api/chat → text/event-stream
 *
 * 响应是上游 OpenAI 兼容 SSE 帧的**原样透传**（api 不解析、不改写），
 * 前端自行做 buffer 拼接与 data: 行解析。
 */
export interface ChatRequest {
  provider: ProviderKey
  /** 模型 ID / 火山接入点 ID（ep-xxx），即前端 ModelConfig.version */
  model: string
  messages: ChatMessage[]
  /** 用户为该模型单独填的 key；留空则由服务端 env 提供 */
  apiKey?: string
  /** 仅 custom：用户自填的接口地址；留空则用服务端 CUSTOM_BASE_URL */
  baseUrl?: string
}

/** POST /api/image → application/json */
export interface ImageRequest {
  provider: ProviderKey
  model: string
  prompt: string
  apiKey?: string
  /** 仅 custom，同 ChatRequest.baseUrl */
  baseUrl?: string
}

/**
 * GET /api/providers → 服务端各供应商的配置情况（只给布尔值，不返回 key 和地址）。
 * 前端据此决定首次访问激活哪些预置模型，并在设置面板里显示 key 状态。
 */
export interface ProvidersResponse {
  /** 该供应商在服务端是否已可用（custom 指已配置 CUSTOM_BASE_URL） */
  configured: Record<ProviderKey, boolean>
  /** 是否允许浏览器为 custom 模型自填 baseUrl（本地模式默认允许，登录模式默认禁止） */
  allowUserBaseUrl: boolean
}

export interface ImageResponse {
  /** 已归一化的图片地址：http(s) URL 或 data:image/... base64 */
  images: string[]
}
