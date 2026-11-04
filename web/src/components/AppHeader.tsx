import { useState } from 'react'

import { UserMenu, useAuth } from '@multi-model-chat/auth-client-web'
import {
  Columns2,
  Grid2x2,
  ImageIcon,
  Layers,
  LayoutGrid,
  Menu,
  Plus,
  SlidersHorizontal,
  Square,
} from 'lucide-react'

import type { LayoutMode } from '../lib/catalog'
import { useSkinMenuItems } from '../lib/skin'
import { useAiModelStore } from '../stores/aiModel'

/** 布局模式 → 图标 */
const LAYOUT_ICON: Record<LayoutMode, typeof LayoutGrid> = {
  auto: LayoutGrid,
  '1col': Square,
  '2col': Columns2,
  '3col': Grid2x2,
  '4col': LayoutGrid,
}

/** 三个并排的圆角窗口，中间一列略矮 —— 对应「多模型并行对话」 */
function ProductIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden
    >
      <rect x="3" y="6" width="7.5" height="20" rx="2.5" />
      <rect x="12.25" y="9" width="7.5" height="17" rx="2.5" />
      <rect x="21.5" y="6" width="7.5" height="20" rx="2.5" />
    </svg>
  )
}

/** 身份 ID 行：单行截断、点击复制、1.5s 反馈。 */
function CopyId({ label, value }: { label: string; value?: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null

  const copy = () => {
    void navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {
        /* clipboard 在非 https 环境可能被拦截 —— title 里仍能看到完整值 */
      })
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`${label}: ${value}（点击复制）`}
      className="block w-full truncate text-left font-mono text-[11px] leading-relaxed text-fg-faint transition-colors hover:text-fg-muted"
    >
      {label}: {copied ? '已复制' : value}
    </button>
  )
}

interface Props {
  onToggleSidebar: () => void
  onAddModel: () => void
  onOpenSettings: () => void
}

/**
 * 产品顶栏 —— 左 icon + 名称，右操作按钮 + 用户头像。
 */
export function AppHeader({ onToggleSidebar, onAddModel, onOpenSettings }: Props) {
  const { user, isLocal } = useAuth()
  const skinItems = useSkinMenuItems()
  const activeCount = useAiModelStore((s) => s.activeModels.size)
  const imageViewOnly = useAiModelStore((s) => s.imageViewOnly)
  const layoutMode = useAiModelStore((s) => s.layoutMode)
  const toggleImageViewOnly = useAiModelStore((s) => s.toggleImageViewOnly)
  const cycleLayout = useAiModelStore((s) => s.cycleLayout)

  const LayoutIcon = LAYOUT_ICON[layoutMode]

  return (
    <header className="flex h-am-header shrink-0 items-center gap-2.5 border-b border-line bg-elevated px-3.5">
      <button
        type="button"
        onClick={onToggleSidebar}
        title="切换侧栏"
        className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface hover:text-accent"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2">
        <span className="text-accent">
          <ProductIcon />
        </span>
        <span className="text-[15px] font-bold text-fg">多模型并行对话</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
        <Layers className="h-[11px] w-[11px]" />
        <span>已激活</span>
        <span className="rounded-md bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-accent">
          {activeCount}
        </span>
        <span>个模型</span>
      </div>

      <button
        type="button"
        onClick={onAddModel}
        className="flex items-center gap-1.5 rounded-md border border-accent/25 bg-accent/10 px-3 py-1.5 text-[11.5px] font-semibold text-accent transition-colors hover:bg-accent/15"
      >
        <Plus className="h-3.5 w-3.5" />
        添加模型
      </button>

      <button
        type="button"
        onClick={toggleImageViewOnly}
        aria-pressed={imageViewOnly}
        title={imageViewOnly ? '已开启：仅显示生图模型窗口' : '关闭：显示全部已选模型窗口'}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
          imageViewOnly
            ? 'border-warning-line bg-warning-bg text-warning-fg'
            : 'border-line bg-surface text-fg-muted hover:border-accent hover:text-accent'
        }`}
      >
        <ImageIcon className="h-3.5 w-3.5" />
        {imageViewOnly ? '仅看生图窗口' : '显示全部窗口'}
      </button>

      <button
        type="button"
        onClick={cycleLayout}
        title="切换布局"
        className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface hover:text-accent"
      >
        <LayoutIcon className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        title="全局设置"
        className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface hover:text-accent"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      <div className="mx-1 h-5 w-px bg-line" />

      {/* 头像菜单：飞书登录时显示 USER_ID / OPEN_ID（点击复制）；本地模式只有皮肤切换 */}
      <UserMenu
        avatarOnly
        items={skinItems}
        subtitle={
          user && !isLocal ? (
            <div className="space-y-0.5">
              <CopyId label="USER_ID" value={user.id} />
              <CopyId label="OPEN_ID" value={user.open_id} />
            </div>
          ) : undefined
        }
      />
    </header>
  )
}
