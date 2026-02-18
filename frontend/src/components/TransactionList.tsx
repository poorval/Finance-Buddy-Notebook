import React, { useEffect, useState } from 'react';
import { Search, Filter, Pencil, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getService } from '@/services/dataService';
import { Transaction } from '@/lib/db';
import { EditTransactionDialog } from './EditTransactionDialog';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// Category → color mapping
const CATEGORY_COLORS: Record<string, string> = {
    'Dining': 'bg-orange-500',
    'Food': 'bg-orange-500',
    'Transport': 'bg-blue-500',
    'Groceries': 'bg-emerald-500',
    'Entertainment': 'bg-purple-500',
    'Shopping': 'bg-pink-500',
    'Bills': 'bg-amber-500',
    'Health': 'bg-teal-500',
    'Utilities': 'bg-cyan-500',
    'Education': 'bg-indigo-500',
    'Rent': 'bg-slate-500',
};

function getCategoryColor(category: string): string {
    return CATEGORY_COLORS[category] || 'bg-primary/60';
}

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
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.description.toLowerCase().includes(query) ||
                t.category.toLowerCase().includes(query)
            );
        }

        if (categoryFilter && categoryFilter !== "all") {
            result = result.filter(t => t.category === categoryFilter);
        }

        setFilteredTransactions(result);
    }, [searchQuery, categoryFilter, transactions]);

    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase();
    }

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
        } catch {
            return timestamp;
        }
    };

    const displayedTransactions = limit ? filteredTransactions.slice(0, limit) : filteredTransactions;
    const hasMore = limit ? filteredTransactions.length > limit : false;

    return (
        <Card className="col-span-3 h-full flex flex-col card-glow border-border/60">
            <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                <CardTitle className="text-base md:text-lg font-semibold tracking-tight">Recent Transactions</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                    {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} this month
                </CardDescription>
                <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-9 h-9 bg-muted/30 border-border/50 text-sm focus-visible:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[100px] md:w-[130px] h-9 bg-muted/30 border-border/50 text-xs md:text-sm">
                            <div className="flex items-center gap-1.5">
                                <Filter className="h-3 w-3 text-muted-foreground" />
                                <SelectValue placeholder="Category" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[300px] md:h-[400px] px-3 md:px-6">
                    <div className="space-y-0.5 pb-4">
                        {displayedTransactions.length === 0 ? (
                            /* Beautiful empty state */
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                    <Receipt className="h-7 w-7 opacity-30" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium">No transactions yet</p>
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                                        Add one via chat or the + button
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {displayedTransactions.map((t, index) => (
                                    <motion.div
                                        key={t.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            delay: Math.min(index * 0.03, 0.3),
                                            duration: 0.25,
                                            ease: "easeOut"
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center group py-2.5 md:py-3 px-1.5 rounded-xl transition-colors cursor-pointer active:bg-muted/40"
                                        onClick={() => {
                                            // On mobile, tap to edit
                                            if (window.innerWidth < 768) {
                                                setSelectedTransaction(t);
                                                setIsEditDialogOpen(true);
                                            }
                                        }}
                                    >
                                        {/* Category color dot */}
                                        <div className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                                            <div className={`h-2.5 w-2.5 rounded-full ${getCategoryColor(t.category)}`} />
                                        </div>

                                        <div className="ml-3 space-y-0.5 flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-none truncate">{t.description}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {t.category} · {formatRelativeTime(t.timestamp)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                            <div className="font-semibold text-sm text-red-500/90 dark:text-red-400/90 tabular-nums">
                                                -₹{t.amount.toFixed(2)}
                                            </div>
                                            {/* Desktop hover edit button */}
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
                                {hasMore && onViewMore && (
                                    <div className="pt-4 text-center">
                                        <Button variant="outline" className="w-full h-10 rounded-xl" onClick={onViewMore}>
                                            View More ({filteredTransactions.length - limit!} more)
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
