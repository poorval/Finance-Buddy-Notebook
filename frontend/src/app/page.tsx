import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            FrugalAgent
          </h1>
          <p className="text-muted-foreground">
            Your AI-powered personal finance assistant
          </p>
        </div>
        <Chat />
      </div>
    </main>
  );
}
