import { useEffect, useRef, useState } from 'react'

import { Check, Pencil, VenetianMask } from 'lucide-react'

import { useAiModelStore } from '../stores/aiModel'

const PLACEHOLDER = '点击「修改」设置 AI 的角色与行为准则...'

/**
 * 人设 / 系统提示词 —— 「只读 ↔ 编辑」双态：
 * 编辑期间的输入不进 store，**点「完成」才真正保存**。
 */
export function PersonaSection() {
  const persona = useAiModelStore((s) => s.persona)
  const setPersona = useAiModelStore((s) => s.setPersona)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(persona)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [editing])

  const enterEdit = () => {
    setDraft(persona)
    setEditing(true)
  }

  const save = () => {
    setPersona(draft.trim())
    setEditing(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 border-b border-line p-3">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-fg-faint">
        <span className="flex items-center gap-1.5">
          <VenetianMask className="h-3 w-3" />
          人设 / 系统提示词
        </span>
        <button
          type="button"
          onClick={editing ? save : enterEdit}
          className={`flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-semibold transition-colors ${
            editing
              ? 'border-success-line bg-success-bg text-success-fg hover:bg-success-line/60'
              : 'border-line bg-surface text-fg-muted hover:border-accent hover:text-accent'
          }`}
        >
          {editing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
          {editing ? '完成' : '修改'}
        </button>
      </div>

      {editing ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <textarea
            ref={textareaRef}
            className="min-h-0 flex-1 resize-none rounded-md border border-line bg-bg p-2.5 text-[11.5px] leading-[1.7] text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent"
            placeholder={
              '设置 AI 的角色与行为准则，将同步应用到所有激活模型...\n\n例如：你是一位经验丰富的全栈工程师，请用简洁专业的方式回答问题，并在适当时给出代码示例。'
            }
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-fg-faint">
            <span>应用于所有激活模型</span>
            <span className="font-mono">{draft.length} / 2000</span>
          </div>
        </div>
      ) : (
        <div
          className={`min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-surface p-2.5 text-[11.5px] leading-[1.7] ${
            persona ? 'text-fg-muted' : 'text-fg-faint'
          }`}
        >
          {persona || PLACEHOLDER}
        </div>
      )}
    </div>
  )
}
