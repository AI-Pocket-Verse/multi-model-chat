/**
 * 会话历史的 IndexedDB 存储。
 *
 * 为什么不放 localStorage：生图会把 base64 dataURL 直接写进消息（MiniMax 用
 * response_format:'base64'），二十多个模型 × 长对话 + 内嵌图片很快会撑爆 localStorage
 * 的 5MB 配额，而写入失败往往被静默吞掉，用户只会发现历史再也存不上。
 *
 * 边界：只有 conversations 放 IndexedDB；persona / models / activeModels / layoutMode
 * 这些几 KB 的小配置走 localStorage（Zustand persist）。
 *
 * 不引 idb 之类的库，原生 API 足够。
 */
import type { ChatMessageRecord } from './catalog'

const DB_NAME = 'multi-model-chat'
const DB_VERSION = 1
const STORE = 'conversations'

interface ConversationRow {
  modelId: string
  messages: ChatMessageRecord[]
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'modelId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).catch((err) => {
    // 失败时必须清掉缓存：否则这个 rejected promise 会被后续每一次调用复用，
    // 一次偶发失败（如打开时恰好被另一个标签页阻塞）就变成本次会话永久不可用。
    dbPromise = null
    throw err
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = run(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

export async function loadAllConversations(): Promise<Record<string, ChatMessageRecord[]>> {
  const rows = await tx<ConversationRow[]>('readonly', (s) => s.getAll() as IDBRequest<ConversationRow[]>)
  const out: Record<string, ChatMessageRecord[]> = {}
  for (const row of rows) out[row.modelId] = row.messages ?? []
  return out
}

export async function saveConversation(modelId: string, messages: ChatMessageRecord[]): Promise<void> {
  await tx('readwrite', (s) => s.put({ modelId, messages } satisfies ConversationRow) as IDBRequest<IDBValidKey>)
}

export async function deleteConversation(modelId: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(modelId) as unknown as IDBRequest<undefined>)
}

// 流式期间每个 chunk 都会触发保存，逐次写 IndexedDB 会积压 —— 按模型防抖。
const pending = new Map<string, ReturnType<typeof setTimeout>>()

export function saveConversationDebounced(
  modelId: string,
  messages: ChatMessageRecord[],
  delay = 400,
): void {
  const existing = pending.get(modelId)
  if (existing) clearTimeout(existing)
  pending.set(
    modelId,
    setTimeout(() => {
      pending.delete(modelId)
      void saveConversation(modelId, messages).catch((err) => {
        console.error('[multi-model-chat] 会话保存失败', err)
      })
    }, delay),
  )
}
