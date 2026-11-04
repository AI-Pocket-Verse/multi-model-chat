/**
 * 生图意图与生图模型判定。
 *
 * 这两个判定决定一条消息走 /api/chat 还是 /api/image，不含任何密钥，因此留在前端。
 */
import type { ModelConfig } from './catalog'
import { IMAGE_MODEL_PATTERNS } from './catalog'

/** 用户这句话是不是在要图？ */
export function isImageGenerationPrompt(text: string): boolean {
  if (!text) return false
  const patterns = [
    /(?:生成|做|画|绘制|创建|设计|出)(?:一张|1张|几张|个|套)?(?:图片|图像|图|插画|海报|壁纸|封面|头像|配图)/i,
    /(?:帮我|请)?(?:画|生成)(?:一张|1张|几张|一个|一些).{0,24}(?:图|图片|图像|插画|海报|壁纸|头像)/i,
    /\b(generate|create|draw|make)\b.{0,20}\b(image|picture|photo|poster|illustration|artwork)\b/i,
    /\b(text[- ]to[- ]image|image generation|t2i)\b/i,
  ]
  return patterns.some((pattern) => pattern.test(text))
}

/** 这个模型本身是不是生图模型？ */
export function isImageGenerationModel(model: Pick<ModelConfig, 'provider' | 'version'> | undefined): boolean {
  if (!model?.provider || !model?.version) return false
  const patterns = IMAGE_MODEL_PATTERNS[model.provider] || []
  return patterns.some((pattern) => pattern.test(model.version))
}
