import { describe, expect, it } from 'vitest'

import { extractImageApiError, getImageGenerationConfig } from './providers'

/**
 * 锁住四家生图的 endpoint 与响应提取方式，以及不支持模型返回 null 的判定。
 */
describe('getImageGenerationConfig', () => {
  it('qwen-image → 多模态生成接口', () => {
    const c = getImageGenerationConfig({ provider: 'qwen', model: 'qwen-image-2.0-pro', prompt: 'p' })
    expect(c?.endpoint).toContain('/services/aigc/multimodal-generation/generation')
    expect(c?.extractImages({ output: { choices: [{ message: { content: [{ url: 'https://a/1.png' }] } }] } })).toEqual([
      'https://a/1.png',
    ])
  })

  it('glm-image → images/generations', () => {
    const c = getImageGenerationConfig({ provider: 'zhipu', model: 'glm-image', prompt: 'p' })
    expect(c?.endpoint).toContain('/images/generations')
    expect(c?.extractImages({ data: [{ url: 'https://b/2.png' }] })).toEqual(['https://b/2.png'])
  })

  it('image-01 → base64 回退为 dataURL', () => {
    const c = getImageGenerationConfig({ provider: 'minimax', model: 'image-01', prompt: 'p' })
    expect(c?.endpoint).toContain('/image_generation')
    expect(c?.extractImages({ data: { image_base64: ['AAAA'] } })).toEqual(['data:image/png;base64,AAAA'])
  })

  it('doubao-seedream → operator.las 域名（与 chat 的 ark 域名不同）', () => {
    const c = getImageGenerationConfig({
      provider: 'volcengine',
      model: 'doubao-seedream-4-5-251128',
      prompt: 'p',
    })
    expect(c?.endpoint).toContain('operator.las.cn-beijing.volces.com')
    expect(c?.body).toMatchObject({ size: '2048x2048', response_format: 'url' })
  })

  it('只放行 http(s) 与 data:image 链接，其它协议丢弃（防 XSS）', () => {
    const c = getImageGenerationConfig({ provider: 'zhipu', model: 'glm-image', prompt: 'p' })
    expect(
      c?.extractImages({
        data: [
          { url: 'javascript:alert(1)' },
          { url: 'data:text/html;base64,PHNjcmlwdD4=' },
          { b64_json: 'AAAA', mime_type: 'text/html' },
          'vbscript:x',
          { url: 'https://ok/3.png' },
        ],
      }),
    ).toEqual(['https://ok/3.png'])
  })

  it('非生图模型 → null（调用方据此给出「不支持」文案）', () => {
    expect(getImageGenerationConfig({ provider: 'deepseek', model: 'deepseek-chat', prompt: 'p' })).toBeNull()
    expect(getImageGenerationConfig({ provider: 'qwen', model: 'qwen3-max', prompt: 'p' })).toBeNull()
  })
})

describe('extractImageApiError', () => {
  it('MiniMax 在 HTTP 200 里用 base_resp 报错', () => {
    expect(extractImageApiError({ base_resp: { status_code: 1008, status_msg: '余额不足' } })).toBe('余额不足')
  })

  it('嵌套 error.message', () => {
    expect(extractImageApiError({ error: { message: 'bad prompt' } })).toBe('bad prompt')
  })

  it('正常响应无错误', () => {
    expect(extractImageApiError({ data: [{ url: 'x' }] })).toBe('')
    expect(extractImageApiError({ base_resp: { status_code: 0 } })).toBe('')
  })
})
