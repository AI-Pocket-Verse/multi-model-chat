import { PROVIDER_KEYS } from '@multi-model-chat/shared'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { extractImageApiError, getImageGenerationConfig, isTargetError, resolveTarget, upstreamHeaders } from '../providers'

const ImageBody = z.object({
  provider: z.enum(PROVIDER_KEYS as unknown as [string, ...string[]]),
  model: z.string().min(1),
  prompt: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
})

/**
 * POST /api/image —— 生图代理（qwen-image / glm-image·CogView / doubao-seedream / image-01 / gpt-image·dall-e）。
 *
 * 与 chat 不同，生图是一次性 JSON 响应：四家的 endpoint、请求体、响应结构各不相同，
 * 差异全部封在 providers.getImageGenerationConfig 里。
 * 前端只拿到归一化后的 { images: string[] }。
 */
export async function imageRoutes(app: FastifyInstance) {
  app.post('/api/image', { preHandler: app.requireAuth() }, async (request, reply) => {
    const parsed = ImageBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid request', details: z.flattenError(parsed.error) })
    }
    const { provider, model, prompt, apiKey, baseUrl: requestBaseUrl } = parsed.data as {
      provider: Parameters<typeof resolveTarget>[0]
      model: string
      prompt: string
      apiKey?: string
      baseUrl?: string
    }

    // 该模型不支持直接生图 —— 用 422 与「调用失败」区分开，前端据此给出
    // 「当前模型不支持直接生成图片」的原文案，而不是报错文案。
    if (!getImageGenerationConfig({ provider, model, prompt })) {
      return reply.code(422).send({ error: 'unsupported_image_model' })
    }

    const target = resolveTarget(provider, { apiKey, baseUrl: requestBaseUrl })
    if (isTargetError(target)) return reply.code(target.status).send(target.body)
    const config = getImageGenerationConfig({ provider, model, prompt }, target.baseUrl)!

    let upstream: Response
    try {
      upstream = await fetch(config.endpoint, {
        method: 'POST',
        headers: upstreamHeaders(target.apiKey),
        body: JSON.stringify(config.body),
        // 生图没有流式反馈，上游一旦挂起前端就会无限转圈、发送按钮也不解锁。
        // 300s 远高于各家的典型耗时，只用来兜死锁。
        signal: AbortSignal.timeout(300_000),
      })
    } catch (err) {
      const timedOut = (err as Error).name === 'TimeoutError'
      return reply.code(504).send({
        error: timedOut ? 'upstream_timeout' : 'upstream_unreachable',
        upstream: true,
        message: timedOut
          ? `${provider} 生图超时（已等待 300 秒），请稍后重试或换用其它生图模型`
          : `无法连接到 ${provider} 服务：${(err as Error).message}`,
      })
    }

    // 先取文本再尝试 JSON，解析失败时 payload 置 null
    const rawBody = await upstream.text()
    let payload: unknown = null
    try {
      payload = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      payload = null
    }

    // upstream:true 让前端区分「厂商返回的 401」与「自己没登录的 401」
    if (!upstream.ok) {
      const p = payload as Record<string, any> | null
      return reply.code(upstream.status).send({
        error: 'upstream_error',
        upstream: true,
        message: p?.error?.message || p?.message || rawBody || '图片生成失败',
      })
    }

    // 部分厂商 HTTP 200 也会在 body 里报错（如 MiniMax 的 base_resp.status_code）
    const apiError = extractImageApiError(payload)
    if (apiError)
      return reply.code(502).send({ error: 'upstream_error', upstream: true, message: apiError })

    const images = config.extractImages(payload)
    if (!images.length) {
      return reply
        .code(502)
        .send({ error: 'no_image', message: '模型已响应，但未返回可渲染的图片链接' })
    }

    return reply.send({ images })
  })
}
