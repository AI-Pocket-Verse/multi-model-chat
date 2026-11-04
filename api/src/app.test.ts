import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'

// env.ts reads process.env at import time, so each case stubs the env and
// re-imports the real app.
async function build(env: Record<string, string>): Promise<FastifyInstance> {
  for (const k of ['WHOAMI_URL', 'DEEPSEEK_API_KEY', 'QWEN_API_KEY']) vi.stubEnv(k, '')
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  vi.resetModules()
  const { buildApp } = await import('./app')
  const app = await buildApp()
  await app.ready()
  return app
}

const chat = { provider: 'deepseek', model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }] }

describe('multi-model-chat-api', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    await app?.close()
    app = undefined
    vi.unstubAllEnvs()
  })

  it('/healthz 可用', async () => {
    app = await build({})
    expect((await app.inject({ method: 'GET', url: '/healthz' })).statusCode).toBe(200)
  })

  // 内置 key 直接花钱：接入登录后，未登录不得调用代理
  it('SSO 模式：未登录调 /api/chat 返回 401', async () => {
    app = await build({ WHOAMI_URL: 'http://127.0.0.1:9/api/whoami' })
    const res = await app.inject({ method: 'POST', url: '/api/chat', payload: chat })
    expect(res.statusCode).toBe(401)
  })

  // 开源默认体验：本地模式、还没配 key。用户必须看到「该配哪个 key」，而不是
  // 被共享错误处理器替换成的「服务器内部错误」。
  it('本地模式未配 key：/api/chat 返回 503 provider_key_missing 和可读原因', async () => {
    app = await build({})
    const res = await app.inject({ method: 'POST', url: '/api/chat', payload: chat })
    expect(res.statusCode).toBe(503)
    expect(res.json()).toMatchObject({ error: 'provider_key_missing' })
    expect(res.json().message).toContain('deepseek')
  })

  it('本地模式未配 key：/api/image 同样返回 provider_key_missing', async () => {
    app = await build({})
    const res = await app.inject({
      method: 'POST',
      url: '/api/image',
      payload: { provider: 'qwen', model: 'qwen-image-2.0-pro', prompt: '一只猫' },
    })
    expect(res.statusCode).toBe(503)
    expect(res.json()).toMatchObject({ error: 'provider_key_missing' })
  })
})

// 限流按 req.ip 分桶：只有来自可信反代（默认 loopback）的 X-Forwarded-For 才能改写 req.ip。
describe('trustProxy', () => {
  async function ipOf(remoteAddress: string, xff: string, env: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
    vi.resetModules()
    const { buildApp } = await import('./app')
    const app = await buildApp()
    app.get('/_ip', async (req) => ({ ip: req.ip }))
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/_ip', remoteAddress, headers: { 'x-forwarded-for': xff } })
    await app.close()
    vi.unstubAllEnvs()
    return res.json().ip as string
  }

  it('默认 loopback：本机 nginx 转发的 XFF 被采信', async () => {
    expect(await ipOf('127.0.0.1', '198.51.100.7')).toBe('198.51.100.7')
  })
  it('默认 loopback：非可信来源直连时伪造的 XFF 被忽略', async () => {
    expect(await ipOf('203.0.113.9', '198.51.100.7')).toBe('203.0.113.9')
  })
  it('TRUST_PROXY 可指定其他反代地址', async () => {
    expect(await ipOf('10.0.0.5', '198.51.100.7', { TRUST_PROXY: '10.0.0.0/8' })).toBe('198.51.100.7')
  })
  // Fastify 5.12 起跳数信任会静默变成「不信任任何代理」，启动时直接报错更好排查
  it('TRUST_PROXY 写跳数时启动报错', async () => {
    vi.stubEnv('TRUST_PROXY', '1')
    vi.resetModules()
    await expect(import('./app')).rejects.toThrow(/hop counts are not supported/)
    vi.unstubAllEnvs()
  })
})

