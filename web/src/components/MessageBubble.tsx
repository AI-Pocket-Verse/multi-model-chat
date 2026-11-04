import { Copy } from 'lucide-react'

import { t as currentT, useT } from '../i18n'
import type { ChatMessageRecord } from '../lib/catalog'
import { renderMarkdown } from '../lib/markdown'
import { showToast } from '../lib/toast'

interface Props {
  message: ChatMessageRecord
  /** 该条是否正在流式输出 —— 决定要不要挂闪烁光标 */
  streaming?: boolean
}

function copyText(text: string) {
  if (!text) return
  navigator.clipboard
    .writeText(text)
    .then(() => showToast(currentT().bubble.copied))
    .catch(() => showToast(currentT().bubble.copyFailed))
}

export function MessageBubble({ message, streaming = false }: Props) {
  const t = useT()
  const isUser = message.role === 'user'
  const images = message.images ?? []

  if (isUser) {
    return (
      <div className="anim-msg-in flex flex-row-reverse gap-2 opacity-0">
        <div
          className="max-w-[86%] break-words rounded-[12px_3px_12px_12px] border border-accent/20 bg-accent/10 px-[13px] py-[9px] text-[12.5px] leading-[1.65] text-fg"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
      </div>
    )
  }

  return (
    <div className="anim-msg-in flex gap-2 opacity-0">
      <div className="group relative max-w-[86%] break-words rounded-[3px_12px_12px_12px] border border-line bg-elevated px-[13px] pb-[10px] pt-[9px] font-mono text-[12px] leading-[1.65] text-fg shadow-sm">
        <div
          className={`msg-content ${streaming ? 'stream-cursor' : ''}`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />

        {images.length > 0 && (
          <>
            <div className={`mt-2 grid gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {images.map((url) => (
                <a
                  key={url}
                  className="block overflow-hidden rounded-[10px] border border-line bg-surface transition-all duration-150 hover:-translate-y-px hover:border-accent hover:shadow-[0_10px_24px_rgb(var(--accent)/0.12)]"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t.bubble.viewImage}
                >
                  <img
                    className="block aspect-square h-auto w-full object-cover"
                    src={url}
                    alt={t.bubble.imageAlt}
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
            <div className="mt-2 text-[10.5px] text-fg-faint">{t.bubble.imagesGenerated(images.length)}</div>
          </>
        )}

        {message.content && !streaming && (
          <button
            type="button"
            onClick={() => copyText(message.content)}
            title={t.bubble.copyAll}
            className="absolute bottom-[5px] right-[7px] flex h-[22px] w-[22px] items-center justify-center rounded-[5px] border border-line bg-surface text-[10px] leading-none text-fg-faint opacity-0 transition-all duration-150 hover:border-accent hover:bg-nav-active-bg hover:text-accent group-hover:opacity-100"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
