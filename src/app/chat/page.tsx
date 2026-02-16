import { ChatWindow } from "@/components/chat/chat-window";
import { aiRegistry } from "@/lib/ai";

export const metadata = {
  title: "AI assistant",
};

export default function ChatPage() {
  const providers = aiRegistry.list();

  return (
    <main className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col px-4 py-4">
      <p className="text-muted-foreground mb-3 text-sm">
        Optional AI chat. Main workflow lives under <strong>Quotes</strong>.
      </p>
      <div className="min-h-0 flex-1 flex flex-col rounded-lg border bg-card">
        <ChatWindow providers={providers} />
      </div>
    </main>
  );
}
