"use client"

import * as React from "react"
import { Send, Plus, Split, BarChart3, Bot, User, Sparkles } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
// Import api
import api from "@/utils/api"
import { getService } from '@/services/dataService';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { AddExpenseDialog } from "./AddExpenseDialog"
import { ExpenseFormBubble } from "./ExpenseFormBubble"
import { InsightsBubble } from "./InsightsBubble"

interface Message {
    role: "user" | "assistant"
    content: string
    type?: "text" | "form" | "insights"
    isFormSubmitted?: boolean
}

interface ChatProps {
    onTransactionComplete?: () => void;
}

export function Chat({ onTransactionComplete }: ChatProps) {
    const [messages, setMessages] = React.useState<Message[]>([
        { role: "assistant", content: "Hello! I'm FrugalAgent. How can I help you manage your expenses today?" }
    ])
    // ... existing state ...
    const [input, setInput] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [showAddExpense, setShowAddExpense] = React.useState(false)
    const scrollAreaRef = React.useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                setTimeout(() => {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight;
                }, 100);
            }
        }
    }

    React.useEffect(() => {
        scrollToBottom()
    }, [messages])

    const processMessage = async (text: string) => {
        const userMessage: Message = { role: "user", content: text }
        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)

        try {
            const response = await api.post("/chat", { message: userMessage.content })
            const data = response.data
            const botMessage: Message = { role: "assistant", content: data.response }
            setMessages(prev => [...prev, botMessage])

            if (onTransactionComplete) {
                onTransactionComplete();
            }
        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return
        const text = input;
        setInput("")
        await processMessage(text);
    }

    const handleQuickAction = (action: string) => {
        switch (action) {
            case "add":
                // Instead of modal, append form message
                setMessages(prev => [...prev, { role: "assistant", content: "", type: "form" }])
                break
            case "split":
                alert("Split Bill feature is coming soon!");
                break
            case "insights":
                setMessages(prev => [...prev, { role: "assistant", content: "", type: "insights" }])
                break
        }
    }

    const handleExpenseBubbleSubmit = async (desc: string, amt: string, cat: string, timestamp: string, index: number) => {
        try {
            const service = getService();
            await service.addTransaction({
                description: desc,
                amount: parseFloat(amt),
                category: cat,
                timestamp: timestamp || new Date().toISOString(),
                user_id: 'local_user' // Default for local, service will handle if cloud needs token from context but here we are in frontend
            });

            // Mark form as submitted
            setMessages(prev => prev.map((msg, i) => i === index ? { ...msg, isFormSubmitted: true } : msg));

            // Add success message
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `Success! Added **$${amt}** for **${desc}** in **${cat}**.`
            }]);

            // Trigger refresh
            if (onTransactionComplete) {
                onTransactionComplete();
            }
        } catch (error) {
            console.error("Failed to add transaction", error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Error: Failed to add transaction. Please try again."
            }]);
        }
    }

    return (
        <div className="flex flex-col h-full max-h-full bg-background/50 backdrop-blur-sm border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">AI Assistant</h3>
                    <p className="text-xs text-muted-foreground">Always here to help</p>
                </div>
            </div>

            <div className="flex-1 relative min-h-0">
                <ScrollArea className="h-full absolute inset-0 p-4" ref={scrollAreaRef}>
                    <div className="flex flex-col gap-6 pb-4">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "flex gap-3 max-w-[85%]",
                                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}
                            >
                                <Avatar className="w-8 h-8 border shadow-sm mt-1">
                                    {msg.role === "user" ? (
                                        <>
                                            <AvatarImage src="/user-avatar.png" />
                                            <AvatarFallback className="bg-primary text-primary-foreground"><User className="w-4 h-4" /></AvatarFallback>
                                        </>
                                    ) : (
                                        <>
                                            <AvatarImage src="/bot-avatar.png" />
                                            <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-4 h-4" /></AvatarFallback>
                                        </>
                                    )}
                                </Avatar>

                                {msg.type === "form" ? (
                                    <div className="mt-1">
                                        <ExpenseFormBubble
                                            onSubmit={(d, a, c, t) => handleExpenseBubbleSubmit(d, a, c, t, index)}
                                            onCancel={() => {
                                                setMessages(prev => prev.filter((_, i) => i !== index));
                                            }}
                                        />
                                    </div>
                                ) : msg.type === "insights" ? (
                                    <div className="mt-1 w-full max-w-full">
                                        <InsightsBubble />
                                    </div>
                                ) : (
                                    <div
                                        className={cn(
                                            "rounded-2xl px-4 py-3 text-sm shadow-sm",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                : "bg-muted/50 border rounded-tl-sm"
                                        )}
                                    >
                                        <div className="prose dark:prose-invert max-w-none text-sm break-words leading-relaxed">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 mr-auto max-w-[80%]">
                                <Avatar className="w-8 h-8 border shadow-sm mt-1">
                                    <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-4 h-4" /></AvatarFallback>
                                </Avatar>
                                <div className="bg-muted/50 border rounded-2xl rounded-tl-sm px-4 py-3 text-sm flex items-center gap-1 shadow-sm">
                                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>


            <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 space-y-4">
                {/* Quick Actions */}
                <div className="flex gap-2 w-full overflow-x-auto pb-1 no-scrollbar">
                    <Button variant="outline" size="sm" onClick={() => handleQuickAction("add")} className="gap-2 h-8 text-xs rounded-full bg-background hover:bg-muted/50 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Expense
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleQuickAction("split")} className="gap-2 h-8 text-xs rounded-full bg-background hover:bg-muted/50 transition-colors opacity-50 cursor-not-allowed" title="Coming Soon">
                        <Split className="w-3.5 h-3.5" /> Split Bill
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleQuickAction("insights")} className="gap-2 h-8 text-xs rounded-full bg-background hover:bg-muted/50 transition-colors">
                        <BarChart3 className="w-3.5 h-3.5" /> Insights
                    </Button>
                </div>

                {/* Input Area */}
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex w-full gap-2 relative"
                >
                    <Input
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="flex-1 pr-12 h-11 rounded-full bg-muted/50 border-transparent focus:border-input focus:bg-background transition-all shadow-sm"
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        size="icon"
                        className="absolute right-1.5 top-1.5 h-8 w-8 rounded-full shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </div>
    )
}
