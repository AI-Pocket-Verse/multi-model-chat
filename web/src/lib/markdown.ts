/**
 * 轻量内联 Markdown 渲染，无外部依赖。
 *
 * 支持：**粗体**、*斜体*、`行内代码`、# 一~三级标题、有序/无序列表、\n 换行。
 * 所有文本先经 escHtml 转义再套正则，防 XSS —— 这一点必须保持。
 *
 * 元素用语义 class，样式在 index.css 的 .md-* 里定义 ——
 * 作用于动态 HTML 字符串的富文本样式没法用 Tailwind 原子类表达。
 */

/** HTML 特殊字符转义，插入 innerHTML 前必须调用 */
export function escHtml(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderMarkdown(text: string): string {
  if (!text) return ''
  return escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/^### (.+)$/gm, '<div class="md-h3">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="md-h2">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="md-h1">$1</div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="md-li"><span class="md-li-num">$1.</span>$2</div>')
    .replace(/^[-•] (.+)$/gm, '<div class="md-li"><span class="md-li-dot">·</span>$1</div>')
    .replace(/\n/g, '<br>')
}
