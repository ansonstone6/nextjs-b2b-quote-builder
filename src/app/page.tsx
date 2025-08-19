import { ChatWindow } from '@/components/chat/chat-window'
import { aiRegistry } from '@/lib/ai'

export default function Home() {
  const providers = aiRegistry.list()

  return (
    <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full h-screen">
      <ChatWindow providers={providers} />
    </main>
  )
}
