import { useRef, useState } from 'react'

import { Send, VenetianMask } from 'lucide-react'

import { useT } from '../i18n'
import { useAiModelStore } from '../stores/aiModel'

export function InputBar() {
  const t = useT()
  const persona = useAiModelStore((s) => s.persona)
  const pendingCount = useAiModelStore((s) => s.pendingCount)
  const sendBroadcast = useAiModelStore((s) => s.sendBroadcast)

  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const locked = pendingCount > 0

  const submit = () => {
    if (locked || !text.trim()) return
    sendBroadcast(text)
    setText('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  const personaChip = persona.trim()

  return (
    <div className="flex h-am-inputbar shrink-0 items-center gap-2.5 border-t border-line bg-elevated/95 px-5 shadow-[0_-1px_6px_rgb(var(--shadow-color)/0.05)] backdrop-blur-[20px]">
      {personaChip && (
        <div
          className="flex shrink-0 items-center gap-1 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-accent"
          title={t.input.personaActive}
        >
          <VenetianMask className="h-[9px] w-[9px]" />
          <span className="max-w-[110px] truncate font-mono text-[10px]">
            {personaChip.length > 22 ? `${personaChip.slice(0, 22)}…` : personaChip}
          </span>
        </div>
      )}

      <div className="flex flex-1 items-center gap-2 rounded-2xl border-[1.5px] border-line bg-bg px-3.5 py-2 transition-colors focus-within:border-accent">
        <textarea
          ref={inputRef}
          className="max-h-[100px] flex-1 resize-none bg-transparent text-[13px] leading-[1.6] text-fg outline-none placeholder:text-fg-faint"
          placeholder={locked ? t.input.busy : t.input.idle}
          rows={1}
          autoComplete="off"
          spellCheck={false}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`
          }}
          onKeyDown={(e) => {
            // IME 合字期间的 Enter 不发送
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        {text.length > 50 && (
          <span className="shrink-0 font-mono text-[10.5px] text-fg-faint">{text.length}</span>
        )}
      </div>

      <button
        type="button"
        title={t.input.send}
        disabled={locked}
        onClick={submit}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-fg shadow-md transition-all hover:bg-accent/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}
