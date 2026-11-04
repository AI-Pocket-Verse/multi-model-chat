import * as Dialog from '@radix-ui/react-dialog'
import { type ReactNode, useEffect, useState } from 'react'

import type { ProviderKey } from '@multi-model-chat/shared'
import { Eye, EyeOff, Info, Pencil, Plus, ShieldCheck, X } from 'lucide-react'

import type { ModelConfig } from '../lib/catalog'
import { MODEL_CATALOG } from '../lib/catalog'
import { showToast } from '../lib/toast'
import { useAiModelStore } from '../stores/aiModel'
import { ProviderSelect } from './ProviderSelect'

const A = (props: { href: string; children: ReactNode }) => (
  <a href={props.href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
    {props.children}
  </a>
)

/** 各供应商的输入提示 */
const HINTS: Record<ProviderKey, { placeholder: string; hint: ReactNode }> = {
  volcengine: {
    placeholder: 'doubao-seed-2.0-pro、doubao-seedream-4-5-251128 或 ep-XXXXXXXX-XXXX',
    hint: (
      <>
        可填模型名称，或在
        <A href="https://ark.volcengine.com/endpoint">控制台→推理接入点</A>
        创建后填入 ep-xxx-xxx；doubao-seedream-* 可直接生图
      </>
    ),
  },
  qwen: {
    placeholder: 'qwen3.5-plus、qwen-image-2.0-pro 等',
    hint: (
      <>
        填写模型名称，可在<A href="https://bailian.console.aliyun.com/">百炼控制台</A>
        查看已开通模型；qwen-image-* 可直接生图
      </>
    ),
  },
  deepseek: {
    placeholder: 'deepseek-chat 或 deepseek-reasoner',
    hint: (
      <>
        模型仅支持 deepseek-chat（通用）和 deepseek-reasoner（推理），详见
        <A href="https://api-docs.deepseek.com/zh-cn/">API 文档</A>
      </>
    ),
  },
  zhipu: {
    placeholder: 'glm-5、glm-image、glm-4.7、glm-4.6v',
    hint: (
      <>
        填写模型名称，详见<A href="https://docs.bigmodel.cn/">智谱 AI 文档</A>；glm-image / CogView
        可直接生图
      </>
    ),
  },
  kimi: {
    placeholder: 'kimi-k2.5、moonshot-v1-8k、moonshot-v1-128k',
    hint: (
      <>
        填写模型名称，详见<A href="https://platform.moonshot.cn/docs/api/chat">Kimi API 文档</A>，在
        <A href="https://platform.moonshot.cn/">开发者平台</A>管理 API Key
      </>
    ),
  },
  minimax: {
    placeholder: 'MiniMax-M2.7、image-01、M2-her',
    hint: (
      <>
        注意模型 ID 大小写，详见<A href="https://platform.minimaxi.com/docs">MiniMax 文档</A>
        ；image-01 可直接生图
      </>
    ),
  },
  custom: {
    placeholder: 'gpt-4o-mini、gpt-image-1、llama3.2 等',
    hint: <>填写该接口实际提供的模型名称；gpt-image / dall-e 可直接生图</>,
  },
}

const INPUT_CLASS =
  'w-full rounded-md border border-line bg-bg px-3 py-2.5 text-[12.5px] text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 传入时为编辑模式：表单预填该模型，确认后原地更新（对话历史保留） */
  editing?: ModelConfig
}

/** 添加 / 编辑模型共用一个弹窗：字段与校验完全相同，只有标题和确认动作不同 */
export function AddModelDialog({ open, onOpenChange, editing }: Props) {
  const addModel = useAiModelStore((s) => s.addModel)
  const updateModel = useAiModelStore((s) => s.updateModel)
  const providerStatus = useAiModelStore((s) => s.providerStatus)

  const [provider, setProvider] = useState<ProviderKey>('volcengine')
  const [version, setVersion] = useState('')
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showKey, setShowKey] = useState(false)

  const catalog = MODEL_CATALOG[provider]
  const isCustom = provider === 'custom'
  // null = 还不知道服务端配置（接口没返回），此时不下结论
  const serverConfigured = providerStatus ? providerStatus.configured[provider] : null

  // 打开时：编辑模式预填该模型；添加模式沿用上次选的供应商，预填该家的第一个推荐版本。
  // 依赖里故意不放 provider：只在打开那一刻预填，用户切换供应商走 changeProvider。
  useEffect(() => {
    if (!open) return
    if (editing) {
      setProvider(editing.provider)
      setVersion(editing.version)
      setLabel(editing.label)
      setApiKey(editing.apiKey ?? '')
      setBaseUrl(editing.baseUrl ?? '')
    } else {
      setVersion(MODEL_CATALOG[provider].versions[0] ?? '')
    }
    setShowKey(false)
  }, [open, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  // 用户切换供应商时换成该家的第一个推荐版本
  const changeProvider = (p: ProviderKey) => {
    setProvider(p)
    setVersion(MODEL_CATALOG[p].versions[0] ?? '')
  }

  const reset = () => {
    setVersion('')
    setLabel('')
    setApiKey('')
    setBaseUrl('')
    setShowKey(false)
  }

  const confirm = () => {
    const v = version.trim()
    if (!v) {
      showToast('请填写模型 ID 或接入点 ID')
      return
    }
    const url = isCustom ? baseUrl.trim() : ''
    if (url && !/^https?:\/\/[^/\s]+/i.test(url)) {
      showToast('Base URL 需以 http:// 或 https:// 开头')
      return
    }
    if (isCustom && !url && providerStatus && !providerStatus.configured.custom) {
      showToast('服务端未配置 CUSTOM_BASE_URL，请填写 Base URL')
      return
    }

    const fields = {
      provider,
      version: v,
      label: label.trim() || v,
      apiKey: apiKey.trim() || undefined,
      baseUrl: url || undefined,
    }
    if (editing) {
      updateModel(editing.id, {
        ...fields,
        // 换了供应商才跟着换主题色，否则保留原色（预置模型各有自己的颜色）
        color: provider === editing.provider ? editing.color : catalog.color,
      })
      showToast(`已保存「${fields.label}」`)
    } else {
      addModel({ id: `${provider}_${Date.now()}`, color: catalog.color, active: true, ...fields })
    }
    reset()
    onOpenChange(false)
  }

  const keyHint = isCustom
    ? '留空则使用服务端 CUSTOM_API_KEY；自填 Base URL 时只会使用这里填的 Key（本地 Ollama 等可留空）'
    : serverConfigured === false
      ? '服务端未配置该供应商的 Key，请在这里填写；仅保存在本地浏览器'
      : '留空则使用服务端配置的 Key；填写后仅保存在本地浏览器'

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/35 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-elevated p-5 shadow-lg">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-[15px] font-bold text-fg">
                {editing ? (
                  <Pencil className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-accent" />
                )}
                {editing ? '编辑模型' : '添加 AI 模型'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[11.5px] text-fg-faint">
                {editing
                  ? '修改供应商、模型 ID、显示名称或 API Key，对话历史保留'
                  : '配置新的对话窗口，支持主流大模型服务商'}
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

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.06em] text-fg-muted">
                模型提供商
              </label>
              <ProviderSelect value={provider} onChange={changeProvider} />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.06em] text-fg-muted">
                模型 ID / 接入点 ID
              </label>
              {/* datalist 只是输入补全提示（仍可自由输入），不是规则 2 所指的原生弹层选择器 */}
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder={HINTS[provider].placeholder}
                list="model-version-list"
                autoComplete="off"
                spellCheck={false}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
              <datalist id="model-version-list">
                {catalog.versions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-fg-faint">
                <Info className="mt-px h-3 w-3 shrink-0 text-accent" />
                <span>{HINTS[provider].hint}</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.06em] text-fg-muted">
                显示名称 <span className="font-normal normal-case tracking-normal">（可选）</span>
              </label>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="留空则使用默认名称"
                maxLength={30}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            {isCustom && (
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.06em] text-fg-muted">
                  Base URL{' '}
                  <span className="font-normal normal-case tracking-normal">
                    {providerStatus?.configured.custom ? '（可选）' : ''}
                  </span>
                </label>
                <input
                  type="url"
                  className={INPUT_CLASS}
                  placeholder={
                    providerStatus?.configured.custom
                      ? '留空则使用服务端 CUSTOM_BASE_URL'
                      : 'https://api.openai.com/v1 或 http://127.0.0.1:11434/v1'
                  }
                  autoComplete="off"
                  spellCheck={false}
                  disabled={providerStatus?.allowUserBaseUrl === false}
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-fg-faint">
                  <Info className="mt-px h-3 w-3 shrink-0 text-accent" />
                  <span>
                    {providerStatus?.allowUserBaseUrl === false
                      ? '服务端已禁止自填接口地址，将使用管理员配置的 CUSTOM_BASE_URL'
                      : '填到 /v1 一级；请求由 api 发出，地址需能从 api 所在机器访问'}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.06em] text-fg-muted">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="w-full rounded-md border border-line bg-bg px-3 py-2.5 pr-10 text-[12.5px] text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent"
                  placeholder="sk-..."
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  title="显示/隐藏"
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-fg-faint transition-colors hover:text-accent"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-fg-faint">
                <ShieldCheck className="mt-px h-3 w-3 shrink-0 text-accent" />
                <span>{keyHint}</span>
              </div>
            </div>

            <div className="rounded-md border border-info-line bg-info-bg px-3 py-2.5 text-[11px] leading-[1.7] text-fg-muted">
              <Info className="mr-1.5 inline h-3 w-3 text-accent" />
              {catalog.info}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-line bg-surface px-4 py-2 text-[12px] text-fg-muted transition-colors hover:bg-nav-active-bg"
              >
                取消
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={confirm}
              className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[12px] font-semibold text-accent-fg transition-colors hover:bg-accent/90"
            >
              {editing ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {editing ? '保存' : '添加模型'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
