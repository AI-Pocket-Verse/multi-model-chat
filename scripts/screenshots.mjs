/**
 * Regenerates the README screenshots in docs/images/.
 *
 *   pnpm screenshots
 *
 * Starts the Vite dev server on its own port and drives a browser with
 * Playwright. Every /api/* call is intercepted in the browser and answered
 * with canned demo data, so no api process, API key or network access is
 * needed and nothing is billed. The generated images are self-made SVGs.
 *
 * Uses the locally installed Google Chrome by default; set PW_CHANNEL= (empty)
 * to use Playwright's bundled Chromium instead (`pnpm exec playwright install chromium`).
 */
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'docs/images')
const PORT = 5199
const BASE = `http://localhost:${PORT}`
const CHANNEL = process.env.PW_CHANNEL ?? 'chrome'

// ── demo data ───────────────────────────────────────────────────────────
const CHAT_PROMPT = '用三句话介绍一下长城的历史'
const IMAGE_PROMPT = '画一张月光下屋顶上的猫咪插画'

const ANSWERS = {
  'doubao-seed-2-0-lite-260215':
    '**长城**始建于春秋战国时期，各诸侯国为防御而修筑各自的城墙。\n秦始皇统一六国后，将北方城墙连接起来，形成「万里长城」的雏形。\n今天看到的砖石长城大多是**明代**重修的，全长约 2.1 万公里。',
  'qwen3.5-flash':
    '1. 起源：春秋战国时期，诸侯国为互相防御开始修建长城。\n2. 连接：秦朝统一后把各段城墙连成一线，汉代继续向西延伸。\n3. 定型：明朝大规模重修，八达岭、慕田峪等段都是**明长城**。',
  'deepseek-chat':
    '长城的修建跨越了两千多年：\n- 战国时期各国分段修筑\n- 秦朝连接成**万里长城**\n- 明朝用砖石全面重修，留存至今\n1987 年，长城被列入世界文化遗产名录。',
  'glm-5':
    '### 长城简史\n长城最早可追溯到公元前 7 世纪的春秋时期；秦、汉两代把它连成了横亘北方的防线；现存最完整的部分是 14 世纪以后修建的明长城。',
  'kimi-k2.5':
    '一句话版本：长城是**两千多年里不断修建**的军事防御工程。\n展开来说，它起于战国、成于秦汉、盛于明代，如今是中国最具代表性的文化符号之一。',
  'MiniMax-M2.7':
    '长城的故事可以分三段讲：\n1. **战国**：各国筑墙自保\n2. **秦汉**：连成万里防线，护卫丝绸之路\n3. **明代**：砖石重修，形成今天的模样',
  'deepseek-reasoner':
    '先厘清时间线：春秋战国 → 秦 → 汉 → 明。\n**结论**：长城并非一次建成，而是历代在前人基础上不断修筑、连接和加固的结果。',
}
const fallbackAnswer = (model) => `这是 ${model} 的演示回答。`

/** 自制的演示插画（SVG），四个模型各一张，避免使用任何第三方图片 */
function demoImage(seed) {
  const palettes = [
    ['#1e3a8a', '#6366f1', '#fde68a'],
    ['#0f172a', '#0ea5e9', '#f8fafc'],
    ['#312e81', '#db2777', '#fef3c7'],
    ['#064e3b', '#10b981', '#ecfccb'],
  ]
  const [sky, glow, moon] = palettes[seed % palettes.length]
  const mx = 120 + seed * 60
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${glow}"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  ${Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 97 + seed * 31) % 512}" cy="${(i * 53 + seed * 17) % 260}" r="${1 + (i % 3)}" fill="#fff" opacity="0.7"/>`).join('')}
  <circle cx="${mx}" cy="130" r="58" fill="${moon}"/>
  <path d="M0 380 L140 300 L260 360 L380 290 L512 350 L512 512 L0 512 Z" fill="#0b1020" opacity="0.85"/>
  <g transform="translate(${300 - seed * 30} 268)" fill="#0b1020">
    <ellipse cx="40" cy="70" rx="44" ry="34"/>
    <circle cx="40" cy="26" r="24"/>
    <path d="M20 12 L24 -10 L34 8 Z M60 12 L56 -10 L46 8 Z"/>
    <path d="M80 80 Q120 60 104 20" stroke="#0b1020" stroke-width="9" fill="none" stroke-linecap="round"/>
  </g>
</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const IMAGE_MODELS = ['qwen-image-2.0-pro', 'glm-image', 'doubao-seedream-4-5-251128', 'image-01']

const PROVIDERS = {
  configured: {
    volcengine: true,
    qwen: true,
    deepseek: true,
    zhipu: true,
    kimi: false,
    minimax: false,
    custom: true,
  },
  allowUserBaseUrl: true,
}

function sse(text) {
  const chunks = text.match(/[\s\S]{1,6}/g) ?? []
  const frames = chunks.map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`)
  frames.push(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`, 'data: [DONE]\n\n')
  return frames.join('')
}

async function mockApi(page) {
  await page.route('**/api/providers', (route) => route.fulfill({ json: PROVIDERS }))
  await page.route('**/api/chat', (route) => {
    const { model } = route.request().postDataJSON()
    return route.fulfill({ contentType: 'text/event-stream', body: sse(ANSWERS[model] ?? fallbackAnswer(model)) })
  })
  await page.route('**/api/image', (route) => {
    const { model } = route.request().postDataJSON()
    return route.fulfill({ json: { images: [demoImage(Math.max(0, IMAGE_MODELS.indexOf(model)))] } })
  })
}

/** 预置 localStorage：激活哪些模型与布局（zustand persist 的存档格式） */
async function seed(page, { active, layoutMode = 'auto', imageViewOnly = false }) {
  await page.addInitScript(
    (state) => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.clear()
      localStorage.setItem('multi-model-chat-state', JSON.stringify({ state, version: 0 }))
    },
    { activeModels: active, layoutMode, imageViewOnly, persona: '' },
  )
}

async function broadcast(page, text) {
  const input = page.locator('textarea').last()
  await input.fill(text)
  await input.press('Enter')
  // 等所有窗口的状态灯都不再是「正在生成」
  await page.waitForFunction(() => !document.querySelector('[title="正在生成…"]'))
  await page.waitForTimeout(2600) // 流式结束后的边框高亮持续 2.2s
}

async function shot(page, name, opts = {}) {
  await page.screenshot({ path: resolve(OUT, `${name}.png`), ...opts })
  console.log(`  ✓ docs/images/${name}.png`)
}

async function newPage(browser, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'zh-CN' })
  const page = await context.newPage()
  await mockApi(page)
  return page
}

// ── shots ───────────────────────────────────────────────────────────────
const CHAT_MODELS = ['seed_lite', 'qwen35_flash', 'ds_chat', 'glm5', 'kimi_k25', 'mm_m27']

async function run(browser) {
  // 1. 主界面：六个模型并排回答
  {
    const page = await newPage(browser)
    await seed(page, { active: CHAT_MODELS, layoutMode: '3col' })
    await page.goto(BASE)
    await broadcast(page, CHAT_PROMPT)
    await shot(page, 'hero')
    await page.context().close()
  }

  // 2. 文生图对比
  {
    const page = await newPage(browser, { width: 1440, height: 1180 })
    await seed(page, { active: ['qwen_image', 'glm_image', 'seedream45', 'mm_image'], layoutMode: '2col' })
    await page.goto(BASE)
    await broadcast(page, IMAGE_PROMPT)
    await shot(page, 'image-compare')
    await page.context().close()
  }

  // 3. 全局设置、4. 窗口内切换版本、5. 添加自定义 OpenAI 兼容模型
  {
    const page = await newPage(browser)
    await seed(page, { active: ['ds_chat', 'qwen35_flash', 'glm5'], layoutMode: '3col' })
    await page.goto(BASE)
    await broadcast(page, CHAT_PROMPT)

    await page.getByTitle('全局设置').click()
    await page.getByText('服务端 Key', { exact: true }).waitFor()
    await page.waitForTimeout(300)
    await shot(page, 'settings')
    await page.keyboard.press('Escape')

    await page.getByTitle('切换模型版本').nth(1).click()
    await page.getByRole('listbox').waitFor()
    await page.waitForTimeout(300)
    await shot(page, 'version-switcher', { clip: { x: 300, y: 50, width: 900, height: 520 } })
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: '添加模型' }).first().click()
    await page.getByRole('button', { name: /火山方舟/ }).click()
    await page.getByRole('option', { name: /OpenAI 兼容/ }).click()
    await page.getByPlaceholder(/gpt-4o-mini/).fill('llama3.2')
    await page.getByPlaceholder('留空则使用默认名称').fill('Llama 3.2 (Ollama)')
    await page.locator('input[type="url"]').fill('http://127.0.0.1:11434/v1')
    await page.waitForTimeout(300)
    await shot(page, 'add-custom-model')
    await page.context().close()
  }
}

// ── main ────────────────────────────────────────────────────────────────
async function waitForServer(url, ms = 30_000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`dev server did not start: ${url}`)
}

await mkdir(OUT, { recursive: true })
const vite = spawn('pnpm', ['--filter', '@multi-model-chat/web', 'exec', 'vite', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
})
try {
  await waitForServer(BASE)
  const browser = await chromium.launch(CHANNEL ? { channel: CHANNEL } : {})
  try {
    console.log('Capturing screenshots…')
    await run(browser)
  } finally {
    await browser.close()
  }
} finally {
  vite.kill()
}
