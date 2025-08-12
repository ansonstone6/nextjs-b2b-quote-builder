import { convertToModelMessages, streamText, UIMessage } from 'ai'
import { z } from 'zod'
import { aiRegistry } from '@/lib/ai'

export const maxDuration = 30

const bodySchema = z.object({
  messages: z.array(z.unknown()),
  provider: z.string().optional().default('openai'),
  model: z.string().optional(),
  system: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxOutputTokens: z.number().positive().optional().default(2048),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { messages, provider, model, system, temperature, maxOutputTokens } = parsed.data

  if (!aiRegistry.has(provider)) {
    return Response.json(
      {
        error: `Unknown provider "${provider}". Available: ${aiRegistry
          .list()
          .map((p) => p.id)
          .join(', ')}`,
      },
      { status: 400 }
    )
  }

  const languageModel = aiRegistry.getModel(provider, model)

  const result = streamText({
    model: languageModel,
    system,
    messages: await convertToModelMessages(messages as UIMessage[]),
    temperature,
    maxOutputTokens,
  })

  return result.toUIMessageStreamResponse()
}

// Expose available providers + models for the UI
export async function GET() {
  return Response.json({ providers: aiRegistry.list() })
}
