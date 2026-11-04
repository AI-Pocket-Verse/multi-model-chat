import { Bot, Plus } from 'lucide-react'

import type { LayoutMode, ModelConfig } from '../lib/catalog'
import { selectRenderableModels, useAiModelStore } from '../stores/aiModel'
import { ChatWindow } from './ChatWindow'

/** 非 auto 时固定列数，auto 时按窗口数量决定 */
function gridTemplate(layoutMode: LayoutMode, count: number): string {
  if (layoutMode !== 'auto') {
    const map: Record<Exclude<LayoutMode, 'auto'>, string> = {
      '1col': '1fr',
      '2col': 'repeat(2, 1fr)',
      '3col': 'repeat(3, 1fr)',
      '4col': 'repeat(4, 1fr)',
    }
    return map[layoutMode] ?? 'repeat(auto-fill, minmax(360px, 1fr))'
  }
  if (count === 1) return '1fr'
  if (count === 2) return 'repeat(2, 1fr)'
  return 'repeat(auto-fill, minmax(360px, 1fr))'
}

interface Props {
  onAddModel: () => void
  onShowInfo: (modelId: string, anchor: HTMLElement) => void
  onEditModel: (model: ModelConfig) => void
}

export function ChatGrid({ onAddModel, onShowInfo, onEditModel }: Props) {
  const models = useAiModelStore(selectRenderableModels)
  const layoutMode = useAiModelStore((s) => s.layoutMode)
  const imageViewOnly = useAiModelStore((s) => s.imageViewOnly)

  if (models.length === 0) {
    return (
      <section className="flex-1 overflow-y-auto overflow-x-hidden bg-surface">
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="text-[44px] text-fg-faint opacity-40">
            <Bot className="h-11 w-11" />
          </div>
          <div className="text-[15px] text-fg-muted">
            {imageViewOnly ? '当前没有可展示的生图模型窗口' : '还没有激活的模型'}
          </div>
          <div className="max-w-[320px] text-[12px] text-fg-faint">
            {imageViewOnly
              ? '请先激活生图模型，或关闭右上角「仅看生图窗口」开关'
              : '在左侧面板中开启模型开关，或点击「添加模型」配置新的 AI 服务'}
          </div>
          <button
            type="button"
            onClick={onAddModel}
            className="mt-3 flex items-center gap-1.5 rounded-md border border-accent/25 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15"
          >
            <Plus className="h-3.5 w-3.5" />
            添加第一个模型
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="flex-1 overflow-y-auto overflow-x-hidden bg-surface">
      <div
        className="grid min-h-full content-start gap-[14px] p-4"
        style={{ gridTemplateColumns: gridTemplate(layoutMode, models.length) }}
      >
        {models.map((model) => (
          <ChatWindow key={model.id} model={model} onShowInfo={onShowInfo} onEditModel={onEditModel} />
        ))}
      </div>
    </section>
  )
}
