import { describe, expect, it } from 'vitest'

import { DEFAULT_MODELS } from '../lib/catalog'
import { mergePersistedModels } from './aiModel'

/**
 * 这组断言锁的是「老用户升级后数据不错乱」——
 * 这段逻辑出问题的表现（历史丢失、模型凭空消失、新模型不出现）在 UI 上极难第一时间察觉，
 * 所以用测试钉死，而不是靠肉眼验收。
 */
describe('mergePersistedModels', () => {
  it('首次访问（无存档）→ 预置 23 个模型、12 个默认激活', () => {
    const { models, activeModels } = mergePersistedModels({})
    expect(models).toHaveLength(23)
    expect(activeModels.size).toBe(12)
  })

  it('seedream 老版本号自动迁移到新版本', () => {
    const { models } = mergePersistedModels({
      models: [
        {
          id: 'seedream45',
          provider: 'volcengine',
          version: 'doubao-seedream-4-5-250828',
          label: 'Doubao-Seedream-4.5',
          color: '#1d4ed8',
          active: false,
        },
      ],
      activeModels: [],
    })
    expect(models.find((m) => m.id === 'seedream45')?.version).toBe('doubao-seedream-4-5-251128')
  })

  it('存档里没有的新预置模型会被增量追加，且按其默认 active 激活', () => {
    // 只存了一个模型的老存档
    const { models, activeModels } = mergePersistedModels({
      models: [{ ...DEFAULT_MODELS[0]! }],
      activeModels: [],
    })

    expect(models).toHaveLength(23)
    // seed_pro 默认 active:false，老存档里已存在 → 不该被激活
    expect(activeModels.has('seed_pro')).toBe(false)
    // seed_lite 默认 active:true 且是新追加的 → 应被激活
    expect(activeModels.has('seed_lite')).toBe(true)
  })

  it('用户手动关掉的模型不会因为合并被重新打开', () => {
    const models = DEFAULT_MODELS.map((m) => ({ ...m }))
    const { activeModels } = mergePersistedModels({
      models,
      activeModels: [], // 用户把所有模型都关了
    })
    expect(activeModels.size).toBe(0)
  })

  it('存档完全没有 activeModels 字段时，回落到各模型自带的 active', () => {
    const { activeModels } = mergePersistedModels({
      models: DEFAULT_MODELS.map((m) => ({ ...m })),
    })
    expect(activeModels.size).toBe(12)
  })

  it('自定义添加的模型会被保留（不会被预置列表覆盖）', () => {
    const custom = {
      id: 'volcengine_1700000000000',
      provider: 'volcengine' as const,
      version: 'ep-custom-0001',
      label: '我的接入点',
      color: '#1a56db',
      active: true,
    }
    const { models } = mergePersistedModels({ models: [custom], activeModels: [custom.id] })
    expect(models.find((m) => m.id === custom.id)).toMatchObject({ version: 'ep-custom-0001' })
    expect(models).toHaveLength(24) // 23 预置 + 1 自定义
  })
})
