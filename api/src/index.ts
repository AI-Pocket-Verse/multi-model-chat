import { buildApp } from './app'
import { env } from './env'

const app = await buildApp()

app
  .listen({ port: env.PORT, host: env.HOST })
  .then(() => {
    console.log(`[multi-model-chat-api] listening on http://${env.HOST}:${env.PORT}`)
    console.log(`[multi-model-chat-api] auth: ${env.WHOAMI_URL ? `SSO via ${env.WHOAMI_URL}` : 'local single-user mode'}`)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
