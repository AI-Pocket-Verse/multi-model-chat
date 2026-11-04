/**
 * 模型目录与预置数据。
 *
 * 只有前端用（弹窗、介绍浮层、侧栏、默认列表），因此留在 web，不进 shared 包。
 */
import type { ProviderKey } from '@multi-model-chat/shared'

export interface ModelConfig {
  id: string
  provider: ProviderKey
  version: string
  label: string
  color: string
  active: boolean
  /** 用户为该模型单独填的 key；留空则由服务端 env 提供 */
  apiKey?: string
  /** 仅 custom：OpenAI 兼容接口地址；留空则用服务端 CUSTOM_BASE_URL */
  baseUrl?: string
}

export interface ChatMessageRecord {
  role: 'user' | 'assistant'
  content: string
  ts: number
  images?: string[]
  /** 这条是失败提示（不是模型的真实回答），组装下一轮上下文时要跳过 */
  error?: boolean
}

// ── 模型详情介绍（≤200 字，显示在介绍浮层中）─────────────────────────────
export const MODEL_INFO: Record<string, string> = {
  'doubao-seed-2-0-pro-260215':
    '豆包 Seed 2.0 旗舰版（2026.02 发布）。原生深度推理，全面支持多模态理解（文字/图片/视频），32K 上下文，Agent 工具调用稳定精准，对标 GPT-5.2 与 Gemini 3 Pro，适合复杂推理与企业级任务。',
  'doubao-seed-2-0-lite-260215':
    '豆包 Seed 2.0 均衡版。综合能力超越豆包 1.8，在推理性能与调用成本之间取得出色平衡，支持多模态输入，适合中等复杂度的对话、内容生成和日常业务处理场景。',
  'doubao-seed-2-0-mini-260215':
    '豆包 Seed 2.0 轻量版。支持 256K 超长上下文，提供四档思考深度可调（minimal → high），极低延迟与高并发，成本仅为同级的 1/10，适合高频调用与成本敏感的生产环境。',
  'doubao-1-5-pro-32k-250115':
    '豆包 1.5 Pro 旗舰版，32K 上下文窗口。代码生成、逻辑推理与文档处理能力突出，性价比高，稳定性经过充分验证，适合各类企业级文本处理、RAG 问答和长文档分析任务。',
  'qwen3.5-plus':
    '千问 3.5 旗舰开源模型（2026.02 发布）。总参数 3970 亿，激活仅 170 亿（稀疏 MoE），支持 1M 超长上下文与 201 种语言，原生多模态，成本仅 0.8 元/百万 Token，综合性能超越 Gemini 3 Pro。',
  'qwen3.5-flash':
    '千问 3.5 快速版。轻量高效，响应速度快，适合对延迟要求严苛的实时对话、内容摘要和分类抽取场景，在保持低调用成本的前提下具备良好的综合语言理解与生成能力。',
  'qwen3-max':
    '千问旗舰模型（2025.09 发布）。总参数超 1 万亿，在 LMArena 文本榜超越 GPT-5 与 Claude Opus 4，支持 1M 上下文，SWE-Bench 代码得分 69.6，Agent 工具调用能力全球领先，适合最复杂任务。',
  'qwen3-omni-flash':
    '千问全模态快速版。支持文本、图像、音频、视频四类输入，可实时流式同步生成文字与自然语音，System Prompt 可精细控制人设风格与口语化表达，适合语音交互与多模态客服场景。',
  'qwen-plus-character':
    '通义星尘角色扮演专属模型。相比通用千问模型，在人设还原、话题推进和倾听共情三项能力上专项增强，32K 上下文，适合虚拟社交、游戏 NPC、IP 复刻、车机语音助手等创意场景。',
  'qwen-image-2.0-pro':
    '千问文生图旗舰模型。支持中文提示词直出高质量图片，擅长海报、插画、角色设定和写实场景生成，适合营销视觉与创意设计任务。',
  'deepseek-chat':
    'DeepSeek-V3.2 非思考模式（128K 上下文）。DeepSeek 最新旗舰通用模型，支持多轮对话、JSON 输出、Tool Calls 与上下文硬盘缓存，在编程、数学、推理、中英文写作等方面表现业界领先，适合日常对话与复杂任务。',
  'deepseek-reasoner':
    'DeepSeek-V3.2 思考模式（128K 上下文）。与 deepseek-chat 共享同一基座模型，但启用深度推理链（Chain-of-Thought），自动展示推理过程，在数学竞赛、代码调试和多步逻辑分析任务中显著优于普通模式。',
  'glm-5':
    '智谱旗舰基座模型，面向 Agentic Engineering 打造。参数 744B（激活 40B），200K 上下文，SWE-Bench 代码得分 77.8 创开源最高，Agent 能力 SOTA，使用体感逼近 Claude Opus 4.5，适合复杂工程与长程任务。',
  'glm-4.7':
    '智谱最新旗舰模型，200K 上下文，128K 输出。Agentic Coding 能力对齐 Claude Sonnet 4.5，SWE-Bench 73.8% 创开源第一，PPT 16:9 适配率从 52% 跃升至 91%，前端审美与沉浸写作显著提升。',
  'glm-4.7-flashx':
    'GLM-4.7 轻量高速版，200K 上下文，128K 输出。在保留旗舰版 Agentic Coding 与工具调用核心能力的基础上，大幅提升推理速度、降低调用成本，适合高并发与对延迟敏感的生产场景。',
  'glm-4.6v':
    '智谱旗舰视觉理解模型（106B）。128K 上下文，原生支持图片/视频/文件/文本多模态输入，Function Call 直接操作视觉内容，同参数规模视觉 SOTA，适合文档解析、视频问答与多模态 Agent 场景。',
  'glm-image':
    '智谱文生图模型，支持中文复杂提示词、风格化插画与写实海报生成，适合角色概念图、品牌 KV、社媒配图等视觉创作场景。',
  'kimi-k2.5':
    'Moonshot AI 最新旗舰模型，支持多模态理解，默认启用深度思考（thinking）模式，擅长解决复杂推理、代码编写与长文档分析问题。兼容 OpenAI 接口，上下文最长 128K，适合高难度任务。',
  'MiniMax-M2.7':
    'MiniMax 最新旗舰模型，204K 超长上下文，输出约 60 TPS。SWE-Pro 编程得分 56.22%，端到端完整项目交付（VIBE-Pro 55.6%），专业办公 ELO 开源最高，擅长复杂工程、Agent 工作流与 Office 三件套。',
  'MiniMax-M2.5':
    'MiniMax 旗舰性能模型，204K 上下文，输出约 60 TPS。顶尖性能与极致性价比的平衡，轻松驾驭复杂任务，在编程、工具调用和搜索、办公等生产力场景表现突出，适合中重度生产场景。',
  'M2-her':
    'MiniMax 专为对话场景优化的文本模型，64K 上下文。支持丰富角色设定（system/user_system/group）与多轮对话历史管理，内置示例对话学习机制，适合角色扮演、虚拟助手与沉浸式互动娱乐场景。',
  'image-01':
    'MiniMax 文生图模型，兼顾出图速度与细节质量，适合角色图、产品图、封面图和概念插画等常见生成场景。',
  'doubao-seedream-4-5-250828':
    '豆包 Seedream 文生图模型，擅长中文语义理解、海报排版和写实风格生成，适合品牌宣传图、电商物料与创意视觉草图。',
  'doubao-seedream-4-5-251128':
    '豆包 Seedream 文生图模型，擅长中文语义理解、海报排版和写实风格生成，适合品牌宣传图、电商物料与创意视觉草图。',
}

/** 老模型 ID → 新模型 ID 的迁移映射（loadState 时套用） */
export const LEGACY_MODEL_VERSION_MAP: Record<string, string> = {
  'doubao-seedream-4-5-250828': 'doubao-seedream-4-5-251128',
}

/** 哪些模型 ID 属于「能直接生图」—— 决定走 /api/image 还是 /api/chat */
export const IMAGE_MODEL_PATTERNS: Partial<Record<ProviderKey, RegExp[]>> = {
  qwen: [/^qwen-image/i],
  zhipu: [/^(glm-image|cogview-4)/i],
  volcengine: [/^doubao-seedream/i],
  minimax: [/^image-01(?:-live)?$/i],
  custom: [/^(gpt-image|dall-e)/i],
}

export interface CatalogEntry {
  label: string
  color: string
  icon: string
  versions: string[]
  info: string
}

export const MODEL_CATALOG: Record<ProviderKey, CatalogEntry> = {
  volcengine: {
    label: '火山方舟 · 豆包',
    color: '#1a56db',
    icon: '⬢',
    versions: [
      'doubao-seed-2-0-pro-260215',
      'doubao-seed-2-0-lite-260215',
      'doubao-seed-2-0-mini-260215',
      'doubao-1-5-pro-32k-250115',
      'doubao-seedream-4-5-251128',
      'doubao-seed-1-8-251228',
      'doubao-seed-1-6-250615',
    ],
    info: '字节跳动火山方舟平台，豆包系列大模型。模型 ID 也支持控制台推理接入点格式 ep-xxx-xxx。',
  },
  qwen: {
    label: '阿里云百炼 · 千问',
    color: '#ff6a00',
    icon: '🔶',
    versions: [
      'qwen3.5-plus',
      'qwen3.5-flash',
      'qwen3-max',
      'qwen3-omni-flash',
      'qwen-plus-character',
      'qwen-image-2.0-pro',
    ],
    info: '阿里云百炼平台，通义千问系列大模型。使用 OpenAI 兼容接口调用。',
  },
  deepseek: {
    label: 'DeepSeek',
    color: '#4d6bfe',
    icon: '🐋',
    versions: ['deepseek-chat', 'deepseek-reasoner'],
    info: 'DeepSeek 开放平台，V3.2 128K 上下文，支持思考/非思考双模式、Tool Calls 与上下文缓存。',
  },
  zhipu: {
    label: '智谱 AI · GLM',
    color: '#06b6d4',
    icon: '🧠',
    versions: ['glm-5', 'glm-4.7', 'glm-4.7-flashx', 'glm-4.6v', 'glm-image'],
    info: '智谱 AI 开放平台，GLM 系列旗舰大模型。兼容 OpenAI 接口，支持流式输出与深度思考模式。',
  },
  kimi: {
    label: 'Moonshot AI · Kimi',
    color: '#6366f1',
    icon: '🌙',
    versions: [
      'kimi-k2.5',
      'kimi-k2-0905-preview',
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
    ],
    info: 'Moonshot AI 开放平台，Kimi 系列大模型。兼容 OpenAI 接口，支持流式输出，最长 128K 上下文。',
  },
  minimax: {
    label: 'MiniMax',
    color: '#10b981',
    icon: '⚡',
    versions: [
      'MiniMax-M2.7',
      'MiniMax-M2.7-highspeed',
      'MiniMax-M2.5',
      'MiniMax-M2.5-highspeed',
      'MiniMax-M2.1',
      'M2-her',
      'image-01',
    ],
    info: 'MiniMax 开放平台，M2 系列大模型。兼容 OpenAI 接口，最长 204K 上下文，支持流式输出与复杂 Agent 工作流。',
  },
  custom: {
    label: 'OpenAI 兼容 · 自定义',
    color: '#64748b',
    icon: '◎',
    // 只是输入补全建议：自定义接口的模型名由对方服务决定
    versions: ['gpt-4o-mini', 'gpt-4o', 'gpt-image-1', 'llama3.2', 'qwen2.5'],
    info: '任意 OpenAI 兼容接口：OpenAI、OpenRouter、Ollama、vLLM、LM Studio 等。Base URL 留空时使用服务端 CUSTOM_BASE_URL；gpt-image / dall-e 模型可直接生图。',
  },
}

/** 默认人设留空；用户存过的人设照常从存档恢复。 */
export const DEFAULT_PERSONA = ''

/** 首次访问时预置的模型列表，active 为 true 的默认激活 */
export const DEFAULT_MODELS: ModelConfig[] = [
  // 豆包系列
  { id: 'seed_pro', provider: 'volcengine', version: 'doubao-seed-2-0-pro-260215', label: 'Doubao-Seed-2.0-pro', color: '#2563eb', active: false },
  { id: 'seed_lite', provider: 'volcengine', version: 'doubao-seed-2-0-lite-260215', label: 'Doubao-Seed-2.0-lite', color: '#7c3aed', active: true },
  { id: 'seed_mini', provider: 'volcengine', version: 'doubao-seed-2-0-mini-260215', label: 'Doubao-Seed-2.0-mini', color: '#0891b2', active: true },
  { id: 'pro_32k', provider: 'volcengine', version: 'doubao-1-5-pro-32k-250115', label: 'Doubao-1.5-pro-32k', color: '#059669', active: false },
  { id: 'seedream45', provider: 'volcengine', version: 'doubao-seedream-4-5-251128', label: 'Doubao-Seedream-4.5', color: '#1d4ed8', active: false },
  // 千问系列
  { id: 'qwen35_plus', provider: 'qwen', version: 'qwen3.5-plus', label: 'Qwen3.5-Plus', color: '#ff6a00', active: false },
  { id: 'qwen35_flash', provider: 'qwen', version: 'qwen3.5-flash', label: 'Qwen3.5-Flash', color: '#e65100', active: true },
  { id: 'qwen3_max', provider: 'qwen', version: 'qwen3-max', label: 'Qwen3-Max', color: '#d84315', active: false },
  { id: 'qwen3_omni', provider: 'qwen', version: 'qwen3-omni-flash', label: 'Qwen3-Omni-Flash', color: '#bf360c', active: true },
  { id: 'qwen_character', provider: 'qwen', version: 'qwen-plus-character', label: 'Qwen-Plus-Character', color: '#a1887f', active: true },
  { id: 'qwen_image', provider: 'qwen', version: 'qwen-image-2.0-pro', label: 'Qwen-Image-2.0-Pro', color: '#fb8c00', active: false },
  // DeepSeek 系列
  { id: 'ds_chat', provider: 'deepseek', version: 'deepseek-chat', label: 'DeepSeek-Chat', color: '#4d6bfe', active: true },
  { id: 'ds_reasoner', provider: 'deepseek', version: 'deepseek-reasoner', label: 'DeepSeek-Reasoner', color: '#7c4dff', active: true },
  // 智谱 GLM 系列
  { id: 'glm5', provider: 'zhipu', version: 'glm-5', label: 'GLM-5', color: '#0891b2', active: true },
  { id: 'glm47', provider: 'zhipu', version: 'glm-4.7', label: 'GLM-4.7', color: '#0e7490', active: false },
  { id: 'glm47fx', provider: 'zhipu', version: 'glm-4.7-flashx', label: 'GLM-4.7-FlashX', color: '#155e75', active: true },
  { id: 'glm46v', provider: 'zhipu', version: 'glm-4.6v', label: 'GLM-4.6V', color: '#164e63', active: false },
  { id: 'glm_image', provider: 'zhipu', version: 'glm-image', label: 'GLM-Image', color: '#0ea5e9', active: false },
  // Kimi 系列
  { id: 'kimi_k25', provider: 'kimi', version: 'kimi-k2.5', label: 'Kimi K2.5', color: '#6366f1', active: true },
  // MiniMax 系列
  { id: 'mm_m27', provider: 'minimax', version: 'MiniMax-M2.7', label: 'MiniMax M2.7', color: '#10b981', active: true },
  { id: 'mm_m25', provider: 'minimax', version: 'MiniMax-M2.5', label: 'MiniMax M2.5', color: '#059669', active: false },
  { id: 'mm_her', provider: 'minimax', version: 'M2-her', label: 'MiniMax M2-Her', color: '#0d9488', active: true },
  { id: 'mm_image', provider: 'minimax', version: 'image-01', label: 'MiniMax Image-01', color: '#22c55e', active: false },
]

export type LayoutMode = 'auto' | '1col' | '2col' | '3col' | '4col'
export const LAYOUT_MODES: LayoutMode[] = ['auto', '1col', '2col', '3col', '4col']
