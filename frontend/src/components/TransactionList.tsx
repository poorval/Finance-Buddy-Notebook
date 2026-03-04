import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Pencil, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getService } from '@/services/dataService';
import { Transaction } from '@/lib/db';
import { EditTransactionDialog } from './EditTransactionDialog';
import { Button } from "@/components/ui/button";

export interface TransactionListProps {
    refreshTrigger: number;
    limit?: number;
    onViewMore?: () => void;
}

export function TransactionList({ refreshTrigger, limit, onViewMore }: TransactionListProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const service = getService();
                const data = await service.getTransactions();
                setTransactions(data);
                setFilteredTransactions(data);
                const uniqueCategories = Array.from(new Set(data.map((t: Transaction) => t.category))) as string[];
                setCategories(uniqueCategories);
            } catch (error) {
                console.error("Error fetching transactions:", error);
            }
        };
        fetchData();
    }, [refreshTrigger]);

    useEffect(() => {
        let result = transactions;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
        }
        if (categoryFilter && categoryFilter !== "all") {
            result = result.filter(t => t.category === categoryFilter);
        }
        setFilteredTransactions(result);
    }, [searchQuery, categoryFilter, transactions]);

    const formatRelativeTime = (timestamp: string): string => {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffH = Math.floor(diffMs / 3600000);
            const diffD = Math.floor(diffMs / 86400000);
            if (diffH < 1) return 'Just now';
            if (diffH < 24) return `${diffH}h ago`;
            if (diffD < 7) return `${diffD}d ago`;
            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        } catch { return timestamp; }
    };

    const displayed = limit ? filteredTransactions.slice(0, limit) : filteredTransactions;
    const hasMore = limit ? filteredTransactions.length > limit : false;

    return (
        <Card className="col-span-3 h-full flex flex-col">
            <CardHeader className="px-4 md:px-6 py-3 md:py-4">
                <CardTitle className="text-base md:text-lg">Recent Transactions</CardTitle>
                <CardDescription>
                    {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} this month
                </CardDescription>
                <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-9 h-9 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[100px] md:w-[130px] h-9 text-xs md:text-sm">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[300px] md:h-[400px] px-4 md:px-6">
                    <div className="space-y-0 pb-4">
                        {displayed.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Receipt className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Add one via chat or the + button</p>
                            </div>
                        ) : (
                            <>
                                <motion.div
                                    className="space-y-0"
                                    initial="hidden"
                                    animate="visible"
                                    variants={{
                                        hidden: { opacity: 0 },
                                        visible: {
                                            opacity: 1,
                                            transition: { staggerChildren: 0.05 }
                                        }
                                    }}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {displayed.map((t) => (
                                            <motion.div
                                                layout
                                                key={t.id}
                                                variants={{
                                                    hidden: { opacity: 0, x: -10 },
                                                    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
                                                    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
                                                }}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                whileHover={{ scale: 1.01, transition: { type: "spring", stiffness: 400, damping: 25 } }}
                                                className="flex items-center group py-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                                                onClick={() => {
                                                    if (window.innerWidth < 768) {
                                                        setSelectedTransaction(t);
                                                        setIsEditDialogOpen(true);
                                                    }
                                                }}
                                            >
                                                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">
                                                    {t.category.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="ml-3 space-y-0.5 flex-1 min-w-0">
                                                    <p className="text-sm font-medium leading-none truncate">{t.description}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {t.category} · {formatRelativeTime(t.timestamp)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                    <span className="font-medium text-sm tabular-nums">-₹{t.amount.toFixed(2)}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTransaction(t);
                                                            setIsEditDialogOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                                {hasMore && onViewMore && (
                                    <div className="pt-3 text-center">
                                        <Button variant="ghost" className="w-full text-sm" onClick={onViewMore}>
                                            View All ({filteredTransactions.length - limit!} more)
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <EditTransactionDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                transaction={selectedTransaction}
                onSave={() => {
                    const fetchData = async () => {
                        const service = getService();
                        const data = await service.getTransactions();
                        setTransactions(data);
                    };
                    fetchData();
                }}
            />
        </Card>
    );
}
