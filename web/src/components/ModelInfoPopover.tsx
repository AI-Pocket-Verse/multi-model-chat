import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Tag, X } from 'lucide-react'

import type { ModelConfig } from '../lib/catalog'
import { useLangStore, useT } from '../i18n'
import { MODEL_CATALOG, modelInfo } from '../lib/catalog'

interface Props {
  model: ModelConfig
  anchor: HTMLElement
  onClose: () => void
}

/**
 * 模型介绍浮层。定位算法：
 * 水平与 anchor 左对齐、超出右边界则右对齐；垂直优先在下方、空间不足翻转到上方；
 * 四周留 12px 安全边距，与 anchor 间隔 8px。
 *
 * portal 到 body，避免被聊天窗口的 overflow:hidden 裁掉。
 */
export function ModelInfoPopover({ model, anchor, onClose }: Props) {
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const anchorRect = anchor.getBoundingClientRect()
    const popupWidth = el.offsetWidth || 300
    const popupHeight = el.offsetHeight || 180
    const vw = window.innerWidth
    const vh = window.innerHeight
    const gap = 8

    let left = anchorRect.left
    if (left + popupWidth > vw - 12) left = vw - popupWidth - 12
    if (left < 12) left = 12

    let top = anchorRect.bottom + gap
    if (top + popupHeight > vh - 12) top = anchorRect.top - popupHeight - gap
    if (top < 12) top = 12

    setPos({ left, top })
  }, [anchor])

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // 延后一帧再挂，避免触发它打开的那次点击立刻把它关掉
    const timer = setTimeout(() => document.addEventListener('mousedown', onPointerDown), 0)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const catalog = MODEL_CATALOG[model.provider]
  const info = modelInfo(model.version, lang) || t.info.none

  return createPortal(
    <div
      ref={ref}
      className="anim-mip-in fixed z-[70] w-[300px] rounded-md border border-line bg-elevated p-3.5 shadow-lg"
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-[18px]" style={{ color: model.color }}>
          {catalog.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[13px] font-bold" style={{ color: model.color }}>
            {model.label}
          </div>
          <div className="truncate text-[10.5px] text-fg-faint">{t.providers[model.provider].label}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title={t.info.close}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-fg-faint transition-colors hover:bg-surface hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 rounded-sm bg-surface px-2 py-1 font-mono text-[10.5px] text-fg-muted">
        <Tag className="h-3 w-3 shrink-0" />
        <span className="truncate">{model.version}</span>
      </div>

      <p className="mt-2.5 text-[11.5px] leading-[1.75] text-fg-muted">{info}</p>
    </div>,
    document.body,
  )
}
