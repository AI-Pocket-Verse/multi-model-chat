import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Check, ChevronDown, Pencil } from 'lucide-react'

import type { ModelConfig } from '../lib/catalog'
import { MODEL_CATALOG } from '../lib/catalog'
import { isImageGenerationModel } from '../lib/imageIntent'
import { useAiModelStore } from '../stores/aiModel'

interface Props {
  model: ModelConfig
  disabled?: boolean
  /** 「自定义…」：打开编辑弹窗填任意模型 ID */
  onEdit: () => void
}

/**
 * 聊天窗口标题下的版本切换：点版本号弹出该供应商的推荐版本，选中即切换，对话历史保留。
 * 浮层 portal 到 body（窗口有 overflow:hidden），Esc 与点外部可关。
 */
export function VersionSwitcher({ model, disabled = false, onEdit }: Props) {
  const switchModelVersion = useAiModelStore((s) => s.switchModelVersion)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const versions = MODEL_CATALOG[model.provider].versions
  const options = versions.includes(model.version) ? versions : [model.version, ...versions]

  // 与 ModelInfoPopover 同一套定位：优先在下方，放不下翻到上方，四周留 12px
  useLayoutEffect(() => {
    if (!open) return
    const anchor = anchorRef.current
    const el = listRef.current
    if (!anchor || !el) return
    const rect = anchor.getBoundingClientRect()
    const w = el.offsetWidth
    const h = el.offsetHeight
    let left = Math.min(rect.left, window.innerWidth - w - 12)
    if (left < 12) left = 12
    let top = rect.bottom + 4
    if (top + h > window.innerHeight - 12) top = rect.top - h - 4
    if (top < 12) top = 12
    setPos({ left, top })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!listRef.current?.contains(t) && !anchorRef.current?.contains(t)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={disabled ? '响应中，结束后可切换版本' : '切换模型版本'}
        onClick={() => {
          setPos(null)
          setOpen((v) => !v)
        }}
        className="inline-flex min-w-0 items-center gap-0.5 rounded-sm transition-colors hover:text-accent disabled:cursor-not-allowed disabled:hover:text-fg-faint"
      >
        <span className="truncate">{model.version}</span>
        <ChevronDown className="h-2.5 w-2.5 shrink-0" />
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            className="anim-mip-in fixed z-[70] max-h-[320px] w-[260px] overflow-y-auto rounded-md border border-line bg-elevated py-1 shadow-lg"
            style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
          >
            {options.map((v) => {
              const selected = v === model.version
              return (
                <button
                  key={v}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    switchModelVersion(model.id, v)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-[11.5px] transition-colors hover:bg-surface ${
                    selected ? 'text-accent' : 'text-fg'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{v}</span>
                  {isImageGenerationModel({ provider: model.provider, version: v }) && (
                    <span className="shrink-0 rounded-sm border border-accent/30 px-1 font-sans text-[9px] text-accent">
                      生图
                    </span>
                  )}
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              )
            })}
            <div className="my-1 h-px bg-line" />
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onEdit()
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] text-fg-muted transition-colors hover:bg-surface hover:text-accent"
            >
              <Pencil className="h-3 w-3" />
              自定义模型 ID / 供应商…
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
