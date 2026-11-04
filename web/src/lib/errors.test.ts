import { describe, expect, it } from 'vitest'

import type { ModelConfig } from './catalog'
import { buildChatErrorText, buildImageErrorText } from './errors'

const model: ModelConfig = {
  id: 'ds_chat',
  provider: 'deepseek',
  version: 'deepseek-chat',
  label: 'DeepSeek-Chat',
  color: '#4d6bfe',
  active: true,
}

describe('错误文案分类', () => {
  // 默认体验：服务端还没配 key。要给出可读原因和「去哪配」，不能把 JSON 原文糊给用户。
  it('服务端未配 key：显示可读原因和配置指引', () => {
    const body = JSON.stringify({ error: 'provider_key_missing', message: '服务端未配置 deepseek 的 API Key，且该模型未自带 key' })
    const text = buildChatErrorText(model, { status: 503, message: body })
    expect(text).toContain('错误信息：服务端未配置 deepseek 的 API Key')
    expect(text).not.toContain('{"error"')
    expect(text).toContain('DEEPSEEK_API_KEY')
  })

  it('登录过期与厂商 key 无效都是 401，但文案必须分开', () => {
    // 自己的 requireAuth 拦下的 401
    const expired = buildChatErrorText(model, { status: 401, sessionExpired: true, message: 'session_expired' })
    expect(expired).toContain('需要登录')
    // 措辞要覆盖「从未登录」的人，不能只说"已过期"
    expect(expired).toContain('右上角')
    expect(expired).toContain('无需检查厂商配置')

    // 厂商返回的 401（api 会带 x-upstream-error 透传，前端不打 sessionExpired）
    const badKey = buildChatErrorText(model, {
      status: 401,
      message: JSON.stringify({ error: { message: 'Invalid API key' } }),
    })
    expect(badKey).toContain('API Key 无效或已过期')
    // 反向断言：厂商 key 问题绝不能被说成"需要登录"，否则会把人引向错误的排查方向
    expect(badKey).not.toContain('需要登录')
  })

  it('余额不足 / 限流 各自命中对应建议', () => {
    expect(buildChatErrorText(model, { message: 'Insufficient balance' })).toContain('余额不足')
    expect(buildChatErrorText(model, { status: 429, message: 'rate limit' })).toContain('请求频率超出限制')
  })

  it('未命中特定类型时给出该供应商的排查建议', () => {
    const text = buildChatErrorText(model, { message: 'something odd' })
    expect(text).toContain('platform.deepseek.com')
    expect(text).toContain('deepseek-chat')
  })

  it('生图同样区分登录过期', () => {
    expect(buildImageErrorText(model, { sessionExpired: true })).toContain('需要登录')
    expect(buildImageErrorText(model, { apiMessage: '内容不合规', status: 400 })).toContain('内容不合规')
  })
})
