/**
 * 轻量 Toast，纯 DOM 实现。
 *
 * 刻意**不**做成 React 组件：它与 React 树没有任何交互，
 * 包一层 Provider + Portal 只会凭空多出状态管理，收益为零。
 * 同一时间只显示一个，新的替换旧的。
 */
export function showToast(message: string, duration = 2400): void {
  document.querySelector('.toast')?.remove()

  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), duration)
}
