import { useEffect, useState } from 'react'

import { AddModelDialog } from '../components/AddModelDialog'
import { AppHeader } from '../components/AppHeader'
import { ChatGrid } from '../components/ChatGrid'
import { InputBar } from '../components/InputBar'
import { ModelInfoPopover } from '../components/ModelInfoPopover'
import { ModelListSection } from '../components/ModelListSection'
import { PersonaSection } from '../components/PersonaSection'
import { SettingsDialog } from '../components/SettingsDialog'
import type { ModelConfig } from '../lib/catalog'
import { useAiModelStore } from '../stores/aiModel'

/**
 * 三段式布局：顶部操作栏 / 侧栏 + 聊天网格 / 底部广播输入栏。
 * 整体高度由 index.css 里 html / body / #root 的 100% 高度给足，这里各区独立滚动、页面本身不滚。
 */
export function AiModelPage() {
  const init = useAiModelStore((s) => s.init)
  const hydrated = useAiModelStore((s) => s.hydrated)
  const models = useAiModelStore((s) => s.models)

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // 编辑中的模型；fromSettings 表示从设置面板进来，保存或取消后回到设置面板
  const [editing, setEditing] = useState<{ model: ModelConfig; fromSettings: boolean } | null>(null)
  const [infoTarget, setInfoTarget] = useState<{ modelId: string; anchor: HTMLElement } | null>(null)

  useEffect(() => {
    void init()
  }, [init])

  const infoModel = infoTarget ? models.find((m) => m.id === infoTarget.modelId) : undefined

  const editModel = (model: ModelConfig, fromSettings = false) => {
    setSettingsOpen(false)
    setEditing({ model, fromSettings })
  }

  const showInfo = (modelId: string, anchor: HTMLElement) => {
    setInfoTarget((cur) => (cur?.modelId === modelId ? null : { modelId, anchor }))
  }

  return (
    <div className="relative z-[1] flex h-full flex-col">
      <AppHeader
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onAddModel={() => setDialogOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={`flex shrink-0 flex-col overflow-hidden border-r border-line bg-elevated transition-[width,opacity] duration-300 ${
            sidebarOpen ? 'w-am-sidebar opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <div className="flex h-full w-am-sidebar min-w-0 flex-col">
            <PersonaSection />
            <ModelListSection onAddModel={() => setDialogOpen(true)} onShowInfo={showInfo} />
          </div>
        </aside>

        {hydrated ? (
          <ChatGrid onAddModel={() => setDialogOpen(true)} onShowInfo={showInfo} onEditModel={editModel} />
        ) : (
          <section className="flex flex-1 items-center justify-center bg-surface text-[12px] text-fg-faint">
            正在载入会话…
          </section>
        )}
      </div>

      <InputBar />

      <AddModelDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <AddModelDialog
        open={editing !== null}
        editing={editing?.model}
        onOpenChange={(open) => {
          if (open) return
          if (editing?.fromSettings) setSettingsOpen(true)
          setEditing(null)
        }}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onEditModel={(model) => editModel(model, true)}
      />

      {infoModel && infoTarget && (
        <ModelInfoPopover
          model={infoModel}
          anchor={infoTarget.anchor}
          onClose={() => setInfoTarget(null)}
        />
      )}
    </div>
  )
}
