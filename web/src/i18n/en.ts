/** English UI copy. Typed against zh.ts, so a missing key fails the build. */
import type { Messages } from './zh'

const en: Messages = {
  app: {
    title: 'Multi-Model Chat',
    documentTitle: 'Multi-Model Chat',
    loading: 'Loading conversations…',
  },
  header: {
    toggleSidebar: 'Toggle sidebar',
    activePrefix: 'Active',
    activeSuffix: 'models',
    addModel: 'Add model',
    imageOnlyOnTitle: 'On: only image-model windows are shown',
    imageOnlyOffTitle: 'Off: all active model windows are shown',
    imageOnlyOn: 'Image windows only',
    imageOnlyOff: 'All windows',
    switchLayout: 'Switch layout',
    settings: 'Settings',
    copyIdTitle: (label, value) => `${label}: ${value} (click to copy)`,
    copied: 'Copied',
  },
  menu: {
    login: 'Log in',
    settings: 'Settings',
    logout: 'Log out',
    localUser: 'Local user',
    skin: (name) => `Skin: ${name}`,
    language: (name) => `Language: ${name}`,
    skins: { a: 'Balanced', b: 'Neutral', c: 'Feishu Blue' },
  },
  persona: {
    title: 'Persona / system prompt',
    done: 'Done',
    edit: 'Edit',
    placeholder: 'Click “Edit” to set the AI’s role and rules…',
    editPlaceholder:
      'Set the AI’s role and rules; they apply to every active model…\n\nFor example: You are an experienced full-stack engineer. Answer concisely and professionally, with code examples where helpful.',
    appliesToAll: 'Applies to all active models',
  },
  modelList: {
    title: 'Models',
    count: (n) => `${n}`,
    all: 'All',
    image: 'Image',
    empty: 'No models yet. Add one with the button below',
    emptyFiltered: 'No models match this filter',
    showInfo: 'Click for model details',
    imageBadge: 'Image',
    turnOff: 'Click to turn off',
    turnOn: 'Click to turn on',
    remove: 'Remove this model',
    addNew: 'Add model',
  },
  input: {
    idle: 'Message all active models… (Enter to send · Shift+Enter for a new line)',
    busy: 'Wait for every model to finish before sending the next message…',
    personaActive: 'Persona is active',
    send: 'Send (Enter)',
  },
  grid: {
    emptyImage: 'No image-model windows to show',
    emptyAll: 'No active models yet',
    emptyImageHint: 'Activate an image model, or turn off “Image windows only” at the top right',
    emptyAllHint: 'Turn on a model in the left panel, or click “Add model” to set up a new AI service',
    addFirst: 'Add your first model',
  },
  chat: {
    showInfo: 'Click for model details',
    generating: 'Generating…',
    ready: 'Ready',
    waiting: 'Waiting for input',
    newConversation: 'New conversation',
    clearConversation: 'Clear conversation',
    readyTitle: (label) => `${label} is ready`,
    readyHint: 'Send a message from the bottom bar to start',
    count: (n) => (n === 1 ? '1 msg' : `${n} msgs`),
    placeholder: (label) => `Message ${label} only…`,
    sendOnly: 'Send to this model only',
  },
  bubble: {
    copied: 'Copied',
    copyFailed: 'Copy failed. Please select the text manually',
    viewImage: 'Click to view full size',
    imageAlt: 'AI-generated image',
    imagesGenerated: (n) => (n === 1 ? '1 image generated' : `${n} images generated`),
    copyAll: 'Copy all',
  },
  info: {
    none: 'No description available.',
    close: 'Close',
  },
  version: {
    busy: 'Responding. You can switch versions when it finishes',
    switch: 'Switch model version',
    imageBadge: 'Image',
    custom: 'Custom model ID / provider…',
  },
  settings: {
    title: 'Settings',
    description: 'Check server-side keys, and edit or switch the model each window uses',
    serverKeys: 'Server keys',
    configured: 'Set',
    notConfigured: 'Not set',
    statusUnavailable: 'Could not load the server configuration. Make sure the api is running, then reopen this panel',
    keysHint:
      'Set keys in api/.env.dev (api/.env.prod in production) and restart the api. Providers without a server key can use a key stored on the model.',
    models: (n) => `Models (${n})`,
    active: 'Active',
    ownKey: 'Own key',
    editModel: 'Edit this model',
    edit: 'Edit',
    resetTitle:
      'Restore the preset model list: models you added and their conversations are deleted; preset models keep their conversations',
    reset: 'Restore preset models',
    resetConfirm: 'Click again to confirm',
    done: 'Done',
  },
  dialog: {
    addTitle: 'Add AI model',
    editTitle: 'Edit model',
    addDescription: 'Set up a new chat window with any supported provider',
    editDescription: 'Change the provider, model ID, display name or API key. Conversation history is kept',
    provider: 'Provider',
    modelId: 'Model ID / endpoint ID',
    displayName: 'Display name',
    optional: ' (optional)',
    displayNamePlaceholder: 'Leave empty to use the model ID',
    baseUrlPlaceholder: 'https://api.openai.com/v1 or http://127.0.0.1:11434/v1',
    baseUrlPlaceholderServer: 'Leave empty to use the server’s CUSTOM_BASE_URL',
    baseUrlForbidden: 'The server does not allow custom URLs; the admin’s CUSTOM_BASE_URL is used',
    baseUrlHint: 'Point it at the /v1 level. The api sends the request, so the URL must be reachable from the api’s machine',
    showHide: 'Show / hide',
    keyHintCustom:
      'Leave empty to use the server’s CUSTOM_API_KEY. With your own Base URL only the key entered here is used (Ollama and similar can stay empty)',
    keyHintMissing: 'The server has no key for this provider, so enter one here. It is stored only in this browser',
    keyHintDefault: 'Leave empty to use the server’s key. A key entered here is stored only in this browser',
    cancel: 'Cancel',
    save: 'Save',
    add: 'Add model',
    needModelId: 'Enter a model ID or endpoint ID',
    badBaseUrl: 'Base URL must start with http:// or https://',
    needBaseUrl: 'The server has no CUSTOM_BASE_URL, so enter a Base URL',
    saved: (label) => `Saved “${label}”`,
  },
  toast: {
    storageUnavailable: 'Local storage is unavailable, so history could not be loaded this time',
    personaSaved: 'Persona saved',
    personaCleared: 'Persona cleared',
    modelRemoved: 'Model removed',
    modelAdded: (label) => `Added “${label}”`,
    busySwitch: 'This model is still responding. Try again when it finishes',
    switched: (v) => `Switched to ${v}. Conversation history kept`,
    reset: 'Preset models restored',
    busyView: 'Models are responding, so the window view can’t change yet',
    layout: (mode) => `Layout: ${mode === 'auto' ? 'auto' : mode}`,
    newConversation: 'New conversation started',
    cleared: 'Conversation cleared',
    needImageModel: 'Activate at least one image model first',
    needModel: 'Activate at least one model in the left panel first',
    busyModel: 'This model is still responding. Please wait',
    emptyReply: '(The model returned no text)',
  },
  errorBoundary: {
    title: 'Something went wrong',
    hint: 'Click “Retry” to recover. If it keeps happening, please report it with the line below.',
    retry: 'Retry',
  },
  providers: {
    volcengine: {
      label: 'Volcengine · Doubao',
      info: 'ByteDance’s Volcengine Ark platform, Doubao models. Model IDs may also be console endpoint IDs such as ep-xxx-xxx.',
    },
    qwen: {
      label: 'Alibaba · Qwen',
      info: 'Alibaba Cloud Model Studio, Qwen models, called through the OpenAI-compatible API.',
    },
    deepseek: {
      label: 'DeepSeek',
      info: 'DeepSeek platform: V3.2 with 128K context, thinking and non-thinking modes, tool calls and context caching.',
    },
    zhipu: {
      label: 'Zhipu · GLM',
      info: 'Zhipu AI platform, GLM flagship models. OpenAI-compatible, with streaming and deep-thinking mode.',
    },
    kimi: {
      label: 'Moonshot · Kimi',
      info: 'Moonshot AI platform, Kimi models. OpenAI-compatible, with streaming and up to 128K context.',
    },
    minimax: {
      label: 'MiniMax',
      info: 'MiniMax platform, M2 models. OpenAI-compatible, up to 204K context, with streaming and complex agent workflows.',
    },
    custom: {
      label: 'OpenAI-compatible · Custom',
      info: 'Any OpenAI-compatible API: OpenAI, OpenRouter, Ollama, vLLM, LM Studio and more. With Base URL empty, the server’s CUSTOM_BASE_URL is used; gpt-image / dall-e models can generate images.',
    },
  },
  errors: {
    network:
      '⚠️ Network request failed\n\n' +
      'Possible causes:\n' +
      '1. Your network connection has a problem\n' +
      '2. The api is not running or not reachable (for local development, make sure the api is up on :4060; pnpm dev starts both web and api)',
    sessionExpired:
      '🔒 Please log in to send messages\n\n' +
      'Click “Log in” under the avatar at the top right to sign in with Feishu (if you were signed in, your session has expired; just log in again).\n' +
      '(This is not a model or API key problem; no need to check provider settings)',
    streamTimeout:
      '⏱️ Response timed out\n\n' +
      'The model sent nothing for a long time, so the request was stopped. The provider may be busy or the network unstable; try again later.',
    streamInterrupted:
      '⚠️ Reply interrupted\n\n' +
      'The connection to the model dropped before any content arrived. Check your network or try again later.',
    interruptedMark: '\n\n(Reply interrupted; the text above is incomplete)',
    apiFailed: '❌ API request failed',
    errorMessage: 'Error: ',
    httpStatus: 'HTTP status: ',
    requestId: 'Request ID: ',
    currentModel: 'Model ID: ',
    suggestions: '💡 What to try:',
    keyMissing: (env) =>
      `• Set ${env} in api/.env.dev (api/.env.prod in production) and restart the api\n` +
      `• Or edit this model in Settings (top right) and enter its own API key`,
    configTips: {
      custom_base_url_missing:
        `• Edit this model in Settings and enter a Base URL\n` +
        `• Or set CUSTOM_BASE_URL in api/.env.dev (api/.env.prod in production) and restart the api`,
      custom_base_url_forbidden: `• Edit this model in Settings and clear the Base URL to use the server’s address`,
      invalid_base_url: `• Edit this model in Settings; a Base URL looks like https://api.openai.com/v1`,
      host_not_allowed:
        `• Open the app via http://localhost, or add the domain / IP you use to ALLOWED_HOSTS in the api config and restart the api`,
    },
    apiMessages: {
      provider_key_missing: (p) => `The server has no API key for ${p}, and this model has no key of its own`,
      custom_base_url_missing: () => 'This model has no Base URL, and the server has no CUSTOM_BASE_URL',
      custom_base_url_forbidden: () =>
        'The server does not allow custom Base URLs (ALLOW_USER_BASE_URL=false). Clear the Base URL to use the server’s address',
      invalid_base_url: () => 'Invalid Base URL. Only http:// and https:// are supported',
      host_not_allowed: () => 'Local mode only accepts localhost. Add the host you use to ALLOWED_HOSTS',
      upstream_unreachable: (p) => `Cannot reach the ${p} service`,
      upstream_timeout: (p) => `${p} image generation timed out after 300 s. Try again later or use another image model`,
      no_image: () => 'The model responded but returned no image that can be displayed',
      internal_error: () => 'Internal server error',
    },
    overdue:
      `⚠️ Insufficient balance or overdue account!\n` +
      `• Top up in the provider’s console and try again\n` +
      `• Volcengine Ark: https://console.volcengine.com/finance\n` +
      `• Alibaba Model Studio: https://usercenter2.aliyun.com/finance\n` +
      `• DeepSeek: https://platform.deepseek.com/top_up`,
    auth:
      `• The API key is invalid or expired; check that it is correct\n` +
      `• Edit this model in Settings and enter a valid API key`,
    rateLimit: `• Rate limit exceeded; try again later\n` + `• Use fewer models at once, or wait a while before sending`,
    providerTips: {
      qwen:
        `• Check available models in the Model Studio console (bailian.console.aliyun.com)\n` +
        `• Make sure the API key may call this model\n` +
        `• Check the model ID spelling (e.g. qwen3.5-plus, qwen3-max)\n` +
        `• Docs: https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope`,
      deepseek:
        `• Check your API key and balance on the DeepSeek platform (platform.deepseek.com)\n` +
        `• Only deepseek-chat and deepseek-reasoner are valid model IDs\n` +
        `• Check whether you hit the rate limit\n` +
        `• Docs: https://api-docs.deepseek.com/`,
      zhipu:
        `• Check your API key and balance in the Zhipu AI console (open.bigmodel.cn)\n` +
        `• Check the model ID spelling (e.g. glm-5, glm-4.7, glm-4.7-flashx, glm-4.6v)\n` +
        `• Make sure the API key may call this model\n` +
        `• Docs: https://docs.bigmodel.cn/cn/guide/models/text/glm-5`,
      kimi:
        `• Check your API key and balance on the Moonshot platform (platform.moonshot.cn)\n` +
        `• Check the model ID spelling (e.g. kimi-k2.5, moonshot-v1-8k, moonshot-v1-128k)\n` +
        `• Make sure the API key is valid and the balance is sufficient\n` +
        `• Docs: https://platform.moonshot.cn/docs/api/chat`,
      minimax:
        `• Check your API key and balance on the MiniMax platform (platform.minimaxi.com)\n` +
        `• Model IDs are case-sensitive (e.g. MiniMax-M2.7, MiniMax-M2.5, M2-her)\n` +
        `• Make sure the API key is valid and the account has a Token Plan\n` +
        `• Docs: https://platform.minimaxi.com/docs/guides/text-generation`,
      custom:
        `• Make sure the Base URL points at the /v1 level of an OpenAI-compatible API (e.g. https://api.openai.com/v1, http://127.0.0.1:11434/v1)\n` +
        `• Make sure the model ID is one the service actually offers (for Ollama, run ollama list)\n` +
        `• The api sends the request, so the Base URL must be reachable from the api’s machine (inside Docker, reach the host via host.docker.internal)`,
    },
    volcengineTips:
      `• Check available models in the Volcengine Ark console (ark.volcengine.com)\n` +
      `• If the model needs enabling, activate it under “Model access” in the console first\n` +
      `• You can also use a console endpoint ID (format: ep-XXXXXXXX-XXXX)\n` +
      `• Edit this model in Settings and correct the model ID`,
    imageNetwork:
      '⚠️ Image request failed\n\n' +
      'Possible causes:\n' +
      '1. The image API address is misconfigured or the provider returned an error\n' +
      '2. The api is not running or not reachable\n' +
      '3. Your network or the provider’s API has a problem',
    imageFailedTitle: '❌ Image generation failed',
    imageFailedDefault: 'Image generation failed',
    imageUnsupported: (label) =>
      `“${label}” can’t generate images directly.\n\nSupported image models: qwen-image, glm-image / CogView, doubao-seedream, image-01, and gpt-image / dall-e on OpenAI-compatible APIs.`,
  },
}

export default en
