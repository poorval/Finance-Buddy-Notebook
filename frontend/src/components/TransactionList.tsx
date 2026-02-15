import React, { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getService } from '@/services/dataService';
import { Transaction } from '@/lib/db';
import { EditTransactionDialog } from './EditTransactionDialog';
import { Pencil } from 'lucide-react';
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

                // Extract unique categories
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

    const displayedTransactions = limit ? filteredTransactions.slice(0, limit) : filteredTransactions;
    const hasMore = limit ? filteredTransactions.length > limit : false;

    return (
        <Card className="col-span-3 h-full flex flex-col">
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                    You made {filteredTransactions.length} transactions this month.
                </CardDescription>
                <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-9 h-9 bg-muted/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[130px] h-9 bg-muted/50">
                            <div className="flex items-center gap-2">
                                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
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
                <ScrollArea className="h-[400px] px-6">
                    <div className="space-y-8 pb-6">
                        {displayedTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-2">
                                <Search className="h-8 w-8 opacity-20" />
                                <p>No transactions found.</p>
                            </div>
                        ) : (
                            <>
                                {displayedTransactions.map((t) => (
                                    <div key={t.id} className="flex items-center group">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                                                {getInitials(t.category)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="ml-4 space-y-1 flex-1">
                                            <p className="text-sm font-medium leading-none">{t.description}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {t.category} • {t.timestamp}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium mr-2">
                                                -₹{t.amount.toFixed(2)}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => {
                                                    setSelectedTransaction(t);
                                                    setIsEditDialogOpen(true);
                                                }}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {hasMore && onViewMore && (
                                    <div className="pt-4 text-center">
                                        <Button variant="outline" className="w-full" onClick={onViewMore}>
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
                    // Trigger refresh from parent would be ideal, but for now strict local state update or trigger
                    // We depend on 'refreshTrigger' prop from parent (DashboardView). 
                    // Ideally we should call a callback prop 'onUpdate' which DashboardView uses to flip refreshTrigger.
                    // But we don't have that prop yet.
                    // Alternative: We can force a local re-fetch here.
                    const fetchData = async () => {
                        const service = getService();
                        const data = await service.getTransactions();
                        setTransactions(data); // This will re-filter automatically via useEffect
                    };
                    fetchData();
                }}
            />
        </Card>
    );
}
