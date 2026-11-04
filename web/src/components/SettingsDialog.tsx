import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'

import { PROVIDER_KEYS } from '@multi-model-chat/shared'
import { KeyRound, Pencil, RotateCcw, SlidersHorizontal, X } from 'lucide-react'

import { useT } from '../i18n'
import type { ModelConfig } from '../lib/catalog'
import { MODEL_CATALOG } from '../lib/catalog'
import { useAiModelStore } from '../stores/aiModel'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 点了某个模型的「编辑」：由页面关掉本弹窗、打开编辑弹窗，避免两层模态叠在一起 */
  onEditModel: (model: ModelConfig) => void
}

/**
 * 全局设置：服务端 Key 状态 + 模型列表（编辑入口）+ 恢复预置列表。
 * 开关与删除仍在左侧栏，这里不重复。
 */
export function SettingsDialog({ open, onOpenChange, onEditModel }: Props) {
  const t = useT()
  const models = useAiModelStore((s) => s.models)
  const activeModels = useAiModelStore((s) => s.activeModels)
  const providerStatus = useAiModelStore((s) => s.providerStatus)
  const loadProviders = useAiModelStore((s) => s.loadProviders)
  const resetModels = useAiModelStore((s) => s.resetModels)

  // 恢复预置会删掉自建模型及其历史，用「再点一次确认」代替浏览器 confirm 弹窗
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!open) return
    setConfirmReset(false)
    // 用户可能刚改完 .env 重启了 api，每次打开都刷新一次
    void loadProviders()
  }, [open, loadProviders])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/35 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(640px,calc(100vh-32px))] w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-line bg-elevated p-5 shadow-lg">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-[15px] font-bold text-fg">
                <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                {t.settings.title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[11.5px] text-fg-faint">
                {t.settings.description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-faint transition-colors hover:bg-surface hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <section>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-fg-muted">
                <KeyRound className="h-3 w-3" />
                {t.settings.serverKeys}
              </div>
              {providerStatus ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {PROVIDER_KEYS.map((key) => {
                    const ok = providerStatus.configured[key]
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11.5px] text-fg"
                      >
                        <span className="text-[13px]">{MODEL_CATALOG[key].icon}</span>
                        <span className="min-w-0 flex-1 truncate">{t.providers[key].label}</span>
                        <span
                          className={`shrink-0 rounded-sm px-1.5 py-px text-[10px] ${
                            ok ? 'bg-success-bg text-success-fg' : 'bg-bg text-fg-faint'
                          }`}
                        >
                          {ok ? t.settings.configured : t.settings.notConfigured}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-line bg-surface px-3 py-2 text-[11.5px] text-fg-faint">
                  {t.settings.statusUnavailable}
                </div>
              )}
              <div className="mt-1.5 text-[11px] leading-[1.6] text-fg-faint">
                {t.settings.keysHint}
              </div>
            </section>

            <section className="min-h-0">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-fg-muted">
                {t.settings.models(models.length)}
              </div>
              <div className="flex flex-col gap-1.5">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center gap-[7px] rounded-md border border-line bg-surface px-2 py-[7px]"
                  >
                    <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: model.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate text-[11.5px] text-fg">
                        <span className="truncate">{model.label}</span>
                        {activeModels.has(model.id) && (
                          <span className="shrink-0 rounded-sm border border-accent/30 px-1 text-[9px] text-accent">
                            {t.settings.active}
                          </span>
                        )}
                        {model.apiKey && (
                          <span className="shrink-0 rounded-sm border border-line px-1 text-[9px] text-fg-faint">
                            {t.settings.ownKey}
                          </span>
                        )}
                      </div>
                      <div className="truncate font-mono text-[9.5px] text-fg-faint">
                        {t.providers[model.provider].label} · {model.version}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditModel(model)}
                      title={t.settings.editModel}
                      className="flex h-6 shrink-0 items-center gap-1 rounded-sm px-1.5 text-[11px] text-fg-faint transition-colors hover:bg-nav-active-bg hover:text-accent"
                    >
                      <Pencil className="h-3 w-3" />
                      {t.settings.edit}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true)
                  return
                }
                resetModels()
                setConfirmReset(false)
              }}
              onBlur={() => setConfirmReset(false)}
              title={t.settings.resetTitle}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-[12px] transition-colors ${
                confirmReset
                  ? 'border-danger-line bg-danger-bg text-danger-fg'
                  : 'border-line bg-surface text-fg-muted hover:bg-nav-active-bg'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {confirmReset ? t.settings.resetConfirm : t.settings.reset}
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md bg-accent px-4 py-2 text-[12px] font-semibold text-accent-fg transition-colors hover:bg-accent/90"
              >
                {t.settings.done}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
