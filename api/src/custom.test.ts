import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * 自定义 OpenAI 兼容供应商、/api/providers 与本地模式 Host 校验。
 * 走真实的 env 解析 + buildApp，只把发往上游的 fetch 换成记录器。
 */
const ENV_KEYS = [
  'WHOAMI_URL',
  'CUSTOM_BASE_URL',
  'CUSTOM_API_KEY',
  'ALLOW_USER_BASE_URL',
  'ALLOWED_HOSTS',
  'DEEPSEEK_API_KEY',
  'QWEN_API_KEY',
]

interface UpstreamCall {
  url: string
  headers: Record<string, string>
  body: any
}

async function build(env: Record<string, string>) {
  for (const k of ENV_KEYS) vi.stubEnv(k, '')
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  const calls: UpstreamCall[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) })
      // 生图返回 OpenAI 标准格式；chat 返回一帧就结束的 SSE
      if (url.endsWith('/images/generations')) {
        return new Response(JSON.stringify({ data: [{ b64_json: 'AAAA' }] }), { status: 200 })
      }
      return new Response('data: {"choices":[{"delta":{"content":"hi"},"finish_reason":"stop"}]}\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })
    }),
  )
  vi.resetModules()
  const { buildApp } = await import('./app')
  const app = await buildApp()
  await app.ready()
  return { app, calls }
}

const chat = (extra: Record<string, unknown>) => ({
  provider: 'custom',
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'hi' }],
  ...extra,
})

describe('custom 供应商', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    await app?.close()
    app = undefined
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('用服务端 CUSTOM_BASE_URL 与 CUSTOM_API_KEY', async () => {
    const built = await build({ CUSTOM_BASE_URL: 'https://llm.example.com/v1/', CUSTOM_API_KEY: 'sk-server' })
    app = built.app
    const res = await app.inject({ method: 'POST', url: '/api/chat', payload: chat({}) })
    expect(res.statusCode).toBe(200)
    expect(built.calls[0]?.url).toBe('https://llm.example.com/v1/chat/completions')
    expect(built.calls[0]?.headers.Authorization).toBe('Bearer sk-server')
  })

  // 最关键的一条：服务端 key 绝不能发到用户指定的地址
  it('自填 baseUrl 时不带服务端 key', async () => {
    const built = await build({ CUSTOM_BASE_URL: 'https://llm.example.com/v1', CUSTOM_API_KEY: 'sk-server' })
    app = built.app
    const res = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: chat({ baseUrl: 'https://attacker.example.com/v1' }),
    })
    expect(res.statusCode).toBe(200)
    expect(built.calls[0]?.url).toBe('https://attacker.example.com/v1/chat/completions')
    expect(built.calls[0]?.headers.Authorization).toBeUndefined()
  })

  it('自填 baseUrl + 自带 key：用自带 key（Ollama 等无 key 服务也能直接用）', async () => {
    const built = await build({})
    app = built.app
    const res = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: chat({ baseUrl: 'http://127.0.0.1:11434/v1', apiKey: 'sk-own' }),
    })
    expect(res.statusCode).toBe(200)
    expect(built.calls[0]?.headers.Authorization).toBe('Bearer sk-own')
  })

  it('登录模式默认禁止自填 baseUrl', async () => {
    const built = await build({ WHOAMI_URL: 'http://127.0.0.1:9/api/whoami' })
    app = built.app
    const { env } = await import('./env')
    expect(env.ALLOW_USER_BASE_URL).toBe(false)
    const { resolveTarget } = await import('./providers')
    expect(resolveTarget('custom', { baseUrl: 'http://10.0.0.1/v1' })).toMatchObject({
      status: 403,
      body: { error: 'custom_base_url_forbidden' },
    })
  })

  it('非 http(s) 地址被拒绝', async () => {
    const built = await build({})
    app = built.app
    const res = await app.inject({ method: 'POST', url: '/api/chat', payload: chat({ baseUrl: 'file:///etc/passwd' }) })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: 'invalid_base_url' })
    expect(built.calls).toHaveLength(0)
  })

  it('两处都没有地址：503 custom_base_url_missing', async () => {
    const built = await build({})
    app = built.app
    const res = await app.inject({ method: 'POST', url: '/api/chat', payload: chat({}) })
    expect(res.statusCode).toBe(503)
    expect(res.json()).toMatchObject({ error: 'custom_base_url_missing' })
  })

  it('固定供应商忽略请求里的 baseUrl', async () => {
    const built = await build({ DEEPSEEK_API_KEY: 'sk-ds' })
    app = built.app
    await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { ...chat({ baseUrl: 'https://attacker.example.com' }), provider: 'deepseek', model: 'deepseek-chat' },
    })
    expect(built.calls[0]?.url).toBe('https://api.deepseek.com/chat/completions')
  })

  it('gpt-image 走 /images/generations，b64_json 转成 dataURL', async () => {
    const built = await build({ CUSTOM_BASE_URL: 'https://llm.example.com/v1', CUSTOM_API_KEY: 'sk-server' })
    app = built.app
    const res = await app.inject({
      method: 'POST',
      url: '/api/image',
      payload: { provider: 'custom', model: 'gpt-image-1', prompt: 'a cat' },
    })
    expect(res.statusCode).toBe(200)
    expect(built.calls[0]?.url).toBe('https://llm.example.com/v1/images/generations')
    expect(res.json()).toEqual({ images: ['data:image/png;base64,AAAA'] })
  })
})

describe('GET /api/providers', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    await app?.close()
    app = undefined
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('只返回布尔值，不含 key 与地址', async () => {
    const built = await build({ DEEPSEEK_API_KEY: 'sk-ds', CUSTOM_BASE_URL: 'https://llm.example.com/v1' })
    app = built.app
    const res = await app.inject({ method: 'GET', url: '/api/providers' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      configured: {
        volcengine: false,
        qwen: false,
        deepseek: true,
        zhipu: false,
        kimi: false,
        minimax: false,
        custom: true,
      },
      allowUserBaseUrl: true,
    })
    expect(res.body).not.toContain('sk-ds')
    expect(res.body).not.toContain('llm.example.com')
  })
})

describe('本地模式 Host 校验（防 DNS 重绑定）', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    await app?.close()
    app = undefined
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  const get = (host: string) => app!.inject({ method: 'GET', url: '/api/providers', headers: { host } })

  it('localhost / 127.0.0.1 / [::1] 放行，其它域名 403', async () => {
    app = (await build({})).app
    expect((await get('localhost:5160')).statusCode).toBe(200)
    expect((await get('127.0.0.1:4060')).statusCode).toBe(200)
    expect((await get('[::1]:4060')).statusCode).toBe(200)
    const res = await get('evil.example.com')
    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({ error: 'host_not_allowed' })
  })

  it('ALLOWED_HOSTS 可追加', async () => {
    app = (await build({ ALLOWED_HOSTS: 'chat.example.com, 192.168.1.10' })).app
    expect((await get('chat.example.com')).statusCode).toBe(200)
    expect((await get('192.168.1.10:4060')).statusCode).toBe(200)
  })

  it('登录模式不做 Host 限制（由登录态保护）', async () => {
    app = (await build({ WHOAMI_URL: 'http://127.0.0.1:9/api/whoami' })).app
    // 未登录 → 401，而不是 host_not_allowed
    expect((await get('chat.example.com')).statusCode).toBe(401)
  })
})
