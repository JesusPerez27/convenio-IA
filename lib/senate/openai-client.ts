import OpenAI from 'openai'

let client: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está definida')
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}

export const MODEL_ORCHESTRATOR = 'gpt-4o'
export const MODEL_REVIEWER = 'gpt-4o'
export const MODEL_MINI = 'gpt-4o-mini'
