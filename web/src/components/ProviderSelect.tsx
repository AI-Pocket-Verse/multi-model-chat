import { useEffect, useRef, useState } from 'react'

import type { ProviderKey } from '@multi-model-chat/shared'
import { PROVIDER_KEYS } from '@multi-model-chat/shared'
import { Check, ChevronDown } from 'lucide-react'

import { MODEL_CATALOG } from '../lib/catalog'

/**
 * 供应商下拉 —— 自写而非原生 `<select>`。
 *
 * 原生 `<select>` 的弹层无法美化，所以自造。
 * 造轮子的约定：浮层不被裁剪、Esc 与点外部可关、键盘可达。
 */
interface Props {
  value: ProviderKey
  onChange: (value: ProviderKey) => void
}

export function ProviderSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation() // 别把 Esc 冒泡上去顺手把整个 Dialog 关了
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  const current = MODEL_CATALOG[value]

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md border border-line bg-bg px-3 py-2.5 text-[12.5px] text-fg outline-none transition-colors hover:border-accent focus:border-accent"
      >
        <span className="text-[14px]">{current.icon}</span>
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronDown
          className={`h-4 w-4 text-fg-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-[60] mt-1 overflow-hidden rounded-md border border-line bg-elevated py-1 shadow-lg"
        >
          {PROVIDER_KEYS.map((key) => {
            const item = MODEL_CATALOG[key]
            const selected = key === value
            return (
              <li key={key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(key)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-surface ${
                    selected ? 'text-accent' : 'text-fg'
                  }`}
                >
                  <span className="text-[14px]">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {selected && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
