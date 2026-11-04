import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProvidersResponse } from '@multi-model-chat/shared'

/**
 * 模型编辑 / 版本切换 / 恢复预置 / 首次访问按服务端 key 激活。
 * 网络层与 IndexedDB 换成桩，store 走真实的 persist 水合与 init 调用链。
 */
const streamChat = vi.fn()
const fetchProviders = vi.fn<() => Promise<ProvidersResponse | null>>()
vi.mock('../lib/api', () => ({
  streamChat: (...a: unknown[]) => streamChat(...a),
  generateImage: vi.fn(),
  fetchProviders: () => fetchProviders(),
  UnsupportedImageModelError: class extends Error {},
}))
vi.mock('../lib/db', () => ({
  loadAllConversations: async () => ({}),
  saveConversation: async () => {},
  saveConversationDebounced: () => {},
  deleteConversation: async () => {},
}))
vi.mock('../lib/toast', () => ({ showToast: () => {} }))

const ONLY_DEEPSEEK: ProvidersResponse = {
  configured: {
    volcengine: false,
    qwen: false,
    deepseek: true,
    zhipu: false,
    kimi: false,
    minimax: false,
    custom: false,
  },
  allowUserBaseUrl: true,
}

/** 每个用例重新加载 store 模块，让 persist 按当时的 localStorage 重新水合 */
async function loadStore() {
  vi.resetModules()
  const mod = await import('./aiModel')
  await mod.useAiModelStore.getState().init()
  await new Promise((r) => setTimeout(r, 0)) // 等 init 里触发的 loadProviders
  return mod
}

const tick = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  localStorage.clear()
  streamChat.mockReset()
  fetchProviders.mockReset()
  fetchProviders.mockResolvedValue(null)
})
afterEach(() => vi.restoreAllMocks())

describe('首次访问按服务端 key 激活模型', () => {
  it('只配了 DeepSeek → 只激活 DeepSeek 的预置模型', async () => {
    fetchProviders.mockResolvedValue(ONLY_DEEPSEEK)
    const { useAiModelStore } = await loadStore()
    expect([...useAiModelStore.getState().activeModels].sort()).toEqual(['ds_chat', 'ds_reasoner'])
    expect(useAiModelStore.getState().providerStatus).toEqual(ONLY_DEEPSEEK)
  })

  it('老用户（已有存档）不被覆盖', async () => {
    localStorage.setItem(
      'multi-model-chat-state',
      JSON.stringify({ state: { activeModels: ['glm5'] }, version: 0 }),
    )
    fetchProviders.mockResolvedValue(ONLY_DEEPSEEK)
    const { useAiModelStore } = await loadStore()
    expect([...useAiModelStore.getState().activeModels]).toEqual(['glm5'])
  })

  it('一家都没配 → 保持预置的默认激活（各窗口会提示该去哪配 key）', async () => {
    fetchProviders.mockResolvedValue({
      ...ONLY_DEEPSEEK,
      configured: { ...ONLY_DEEPSEEK.configured, deepseek: false },
    })
    const { useAiModelStore } = await loadStore()
    expect(useAiModelStore.getState().activeModels.size).toBe(12)
  })

  it('接口失败 → 保持预置的默认激活', async () => {
    const { useAiModelStore } = await loadStore()
    expect(useAiModelStore.getState().activeModels.size).toBe(12)
    expect(useAiModelStore.getState().providerStatus).toBeNull()
  })
})

describe('switchModelVersion', () => {
  it('切换版本：默认显示名跟着换，对话历史保留，下一轮用新版本请求', async () => {
    const { useAiModelStore } = await loadStore()
    const s = useAiModelStore.getState()
    for (const m of s.models) s.toggleModel(m.id, m.id === 'qwen35_flash')
    streamChat.mockResolvedValueOnce('第一轮')
    s.sendBroadcast('你好')
    await tick()

    useAiModelStore.getState().switchModelVersion('qwen35_flash', 'qwen3-max')
    const model = useAiModelStore.getState().models.find((m) => m.id === 'qwen35_flash')!
    expect(model).toMatchObject({ version: 'qwen3-max', label: 'Qwen3-Max' })
    expect(useAiModelStore.getState().conversations.qwen35_flash).toHaveLength(2)

    streamChat.mockResolvedValueOnce('第二轮')
    useAiModelStore.getState().sendBroadcast('继续')
    await tick()
    expect(streamChat.mock.calls[1]![0]).toMatchObject({ provider: 'qwen', model: 'qwen3-max' })
  })

  it('用户自己改过的显示名保留', async () => {
    const { useAiModelStore } = await loadStore()
    useAiModelStore.getState().updateModel('qwen35_flash', { label: '我的千问' })
    useAiModelStore.getState().switchModelVersion('qwen35_flash', 'qwen3-max')
    expect(useAiModelStore.getState().models.find((m) => m.id === 'qwen35_flash')!.label).toBe('我的千问')
  })

  it('响应中不允许切换', async () => {
    const { useAiModelStore } = await loadStore()
    const s = useAiModelStore.getState()
    for (const m of s.models) s.toggleModel(m.id, m.id === 'ds_chat')
    streamChat.mockReturnValueOnce(new Promise(() => {}))
    s.sendBroadcast('hi')
    useAiModelStore.getState().switchModelVersion('ds_chat', 'deepseek-reasoner')
    expect(useAiModelStore.getState().models.find((m) => m.id === 'ds_chat')!.version).toBe('deepseek-chat')
  })
})

describe('updateModel', () => {
  it('custom 模型的 baseUrl 与 key 随请求发出；其它供应商不发 baseUrl', async () => {
    const { useAiModelStore } = await loadStore()
    const s = useAiModelStore.getState()
    s.addModel({
      id: 'my_custom',
      provider: 'custom',
      version: 'llama3.2',
      label: 'Llama',
      color: '#64748b',
      active: true,
      baseUrl: 'http://127.0.0.1:11434/v1',
    })
    for (const m of useAiModelStore.getState().models) s.toggleModel(m.id, m.id === 'my_custom' || m.id === 'ds_chat')
    useAiModelStore.getState().updateModel('ds_chat', { baseUrl: 'https://ignored.example.com' })
    streamChat.mockResolvedValue('ok')
    useAiModelStore.getState().sendBroadcast('hi')
    await tick()
    const reqs = streamChat.mock.calls.map((c) => c[0] as Record<string, unknown>)
    expect(reqs.find((r) => r.provider === 'custom')).toMatchObject({ baseUrl: 'http://127.0.0.1:11434/v1' })
    expect(reqs.find((r) => r.provider === 'deepseek')).not.toHaveProperty('baseUrl')
  })

  it('改了调用目标时取消在途请求，迟到的回复不写回', async () => {
    const { useAiModelStore } = await loadStore()
    const s = useAiModelStore.getState()
    for (const m of s.models) s.toggleModel(m.id, m.id === 'ds_chat')
    let signal: AbortSignal | undefined
    streamChat.mockImplementationOnce((_req, opts: { signal: AbortSignal }) => {
      signal = opts.signal
      return new Promise(() => {})
    })
    s.sendBroadcast('hi')
    useAiModelStore.getState().updateModel('ds_chat', { version: 'deepseek-reasoner' })
    expect(signal?.aborted).toBe(true)
    expect(useAiModelStore.getState().streaming.has('ds_chat')).toBe(false)
  })
})

describe('resetModels', () => {
  it('恢复预置：自建模型移除，预置模型的对话保留', async () => {
    const { useAiModelStore } = await loadStore()
    const s = useAiModelStore.getState()
    s.addModel({ id: 'x', provider: 'deepseek', version: 'deepseek-chat', label: 'X', color: '#000', active: true })
    s.removeModel('glm5')
    for (const m of useAiModelStore.getState().models) s.toggleModel(m.id, m.id === 'ds_chat')
    streamChat.mockResolvedValueOnce('答')
    s.sendBroadcast('问')
    await tick()

    useAiModelStore.getState().resetModels()
    const after = useAiModelStore.getState()
    expect(after.models.map((m) => m.id)).not.toContain('x')
    expect(after.models.map((m) => m.id)).toContain('glm5')
    expect(after.models).toHaveLength(23)
    expect(after.conversations.ds_chat).toHaveLength(2)
    expect(after.conversations.x).toBeUndefined()
  })
})
