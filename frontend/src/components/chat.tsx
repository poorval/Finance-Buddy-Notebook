"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Plus, Split, BarChart3, Bot, User } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import api from "@/utils/api"
import { getService } from '@/services/dataService';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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
    const [input, setInput] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [showAddExpense, setShowAddExpense] = React.useState(false)
    const scrollAreaRef = React.useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                setTimeout(() => { scrollContainer.scrollTop = scrollContainer.scrollHeight; }, 100);
            }
        }
    }

    React.useEffect(() => { scrollToBottom() }, [messages])

    const processMessage = async (text: string) => {
        const userMessage: Message = { role: "user", content: text }
        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)

        try {
            const response = await api.post("/chat", { message: userMessage.content })
            const data = response.data
            const botMessage: Message = { role: "assistant", content: data.response }
            setMessages(prev => [...prev, botMessage])

            const storageMode = typeof window !== 'undefined' ? localStorage.getItem('storage_mode') || 'local' : 'local';
            if (storageMode === 'local' && data.actions && data.actions.length > 0) {
                const service = getService();
                for (const action of data.actions) {
                    if (action.type === 'save_transaction_tool') {
                        try {
                            await service.addTransaction({
                                description: action.data.description || '',
                                amount: parseFloat(action.data.amount) || 0,
                                category: action.data.category || 'Others',
                                timestamp: new Date().toISOString(),
                                user_id: 'local_user'
                            });
                        } catch (e) {
                            console.error("Failed to save transaction locally from chat action:", e);
                        }
                    }
                }
            }
            if (onTransactionComplete) onTransactionComplete();
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
                user_id: 'local_user'
            });

            setMessages(prev => prev.map((msg, i) => i === index ? { ...msg, isFormSubmitted: true } : msg));
            setMessages(prev => [...prev, { role: "assistant", content: `Added **₹${amt}** for **${desc}** in **${cat}**.` }]);
            if (onTransactionComplete) onTransactionComplete();
        } catch (error) {
            console.error("Failed to add transaction", error);
            setMessages(prev => [...prev, { role: "assistant", content: "Error: Failed to add transaction. Please try again." }]);
        }
    }

    return (
        <div className="flex flex-col h-full max-h-full bg-background md:border md:rounded-lg overflow-hidden">
            {/* Header */}
            <div className="p-3 md:p-4 border-b flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="font-semibold text-sm">AI Assistant</h3>
                    <p className="text-xs text-muted-foreground">Always here to help</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 relative min-h-0">
                <ScrollArea className="h-full absolute inset-0 p-3 md:p-4" ref={scrollAreaRef}>
                    <div className="flex flex-col gap-3 pb-4">
                        <AnimatePresence initial={false}>
                            {messages.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className={cn(
                                        "flex gap-2.5 max-w-[85%] md:max-w-[80%]",
                                        msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                    )}
                                >
                                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                        {msg.role === "user" ? (
                                            <AvatarFallback className="text-xs bg-primary text-primary-foreground"><User className="h-3.5 w-3.5" /></AvatarFallback>
                                        ) : (
                                            <AvatarFallback className="text-xs"><Bot className="h-3.5 w-3.5" /></AvatarFallback>
                                        )}
                                    </Avatar>

                                    {msg.type === "form" ? (
                                        <div className="mt-1 w-full">
                                            <ExpenseFormBubble
                                                onSubmit={(d, a, c, t) => handleExpenseBubbleSubmit(d, a, c, t, index)}
                                                onCancel={() => setMessages(prev => prev.filter((_, i) => i !== index))}
                                            />
                                        </div>
                                    ) : msg.type === "insights" ? (
                                        <div className="mt-1 w-full max-w-full">
                                            <InsightsBubble />
                                        </div>
                                    ) : (
                                        <div className={cn(
                                            "rounded-lg px-3 py-2 text-sm min-w-0",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}>
                                            <div className="prose dark:prose-invert max-w-none text-sm break-words overflow-hidden leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
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
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Typing indicator */}
                        <AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className="flex gap-2.5 mr-auto max-w-[80%]"
                                >
                                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                        <AvatarFallback className="text-xs"><Bot className="h-3.5 w-3.5" /></AvatarFallback>
                                    </Avatar>
                                    <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full typing-dot" />
                                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full typing-dot" />
                                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full typing-dot" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            </div>

            {/* Bottom */}
            <div className="p-3 md:p-4 border-t space-y-2 pb-safe">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <motion.div whileTap={{ scale: 0.95 }}>
                        <Button variant="outline" size="sm" onClick={() => handleQuickAction("add")} className="gap-1.5 h-8 text-xs shrink-0">
                            <Plus className="w-3 h-3" /> Add Expense
                        </Button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.95 }}>
                        <Button variant="outline" size="sm" onClick={() => handleQuickAction("split")} className="gap-1.5 h-8 text-xs opacity-40 cursor-not-allowed shrink-0" title="Coming Soon">
                            <Split className="w-3 h-3" /> Split Bill
                        </Button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.95 }}>
                        <Button variant="outline" size="sm" onClick={() => handleQuickAction("insights")} className="gap-1.5 h-8 text-xs shrink-0">
                            <BarChart3 className="w-3 h-3" /> Insights
                        </Button>
                    </motion.div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                    <Input
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="flex-1 h-10 text-sm"
                        style={{ fontSize: '16px' }}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="h-10 w-10 shrink-0">
                        <Send className="w-4 h-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </div>
    )
}
