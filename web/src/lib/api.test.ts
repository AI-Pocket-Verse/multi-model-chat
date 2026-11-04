import type { ChatRequest } from '@multi-model-chat/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { streamChat } from './api'

const req: ChatRequest = { provider: 'deepseek', model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }] }
const enc = new TextEncoder()

function sseResponse(chunks: string[], opts: { hang?: boolean } = {}): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch))
      if (!opts.hang) c.close()
    },
  })
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}
const delta = (t: string, extra = '') => `data: {"choices":[{"delta":{"content":"${t}"}${extra}}]}\n\n`

afterEach(() => vi.unstubAllGlobals())

describe('streamChat 流结束判定', () => {
  it('收到 [DONE]：返回全文', async () => {
    vi.stubGlobal('fetch', async () => sseResponse([delta('he'), delta('llo'), 'data: [DONE]\n\n']))
    await expect(streamChat(req, { onDelta: () => {} })).resolves.toBe('hello')
  })

  it('只有 finish_reason（无 [DONE]）也算正常结束，含 content_filter 等非 stop 原因', async () => {
    vi.stubGlobal('fetch', async () => sseResponse([delta('ok', ',"finish_reason":"content_filter"')]))
    await expect(streamChat(req, { onDelta: () => {} })).resolves.toBe('ok')
  })

  it('连接在 [DONE] 之前结束：抛 interrupted，并带上已收到的部分文本', async () => {
    vi.stubGlobal('fetch', async () => sseResponse([delta('part')]))
    await expect(streamChat(req, { onDelta: () => {} })).rejects.toMatchObject({ interrupted: true, partial: 'part' })
  })

  it('流中途网络错误：抛 interrupted', async () => {
    vi.stubGlobal('fetch', async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(enc.encode(delta('a')))
        },
        pull(c) {
          c.error(new TypeError('network error'))
        },
      })
      return new Response(stream, { status: 200 })
    })
    await expect(streamChat(req, { onDelta: () => {} })).rejects.toMatchObject({ interrupted: true, partial: 'a' })
  })

  it('厂商中途返回 error 帧：抛错且 message 里带原始 JSON，供 errors.ts 解析', async () => {
    vi.stubGlobal('fetch', async () =>
      sseResponse([delta('x'), 'data: {"error":{"message":"overloaded"}}\n\n']),
    )
    const err = await streamChat(req, { onDelta: () => {} }).catch((e) => e)
    expect(err.message).toContain('overloaded')
    expect(err.partial).toBe('x')
    expect(err.interrupted).toBeUndefined()
  })
})

describe('streamChat 空闲超时与取消', () => {
  it('上游一直不返回数据：超过空闲超时抛 timeout 并中止请求', async () => {
    let signal: AbortSignal | undefined
    vi.stubGlobal('fetch', (_u: unknown, init?: RequestInit) => {
      signal = init?.signal ?? undefined
      return new Promise((_res, rej) => signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))
    })
    await expect(streamChat(req, { onDelta: () => {}, idleTimeoutMs: 30 })).rejects.toMatchObject({ timeout: true })
    expect(signal!.aborted).toBe(true)
  })

  it('流到一半停住：超时后保留已收到的文本', async () => {
    vi.stubGlobal('fetch', async (_u: unknown, init?: RequestInit) => {
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(enc.encode(delta('half')))
          init?.signal?.addEventListener('abort', () => c.error(new DOMException('aborted', 'AbortError')))
        },
      })
      return new Response(stream, { status: 200 })
    })
    await expect(streamChat(req, { onDelta: () => {}, idleTimeoutMs: 30 })).rejects.toMatchObject({
      timeout: true,
      partial: 'half',
    })
  })

  it('调用方主动取消：抛 AbortError，不标成超时 / 中断', async () => {
    vi.stubGlobal('fetch', (_u: unknown, init?: RequestInit) =>
      new Promise((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))),
    )
    const ctrl = new AbortController()
    const p = streamChat(req, { onDelta: () => {}, signal: ctrl.signal })
    ctrl.abort()
    const err = await p.catch((e) => e)
    expect(err.name).toBe('AbortError')
    expect(err.timeout).toBeUndefined()
    expect(err.interrupted).toBeUndefined()
  })
})
