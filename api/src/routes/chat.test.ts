import { request } from 'node:http'
import type { AddressInfo } from 'node:net'

import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'

// 回归：客户端中途断开连接时，api 必须取消发往厂商的上游请求。
// 走真实 HTTP 连接（app.listen + node:http），不能用 app.inject —— inject 没有 socket，测不到断开。
async function startApp(): Promise<{ app: FastifyInstance; port: number }> {
  for (const k of ['WHOAMI_URL']) vi.stubEnv(k, '')
  vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test')
  vi.resetModules()
  const { buildApp } = await import('../app')
  const app = await buildApp()
  await app.listen({ port: 0, host: '127.0.0.1' })
  return { app, port: (app.server.address() as AddressInfo).port }
}

function waitFor(cond: () => boolean, ms = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const tick = () => {
      if (cond()) return resolve()
      if (Date.now() - t0 > ms) return reject(new Error('waitFor timeout'))
      setTimeout(tick, 10)
    }
    tick()
  })
}

const body = JSON.stringify({
  provider: 'deepseek',
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: 'hi' }],
})

describe('POST /api/chat 客户端断开 → 取消上游', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    await app?.close()
    app = undefined
  })

  function post(port: number) {
    const req = request({
      host: '127.0.0.1',
      port,
      method: 'POST',
      path: '/api/chat',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
    })
    req.on('error', () => {}) // 主动 destroy 会触发 ECONNRESET
    req.end(body)
    return req
  }

  it('上游还没返回响应头时断开：上游 signal 被 abort', async () => {
    let upstreamSignal: AbortSignal | undefined
    vi.stubGlobal('fetch', (_url: unknown, init?: RequestInit) => {
      upstreamSignal = init?.signal ?? undefined
      return new Promise((_resolve, reject) => {
        upstreamSignal?.addEventListener('abort', () => reject(upstreamSignal!.reason))
      })
    })
    const started = await startApp()
    app = started.app
    const req = post(started.port)
    await waitFor(() => upstreamSignal !== undefined)
    expect(upstreamSignal!.aborted).toBe(false)
    req.destroy() // 真实断开 TCP 连接
    await waitFor(() => upstreamSignal!.aborted)
  })

  it('上游已开始流式返回后断开：上游 signal 被 abort', async () => {
    let upstreamSignal: AbortSignal | undefined
    vi.stubGlobal('fetch', (_url: unknown, init?: RequestInit) => {
      upstreamSignal = init?.signal ?? undefined
      const enc = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"he"}}]}\n\n'))
          // 不 close：模拟模型还在生成
          upstreamSignal?.addEventListener('abort', () => c.error(upstreamSignal!.reason))
        },
      })
      return Promise.resolve(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }))
    })
    const started = await startApp()
    app = started.app
    const req = post(started.port)
    await new Promise<void>((resolve) => req.on('response', (res) => res.once('data', () => resolve())))
    expect(upstreamSignal!.aborted).toBe(false)
    req.destroy()
    await waitFor(() => upstreamSignal!.aborted)
  })

  it('正常流完整结束不会被当成断开', async () => {
    let upstreamSignal: AbortSignal | undefined
    vi.stubGlobal('fetch', (_url: unknown, init?: RequestInit) => {
      upstreamSignal = init?.signal ?? undefined
      return Promise.resolve(
        new Response('data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      )
    })
    const started = await startApp()
    app = started.app
    const text = await new Promise<string>((resolve) => {
      const req = request(
        { host: '127.0.0.1', port: started.port, method: 'POST', path: '/api/chat', headers: { 'content-type': 'application/json' } },
        (res) => {
          let s = ''
          res.on('data', (d) => (s += d))
          res.on('end', () => resolve(s))
        },
      )
      req.end(body)
    })
    expect(text).toContain('[DONE]')
    await new Promise((r) => setTimeout(r, 50))
    expect(upstreamSignal!.aborted).toBe(false)
  })
})
