/**
 * 与自家 api 的通信层。
 *
 * 一律经 /api/chat、/api/image 代发，浏览器永远拿不到服务端 key。
 * 服务端把上游 SSE 帧原样 pipe 下来，这里按 OpenAI 流式格式解析。
 */
import type { ChatRequest, ImageRequest, ImageResponse, ProvidersResponse } from '@multi-model-chat/shared'
import { createHttpClient, HttpError } from '@multi-model-chat/http-client'

/** 用 BASE_URL 拼绝对路径，不受当前 URL 有无尾斜杠影响 */
const BASE = import.meta.env.BASE_URL

/**
 * 非流式请求走 http-client。流式那条走不了 —— createHttpClient 内部直接
 * await res.json()，不暴露 res.body，所以 streamChat 直接用 fetch。
 */
const http = createHttpClient({ baseUrl: new URL(BASE, window.location.origin).href })

/** 模型不支持直接生图 —— 与「调用失败」区分开，调用方给出不同文案 */
export class UnsupportedImageModelError extends Error {
  constructor() {
    super('unsupported_image_model')
    this.name = 'UnsupportedImageModelError'
  }
}

/** 流式响应超过这个时间没有收到任何数据，就当作上游卡死并中止（毫秒）。 */
export const STREAM_IDLE_TIMEOUT_MS = 120_000

export interface StreamChatOptions {
  /** 每次累积后回调，参数是**到目前为止的全文**（与原实现一致） */
  onDelta: (accumulated: string) => void
  /** 调用方主动取消（移除模型、清空对话等）。取消时抛 AbortError，不按失败处理。 */
  signal?: AbortSignal
  /** 空闲超时，默认 STREAM_IDLE_TIMEOUT_MS；测试里可调小。 */
  idleTimeoutMs?: number
}

/** 流没有正常结束（超时 / 断连 / 厂商中途报错）。partial 是已经收到的文本。 */
function streamFailure(kind: 'timeout' | 'interrupted', partial: string, cause?: unknown) {
  return Object.assign(new Error(kind === 'timeout' ? 'stream_timeout' : 'stream_interrupted'), {
    [kind]: true,
    partial,
    cause,
  })
}

/**
 * 流式对话。返回最终累积的全文；失败时抛出 Error（message = 响应原始 body，附带 status），
 * 由 errors.ts 解析分类。
 *
 * 流没有以 [DONE] / finish_reason 结束（上游中途断连、超时、返回 error 帧）时，
 * 抛出带 `interrupted` / `timeout` 与 `partial` 的错误，调用方据此标注「回复被中断」，
 * 而不是把截断的回答当成正常结束。
 */
export async function streamChat(req: ChatRequest, opts: StreamChatOptions): Promise<string> {
  const idleMs = opts.idleTimeoutMs ?? STREAM_IDLE_TIMEOUT_MS
  const ctrl = new AbortController()
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const armTimer = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      timedOut = true
      ctrl.abort()
    }, idleMs)
  }
  const onUserAbort = () => ctrl.abort()
  if (opts.signal?.aborted) ctrl.abort()
  else opts.signal?.addEventListener('abort', onUserAbort, { once: true })

  let accumulated = ''
  try {
    armTimer()
    let response: Response
    try {
      response = await fetch(`${BASE}api/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      })
    } catch (err) {
      if (timedOut) throw streamFailure('timeout', '', err)
      throw err
    }

    if (!response.ok) {
      const rawBody = await response.text()
      // 401 有两种来源：厂商说 key 无效（api 会带 x-upstream-error 透传），
      // 或者我们自己的 requireAuth 拦下了 —— 后者是登录过期，不能提示用户去查 key。
      if (response.status === 401 && !response.headers.get('x-upstream-error')) {
        throw Object.assign(new Error('session_expired'), { status: 401, sessionExpired: true })
      }
      throw Object.assign(new Error(rawBody), { status: response.status })
    }
    if (!response.body) throw Object.assign(new Error('empty response body'), { status: 502 })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let sseBuffer = ''
    let isDone = false
    let upstreamError: unknown

    // 单行 SSE 解析
    const processSseLine = (rawLine: string) => {
      const trimmed = rawLine.trim()
      if (!trimmed.startsWith('data:')) return

      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') {
        isDone = true
        return
      }

      let json: any
      try {
        json = JSON.parse(payload)
      } catch {
        return /* 忽略不完整 JSON */
      }

      // 厂商在流中途以 data: {"error": ...} 帧报错
      if (json?.error) {
        upstreamError = json
        isDone = true
        return
      }

      const choice = json.choices?.[0]

      // 先读内容再判结束 —— 部分模型最后一个 chunk 同时带 finish_reason 和 content，
      // 顺序反了会吞掉最后一段文字。
      const delta = choice?.delta?.content || ''
      if (delta) {
        accumulated += delta
        opts.onDelta(accumulated)
      }

      // 任何非空 finish_reason（stop / length / content_filter / tool_calls ...）都是正常收尾
      if (choice?.finish_reason) isDone = true
    }

    try {
      while (!isDone) {
        let chunk: ReadableStreamReadResult<Uint8Array>
        try {
          chunk = await reader.read()
        } catch (err) {
          if (timedOut) throw streamFailure('timeout', accumulated, err)
          if (opts.signal?.aborted) throw err
          throw streamFailure('interrupted', accumulated, err)
        }
        armTimer()
        const { done, value } = chunk

        // done 时 flush 解码器里可能残留的多字节字符
        sseBuffer += done ? decoder.decode() : decoder.decode(value, { stream: true })

        const lines = sseBuffer.split('\n')
        sseBuffer = lines.pop() ?? '' // 最后一行可能不完整，留到下一轮

        for (const line of lines) {
          processSseLine(line)
          if (isDone) break
        }

        // 服务端关闭连接但最后一行没有换行结尾
        if (done) {
          if (sseBuffer.trim()) processSseLine(sseBuffer)
          break
        }
      }
    } finally {
      // 收到 [DONE] / finish_reason 时我们会主动跳出循环，此时流还没读完，
      // 不 cancel 的话这条连接会一直挂着（一次广播 20+ 个模型，很快就堆满）。
      reader.cancel().catch(() => {})
    }

    if (upstreamError) {
      throw Object.assign(new Error(JSON.stringify(upstreamError)), { status: 502, partial: accumulated })
    }
    // 连接结束了但没有收到 [DONE] / finish_reason：回答被截断
    if (!isDone) throw streamFailure('interrupted', accumulated)

    return accumulated
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', onUserAbort)
  }
}

/** 生图。抛 UnsupportedImageModelError 表示该模型不支持，其余为真实失败。 */
export async function generateImage(req: ImageRequest): Promise<string[]> {
  try {
    const res = await http.post<ImageResponse>('api/image', req)
    return res.images
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 422) throw new UnsupportedImageModelError()
      const details = err.details as { error?: string; message?: string; upstream?: boolean } | undefined
      // 同 streamChat：没有 upstream 标记的 401 是自己登录过期，不是厂商 key 问题
      if (err.status === 401 && !details?.upstream) {
        throw Object.assign(new Error('session_expired'), { status: 401, sessionExpired: true })
      }
      throw Object.assign(new Error(details?.message ?? err.message), {
        status: err.status,
        apiMessage: details?.message,
        // 自家 api 的错误码，供界面按当前语言给出原因
        code: details?.error,
      })
    }
    throw err
  }
}

/** 服务端各供应商是否已配置 key（只有布尔值）。失败时返回 null，调用方按「未知」处理。 */
export async function fetchProviders(): Promise<ProvidersResponse | null> {
  try {
    return await http.get<ProvidersResponse>('api/providers')
  } catch {
    return null
  }
}
