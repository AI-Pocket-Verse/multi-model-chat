/**
 * 全局状态：模型列表、会话、布局等 + 各类业务动作。
 *
 * 持久化分两处：
 *   - 小配置（persona / models / activeModels / layoutMode / 筛选 / 视图开关）→ localStorage
 *   - conversations（大头，含 base64 图片）→ IndexedDB
 * streaming 与 pendingCount 是运行时状态，两边都不存。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ChatRequest, ProviderKey, ProvidersResponse } from '@multi-model-chat/shared'

import { fetchProviders, generateImage, streamChat, UnsupportedImageModelError } from '../lib/api'
import type { ChatMessageRecord, LayoutMode, ModelConfig } from '../lib/catalog'
import {
  DEFAULT_MODELS,
  DEFAULT_PERSONA,
  LAYOUT_MODES,
  LEGACY_MODEL_VERSION_MAP,
  MODEL_CATALOG,
} from '../lib/catalog'
import {
  deleteConversation,
  loadAllConversations,
  saveConversation,
  saveConversationDebounced,
} from '../lib/db'
import {
  buildChatErrorText,
  buildImageErrorText,
  buildImageUnsupportedText,
  STREAM_INTERRUPTED_MARK,
} from '../lib/errors'
import { isImageGenerationModel, isImageGenerationPrompt } from '../lib/imageIntent'
import { showToast } from '../lib/toast'

export type ModelListFilter = 'all' | 'image'

interface AiModelState {
  persona: string
  models: ModelConfig[]
  activeModels: Set<string>
  streaming: Set<string>
  conversations: Record<string, ChatMessageRecord[]>
  layoutMode: LayoutMode
  modelListFilter: ModelListFilter
  imageViewOnly: boolean
  pendingCount: number
  hydrated: boolean
  /** 服务端各供应商的配置情况；还没取到或取失败时为 null（运行时态，不落盘） */
  providerStatus: ProvidersResponse | null

  init: () => Promise<void>
  loadProviders: () => Promise<void>
  setPersona: (persona: string) => void
  toggleModel: (modelId: string, isActive: boolean) => void
  removeModel: (modelId: string) => void
  addModel: (model: ModelConfig) => void
  updateModel: (modelId: string, patch: Partial<Omit<ModelConfig, 'id'>>) => void
  switchModelVersion: (modelId: string, version: string) => void
  resetModels: () => void
  setModelListFilter: (filter: ModelListFilter) => void
  toggleImageViewOnly: () => void
  cycleLayout: () => void
  newConversation: (modelId: string) => void
  clearConversation: (modelId: string) => void
  sendBroadcast: (text: string) => void
  sendToModel: (modelId: string, text: string) => void
}

export interface PersistedShape {
  persona?: string
  models?: ModelConfig[]
  activeModels?: string[]
  layoutMode?: LayoutMode
  modelListFilter?: ModelListFilter
  imageViewOnly?: boolean
}

/**
 * 恢复已存配置时的三处合并逻辑 —— 漏掉任何一条，老用户刷新后数据都会错乱：
 *   1. seedream 等老模型 ID 的版本迁移
 *   2. DEFAULT_MODELS 增量合并：按 id 去重追加新模型
 *   3. 新追加的模型按其 active 默认值加入 activeModels
 * Set 不能直接 JSON 序列化，落盘存数组、这里转回 Set。
 *
 * 抽成纯函数是为了能单测 —— 这段逻辑出错的后果（历史丢失/模型消失）最难在 UI 上察觉。
 */
export function mergePersistedModels(persisted: PersistedShape): {
  models: ModelConfig[]
  activeModels: Set<string>
} {
  const models = (
    Array.isArray(persisted.models) && persisted.models.length > 0 ? persisted.models : DEFAULT_MODELS
  ).map((m) => {
    const nextVersion = LEGACY_MODEL_VERSION_MAP[m.version]
    return nextVersion ? { ...m, version: nextVersion } : { ...m }
  })

  const savedIds = new Set(models.map((m) => m.id))
  const activeModels = new Set(Array.isArray(persisted.activeModels) ? persisted.activeModels : [])

  for (const dm of DEFAULT_MODELS) {
    if (savedIds.has(dm.id)) continue
    models.push({ ...dm })
    if (dm.active) activeModels.add(dm.id)
  }

  // 存档里完全没有 activeModels 字段时，回落到各模型自带的 active
  if (!Array.isArray(persisted.activeModels)) {
    for (const m of models) if (m.active) activeModels.add(m.id)
  }

  return { models, activeModels }
}

/**
 * 首次访问（本地还没有任何存档）时为 true，由 persist 的 merge 写入。
 * 只在这种情况下按服务端 key 配置调整默认激活的模型，不覆盖老用户自己的选择。
 */
let firstVisit = false

/**
 * 按服务端已配置的供应商挑出要激活的模型：先取「默认激活且该家已配 key」的，
 * 一个都没有就取「该家已配 key」的全部；仍为空（如只配了 custom）返回 null，表示不调整。
 */
export function pickActiveByProviders(
  models: ModelConfig[],
  configured: Record<ProviderKey, boolean>,
): Set<string> | null {
  const usable = models.filter((m) => configured[m.provider])
  const preferred = usable.filter((m) => m.active)
  const picked = preferred.length > 0 ? preferred : usable
  return picked.length > 0 ? new Set(picked.map((m) => m.id)) : null
}

/** 某个模型版本的默认显示名：预置列表里有就用预置的，否则就是版本号本身 */
export function defaultLabelFor(provider: ProviderKey, version: string): string {
  return DEFAULT_MODELS.find((m) => m.provider === provider && m.version === version)?.label ?? version
}

/** 侧栏列表受「全部/生图」筛选影响 */
export function selectVisibleModels(s: AiModelState): ModelConfig[] {
  if (s.modelListFilter === 'image') return s.models.filter(isImageGenerationModel)
  return s.models
}

/** 聊天网格里真正渲染的窗口 */
export function selectRenderableModels(s: AiModelState): ModelConfig[] {
  return s.models.filter((model) => {
    if (!s.activeModels.has(model.id)) return false
    if (s.imageViewOnly && !isImageGenerationModel(model)) return false
    return true
  })
}

export const useAiModelStore = create<AiModelState>()(
  persist(
    (set, get) => {
      /** 追加一条消息并持久化，返回该条记录 */
      const pushMessage = (
        modelId: string,
        role: 'user' | 'assistant',
        content: string,
      ): ChatMessageRecord => {
        const message: ChatMessageRecord = { role, content, ts: Date.now() }
        set((s) => {
          const next = [...(s.conversations[modelId] ?? []), message]
          saveConversationDebounced(modelId, next)
          return { conversations: { ...s.conversations, [modelId]: next } }
        })
        return message
      }

      /** 就地改写某条消息（流式累积 / 错误文案 / 生图结果） */
      const patchMessage = (modelId: string, index: number, patch: Partial<ChatMessageRecord>) => {
        set((s) => {
          const list = s.conversations[modelId] ?? []
          const current = list[index]
          if (!current) return {}
          const next = [...list]
          next[index] = { ...current, ...patch }
          saveConversationDebounced(modelId, next)
          return { conversations: { ...s.conversations, [modelId]: next } }
        })
      }

      const finishOne = (modelId: string) => {
        set((s) => {
          const streaming = new Set(s.streaming)
          streaming.delete(modelId)
          return { streaming, pendingCount: Math.max(0, s.pendingCount - 1) }
        })
      }

      /** 模型自带的 key 与（仅 custom）接口地址，没有就不传，由服务端 env 提供 */
      const upstreamOverrides = (model: ModelConfig) => ({
        ...(model.apiKey ? { apiKey: model.apiKey } : {}),
        ...(model.provider === 'custom' && model.baseUrl ? { baseUrl: model.baseUrl } : {}),
      })

      /** 每个模型在途请求的取消器：移除模型 / 停用 / 清空对话时中止，避免迟到的回复写进新会话 */
      const inflight = new Map<string, AbortController>()
      const abortInflight = (modelId: string) => {
        inflight.get(modelId)?.abort()
        inflight.delete(modelId)
      }

      /** 流式对话 */
      const runChat = async (model: ModelConfig) => {
        set((s) => ({ streaming: new Set(s.streaming).add(model.id) }))
        const history = get().conversations[model.id] ?? []

        // 组装发给上游的 messages：人设作为 system，其后是本轮之前的全部有内容消息。
        // 失败提示（error:true）不是模型回答，不发给上游；跳过后相邻的同角色消息合并，
        // 避免出现连续两条 user（部分厂商会拒绝）。
        const apiMessages: ChatRequest['messages'] = []
        const persona = get().persona
        if (persona) apiMessages.push({ role: 'system', content: persona })
        for (const m of history) {
          if (!m.content || m.error) continue
          const last = apiMessages[apiMessages.length - 1]
          if (last && last.role === m.role) last.content += `\n\n${m.content}`
          else apiMessages.push({ role: m.role, content: m.content })
        }

        pushMessage(model.id, 'assistant', '')
        const msgIdx = (get().conversations[model.id] ?? []).length - 1
        const ctrl = new AbortController()
        inflight.set(model.id, ctrl)

        try {
          const finalText = await streamChat(
            {
              provider: model.provider,
              model: model.version,
              messages: apiMessages,
              ...upstreamOverrides(model),
            },
            {
              onDelta: (accumulated) => patchMessage(model.id, msgIdx, { content: accumulated }),
              signal: ctrl.signal,
            },
          )

          // 模型返回空内容时补一句提示，方便排查（原实现同样处理）
          if (!finalText) {
            patchMessage(model.id, msgIdx, { content: '（模型未返回文本内容）', error: true })
          } else {
            // 流结束再落一次完整内容，覆盖掉防抖可能漏掉的最后一帧
            const list = get().conversations[model.id] ?? []
            void saveConversation(model.id, list)
          }
        } catch (err) {
          // 被主动取消（移除模型 / 清空对话）：会话已经变了，不再写回
          if (ctrl.signal.aborted) return
          const partial = (err as { partial?: string }).partial
          const cut = (err as { interrupted?: boolean; timeout?: boolean }).interrupted ||
            (err as { timeout?: boolean }).timeout
          if (cut && partial) {
            // 已收到一部分：保留并标注不完整，而不是整条换成错误提示
            patchMessage(model.id, msgIdx, { content: partial + STREAM_INTERRUPTED_MARK })
          } else {
            patchMessage(model.id, msgIdx, { content: buildChatErrorText(model, err), error: true })
          }
        } finally {
          if (inflight.get(model.id) === ctrl) inflight.delete(model.id)
          finishOne(model.id)
        }
      }

      /** 生图 */
      const runImage = async (model: ModelConfig, prompt: string) => {
        set((s) => ({ streaming: new Set(s.streaming).add(model.id) }))
        pushMessage(model.id, 'assistant', '')
        const msgIdx = (get().conversations[model.id] ?? []).length - 1

        try {
          const images = await generateImage({
            provider: model.provider,
            model: model.version,
            prompt,
            ...upstreamOverrides(model),
          })
          patchMessage(model.id, msgIdx, { content: '', images })
        } catch (err) {
          const text =
            err instanceof UnsupportedImageModelError
              ? buildImageUnsupportedText(model)
              : buildImageErrorText(model, err)
          patchMessage(model.id, msgIdx, { content: text, images: [] })
        } finally {
          finishOne(model.id)
        }
      }

      /** 按「这句话是不是要图 + 这个模型能不能生图」分流 */
      const routeRequest = (model: ModelConfig, text: string) => {
        if (!isImageGenerationPrompt(text)) {
          void runChat(model)
          return
        }
        // 与原实现一致：模型本身不支持生图时**不发请求**，直接给提示
        if (!isImageGenerationModel(model)) {
          set((s) => ({ streaming: new Set(s.streaming).add(model.id) }))
          pushMessage(model.id, 'assistant', buildImageUnsupportedText(model))
          finishOne(model.id)
          return
        }
        void runImage(model, text)
      }

      return {
        persona: DEFAULT_PERSONA,
        models: [],
        activeModels: new Set<string>(),
        streaming: new Set<string>(),
        conversations: {},
        layoutMode: 'auto',
        modelListFilter: 'all',
        imageViewOnly: false,
        pendingCount: 0,
        hydrated: false,
        providerStatus: null,

        async init() {
          /** 无论成败都要保证有模型可用，否则页面是一片空白 */
          const ensureModels = () => {
            if (get().models.length > 0) return
            set({
              models: DEFAULT_MODELS.map((m) => ({ ...m })),
              activeModels: new Set(DEFAULT_MODELS.filter((m) => m.active).map((m) => m.id)),
            })
          }

          try {
            // 首访（没有 persist 数据）→ 用预置列表
            ensureModels()

            // 会话历史一律从 IndexedDB 读
            const conversations = await loadAllConversations()

            // 保证每个模型都有会话数组
            for (const m of get().models) conversations[m.id] ??= []

            set({ conversations, hydrated: true })
            void get().loadProviders()
          } catch (err) {
            // IndexedDB 在 Safari 无痕模式、存储配额耗尽、用户禁用站点数据时会直接抛错。
            // 不兜底的话 hydrated 永远为 false，页面就永久停在「正在载入会话…」——
            // 等于整个产品打不开，比丢历史严重得多。降级为「无历史但可正常用」。
            console.error('[multi-model-chat] 会话载入失败，将以空历史启动', err)
            ensureModels()
            set({ conversations: {}, hydrated: true })
            showToast('本地存储不可用，历史记录本次无法加载')
            void get().loadProviders()
          }
        },

        async loadProviders() {
          const before = get().activeModels
          const status = await fetchProviders()
          if (!status) return
          set({ providerStatus: status })

          if (!firstVisit) return
          firstVisit = false
          // 请求期间用户已经手动开关过模型 → 尊重用户的操作
          if (get().activeModels !== before) return
          const picked = pickActiveByProviders(get().models, status.configured)
          if (picked) set({ activeModels: picked })
        },

        setPersona(persona) {
          set({ persona })
          showToast(persona ? '人设已保存' : '人设已清空')
        },

        toggleModel(modelId, isActive) {
          set((s) => {
            const activeModels = new Set(s.activeModels)
            const streaming = new Set(s.streaming)
            if (isActive) activeModels.add(modelId)
            else {
              activeModels.delete(modelId)
              streaming.delete(modelId)
            }
            return { activeModels, streaming }
          })
          if (!isActive) abortInflight(modelId)
        },

        removeModel(modelId) {
          abortInflight(modelId)
          set((s) => {
            const activeModels = new Set(s.activeModels)
            const streaming = new Set(s.streaming)
            activeModels.delete(modelId)
            streaming.delete(modelId)
            const conversations = { ...s.conversations }
            delete conversations[modelId]
            return {
              models: s.models.filter((m) => m.id !== modelId),
              activeModels,
              streaming,
              conversations,
            }
          })
          void deleteConversation(modelId)
          showToast('模型已移除')
        },

        addModel(model) {
          set((s) => ({
            models: [...s.models, model],
            activeModels: new Set(s.activeModels).add(model.id),
            conversations: { ...s.conversations, [model.id]: [] },
          }))
          showToast(`已添加「${model.label}」`)
        },

        updateModel(modelId, patch) {
          const current = get().models.find((m) => m.id === modelId)
          if (!current) return
          const next: ModelConfig = { ...current, ...patch }
          // 换了调用目标：在途回复属于旧配置，取消掉，避免写进同一个窗口造成混淆
          const targetChanged =
            next.provider !== current.provider ||
            next.version !== current.version ||
            next.apiKey !== current.apiKey ||
            next.baseUrl !== current.baseUrl
          if (targetChanged) abortInflight(modelId)
          set((s) => {
            const streaming = new Set(s.streaming)
            if (targetChanged) streaming.delete(modelId)
            return { models: s.models.map((m) => (m.id === modelId ? next : m)), streaming }
          })
        },

        switchModelVersion(modelId, version) {
          const s = get()
          const model = s.models.find((m) => m.id === modelId)
          const v = version.trim()
          if (!model || !v || v === model.version) return
          if (s.streaming.has(modelId)) {
            showToast('该模型正在响应中，请稍后再切换')
            return
          }
          // 显示名还是旧版本的默认名时跟着换，用户自己改过的名字保留
          const autoLabel = model.label === defaultLabelFor(model.provider, model.version)
          get().updateModel(modelId, {
            version: v,
            ...(autoLabel ? { label: defaultLabelFor(model.provider, v) } : {}),
          })
          showToast(`已切换到 ${v}，对话历史保留`)
        },

        resetModels() {
          const s = get()
          for (const m of s.models) abortInflight(m.id)
          const models = DEFAULT_MODELS.map((m) => ({ ...m }))
          const keep = new Set(models.map((m) => m.id))
          const conversations: Record<string, ChatMessageRecord[]> = {}
          for (const m of models) conversations[m.id] = s.conversations[m.id] ?? []
          for (const id of Object.keys(s.conversations)) if (!keep.has(id)) void deleteConversation(id)

          const byProviders = s.providerStatus ? pickActiveByProviders(models, s.providerStatus.configured) : null
          set({
            models,
            activeModels: byProviders ?? new Set(models.filter((m) => m.active).map((m) => m.id)),
            streaming: new Set(),
            pendingCount: 0,
            conversations,
          })
          showToast('已恢复预置模型列表')
        },

        setModelListFilter(filter) {
          if (filter !== 'all' && filter !== 'image') return
          if (get().modelListFilter === filter) return
          set({ modelListFilter: filter })
        },

        toggleImageViewOnly() {
          if (get().pendingCount > 0) {
            showToast('模型响应中，暂时不能切换窗口视图')
            return
          }
          set((s) => ({ imageViewOnly: !s.imageViewOnly }))
        },

        cycleLayout() {
          const idx = LAYOUT_MODES.indexOf(get().layoutMode)
          const layoutMode = LAYOUT_MODES[(idx + 1) % LAYOUT_MODES.length]!
          set({ layoutMode })
          showToast(`布局：${layoutMode === 'auto' ? '自动' : layoutMode}`)
        },

        newConversation(modelId) {
          abortInflight(modelId)
          set((s) => ({ conversations: { ...s.conversations, [modelId]: [] } }))
          void saveConversation(modelId, [])
          showToast('已开启新对话')
        },

        clearConversation(modelId) {
          abortInflight(modelId)
          set((s) => ({ conversations: { ...s.conversations, [modelId]: [] } }))
          void saveConversation(modelId, [])
          showToast('对话已清空')
        },

        sendBroadcast(text) {
          const s = get()
          if (s.pendingCount > 0) return
          const trimmed = text.trim()
          if (!trimmed) return

          const active = selectRenderableModels(s)
          if (active.length === 0) {
            showToast(s.imageViewOnly ? '请先激活至少一个生图模型' : '请先在左侧面板激活至少一个模型')
            return
          }

          set({ pendingCount: active.length })
          for (const model of active) pushMessage(model.id, 'user', trimmed)
          for (const model of active) routeRequest(model, trimmed)
        },

        sendToModel(modelId, text) {
          const s = get()
          const model = s.models.find((m) => m.id === modelId)
          const trimmed = text.trim()
          if (!model || !trimmed) return
          if (s.streaming.has(modelId)) {
            showToast('该模型正在响应中，请稍后')
            return
          }
          pushMessage(modelId, 'user', trimmed)
          routeRequest(model, trimmed)
        },
      }
    },
    {
      name: 'multi-model-chat-state',
      // conversations 走 IndexedDB；streaming / pendingCount / hydrated 是运行时态
      partialize: (s) => ({
        persona: s.persona,
        models: s.models,
        activeModels: [...s.activeModels],
        layoutMode: s.layoutMode,
        modelListFilter: s.modelListFilter,
        imageViewOnly: s.imageViewOnly,
      }),
      /** 合并细节见 mergePersistedModels（抽成纯函数以便单测） */
      merge: (persisted, current) => {
        if (persisted == null) firstVisit = true
        const p = (persisted ?? {}) as PersistedShape
        const { models, activeModels } = mergePersistedModels(p)

        return {
          ...current,
          persona: p.persona ?? current.persona,
          models,
          activeModels,
          layoutMode: p.layoutMode ?? current.layoutMode,
          modelListFilter: p.modelListFilter ?? current.modelListFilter,
          imageViewOnly: p.imageViewOnly ?? current.imageViewOnly,
        }
      },
    },
  ),
)
