import { Bot, Plus, X } from 'lucide-react'

import { MODEL_CATALOG } from '../lib/catalog'
import { isImageGenerationModel } from '../lib/imageIntent'
import { selectVisibleModels, useAiModelStore } from '../stores/aiModel'

interface Props {
  onAddModel: () => void
  onShowInfo: (modelId: string, anchor: HTMLElement) => void
}

export function ModelListSection({ onAddModel, onShowInfo }: Props) {
  const models = useAiModelStore((s) => s.models)
  const visible = useAiModelStore(selectVisibleModels)
  const activeModels = useAiModelStore((s) => s.activeModels)
  const filter = useAiModelStore((s) => s.modelListFilter)
  const setFilter = useAiModelStore((s) => s.setModelListFilter)
  const toggleModel = useAiModelStore((s) => s.toggleModel)
  const removeModel = useAiModelStore((s) => s.removeModel)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-fg-faint">
        <span className="flex items-center gap-1.5">
          <Bot className="h-3 w-3" />
          模型列表
        </span>
        <span className="rounded-xl border border-line bg-elevated px-[7px] py-0.5 text-[9.5px] tracking-[0.04em]">
          {filter === 'image' ? `${visible.length} / ${models.length}` : `${models.length} 个`}
        </span>
      </div>

      <div className="flex gap-1.5">
        {([
          ['all', '全部模型'],
          ['image', '生图模型'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
              filter === key
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-line bg-surface text-fg-muted hover:border-accent hover:text-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {models.length === 0 ? (
          <div className="p-5 text-center text-[12px] text-fg-faint">暂无模型，请点击下方按钮添加</div>
        ) : visible.length === 0 ? (
          <div className="p-5 text-center text-[12px] text-fg-faint">当前筛选下暂无模型</div>
        ) : (
          visible.map((model) => {
            const isActive = activeModels.has(model.id)
            return (
              <div
                key={model.id}
                className={`flex items-center gap-[7px] rounded-md border px-2 py-[7px] transition-colors ${
                  isActive ? 'border-accent/25 bg-accent/10' : 'border-line bg-surface hover:bg-nav-active-bg'
                }`}
              >
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: model.color }}
                />

                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="flex max-w-full items-center gap-1 truncate text-left text-[11.5px] text-fg hover:text-accent"
                    title="点击查看模型介绍"
                    onClick={(e) => onShowInfo(model.id, e.currentTarget)}
                  >
                    <span className="truncate">{model.label}</span>
                    {isImageGenerationModel(model) && (
                      <span className="shrink-0 rounded-sm border border-accent/30 px-1 text-[9px] text-accent">
                        生图
                      </span>
                    )}
                  </button>
                  <div className="truncate font-mono text-[9.5px] text-fg-faint">
                    {MODEL_CATALOG[model.provider].label} · {model.version}
                  </div>
                </div>

                {/* 激活开关 */}
                <label
                  className="relative h-[19px] w-[34px] shrink-0 cursor-pointer"
                  title={isActive ? '点击关闭' : '点击开启'}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isActive}
                    onChange={(e) => toggleModel(model.id, e.target.checked)}
                  />
                  {/* 尺寸与阴影沿用原 .toggle：34×19 轨道、13×13 滑块、平移 15px */}
                  <span className="absolute inset-0 rounded-[10px] bg-line transition-colors peer-checked:bg-accent" />
                  <span className="absolute left-[3px] top-[3px] h-[13px] w-[13px] rounded-full bg-elevated shadow-[0_1px_3px_rgb(var(--shadow-color)/0.2)] transition-transform peer-checked:translate-x-[15px]" />
                </label>

                <button
                  type="button"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-fg-faint transition-colors hover:bg-danger-bg hover:text-danger-fg"
                  title="移除此模型"
                  onClick={() => removeModel(model.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })
        )}
      </div>

      <button
        type="button"
        onClick={onAddModel}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-accent/25 bg-accent/10 px-3 py-2 text-[11.5px] font-semibold text-accent transition-colors hover:bg-accent/15"
      >
        <Plus className="h-3.5 w-3.5" />
        添加新模型
      </button>
    </div>
  )
}
