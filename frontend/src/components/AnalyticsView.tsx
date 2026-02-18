"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { getService } from '@/services/dataService';
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ModernDatePicker } from "@/components/ui/modern-date-picker"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loader2, TrendingUp, Wallet, Filter, Pencil, Search as SearchIcon } from 'lucide-react';
import { Input } from "@/components/ui/input"

import { Transaction } from '@/lib/db';
import { EditTransactionDialog } from './EditTransactionDialog';
import { filterTransactions } from '@/utils/searchLogic';

interface PersonalityProfile {
    title: string;
    emoji: string;
    description: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function AnalyticsView() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [personality, setPersonality] = useState<PersonalityProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [categoryFilter, setCategoryFilter] = useState("all");

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const service = getService();
                const pRes = await service.getPersonality();
                setPersonality(pRes);
            } catch (err) {
                console.error("Failed to fetch metadata", err);
            }
        };
        fetchMeta();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const service = getService();
                const filters: any = {};

                if (dateRange?.from) filters.start_date = format(dateRange.from, 'yyyy-MM-dd');
                if (dateRange?.to) filters.end_date = format(dateRange.to, 'yyyy-MM-dd');
                if (categoryFilter !== 'all') filters.category = categoryFilter;

                const data = await service.getTransactions(filters);
                setTransactions(data);

                const cats = Array.from(new Set(data.map((t: Transaction) => t.category))) as string[];
                setCategories(prev => Array.from(new Set([...prev, ...cats])).sort());

            } catch (err) {
                console.error("Failed to fetch transactions", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange, categoryFilter, refreshTrigger]);

    const handleSeedData = async () => {
        setLoading(true);
        try {
            const service = getService();
            await service.seedData(5000);
            window.location.reload();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = useMemo(() => {
        return filterTransactions(transactions, searchQuery);
    }, [transactions, searchQuery]);

    const chartData = useMemo(() => {
        if (!filteredTransactions.length) return { lineData: [], pieData: [] };

        const dailyMap = new Map<string, number>();
        filteredTransactions.forEach(t => {
            const dateStr = t.timestamp.split(' ')[0];
            dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + t.amount);
        });

        const lineData = Array.from(dailyMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const catMap = new Map<string, number>();
        filteredTransactions.forEach(t => {
            catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
        });

        const pieData = Array.from(catMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return { lineData, pieData };
    }, [filteredTransactions]);

    const totalSpentInRange = useMemo(() => {
        return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    }, [filteredTransactions]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
            {/* Header / Filters */}
            <div className="flex flex-col gap-3 md:gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Analytics & Insights</h2>
                        <p className="text-sm text-muted-foreground">Analyze your spending habits and trends.</p>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <Button variant="outline" size="sm" onClick={handleSeedData} className="flex-shrink-0 text-xs">
                            Seed 5k Data
                        </Button>
                        <ModernDatePicker
                            date={dateRange ? { from: dateRange.from, to: dateRange.to } : undefined}
                            setDate={setDateRange}
                        />
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[120px] md:w-[150px] flex-shrink-0 text-xs md:text-sm">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transactions..."
                        className="pl-10 font-mono text-sm h-10 md:h-11 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                        style={{ fontSize: '16px' }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex gap-1">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">SPL</span>
                        </kbd>
                    </div>
                </div>
            </div>

            {/* Personality Card */}
            {personality && (
                <Card className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-200 dark:border-indigo-800">
                    <CardHeader className="flex flex-row items-center gap-3 md:gap-4 pb-2 p-3 md:p-6">
                        <div className="text-3xl md:text-4xl bg-background p-1.5 md:p-2 rounded-full shadow-sm">{personality.emoji}</div>
                        <div>
                            <CardTitle className="text-base md:text-lg text-indigo-700 dark:text-indigo-300">
                                {personality.title}
                            </CardTitle>
                            <CardDescription className="text-sm text-foreground/80">
                                {personality.description}
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {/* Key Metrics Row — horizontal scroll on mobile */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-2.5 md:p-6">
                        <CardTitle className="text-[11px] md:text-sm font-medium">Total Spent</CardTitle>
                        <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground hidden xs:block" />
                    </CardHeader>
                    <CardContent className="p-2.5 pt-0 md:p-6 md:pt-0">
                        <div className="text-base md:text-2xl font-bold">{formatCurrency(totalSpentInRange)}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">In selected range</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-2.5 md:p-6">
                        <CardTitle className="text-[11px] md:text-sm font-medium">Avg. Txn</CardTitle>
                        <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground hidden xs:block" />
                    </CardHeader>
                    <CardContent className="p-2.5 pt-0 md:p-6 md:pt-0">
                        <div className="text-base md:text-2xl font-bold">
                            {formatCurrency(filteredTransactions.length ? totalSpentInRange / filteredTransactions.length : 0)}
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">{filteredTransactions.length} txns</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-2.5 md:p-6">
                        <CardTitle className="text-[11px] md:text-sm font-medium">Top Cat.</CardTitle>
                        <Filter className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground hidden xs:block" />
                    </CardHeader>
                    <CardContent className="p-2.5 pt-0 md:p-6 md:pt-0">
                        <div className="text-base md:text-2xl font-bold truncate">
                            {chartData.pieData.length > 0 ? chartData.pieData[0].name : "N/A"}
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                            {chartData.pieData.length > 0 ? formatCurrency(chartData.pieData[0].value) : "₹0.00"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts — stacked on mobile */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="md:col-span-4 lg:col-span-4">
                    <CardHeader className="p-3 md:p-6">
                        <CardTitle className="text-base md:text-lg">Spending Trend</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Daily spending over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 md:pl-2 md:p-6">
                        <div className="h-[200px] md:h-[300px] w-full">
                            {loading ? (
                                <div className="h-full w-full flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : chartData.lineData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.lineData}>
                                        <defs>
                                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(str) => {
                                                const date = parseISO(str);
                                                return format(date, "MMM d");
                                            }}
                                            minTickGap={40}
                                            tick={{ fontSize: 11 }}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `₹${val}`}
                                            tick={{ fontSize: 11 }}
                                            width={50}
                                        />
                                        <Tooltip
                                            formatter={(value: number) => [formatCurrency(value), "Spent"]}
                                            labelFormatter={(label) => format(parseISO(label), "MMM d, yyyy")}
                                        />
                                        <Area type="monotone" dataKey="amount" stroke="#8884d8" fillOpacity={1} fill="url(#colorAmount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                    No data for this period.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3 lg:col-span-3">
                    <CardHeader className="p-3 md:p-6">
                        <CardTitle className="text-base md:text-lg">Category Distribution</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Where your money went.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 md:p-6">
                        <div className="h-[220px] md:h-[300px] w-full">
                            {loading ? (
                                <div className="h-full w-full flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : chartData.pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.pieData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={70}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {chartData.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                    No categories found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtered Transactions List */}
            <Card>
                <CardHeader className="p-3 md:p-6">
                    <CardTitle className="text-base md:text-lg">Transactions</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Review filtered transactions.</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                    <ScrollArea className="h-[250px] md:h-[300px]">
                        <div className="space-y-1">
                            {filteredTransactions.map((t) => (
                                <div
                                    key={t.id}
                                    className="flex items-center justify-between py-2.5 px-1 rounded-lg group active:bg-muted/50 transition-colors touch-target"
                                    onClick={() => {
                                        if (window.innerWidth < 768) {
                                            setSelectedTransaction(t);
                                            setIsEditDialogOpen(true);
                                        }
                                    }}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{t.description}</p>
                                        <p className="text-xs text-muted-foreground truncate">{t.category} • {t.timestamp}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                        <div className="font-semibold text-sm">{formatCurrency(t.amount)}</div>
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
                                </div>
                            ))}
                            {!loading && filteredTransactions.length === 0 && (
                                <p className="text-center text-muted-foreground py-8 text-sm">No transactions found.</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <EditTransactionDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                transaction={selectedTransaction}
                onSave={() => {
                    setRefreshTrigger(prev => prev + 1);
                }}
            />
        </div>
    )
}
