import type { Config } from 'tailwindcss'
// @ts-expect-error -- shared preset is plain CJS, no types needed
import preset from '@multi-model-chat/tailwind-preset'

/**
 * 【这里不加任何颜色】—— 全走共享语义 token(bg-surface / bg-elevated / text-fg /
 * border-line / bg-accent…),定义在 packages/design-tokens/skins/*.css。
 *
 * 模型各自的品牌色(呼吸灯 --stream-color)是业务语义色,由 JS 按模型写入,不进这里。
 *
 * 下面只保留【布局常量】:侧栏宽 / 顶栏高 / 输入条高。它们是尺寸不是颜色,
 * 换皮肤不该变,且被多个组件引用,收在一处防漂移。
 */
export default {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // 必须包含:<UserMenu> 的类名写在这个包里,不扫描就会被 purge 掉,
    // 头像弹窗会变成没有样式的一堆文字。
    '../packages/auth-client-web/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      spacing: {
        'am-sidebar': 'var(--sidebar-w)',
        'am-header': 'var(--header-h)',
        'am-inputbar': 'var(--inputbar-h)',
      },
    },
  },
} satisfies Config
