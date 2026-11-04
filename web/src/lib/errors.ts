/**
/**
 * 错误分类与排查建议（文字模型与生图）。
 *
 * 这些文案是这个页面最有价值的部分之一：各家厂商各自的排查路径。
 */
import type { ModelConfig } from './catalog'

const PROVIDER_TIPS: Record<string, string> = {
  qwen:
    `• 在阿里云百炼控制台（bailian.console.aliyun.com）查看可用模型\n` +
    `• 确认 API Key 有权限调用该模型\n` +
    `• 检查模型 ID 是否拼写正确（如 qwen3.5-plus、qwen3-max 等）\n` +
    `• 文档：https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope`,
  deepseek:
    `• 在 DeepSeek 开放平台（platform.deepseek.com）查看 API Key 与余额\n` +
    `• 模型 ID 仅支持 deepseek-chat 或 deepseek-reasoner\n` +
    `• 检查是否超出速率限制（Rate Limit）\n` +
    `• 文档：https://api-docs.deepseek.com/zh-cn/`,
  zhipu:
    `• 在智谱 AI 控制台（open.bigmodel.cn）查看 API Key 与账户余额\n` +
    `• 确认模型 ID 拼写正确（如 glm-5、glm-4.7、glm-4.7-flashx、glm-4.6v）\n` +
    `• 检查 API Key 是否具有对应模型的调用权限\n` +
    `• 文档：https://docs.bigmodel.cn/cn/guide/models/text/glm-5`,
  kimi:
    `• 在 Moonshot 开发者平台（platform.moonshot.cn）查看 API Key 与账户余额\n` +
    `• 确认模型 ID 拼写正确（如 kimi-k2.5、moonshot-v1-8k、moonshot-v1-128k）\n` +
    `• 检查 API Key 是否有效，账户余额是否充足\n` +
    `• 文档：https://platform.moonshot.cn/docs/api/chat`,
  minimax:
    `• 在 MiniMax 开放平台（platform.minimaxi.com）查看 API Key 与账户余额\n` +
    `• 确认模型 ID 大小写正确（如 MiniMax-M2.7、MiniMax-M2.5、M2-her）\n` +
    `• 检查 API Key 是否有效，账户是否已订阅 Token Plan\n` +
    `• 文档：https://platform.minimaxi.com/docs/guides/text-generation`,
  custom:
    `• 确认 Base URL 指向 OpenAI 兼容接口的 /v1 一级（如 https://api.openai.com/v1、http://127.0.0.1:11434/v1）\n` +
    `• 确认模型 ID 是该服务实际提供的名称（Ollama 用 ollama list 查看）\n` +
    `• api 在服务端发起请求：Base URL 要能从 api 所在机器访问（Docker 里访问宿主机用 host.docker.internal）`,
}

const VOLCENGINE_TIPS =
  `• 在火山方舟控制台（ark.volcengine.com）查看可用模型\n` +
  `• 若模型需要开通，先在控制台「模型接入」中激活\n` +
  `• 也可使用控制台推理接入点 ID（格式：ep-XXXXXXXX-XXXX）\n` +
  `• 在顶栏「全局设置」里编辑此模型，改成正确的模型 ID`

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

/** 自家 api 的配置类错误：原因已经在 message 里说清楚了，只补一句该去哪改 */
const CONFIG_ERROR_TIPS: Record<string, string> = {
  custom_base_url_missing:
    `• 在顶栏「全局设置」里编辑此模型并填写 Base URL\n` +
    `• 或在 api/.env.dev（生产为 .env.prod）里设置 CUSTOM_BASE_URL，然后重启 api`,
  custom_base_url_forbidden: `• 在顶栏「全局设置」里编辑此模型，清空 Base URL 后改用服务端配置的地址`,
  invalid_base_url: `• 在顶栏「全局设置」里编辑此模型，Base URL 形如 https://api.openai.com/v1`,
  host_not_allowed:
    `• 用 http://localhost 访问，或在 api 配置里把当前访问的域名 / IP 加进 ALLOWED_HOSTS 后重启 api`,
}

function isNetworkFailure(message: string): boolean {
  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('CORS')
  )
}

const NETWORK_ERROR_TEXT =
  '⚠️ 网络请求失败\n\n' +
  '可能原因：\n' +
  '1. 网络连接异常，请检查网络\n' +
  '2. API 服务未启动或不可达（本地开发确认 api 的 :4060 在运行，可用 pnpm dev 同时启动前后端）'

/**
 * 登录过期与「厂商 key 无效」都是 401，但处置方式完全不同，必须分开说。
 * 措辞要同时覆盖「从未登录」和「登录已过期」两种情况 —— 只说"已过期"会让
 * 从没登录过的人困惑；并直接指向右上角的登录入口，而不是让他自己找。
 */
const SESSION_EXPIRED_TEXT =
  '🔒 需要登录后才能发送\n\n' +
  '请点击右上角头像处的「登录」完成飞书登录（若此前已登录，则是登录态已过期，重新登录即可）。\n' +
  '（这不是模型或 API Key 的问题，无需检查厂商配置）'

function isSessionExpired(err: unknown): boolean {
  return (err as { sessionExpired?: boolean })?.sessionExpired === true
}

const STREAM_TIMEOUT_TEXT =
  '⏱️ 响应超时\n\n' +
  '模型长时间没有返回任何内容，已中止本次请求。可能是该厂商服务繁忙或网络不稳定，稍后重试即可。'

const STREAM_INTERRUPTED_TEXT =
  '⚠️ 回复被中断\n\n' +
  '与模型的连接在回复完成前断开，没有收到任何内容。请检查网络或稍后重试。'

/** 流式回复中途失败但已收到部分文本时，附在末尾的标记 */
export const STREAM_INTERRUPTED_MARK = '\n\n（回复被中断，以上内容不完整）'

/** 文字模型的错误文案 */
export function buildChatErrorText(model: ModelConfig, err: unknown): string {
  const e = err as { message?: string; status?: number; timeout?: boolean; interrupted?: boolean }
  const message = e?.message ?? ''

  if (isSessionExpired(err)) return SESSION_EXPIRED_TEXT
  if (e?.timeout) return STREAM_TIMEOUT_TEXT
  if (e?.interrupted) return STREAM_INTERRUPTED_TEXT
  if (isNetworkFailure(message)) return NETWORK_ERROR_TEXT

  let parsed: any = null
  try {
    parsed = JSON.parse(message)
  } catch {
    /* 上游返回的可能就是纯文本 */
  }

  // 上游错误形如 {error:{message}}；自家 api 的错误形如 {error:'code', message}
  const apiMsg = parsed?.error?.message || parsed?.message || message
  const reqId = parsed?.request_id || parsed?.error?.request_id || ''
  const status = e?.status || ''

  const isOverdue = /overdue|balance|insufficient|欠费|余额/i.test(apiMsg)
  const isAuthError = status === 401 || /unauthorized|invalid.*key|auth/i.test(apiMsg)
  const isRateLimit = status === 429 || /rate.?limit|too many/i.test(apiMsg)

  let tips: string
  if (parsed?.error === 'provider_key_missing') {
    tips =
      `• 在 api/.env.dev（生产为 .env.prod）里填写 ${PROVIDER_KEY_ENV[model.provider]}，然后重启 api\n` +
      `• 或在顶栏「全局设置」里编辑此模型，填入该模型自己的 API Key`
  } else if (typeof parsed?.error === 'string' && CONFIG_ERROR_TIPS[parsed.error]) {
    tips = CONFIG_ERROR_TIPS[parsed.error]!
  } else if (isOverdue) {
    tips =
      `⚠️ 账户余额不足或已欠费！\n` +
      `• 请前往对应平台控制台充值后重试\n` +
      `• 火山方舟：https://console.volcengine.com/finance\n` +
      `• 阿里云百炼：https://usercenter2.aliyun.com/finance\n` +
      `• DeepSeek：https://platform.deepseek.com/top_up`
  } else if (isAuthError) {
    tips =
      `• API Key 无效或已过期，请检查密钥是否正确\n` +
      `• 可在顶栏「全局设置」里编辑此模型，填入有效的 API Key`
  } else if (isRateLimit) {
    tips = `• 请求频率超出限制，请稍后重试\n` + `• 可降低并发模型数量或等待一段时间后再发送`
  } else {
    tips = PROVIDER_TIPS[model.provider] || VOLCENGINE_TIPS
  }

  return (
    `❌ API 请求失败\n\n` +
    `错误信息：${apiMsg}\n` +
    (status ? `HTTP 状态码：${status}\n` : '') +
    (reqId ? `Request ID：${reqId}\n` : '') +
    `当前模型 ID：${model.version}\n` +
    `\n💡 解决建议：\n` +
    tips
  )
}

/** 生图失败文案 */
export function buildImageErrorText(model: ModelConfig, err: unknown): string {
  const e = err as { message?: string; status?: number; apiMessage?: string }
  if (isSessionExpired(err)) return SESSION_EXPIRED_TEXT
  if (isNetworkFailure(e?.message ?? '')) {
    return (
      '⚠️ 图片请求失败\n\n' +
      '可能原因：\n' +
      '1. 图片接口地址配置错误或上游返回异常\n' +
      '2. API 服务未启动或不可达\n' +
      '3. 当前网络或供应商接口异常'
    )
  }

  const apiMsg = e?.apiMessage || e?.message || '图片生成失败'
  const status = e?.status ? `\nHTTP 状态码：${e.status}` : ''
  return `❌ 图片生成失败\n\n错误信息：${apiMsg}${status}\n当前模型 ID：${model.version}`
}

/** 模型不支持生图时的提示 */
export function buildImageUnsupportedText(model: ModelConfig): string {
  return `当前模型「${model.label}」不支持直接生成图片。\n\n当前仅已接入 qwen-image、glm-image / CogView、doubao-seedream、image-01，以及 OpenAI 兼容接口的 gpt-image / dall-e 这类生图模型。`
}
