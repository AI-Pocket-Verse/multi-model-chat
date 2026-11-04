import { Readable } from 'node:stream'

import { PROVIDER_KEYS } from '@multi-model-chat/shared'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { isTargetError, resolveTarget, upstreamHeaders } from '../providers'

const ChatBody = z.object({
  provider: z.enum(PROVIDER_KEYS as unknown as [string, ...string[]]),
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      }),
    )
    .min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
})

/**
 * POST /api/chat —— 各家 OpenAI 兼容 /chat/completions 的流式代理。
 *
 * 关键设计：上游 SSE **原封不动 pipe** 给前端。api 不解析、不改写、不重新封帧，
 * 前端按标准 OpenAI 流式格式自行解析 `data:` 行。
 */
export async function chatRoutes(app: FastifyInstance) {
  app.post('/api/chat', { preHandler: app.requireAuth() }, async (request, reply) => {
    const parsed = ChatBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid request', details: z.flattenError(parsed.error) })
    }
    const { provider, model, messages, apiKey, baseUrl: requestBaseUrl } = parsed.data as {
      provider: Parameters<typeof resolveTarget>[0]
      model: string
      messages: { role: string; content: string }[]
      apiKey?: string
      baseUrl?: string
    }

    const target = resolveTarget(provider, { apiKey, baseUrl: requestBaseUrl })
    if (isTargetError(target)) return reply.code(target.status).send(target.body)

    // 客户端断开时同步中断上游，避免用户关掉页面后厂商侧仍在计费产出。
    // 必须监听 reply.raw（响应）而不是 request.raw：Node 16 起 IncomingMessage 的 'close'
    // 在请求体读完后立刻触发，不代表连接断开，且 Fastify 解析完 body 才进 handler，
    // 此处注册监听时它早已触发过。响应正常写完时也会 'close'，用 writableFinished 排除。
    const upstreamAbort = new AbortController()
    reply.raw.on('close', () => {
      if (!reply.raw.writableFinished) upstreamAbort.abort()
    })

    let upstream: Response
    try {
      upstream = await fetch(`${target.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: upstreamHeaders(target.apiKey),
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          // Kimi K2.5 默认开启 thinking，会把超长推理链混进正文 —— 原样保留这处特判
          ...(provider === 'kimi' ? { thinking: { type: 'disabled' } } : {}),
        }),
        signal: upstreamAbort.signal,
      })
    } catch (err) {
      // 客户端自己断开的，连接已经没了，不必再回错误
      if (upstreamAbort.signal.aborted) return reply
      // 否则是真的连不上上游（DNS / 网络 / 证书）。不兜住的话 Fastify 会吐一坨
      // 默认 500 JSON，被前端当作模型返回内容整段显示出来。
      return reply.code(502).header('x-upstream-error', '1').send({
        error: 'upstream_unreachable',
        message: `无法连接到 ${provider} 服务：${(err as Error).message}`,
      })
    }

    // 上游报错：把状态码与原始 body 原样透传，让前端的错误分类逻辑
    // （余额不足 / 401 / 429 / 各厂商专属建议，见 web/src/lib/errors.ts）能拿到原文。
    // x-upstream-error 用于让前端区分「厂商返回的 401」和「自己没登录的 401」。
    if (!upstream.ok || !upstream.body) {
      const rawBody = await upstream.text().catch(() => '')
      return reply
        .code(upstream.status)
        .header('x-upstream-error', '1')
        .header('content-type', upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8')
        .send(rawBody)
    }

    const stream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0])
    // 客户端中途断开时我们会 abort 上游，这条 stream 随即 emit 'error'。
    // Node 的 stream 没有 error 监听就会抛成 uncaught exception —— 一个用户关掉页面
    // 就可能把整个 api 进程打挂，所以这里必须兜住（属于正常中断，无需告警）。
    stream.on('error', () => {})

    return reply
      .header('content-type', upstream.headers.get('content-type') ?? 'text/event-stream')
      .header('cache-control', 'no-cache, no-transform')
      .header('connection', 'keep-alive')
      // 关掉中间层缓冲，否则 nginx 等反向代理可能攒够一批才下发 → 打字机效果消失
      .header('x-accel-buffering', 'no')
      .send(stream)
  })
}
