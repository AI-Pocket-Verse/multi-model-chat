import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MessageBubble } from './MessageBubble'

describe('MessageBubble', () => {
  it('渲染 markdown：粗体 / 行内代码 / 有序列表', () => {
    const { container } = render(
      <MessageBubble
        message={{ role: 'assistant', content: '**粗体** 与 `代码`\n\n1. 第一条', ts: 1 }}
      />,
    )
    expect(container.querySelector('strong')?.textContent).toBe('粗体')
    expect(container.querySelector('code.md-code')?.textContent).toBe('代码')
    expect(container.querySelector('.md-li-num')?.textContent).toBe('1.')
  })

  it('转义 HTML，避免模型输出注入标签', () => {
    const { container } = render(
      <MessageBubble message={{ role: 'assistant', content: '<img src=x onerror=alert(1)>', ts: 1 }} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  })

  it('生图结果渲染为画廊并显示张数', () => {
    render(
      <MessageBubble
        message={{
          role: 'assistant',
          content: '',
          ts: 1,
          images: ['https://a/1.png', 'https://a/2.png'],
        }}
      />,
    )
    expect(screen.getAllByAltText('AI 生成图片')).toHaveLength(2)
    expect(screen.getByText('已生成 2 张图片')).toBeInTheDocument()
  })

  it('流式中不显示复制按钮，流完才出现', () => {
    const message = { role: 'assistant' as const, content: '生成中的内容', ts: 1 }
    const { rerender } = render(<MessageBubble message={message} streaming />)
    expect(screen.queryByTitle('复制全文')).toBeNull()

    rerender(<MessageBubble message={message} streaming={false} />)
    expect(screen.getByTitle('复制全文')).toBeInTheDocument()
  })

  it('用户消息靠右显示', () => {
    const { container } = render(
      <MessageBubble message={{ role: 'user', content: '你好', ts: 1 }} />,
    )
    expect(container.querySelector('.flex-row-reverse')).not.toBeNull()
  })
})
