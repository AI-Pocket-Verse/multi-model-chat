import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ModelConfig } from '../lib/catalog'

/** 每个用例重新加载 i18n 模块，让语言检测按当时的 localStorage / navigator 重新跑 */
async function load(opts: { stored?: string; language?: string; languages?: string[] }) {
  localStorage.clear()
  if (opts.stored) localStorage.setItem('multi-model-chat.lang', opts.stored)
  if (opts.language) {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(opts.language)
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(opts.languages ?? [opts.language])
  }
  vi.resetModules()
  return import('./index')
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('语言检测', () => {
  it('中文浏览器（含繁体）→ 中文', async () => {
    expect((await load({ language: 'zh-CN' })).getLang()).toBe('zh')
    expect((await load({ language: 'zh-TW' })).getLang()).toBe('zh')
  })

  it('其它语言 → 英文', async () => {
    expect((await load({ language: 'en-US' })).getLang()).toBe('en')
    expect((await load({ language: 'ja-JP' })).getLang()).toBe('en')
  })

  it('用户选过的语言优先于浏览器语言', async () => {
    expect((await load({ stored: 'en', language: 'zh-CN' })).getLang()).toBe('en')
    expect((await load({ stored: 'zh', language: 'en-US' })).getLang()).toBe('zh')
  })

  it('切换语言：记住选择，并同步 <html lang> 与标题', async () => {
    const i18n = await load({ language: 'zh-CN' })
    i18n.useLangStore.getState().setLang('en')
    expect(localStorage.getItem(i18n.LANG_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Multi-Model Chat')
    expect(i18n.t().header.addModel).toBe('Add model')
  })
})

describe('英文界面下的错误文案', () => {
  const model: ModelConfig = {
    id: 'ds_chat',
    provider: 'deepseek',
    version: 'deepseek-chat',
    label: 'DeepSeek-Chat',
    color: '#4d6bfe',
    active: true,
  }

  it('自家 api 的中文 message 按错误码换成英文，排查建议也是英文', async () => {
    await load({ language: 'en-US' })
    const { buildChatErrorText } = await import('../lib/errors')
    const body = JSON.stringify({ error: 'provider_key_missing', message: '服务端未配置 deepseek 的 API Key，且该模型未自带 key' })
    const text = buildChatErrorText(model, { status: 503, message: body })
    expect(text).toContain('Error: The server has no API key for deepseek')
    expect(text).toContain('Set DEEPSEEK_API_KEY')
    expect(text).not.toMatch(/[一-龥]/)
  })

  it('生图错误同样按错误码翻译', async () => {
    await load({ language: 'en-US' })
    const { buildImageErrorText } = await import('../lib/errors')
    const text = buildImageErrorText(model, { status: 504, code: 'upstream_timeout', apiMessage: 'deepseek 生图超时' })
    expect(text).toContain('timed out after 300 s')
    expect(text).not.toMatch(/[一-龥]/)
  })

  it('厂商返回的原始报错保持原样', async () => {
    await load({ language: 'en-US' })
    const { buildChatErrorText } = await import('../lib/errors')
    const text = buildChatErrorText(model, { status: 400, message: JSON.stringify({ error: { message: '模型不存在' } }) })
    expect(text).toContain('Error: 模型不存在')
  })
})

describe('英文模型介绍', () => {
  it('每条中文介绍都有英文版', async () => {
    const { MODEL_INFO, MODEL_INFO_EN } = await import('../lib/catalog')
    expect(Object.keys(MODEL_INFO_EN).sort()).toEqual(Object.keys(MODEL_INFO).sort())
    for (const text of Object.values(MODEL_INFO_EN)) expect(text).not.toMatch(/[一-龥]/)
  })
})
