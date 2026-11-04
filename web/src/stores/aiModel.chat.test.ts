import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 网络层与 IndexedDB 换成桩，其余走真实的 store（sendBroadcast -> runChat -> 组装上下文）。
const streamChat = vi.fn()
vi.mock('../lib/api', () => ({
  streamChat: (...a: unknown[]) => streamChat(...a),
  generateImage: vi.fn(),
  fetchProviders: async () => null,
  UnsupportedImageModelError: class extends Error {},
}))
vi.mock('../lib/db', () => ({
  loadAllConversations: async () => ({}),
  saveConversation: async () => {},
  saveConversationDebounced: () => {},
  deleteConversation: async () => {},
}))
vi.mock('../lib/toast', () => ({ showToast: () => {} }))

import { useAiModelStore } from './aiModel'

const MODEL_ID = 'ds_chat'

async function setup() {
  await useAiModelStore.getState().init()
  const s = useAiModelStore.getState()
  // 只留一个激活模型，便于断言
  for (const m of s.models) s.toggleModel(m.id, m.id === MODEL_ID)
  useAiModelStore.setState({ persona: '' })
  s.clearConversation(MODEL_ID)
}

const tick = () => new Promise((r) => setTimeout(r, 0))
const conv = () => useAiModelStore.getState().conversations[MODEL_ID]!

beforeEach(async () => {
  streamChat.mockReset()
  localStorage.clear()
  await setup()
})
afterEach(() => vi.restoreAllMocks())

describe('失败提示不进入下一轮上下文', () => {
  it('第一轮失败后再发一句：发给上游的 messages 里没有错误文案，且 user 消息已合并', async () => {
    streamChat.mockRejectedValueOnce(Object.assign(new Error('{"error":{"message":"Invalid API key"}}'), { status: 401 }))
    useAiModelStore.getState().sendBroadcast('第一句')
    await tick(); await tick()
    expect(conv()[1]).toMatchObject({ role: 'assistant', error: true })
    expect(conv()[1]!.content).toContain('API 请求失败')

    streamChat.mockResolvedValueOnce('好的')
    useAiModelStore.getState().sendBroadcast('第二句')
    await tick()
    const sent = streamChat.mock.calls[1]![0] as { messages: { role: string; content: string }[] }
    expect(sent.messages).toEqual([{ role: 'user', content: '第一句\n\n第二句' }])
    expect(JSON.stringify(sent.messages)).not.toContain('API 请求失败')
  })

  it('模型返回空内容的占位提示同样不发给上游', async () => {
    streamChat.mockResolvedValueOnce('')
    useAiModelStore.getState().sendBroadcast('a')
    await tick(); await tick()
    expect(conv()[1]).toMatchObject({ content: '（模型未返回文本内容）', error: true })
  })

  it('正常回答仍然进入上下文', async () => {
    streamChat.mockImplementationOnce(async (_req: unknown, opts: { onDelta: (t: string) => void }) => {
      opts.onDelta('回答一')
      return '回答一'
    })
    useAiModelStore.getState().sendBroadcast('问题一')
    await tick(); await tick()
    streamChat.mockResolvedValueOnce('回答二')
    useAiModelStore.getState().sendBroadcast('问题二')
    await tick()
    const sent = streamChat.mock.calls[1]![0] as { messages: { role: string; content: string }[] }
    expect(sent.messages).toEqual([
      { role: 'user', content: '问题一' },
      { role: 'assistant', content: '回答一' },
      { role: 'user', content: '问题二' },
    ])
  })
})

describe('流中断', () => {
  it('中断且已有部分文本：保留文本并标注不完整，不标为 error', async () => {
    streamChat.mockRejectedValueOnce(Object.assign(new Error('stream_interrupted'), { interrupted: true, partial: '前半段' }))
    useAiModelStore.getState().sendBroadcast('q')
    await tick(); await tick()
    expect(conv()[1]!.content).toContain('前半段')
    expect(conv()[1]!.content).toContain('回复被中断')
    expect(conv()[1]!.error).toBeUndefined()
  })

  it('超时且无任何内容：给出超时提示并标为 error', async () => {
    streamChat.mockRejectedValueOnce(Object.assign(new Error('stream_timeout'), { timeout: true, partial: '' }))
    useAiModelStore.getState().sendBroadcast('q')
    await tick(); await tick()
    expect(conv()[1]!.content).toContain('响应超时')
    expect(conv()[1]!.error).toBe(true)
    expect(useAiModelStore.getState().pendingCount).toBe(0)
  })
})

describe('取消在途请求', () => {
  it('清空对话会中止在途请求，迟到的结果不会写进新会话，输入框解锁', async () => {
    let signal: AbortSignal | undefined
    streamChat.mockImplementationOnce((_req: unknown, opts: { signal: AbortSignal }) => {
      signal = opts.signal
      return new Promise((_res, rej) => opts.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))
    })
    useAiModelStore.getState().sendBroadcast('慢问题')
    await tick()
    expect(useAiModelStore.getState().pendingCount).toBe(1)
    useAiModelStore.getState().clearConversation(MODEL_ID)
    await tick(); await tick()
    expect(signal!.aborted).toBe(true)
    expect(conv()).toEqual([])
    expect(useAiModelStore.getState().pendingCount).toBe(0)
  })
})
