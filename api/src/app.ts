import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'

import apiKit from '@multi-model-chat/api-kit'
import authPlugin from '@multi-model-chat/auth-client-api'

import { env } from './env'
import { chatRoutes } from './routes/chat'
import { imageRoutes } from './routes/image'
import { providerRoutes } from './routes/providers'

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '::1']

/** Host 头 → 小写主机名（去掉端口与 IPv6 方括号） */
export function hostnameOf(host: string | undefined): string {
  if (!host) return ''
  const h = host.trim().toLowerCase()
  if (h.startsWith('[')) return h.slice(1, h.indexOf(']'))
  return h.replace(/:\d+$/, '')
}

/**
 * 构建 Fastify 实例但**不** listen —— 与入口分离，好让测试用 app.inject() 驱动。
 */
export async function buildApp() {
  // trustProxy 只信任 TRUST_PROXY 指定的反代地址，限流按真实客户端 IP 分桶；不能写 true（任何客户端都能伪造 XFF）。
  const app = Fastify({ logger: false, trustProxy: env.TRUST_PROXY })

  const corsOrigins = env.CORS_ORIGINS.split(/[\s,]+/).filter(Boolean)
  await app.register(cors, {
    // 无 origin → 仅同源（vite 代理 / 反向代理）。配置了才走白名单模式。
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  })
  // 广播一次最多打 20+ 个模型，且都是长连接流式请求，限额比默认产品放宽一些。
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute' })
  await app.register(apiKit, { service: 'multi-model-chat-api', version: '0.0.0' })
  await app.register(authPlugin, { whoamiUrl: env.WHOAMI_URL })

  // 本地模式不鉴权：只接受本机 Host，挡住 DNS 重绑定（恶意网页把自己的域名解析到
  // 127.0.0.1 后就能同源调用本机 api、花你的 key）。登录模式由登录态保护，不做限制。
  if (!env.WHOAMI_URL) {
    const allowed = new Set([...LOOPBACK_HOSTS, ...env.ALLOWED_HOSTS.split(/[\s,]+/).filter(Boolean).map(hostnameOf)])
    app.addHook('onRequest', async (request, reply) => {
      if (!request.url.startsWith('/api/')) return
      const hostname = hostnameOf(request.headers.host)
      if (allowed.has(hostname)) return
      return reply.code(403).send({
        error: 'host_not_allowed',
        message: `本地模式只接受 localhost 访问；用 ${hostname || '该地址'} 访问请把它加进 ALLOWED_HOSTS`,
      })
    })
  }

  await app.register(chatRoutes)
  await app.register(imageRoutes)
  await app.register(providerRoutes)

  // Docker 单镜像部署：api 同时托管前端，未命中的 GET 页面路由回落到 index.html（SPA）
  if (env.WEB_DIST_DIR) {
    const root = resolve(env.WEB_DIST_DIR)
    if (!existsSync(resolve(root, 'index.html'))) {
      throw new Error(`WEB_DIST_DIR=${env.WEB_DIST_DIR}: index.html not found, run pnpm build first`)
    }
    await app.register(fastifyStatic, { root, wildcard: false })
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) return reply.sendFile('index.html')
      return reply.code(404).send({ error: 'not_found' })
    })
  }

  return app
}
