import { useEffect, useRef, useState } from 'react'

import { MessageSquarePlus, Send, Trash2 } from 'lucide-react'

import { useT } from '../i18n'
import type { ModelConfig } from '../lib/catalog'
import { MODEL_CATALOG } from '../lib/catalog'
import { useAiModelStore } from '../stores/aiModel'
import { MessageBubble } from './MessageBubble'
import { VersionSwitcher } from './VersionSwitcher'

/** 打字等待指示器：三点依次弹跳（延迟由 index.css 的 nth-child 控制） */
function TypingIndicator() {
  return (
    <div className="anim-msg-in flex opacity-0">
      <div className="flex items-center gap-[5px] rounded-[3px_12px_12px_12px] border border-line bg-elevated px-[14px] py-[10px] shadow-sm">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  )
}

interface Props {
  model: ModelConfig
  onShowInfo: (modelId: string, anchor: HTMLElement) => void
  onEditModel: (model: ModelConfig) => void
}

export function ChatWindow({ model, onShowInfo, onEditModel }: Props) {
  const t = useT()
  const messages = useAiModelStore((s) => s.conversations[model.id] ?? [])
  const isStreaming = useAiModelStore((s) => s.streaming.has(model.id))
  const sendToModel = useAiModelStore((s) => s.sendToModel)
  const newConversation = useAiModelStore((s) => s.newConversation)
  const clearConversation = useAiModelStore((s) => s.clearConversation)

  const [draft, setDraft] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 流式结束的一刻高亮窗口边框，2.2s 后恢复。
  // 多窗口并行时这是"哪个模型刚答完"的唯一视觉线索，不能省。
  const [flash, setFlash] = useState(false)
  const prevStreaming = useRef(isStreaming)
  useEffect(() => {
    if (prevStreaming.current && !isStreaming) {
      setFlash(true)
      const timer = setTimeout(() => setFlash(false), 2200)
      prevStreaming.current = isStreaming
      return () => clearTimeout(timer)
    }
    prevStreaming.current = isStreaming
    return undefined
  }, [isStreaming])

  const catalog = MODEL_CATALOG[model.provider]
  // 最后一条 assistant 且正在流式 → 该条挂光标
  const lastIndex = messages.length - 1

  // 新消息 / 流式增量后置底（原实现每次 DOM 追加后手动 scrollTop = scrollHeight）
  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isStreaming])

  const submit = () => {
    if (!draft.trim()) return
    sendToModel(model.id, draft)
    setDraft('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  // 状态灯:流式=主色呼吸 / 有消息=成功绿 / 空闲=中性灰。发光色跟着灯色走
  const statusClass = isStreaming
    ? 'bg-accent shadow-[0_0_8px_rgb(var(--accent)/0.5)] anim-status-loading'
    : messages.length > 0
      ? 'bg-success-fg shadow-[0_0_6px_rgb(var(--success-fg)/0.5)]'
      : 'bg-fg-faint'

  return (
    <div
      className="relative flex h-[510px] flex-col overflow-hidden rounded-xl border border-line bg-elevated shadow-md transition-all duration-300 hover:shadow-lg"
      style={{
        ['--stream-color' as string]: model.color,
        ...(flash ? { borderColor: model.color, boxShadow: `0 0 22px ${model.color}22` } : {}),
      }}
    >
      {/* 顶部主题色条 */}
      <div className="h-[3px] shrink-0" style={{ background: model.color }} />

      <div className="flex shrink-0 items-center gap-[10px] border-b border-line bg-elevated px-[14px] py-[11px]">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm font-mono text-[15px] ${isStreaming ? 'anim-avatar-breath' : ''}`}
          style={{
            background: `${model.color}1a`,
            color: model.color,
            border: `1px solid ${model.color}33`,
          }}
        >
          {catalog.icon}
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="block max-w-full cursor-pointer truncate font-mono text-[12.5px] font-bold"
            style={{ color: model.color }}
            title={t.chat.showInfo}
            onClick={(e) => onShowInfo(model.id, e.currentTarget)}
          >
            {model.label}
          </button>
          <div className="flex min-w-0 items-center font-mono text-[10px] text-fg-faint">
            <span className="shrink-0 whitespace-pre">{t.providers[model.provider].label} · </span>
            <VersionSwitcher model={model} disabled={isStreaming} onEdit={() => onEditModel(model)} />
          </div>
        </div>

        <div
          className={`h-[6px] w-[6px] shrink-0 rounded-full transition-all duration-150 ${statusClass}`}
          title={isStreaming ? t.chat.generating : messages.length > 0 ? t.chat.ready : t.chat.waiting}
        />

        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-fg-faint transition-colors hover:bg-surface hover:text-accent"
          onClick={() => newConversation(model.id)}
          title={t.chat.newConversation}
        >
          <MessageSquarePlus className="h-[13px] w-[13px]" />
        </button>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-fg-faint transition-colors hover:bg-surface hover:text-danger-fg"
          onClick={() => clearConversation(model.id)}
          title={t.chat.clearConversation}
        >
          <Trash2 className="h-[13px] w-[13px]" />
        </button>
      </div>

      <div ref={messagesRef} className="flex flex-1 flex-col gap-[10px] overflow-y-auto bg-panel p-[14px]">
        {messages.length === 0 && !isStreaming ? (
          <div className="anim-msg-in flex h-full flex-col items-center justify-center gap-[10px] p-6 text-center text-fg-faint opacity-0">
            <div className="text-[36px] opacity-[0.35]" style={{ color: model.color }}>
              {catalog.icon}
            </div>
            <div className="text-[13px] text-fg-muted">{t.chat.readyTitle(model.label)}</div>
            <div className="text-[11px] text-fg-faint">{t.chat.readyHint}</div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.ts + '-' + i}
                message={msg}
                streaming={isStreaming && i === lastIndex && msg.role === 'assistant'}
              />
            ))}
            {/* 已发出请求但还没有 assistant 占位时显示三点 */}
            {isStreaming && messages[lastIndex]?.role !== 'assistant' && <TypingIndicator />}
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-[5px] border-t border-line bg-elevated px-[9px] py-[10px] opacity-[0.55] transition-opacity duration-150 focus-within:opacity-100 hover:opacity-100">
        <span className="shrink-0 self-center whitespace-nowrap font-mono text-[10px] text-fg-faint">
          {t.chat.count(messages.length)}
        </span>
        <textarea
          ref={inputRef}
          className="max-h-20 min-h-[22px] flex-1 resize-none self-center overflow-y-auto rounded-sm border border-line bg-transparent px-[7px] py-[3px] text-[11px] leading-[1.5] text-fg-muted outline-none transition-colors placeholder:text-[10.5px] placeholder:text-fg-faint focus:border-accent focus:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          placeholder={t.chat.placeholder(model.label)}
          rows={1}
          disabled={isStreaming}
          autoComplete="off"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`
          }}
          onKeyDown={(e) => {
            // IME 合字期间的 Enter 只是确认选词，不能当发送
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <button
          type="button"
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center self-center rounded-sm text-fg-faint transition-colors hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
          title={t.chat.sendOnly}
          disabled={isStreaming}
          onClick={submit}
        >
          <Send className="h-[11px] w-[11px]" />
        </button>
      </div>
    </div>
  )
}
