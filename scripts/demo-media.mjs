/**
 * Regenerates the README screenshots and demo video, in English and Chinese.
 *
 *   pnpm screenshots   → docs/images/{en,zh}/*.png
 *   pnpm demo-video    → docs/images/{en,zh}/demo.gif + docs/media/demo-{en,zh}.mp4 (needs ffmpeg)
 *
 * Starts a small mock api (streams canned replies chunk by chunk, returns
 * self-made SVG images) and the Vite dev server pointed at it, then drives the
 * locally installed Google Chrome with Playwright. No real api, API key or
 * network access is needed and nothing is billed.
 *
 * Set PW_CHANNEL= (empty) to use Playwright's bundled Chromium instead
 * (`pnpm exec playwright install chromium`).
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MODE = process.argv[2]
const WEB_PORT = 5199
const BASE = `http://localhost:${WEB_PORT}`
const CHANNEL = process.env.PW_CHANNEL ?? 'chrome'
const VIEWPORT = { width: 1440, height: 900 }

if (MODE !== 'screenshots' && MODE !== 'video') {
  console.error('usage: node scripts/demo-media.mjs screenshots|video')
  process.exit(1)
}

// ── demo content ────────────────────────────────────────────────────────
const CONTENT = {
  en: {
    chatPrompt: 'Summarize the history of the Great Wall in three sentences',
    followUp: 'Now in one sentence?',
    imagePrompt: 'Draw an illustration of a cat on a rooftop under the moonlight',
    answers: {
      'doubao-seed-2-0-lite-260215':
        'The **Great Wall** began in the Spring and Autumn and Warring States periods, when rival states built their own walls.\nAfter unifying China, Qin Shi Huang linked the northern walls into an early “Ten-Thousand-Li Wall”.\nMost of the brick wall standing today was rebuilt in the **Ming dynasty**, about 21,000 km in total.',
      'qwen3.5-flash':
        '1. Origins: Warring States kingdoms built walls to defend against each other.\n2. Connection: the Qin joined them into one line, and the Han extended it west.\n3. Final form: the Ming rebuilt it on a grand scale, including Badaling and Mutianyu.',
      'qwen3-max':
        '1. Origins: rival states started building walls in the 7th century BC.\n2. Connection: the Qin and Han dynasties joined and extended them.\n3. Legacy: the **Ming** rebuilt most of what survives today.',
      'deepseek-chat':
        'The Great Wall was built over more than two thousand years:\n- Warring States: walls built section by section\n- Qin: joined into the **Great Wall**\n- Ming: rebuilt in brick and stone, surviving today\nIt became a UNESCO World Heritage Site in 1987.',
      'glm-5':
        '### A short history\nThe wall dates back to the 7th century BC; the Qin and Han linked it into a northern defense line; the best-preserved parts are Ming walls built after the 14th century.',
      'kimi-k2.5':
        'In one line: the Great Wall is a defense project **built and rebuilt over two millennia**.\nIt started in the Warring States, took shape under the Qin and Han, peaked in the Ming, and is now a symbol of China.',
      'MiniMax-M2.7':
        'The story in three parts:\n1. **Warring States**: each state walls itself in\n2. **Qin and Han**: one long line guarding the Silk Road\n3. **Ming**: brick-and-stone rebuild, the wall we see today',
    },
    followUpAnswer: 'A defensive wall begun in the Warring States, joined by the Qin and largely rebuilt by the Ming.',
  },
  zh: {
    chatPrompt: '用三句话介绍一下长城的历史',
    followUp: '再用一句话概括',
    imagePrompt: '画一张月光下屋顶上的猫咪插画',
    answers: {
      'doubao-seed-2-0-lite-260215':
        '**长城**始建于春秋战国时期，各诸侯国为防御而修筑各自的城墙。\n秦始皇统一六国后，将北方城墙连接起来，形成「万里长城」的雏形。\n今天看到的砖石长城大多是**明代**重修的，全长约 2.1 万公里。',
      'qwen3.5-flash':
        '1. 起源：春秋战国时期，诸侯国为互相防御开始修建长城。\n2. 连接：秦朝统一后把各段城墙连成一线，汉代继续向西延伸。\n3. 定型：明朝大规模重修，八达岭、慕田峪等段都是**明长城**。',
      'qwen3-max':
        '1. 起源：公元前 7 世纪起，各诸侯国开始修筑城墙。\n2. 连接：秦汉两代把它们连接并向西延伸。\n3. 留存：今天看到的大部分是**明代**重修的。',
      'deepseek-chat':
        '长城的修建跨越了两千多年：\n- 战国时期各国分段修筑\n- 秦朝连接成**万里长城**\n- 明朝用砖石全面重修，留存至今\n1987 年，长城被列入世界文化遗产名录。',
      'glm-5':
        '### 长城简史\n长城最早可追溯到公元前 7 世纪的春秋时期；秦、汉两代把它连成了横亘北方的防线；现存最完整的部分是 14 世纪以后修建的明长城。',
      'kimi-k2.5':
        '一句话版本：长城是**两千多年里不断修建**的军事防御工程。\n展开来说，它起于战国、成于秦汉、盛于明代，如今是中国最具代表性的文化符号之一。',
      'MiniMax-M2.7':
        '长城的故事可以分三段讲：\n1. **战国**：各国筑墙自保\n2. **秦汉**：连成万里防线，护卫丝绸之路\n3. **明代**：砖石重修，形成今天的模样',
    },
    followUpAnswer: '长城是起于战国、由秦连接、在明代大规模重修的军事防御工程。',
  },
}

/** UI strings the script looks for, per language (must match web/src/i18n) */
const UI = {
  en: {
    generating: 'Generating…',
    settings: 'Settings',
    serverKeys: 'Server keys',
    switchVersion: 'Switch model version',
    addModel: 'Add model',
    firstProvider: /Volcengine/,
    customProvider: /OpenAI-compatible/,
    namePlaceholder: 'Leave empty to use the model ID',
    turnOn: 'Click to turn on',
    imageFilter: 'Image',
    imageOnly: 'All windows',
    sendOnly: (label) => `Message ${label} only…`,
  },
  zh: {
    generating: '正在生成…',
    settings: '全局设置',
    serverKeys: '服务端 Key',
    switchVersion: '切换模型版本',
    addModel: '添加模型',
    firstProvider: /火山方舟/,
    customProvider: /OpenAI 兼容/,
    namePlaceholder: '留空则使用默认名称',
    turnOn: '点击开启',
    imageFilter: '生图模型',
    imageOnly: '显示全部窗口',
    sendOnly: (label) => `单独发送给 ${label}…`,
  },
}

const IMAGE_MODELS = ['qwen-image-2.0-pro', 'glm-image', 'doubao-seedream-4-5-251128', 'image-01']

/** 自制的演示插画（SVG），每个生图模型一张，避免使用任何第三方图片 */
function demoImage(seed) {
  const palettes = [
    ['#1e3a8a', '#6366f1', '#fde68a'],
    ['#0f172a', '#0ea5e9', '#f8fafc'],
    ['#312e81', '#db2777', '#fef3c7'],
    ['#064e3b', '#10b981', '#ecfccb'],
  ]
  const [sky, glow, moon] = palettes[seed % palettes.length]
  const mx = 120 + seed * 60
  const stars = Array.from(
    { length: 24 },
    (_, i) =>
      `<circle cx="${(i * 97 + seed * 31) % 512}" cy="${(i * 53 + seed * 17) % 260}" r="${1 + (i % 3)}" fill="#fff" opacity="0.7"/>`,
  ).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${glow}"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>${stars}
  <circle cx="${mx}" cy="130" r="58" fill="${moon}"/>
  <path d="M0 380 L140 300 L260 360 L380 290 L512 350 L512 512 L0 512 Z" fill="#0b1020" opacity="0.85"/>
  <g transform="translate(${300 - seed * 30} 268)" fill="#0b1020">
    <ellipse cx="40" cy="70" rx="44" ry="34"/><circle cx="40" cy="26" r="24"/>
    <path d="M20 12 L24 -10 L34 8 Z M60 12 L56 -10 L46 8 Z"/>
    <path d="M80 80 Q120 60 104 20" stroke="#0b1020" stroke-width="9" fill="none" stroke-linecap="round"/>
  </g>
</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// ── mock api ────────────────────────────────────────────────────────────
const PROVIDERS = {
  configured: { volcengine: true, qwen: true, deepseek: true, zhipu: true, kimi: false, minimax: false, custom: true },
  allowUserBaseUrl: true,
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const hasCjk = (s) => /[一-龥]/.test(s)

/** 回答里按问题语言与内容挑一段；不同模型给不同速度，流式效果更真实 */
function answerFor(model, messages) {
  const last = messages.filter((m) => m.role === 'user').at(-1)?.content ?? ''
  const c = CONTENT[hasCjk(last) ? 'zh' : 'en']
  if (last === c.followUp) return c.followUpAnswer
  return c.answers[model] ?? `${model}: ${last}`
}

function startMockApi() {
  const server = createServer((req, res) => {
    let raw = ''
    req.on('data', (d) => (raw += d))
    req.on('end', async () => {
      const body = raw ? JSON.parse(raw) : {}
      if (req.url === '/api/providers') {
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(PROVIDERS))
      } else if (req.url === '/api/chat') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
        const text = answerFor(body.model, body.messages)
        const speed = 18 + (body.model.length % 5) * 7
        await sleep(250 + (body.model.length % 4) * 150)
        for (const piece of text.match(/[\s\S]{1,3}/g) ?? []) {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`)
          await sleep(speed)
        }
        res.end(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`)
      } else if (req.url === '/api/image') {
        const idx = Math.max(0, IMAGE_MODELS.indexOf(body.model))
        await sleep(1200 + idx * 500)
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ images: [demoImage(idx)] }))
      } else {
        res.writeHead(404).end('{}')
      }
    })
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)))
}

// ── browser helpers ─────────────────────────────────────────────────────
/** 预置 localStorage：语言、激活哪些模型、布局（zustand persist 的存档格式） */
async function seed(page, { lang, active, layoutMode = 'auto' }) {
  await page.addInitScript(
    ([state, l]) => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.clear()
      localStorage.setItem('multi-model-chat-state', JSON.stringify({ state, version: 0 }))
      localStorage.setItem('multi-model-chat.lang', l)
    },
    [{ activeModels: active, layoutMode, imageViewOnly: false, persona: '' }, lang],
  )
}

/** 录屏里看不到系统鼠标：注入一个跟随鼠标的指针和点击波纹 */
async function showCursor(page) {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const dot = document.createElement('div')
      dot.style.cssText =
        'position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;' +
        'background:rgba(51,112,255,.35);border:2px solid rgba(51,112,255,.9);pointer-events:none;transition:transform .12s;left:-50px;top:-50px'
      document.body.appendChild(dot)
      document.addEventListener('mousemove', (e) => {
        dot.style.left = `${e.clientX}px`
        dot.style.top = `${e.clientY}px`
      })
      document.addEventListener('mousedown', () => (dot.style.transform = 'scale(.7)'))
      document.addEventListener('mouseup', () => (dot.style.transform = 'scale(1)'))
    })
  })
}

/** 平滑移动到元素中心再点击，录屏里能看清在点哪 */
async function moveClick(page, locator, pause = 350) {
  await locator.waitFor()
  const box = await locator.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 })
  await page.waitForTimeout(pause)
  await page.mouse.down()
  await page.mouse.up()
}

async function waitIdle(page, ui) {
  await page.waitForTimeout(300)
  await page.waitForFunction((title) => !document.querySelector(`[title="${title}"]`), ui.generating, { timeout: 30_000 })
}

async function broadcast(page, ui, text, { typing = false } = {}) {
  const input = page.locator('textarea').last()
  if (typing) {
    await moveClick(page, input, 200)
    await input.pressSequentially(text, { delay: 45 })
    await page.waitForTimeout(400)
  } else {
    await input.fill(text)
  }
  await input.press('Enter')
  await waitIdle(page, ui)
}

async function newContext(browser, opts = {}) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, ...opts })
  return { context, page: await context.newPage() }
}

// ── screenshots ─────────────────────────────────────────────────────────
const CHAT_MODELS = ['seed_lite', 'qwen35_flash', 'ds_chat', 'glm5', 'kimi_k25', 'mm_m27']

async function screenshots(browser, lang) {
  const out = resolve(ROOT, 'docs/images', lang)
  await mkdir(out, { recursive: true })
  const ui = UI[lang]
  const c = CONTENT[lang]
  const shot = async (page, name, opts = {}) => {
    await page.screenshot({ path: join(out, `${name}.png`), ...opts })
    console.log(`  ✓ docs/images/${lang}/${name}.png`)
  }

  {
    const { context, page } = await newContext(browser)
    await seed(page, { lang, active: CHAT_MODELS, layoutMode: '3col' })
    await page.goto(BASE)
    await broadcast(page, ui, c.chatPrompt)
    await page.waitForTimeout(2600) // 流式结束后的边框高亮持续 2.2s
    await shot(page, 'hero')
    await context.close()
  }
  {
    const { context, page } = await newContext(browser, { viewport: { width: 1440, height: 1180 } })
    await seed(page, { lang, active: ['qwen_image', 'glm_image', 'seedream45', 'mm_image'], layoutMode: '2col' })
    await page.goto(BASE)
    await broadcast(page, ui, c.imagePrompt)
    await page.waitForTimeout(2600)
    await shot(page, 'image-compare')
    await context.close()
  }
  {
    const { context, page } = await newContext(browser)
    await seed(page, { lang, active: ['ds_chat', 'qwen35_flash', 'glm5'], layoutMode: '3col' })
    await page.goto(BASE)
    await broadcast(page, ui, c.chatPrompt)
    await page.waitForTimeout(2600)

    await page.getByTitle(ui.settings, { exact: true }).click()
    await page.getByText(ui.serverKeys, { exact: true }).waitFor()
    await page.waitForTimeout(300)
    await shot(page, 'settings')
    await page.keyboard.press('Escape')

    await page.getByTitle(ui.switchVersion).nth(1).click()
    await page.getByRole('listbox').waitFor()
    await page.waitForTimeout(300)
    await shot(page, 'version-switcher', { clip: { x: 300, y: 50, width: 900, height: 520 } })
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: ui.addModel }).first().click()
    await page.getByRole('button', { name: ui.firstProvider }).click()
    await page.getByRole('option', { name: ui.customProvider }).click()
    await page.getByPlaceholder(/gpt-4o-mini/).fill('llama3.2')
    await page.getByPlaceholder(ui.namePlaceholder).fill('Llama 3.2 (Ollama)')
    await page.locator('input[type="url"]').fill('http://127.0.0.1:11434/v1')
    await page.waitForTimeout(300)
    await shot(page, 'add-custom-model')
    await context.close()
  }
}

// ── demo video ──────────────────────────────────────────────────────────
async function video(browser, lang) {
  const ui = UI[lang]
  const c = CONTENT[lang]
  const rawDir = await mkdtemp(join(tmpdir(), 'mmc-video-'))
  const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: rawDir, size: VIEWPORT } })
  const page = await context.newPage()
  await showCursor(page)
  await seed(page, { lang, active: ['ds_chat', 'qwen35_flash', 'glm5'], layoutMode: '3col' })
  await page.goto(BASE)
  await page.waitForTimeout(1500)

  // 1. 一句话广播给三个模型，各自流式回答
  await broadcast(page, ui, c.chatPrompt, { typing: true })
  await page.waitForTimeout(2500)

  // 2. 窗口内切换版本
  await moveClick(page, page.getByTitle(ui.switchVersion).filter({ hasText: 'qwen3.5-flash' }))
  await page.waitForTimeout(900)
  await moveClick(page, page.getByRole('option', { name: 'qwen3-max', exact: true }))
  await page.waitForTimeout(1600)

  // 3. 只问切换后的这个模型
  const single = page.getByPlaceholder(ui.sendOnly('Qwen3-Max'))
  await moveClick(page, single, 200)
  await single.pressSequentially(c.followUp, { delay: 50 })
  await single.press('Enter')
  await waitIdle(page, ui)
  await page.waitForTimeout(2000)

  // 4. 生图对比：侧栏筛出生图模型，开三个，只看生图窗口
  await moveClick(page, page.getByRole('button', { name: ui.imageFilter, exact: true }))
  await page.waitForTimeout(600)
  for (const label of ['Doubao-Seedream-4.5', 'Qwen-Image-2.0-Pro', 'GLM-Image']) {
    const row = page.locator('aside div.rounded-md', { hasText: label }).first()
    await moveClick(page, row.getByTitle(ui.turnOn), 150)
    await page.waitForTimeout(300)
  }
  await moveClick(page, page.getByRole('button', { name: ui.imageOnly }))
  await page.waitForTimeout(1000)
  await broadcast(page, ui, c.imagePrompt, { typing: true })
  await page.waitForTimeout(2500)

  // 5. 全局设置：服务端 Key 状态与模型列表
  await moveClick(page, page.getByTitle(ui.settings, { exact: true }))
  await page.waitForTimeout(3000)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)

  await context.close()
  const [webm] = (await readdir(rawDir)).filter((f) => f.endsWith('.webm'))
  const src = join(rawDir, webm)

  const mediaDir = resolve(ROOT, 'docs/media')
  const imgDir = resolve(ROOT, 'docs/images', lang)
  await mkdir(mediaDir, { recursive: true })
  await mkdir(imgDir, { recursive: true })
  const mp4 = join(mediaDir, `demo-${lang}.mp4`)
  const gif = join(imgDir, 'demo.gif')
  const ff = (args) => {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
    if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`)
  }
  ff(['-i', src, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4])
  ff([
    '-i', src,
    '-vf', 'fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    '-loop', '0', gif,
  ])
  await rm(rawDir, { recursive: true, force: true })
  console.log(`  ✓ docs/media/demo-${lang}.mp4`)
  console.log(`  ✓ docs/images/${lang}/demo.gif`)
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
    await sleep(300)
  }
  throw new Error(`dev server did not start: ${url}`)
}

const api = await startMockApi()
const vite = spawn('pnpm', ['--filter', '@multi-model-chat/web', 'exec', 'vite', '--port', String(WEB_PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
  env: { ...process.env, API_PROXY_TARGET: `http://127.0.0.1:${api.address().port}` },
})
try {
  await waitForServer(BASE)
  const browser = await chromium.launch(CHANNEL ? { channel: CHANNEL } : {})
  try {
    for (const lang of ['en', 'zh']) {
      console.log(`${MODE} (${lang})…`)
      await (MODE === 'screenshots' ? screenshots : video)(browser, lang)
    }
  } finally {
    await browser.close()
  }
} finally {
  vite.kill()
  api.close()
}
