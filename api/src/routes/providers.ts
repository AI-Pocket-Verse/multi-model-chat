import type { FastifyInstance } from 'fastify'

import { providersStatus } from '../providers'

/**
 * GET /api/providers —— 服务端各供应商是否已配置（只有布尔值，不含 key 与地址）。
 * 前端首次访问时据此只激活能直接用的预置模型，设置面板里显示 key 状态。
 */
export async function providerRoutes(app: FastifyInstance) {
  app.get('/api/providers', { preHandler: app.requireAuth() }, async () => providersStatus())
}
