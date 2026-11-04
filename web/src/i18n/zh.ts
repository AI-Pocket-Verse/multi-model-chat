/**
 * 中文文案 —— 界面文案的基准。en.ts 以这里的类型为准，漏翻会编译报错。
 *
 * 带参数的文案写成函数；组件里一律通过 useT() / t() 取，不写死字符串。
 */
import type { ProviderKey } from '@multi-model-chat/shared'

const zh = {
  app: {
    title: '多模型并行对话',
    documentTitle: '多模型 AI 并行对话',
    loading: '正在载入会话…',
  },
  header: {
    toggleSidebar: '切换侧栏',
    activePrefix: '已激活',
    activeSuffix: '个模型',
    addModel: '添加模型',
    imageOnlyOnTitle: '已开启：仅显示生图模型窗口',
    imageOnlyOffTitle: '关闭：显示全部已选模型窗口',
    imageOnlyOn: '仅看生图窗口',
    imageOnlyOff: '显示全部窗口',
    switchLayout: '切换布局',
    settings: '全局设置',
    copyIdTitle: (label: string, value: string) => `${label}: ${value}（点击复制）`,
    copied: '已复制',
  },
  menu: {
    login: '登录',
    settings: '设置',
    logout: '退出登录',
    localUser: '本地用户',
    skin: (name: string) => `皮肤：${name}`,
    language: (name: string) => `语言：${name}`,
    skins: { a: '折中', b: '中性', c: '飞书蓝' },
  },
  persona: {
    title: '人设 / 系统提示词',
    done: '完成',
    edit: '修改',
    placeholder: '点击「修改」设置 AI 的角色与行为准则...',
    editPlaceholder:
      '设置 AI 的角色与行为准则，将同步应用到所有激活模型...\n\n例如：你是一位经验丰富的全栈工程师，请用简洁专业的方式回答问题，并在适当时给出代码示例。',
    appliesToAll: '应用于所有激活模型',
  },
  modelList: {
    title: '模型列表',
    count: (n: number) => `${n} 个`,
    all: '全部模型',
    image: '生图模型',
    empty: '暂无模型，请点击下方按钮添加',
    emptyFiltered: '当前筛选下暂无模型',
    showInfo: '点击查看模型介绍',
    imageBadge: '生图',
    turnOff: '点击关闭',
    turnOn: '点击开启',
    remove: '移除此模型',
    addNew: '添加新模型',
  },
  input: {
    idle: '输入消息，同时发送给所有激活的模型... (Enter 发送 · Shift+Enter 换行)',
    busy: '等待所有模型响应完成后才能发送下一条消息...',
    personaActive: '当前人设已激活',
    send: '发送 (Enter)',
  },
  grid: {
    emptyImage: '当前没有可展示的生图模型窗口',
    emptyAll: '还没有激活的模型',
    emptyImageHint: '请先激活生图模型，或关闭右上角「仅看生图窗口」开关',
    emptyAllHint: '在左侧面板中开启模型开关，或点击「添加模型」配置新的 AI 服务',
    addFirst: '添加第一个模型',
  },
  chat: {
    showInfo: '点击查看模型介绍',
    generating: '正在生成…',
    ready: '已就绪',
    waiting: '等待输入',
    newConversation: '新开对话',
    clearConversation: '清空对话',
    readyTitle: (label: string) => `${label} 已就绪`,
    readyHint: '在底部输入框发送消息以开始对话',
    count: (n: number) => `${n} 条`,
    placeholder: (label: string) => `单独发送给 ${label}…`,
    sendOnly: '仅发送给此模型',
  },
  bubble: {
    copied: '已复制',
    copyFailed: '复制失败，请手动选择文本',
    viewImage: '点击查看大图',
    imageAlt: 'AI 生成图片',
    imagesGenerated: (n: number) => `已生成 ${n} 张图片`,
    copyAll: '复制全文',
  },
  info: {
    none: '暂无介绍信息。',
    close: '关闭',
  },
  version: {
    busy: '响应中，结束后可切换版本',
    switch: '切换模型版本',
    imageBadge: '生图',
    custom: '自定义模型 ID / 供应商…',
  },
  settings: {
    title: '全局设置',
    description: '查看服务端 Key 配置，编辑或切换各窗口使用的模型',
    serverKeys: '服务端 Key',
    configured: '已配置',
    notConfigured: '未配置',
    statusUnavailable: '暂时无法获取服务端配置，确认 api 已启动后重新打开本面板',
    keysHint: '在 api/.env.dev（生产为 .env.prod）里配置，重启 api 生效；未配置的供应商可在模型里自带 Key。',
    models: (n: number) => `模型（${n}）`,
    active: '已激活',
    ownKey: '自带 Key',
    editModel: '编辑此模型',
    edit: '编辑',
    resetTitle: '恢复为预置的模型列表：自己添加的模型及其对话会被删除，预置模型的对话保留',
    reset: '恢复预置模型列表',
    resetConfirm: '再点一次确认恢复',
    done: '完成',
  },
  dialog: {
    addTitle: '添加 AI 模型',
    editTitle: '编辑模型',
    addDescription: '配置新的对话窗口，支持主流大模型服务商',
    editDescription: '修改供应商、模型 ID、显示名称或 API Key，对话历史保留',
    provider: '模型提供商',
    modelId: '模型 ID / 接入点 ID',
    displayName: '显示名称',
    optional: '（可选）',
    displayNamePlaceholder: '留空则使用默认名称',
    baseUrlPlaceholder: 'https://api.openai.com/v1 或 http://127.0.0.1:11434/v1',
    baseUrlPlaceholderServer: '留空则使用服务端 CUSTOM_BASE_URL',
    baseUrlForbidden: '服务端已禁止自填接口地址，将使用管理员配置的 CUSTOM_BASE_URL',
    baseUrlHint: '填到 /v1 一级；请求由 api 发出，地址需能从 api 所在机器访问',
    showHide: '显示/隐藏',
    keyHintCustom: '留空则使用服务端 CUSTOM_API_KEY；自填 Base URL 时只会使用这里填的 Key（本地 Ollama 等可留空）',
    keyHintMissing: '服务端未配置该供应商的 Key，请在这里填写；仅保存在本地浏览器',
    keyHintDefault: '留空则使用服务端配置的 Key；填写后仅保存在本地浏览器',
    cancel: '取消',
    save: '保存',
    add: '添加模型',
    needModelId: '请填写模型 ID 或接入点 ID',
    badBaseUrl: 'Base URL 需以 http:// 或 https:// 开头',
    needBaseUrl: '服务端未配置 CUSTOM_BASE_URL，请填写 Base URL',
    saved: (label: string) => `已保存「${label}」`,
  },
  toast: {
    storageUnavailable: '本地存储不可用，历史记录本次无法加载',
    personaSaved: '人设已保存',
    personaCleared: '人设已清空',
    modelRemoved: '模型已移除',
    modelAdded: (label: string) => `已添加「${label}」`,
    busySwitch: '该模型正在响应中，请稍后再切换',
    switched: (v: string) => `已切换到 ${v}，对话历史保留`,
    reset: '已恢复预置模型列表',
    busyView: '模型响应中，暂时不能切换窗口视图',
    layout: (mode: string) => `布局：${mode === 'auto' ? '自动' : mode}`,
    newConversation: '已开启新对话',
    cleared: '对话已清空',
    needImageModel: '请先激活至少一个生图模型',
    needModel: '请先在左侧面板激活至少一个模型',
    busyModel: '该模型正在响应中，请稍后',
    emptyReply: '（模型未返回文本内容）',
  },
  errorBoundary: {
    title: '页面出错了',
    hint: '可以点「重试」恢复；反复出现的话，请带上下面这行信息反馈。',
    retry: '重试',
  },
  providers: {
    volcengine: {
      label: '火山方舟 · 豆包',
      info: '字节跳动火山方舟平台，豆包系列大模型。模型 ID 也支持控制台推理接入点格式 ep-xxx-xxx。',
    },
    qwen: { label: '阿里云百炼 · 千问', info: '阿里云百炼平台，通义千问系列大模型。使用 OpenAI 兼容接口调用。' },
    deepseek: {
      label: 'DeepSeek',
      info: 'DeepSeek 开放平台，V3.2 128K 上下文，支持思考/非思考双模式、Tool Calls 与上下文缓存。',
    },
    zhipu: {
      label: '智谱 AI · GLM',
      info: '智谱 AI 开放平台，GLM 系列旗舰大模型。兼容 OpenAI 接口，支持流式输出与深度思考模式。',
    },
    kimi: {
      label: 'Moonshot AI · Kimi',
      info: 'Moonshot AI 开放平台，Kimi 系列大模型。兼容 OpenAI 接口，支持流式输出，最长 128K 上下文。',
    },
    minimax: {
      label: 'MiniMax',
      info: 'MiniMax 开放平台，M2 系列大模型。兼容 OpenAI 接口，最长 204K 上下文，支持流式输出与复杂 Agent 工作流。',
    },
    custom: {
      label: 'OpenAI 兼容 · 自定义',
      info: '任意 OpenAI 兼容接口：OpenAI、OpenRouter、Ollama、vLLM、LM Studio 等。Base URL 留空时使用服务端 CUSTOM_BASE_URL；gpt-image / dall-e 模型可直接生图。',
    },
  } as Record<ProviderKey, { label: string; info: string }>,
  errors: {
    network:
      '⚠️ 网络请求失败\n\n' +
      '可能原因：\n' +
      '1. 网络连接异常，请检查网络\n' +
      '2. API 服务未启动或不可达（本地开发确认 api 的 :4060 在运行，可用 pnpm dev 同时启动前后端）',
    sessionExpired:
      '🔒 需要登录后才能发送\n\n' +
      '请点击右上角头像处的「登录」完成飞书登录（若此前已登录，则是登录态已过期，重新登录即可）。\n' +
      '（这不是模型或 API Key 的问题，无需检查厂商配置）',
    streamTimeout:
      '⏱️ 响应超时\n\n' +
      '模型长时间没有返回任何内容，已中止本次请求。可能是该厂商服务繁忙或网络不稳定，稍后重试即可。',
    streamInterrupted:
      '⚠️ 回复被中断\n\n' + '与模型的连接在回复完成前断开，没有收到任何内容。请检查网络或稍后重试。',
    interruptedMark: '\n\n（回复被中断，以上内容不完整）',
    apiFailed: '❌ API 请求失败',
    errorMessage: '错误信息：',
    httpStatus: 'HTTP 状态码：',
    requestId: 'Request ID：',
    currentModel: '当前模型 ID：',
    suggestions: '💡 解决建议：',
    keyMissing: (env: string) =>
      `• 在 api/.env.dev（生产为 .env.prod）里填写 ${env}，然后重启 api\n` +
      `• 或在顶栏「全局设置」里编辑此模型，填入该模型自己的 API Key`,
    configTips: {
      custom_base_url_missing:
        `• 在顶栏「全局设置」里编辑此模型并填写 Base URL\n` +
        `• 或在 api/.env.dev（生产为 .env.prod）里设置 CUSTOM_BASE_URL，然后重启 api`,
      custom_base_url_forbidden: `• 在顶栏「全局设置」里编辑此模型，清空 Base URL 后改用服务端配置的地址`,
      invalid_base_url: `• 在顶栏「全局设置」里编辑此模型，Base URL 形如 https://api.openai.com/v1`,
      host_not_allowed: `• 用 http://localhost 访问，或在 api 配置里把当前访问的域名 / IP 加进 ALLOWED_HOSTS 后重启 api`,
    } as Record<string, string>,
    /**
     * 自家 api 错误码 → 本语言的原因说明。中文留空：直接显示 api 返回的中文 message，
     * 与加多语言之前的行为完全一致。
     */
    apiMessages: {} as Record<string, (provider: string) => string>,
    overdue:
      `⚠️ 账户余额不足或已欠费！\n` +
      `• 请前往对应平台控制台充值后重试\n` +
      `• 火山方舟：https://console.volcengine.com/finance\n` +
      `• 阿里云百炼：https://usercenter2.aliyun.com/finance\n` +
      `• DeepSeek：https://platform.deepseek.com/top_up`,
    auth: `• API Key 无效或已过期，请检查密钥是否正确\n` + `• 可在顶栏「全局设置」里编辑此模型，填入有效的 API Key`,
    rateLimit: `• 请求频率超出限制，请稍后重试\n` + `• 可降低并发模型数量或等待一段时间后再发送`,
    providerTips: {
      qwen:
        `• 在阿里云百炼控制台（bailian.console.aliyun.com）查看可用模型\n` +
        `• 确认 API Key 有权限调用该模型\n` +
        `• 检查模型 ID 是否拼写正确（如 qwen3.5-plus、qwen3-max 等）\n` +
        `• 文档：https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope`,
      deepseek:
        `• 在 DeepSeek 开放平台（platform.deepseek.com）查看 API Key 与余额\n` +
        `• 模型 ID 仅支持 deepseek-chat 或 deepseek-reasoner\n` +
        `• 检查是否超出速率限制（Rate Limit）\n` +
        `• 文档：https://api-docs.deepseek.com/zh-cn/`,
      zhipu:
        `• 在智谱 AI 控制台（open.bigmodel.cn）查看 API Key 与账户余额\n` +
        `• 确认模型 ID 拼写正确（如 glm-5、glm-4.7、glm-4.7-flashx、glm-4.6v）\n` +
        `• 检查 API Key 是否具有对应模型的调用权限\n` +
        `• 文档：https://docs.bigmodel.cn/cn/guide/models/text/glm-5`,
      kimi:
        `• 在 Moonshot 开发者平台（platform.moonshot.cn）查看 API Key 与账户余额\n` +
        `• 确认模型 ID 拼写正确（如 kimi-k2.5、moonshot-v1-8k、moonshot-v1-128k）\n` +
        `• 检查 API Key 是否有效，账户余额是否充足\n` +
        `• 文档：https://platform.moonshot.cn/docs/api/chat`,
      minimax:
        `• 在 MiniMax 开放平台（platform.minimaxi.com）查看 API Key 与账户余额\n` +
        `• 确认模型 ID 大小写正确（如 MiniMax-M2.7、MiniMax-M2.5、M2-her）\n` +
        `• 检查 API Key 是否有效，账户是否已订阅 Token Plan\n` +
        `• 文档：https://platform.minimaxi.com/docs/guides/text-generation`,
      custom:
        `• 确认 Base URL 指向 OpenAI 兼容接口的 /v1 一级（如 https://api.openai.com/v1、http://127.0.0.1:11434/v1）\n` +
        `• 确认模型 ID 是该服务实际提供的名称（Ollama 用 ollama list 查看）\n` +
        `• api 在服务端发起请求：Base URL 要能从 api 所在机器访问（Docker 里访问宿主机用 host.docker.internal）`,
    } as Partial<Record<ProviderKey, string>>,
    volcengineTips:
      `• 在火山方舟控制台（ark.volcengine.com）查看可用模型\n` +
      `• 若模型需要开通，先在控制台「模型接入」中激活\n` +
      `• 也可使用控制台推理接入点 ID（格式：ep-XXXXXXXX-XXXX）\n` +
      `• 在顶栏「全局设置」里编辑此模型，改成正确的模型 ID`,
    imageNetwork:
      '⚠️ 图片请求失败\n\n' +
      '可能原因：\n' +
      '1. 图片接口地址配置错误或上游返回异常\n' +
      '2. API 服务未启动或不可达\n' +
      '3. 当前网络或供应商接口异常',
    imageFailedTitle: '❌ 图片生成失败',
    imageFailedDefault: '图片生成失败',
    imageUnsupported: (label: string) =>
      `当前模型「${label}」不支持直接生成图片。\n\n当前仅已接入 qwen-image、glm-image / CogView、doubao-seedream、image-01，以及 OpenAI 兼容接口的 gpt-image / dall-e 这类生图模型。`,
  },
}

export type Messages = typeof zh
export default zh
