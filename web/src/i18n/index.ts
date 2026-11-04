/**
 * 界面语言：中文 / 英文。
 *
 * 默认跟随浏览器（zh* → 中文，其它 → 英文），用户在头像菜单里切换后记在 localStorage。
 * 组件用 useT() 订阅（切换语言即重渲染）；store、错误文案等非组件代码用 t() 取当下的文案。
 *
 * 语言存储 key 在 web/index.html 的首屏脚本里也写了一次（设置 <html lang> 与标题），改一处必须同步另一处。
 */
import { create } from 'zustand'

import en from './en'
import type { Messages } from './zh'
import zh from './zh'

export type Lang = 'zh' | 'en'
export type { Messages }

export const LANGS: Lang[] = ['zh', 'en']
/** 各语言用自己的语言写名字，切换菜单里不管当前是哪种语言都认得出来 */
export const LANG_NAMES: Record<Lang, string> = { zh: '中文', en: 'English' }
export const LANG_STORAGE_KEY = 'multi-model-chat.lang'

const MESSAGES: Record<Lang, Messages> = { zh, en }

/** 已存的选择优先；否则看浏览器语言，中文（含繁体）用中文，其它一律英文 */
export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    if (stored === 'zh' || stored === 'en') return stored
  } catch {
    // localStorage 可能被禁用 —— 回落到浏览器语言
  }
  const prefs = typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? []), navigator.language]
  const first = prefs.find(Boolean) ?? ''
  return /^zh\b/i.test(first) ? 'zh' : 'en'
}

function applyToDocument(lang: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  document.title = MESSAGES[lang].app.documentTitle
}

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLangStore = create<LangState>()((set) => ({
  lang: detectLang(),
  setLang(lang) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang)
    } catch {
      // 存不下就只在本次会话生效
    }
    applyToDocument(lang)
    set({ lang })
  },
}))

applyToDocument(useLangStore.getState().lang)

/** 组件里用：语言切换时自动重渲染 */
export function useT(): Messages {
  return MESSAGES[useLangStore((s) => s.lang)]
}

/** 非组件代码用：取调用这一刻的语言 */
export function t(): Messages {
  return MESSAGES[useLangStore.getState().lang]
}

export function getLang(): Lang {
  return useLangStore.getState().lang
}
