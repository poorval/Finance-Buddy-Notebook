"use client"

import * as React from "react"
import { Send, Plus, Split, BarChart3, Bot, User, Sparkles } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import api from "@/utils/api"
import { getService } from '@/services/dataService';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"

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

            setMessages(prev => [...prev, {
                role: "assistant",
                content: `Success! Added **$${amt}** for **${desc}** in **${cat}**.`
            }]);

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

    // Message entry animation
    const messageVariants = {
        hidden: { opacity: 0, y: 10, scale: 0.97 },
        visible: {
            opacity: 1, y: 0, scale: 1,
            transition: { type: "spring" as const, stiffness: 400, damping: 25 }
        },
    };

    return (
        <div className="flex flex-col h-full max-h-full bg-background/50 backdrop-blur-sm md:border md:rounded-xl md:shadow-sm overflow-hidden">
            {/* Chat header */}
            <div className="p-3 md:p-4 border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm tracking-tight">AI Assistant</h3>
                    <p className="text-[10px] text-muted-foreground">Always here to help</p>
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 relative min-h-0">
                <ScrollArea className="h-full absolute inset-0 p-3 md:p-4" ref={scrollAreaRef}>
                    <div className="flex flex-col gap-3 md:gap-5 pb-4">
                        <AnimatePresence initial={false}>
                            {messages.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    variants={messageVariants}
                                    initial="hidden"
                                    animate="visible"
                                    layout
                                    className={cn(
                                        "flex gap-2 md:gap-3 max-w-[88%] md:max-w-[85%]",
                                        msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                    )}
                                >
                                    <Avatar className="w-7 h-7 md:w-8 md:h-8 border shadow-sm mt-1 flex-shrink-0">
                                        {msg.role === "user" ? (
                                            <>
                                                <AvatarImage src="/user-avatar.png" />
                                                <AvatarFallback className="bg-primary text-primary-foreground"><User className="w-3.5 h-3.5 md:w-4 md:h-4" /></AvatarFallback>
                                            </>
                                        ) : (
                                            <>
                                                <AvatarImage src="/bot-avatar.png" />
                                                <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-3.5 h-3.5 md:w-4 md:h-4" /></AvatarFallback>
                                            </>
                                        )}
                                    </Avatar>

                                    {msg.type === "form" ? (
                                        <div className="mt-1 w-full">
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
                                                "rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3 text-sm",
                                                msg.role === "user"
                                                    ? "bg-primary text-primary-foreground rounded-tr-md shadow-sm"
                                                    : "bg-muted/40 border border-border/50 rounded-tl-md"
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
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Typing indicator */}
                        <AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="flex gap-2 md:gap-3 mr-auto max-w-[80%]"
                                >
                                    <Avatar className="w-7 h-7 md:w-8 md:h-8 border shadow-sm mt-1">
                                        <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-3.5 h-3.5 md:w-4 md:h-4" /></AvatarFallback>
                                    </Avatar>
                                    <div className="bg-muted/40 border border-border/50 rounded-2xl rounded-tl-md px-4 py-3 text-sm flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full typing-dot" />
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full typing-dot" />
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full typing-dot" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            </div>

            {/* Bottom input area */}
            <div className="p-3 md:p-4 border-t border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 space-y-2.5 md:space-y-3 pb-safe">
                {/* Quick Actions */}
                <div className="flex gap-2 w-full overflow-x-auto no-scrollbar">
                    <motion.div whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction("add")}
                            className="gap-1.5 h-8 text-[11px] font-medium rounded-full bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30 text-primary transition-all flex-shrink-0"
                        >
                            <Plus className="w-3 h-3" /> Add Expense
                        </Button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction("split")}
                            className="gap-1.5 h-8 text-[11px] font-medium rounded-full border-border/50 hover:bg-muted/50 transition-all opacity-40 cursor-not-allowed flex-shrink-0"
                            title="Coming Soon"
                        >
                            <Split className="w-3 h-3" /> Split Bill
                        </Button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction("insights")}
                            className="gap-1.5 h-8 text-[11px] font-medium rounded-full border-border/50 hover:bg-muted/50 transition-all flex-shrink-0"
                        >
                            <BarChart3 className="w-3 h-3" /> Insights
                        </Button>
                    </motion.div>
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
                        className="flex-1 pr-12 h-11 rounded-full bg-muted/30 border-border/50 focus:border-primary/40 focus:bg-background/80 transition-all shadow-sm text-base md:text-sm"
                        style={{ fontSize: '16px' }}
                    />
                    <motion.div
                        className="absolute right-1.5 top-1.5"
                        whileTap={{ scale: 0.88 }}
                        animate={input.trim() ? { scale: [1, 1.05, 1] } : {}}
                        transition={input.trim() ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
                    >
                        <Button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            size="icon"
                            className="h-8 w-8 rounded-full shadow-sm"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </motion.div>
                </form>
            </div>
        </div>
    )
}
