import { useState } from 'react'

import type { UserMenuItem } from '@multi-model-chat/auth-client-web'
import { SKINS, getSkin, setSkin } from '@multi-model-chat/design-tokens'

import { LANG_NAMES, LANGS, useLangStore, useT } from '../i18n'

/** 皮肤切换项 + 语言切换项，挂进右上角 UserMenu。 */
export function useSkinMenuItems(): UserMenuItem[] {
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)
  const [current, setCurrent] = useState(getSkin)
  return [
    ...SKINS.map((s) => ({
      label: `${t.menu.skin(t.menu.skins[s])}${s === current ? ' ✓' : ''}`,
      onClick: () => {
        setSkin(s)
        setCurrent(s)
      },
    })),
    ...LANGS.map((l) => ({
      label: `${t.menu.language(LANG_NAMES[l])}${l === lang ? ' ✓' : ''}`,
      onClick: () => setLang(l),
    })),
  ]
}
