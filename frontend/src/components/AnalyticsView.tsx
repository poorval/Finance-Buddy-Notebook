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
    // State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [personality, setPersonality] = useState<PersonalityProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    // Filters
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [categoryFilter, setCategoryFilter] = useState("all");

    // Fetch Initial Data (Personality & Categories)
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const service = getService();
                // Fetch Personality (All Time)
                const pRes = await service.getPersonality();
                setPersonality(pRes);
            } catch (err) {
                console.error("Failed to fetch metadata", err);
            }
        };
        fetchMeta();
    }, []);

    // Fetch Filtered Transactions (from DB/API based on Date/Category)
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

                // Update categories list from the fetched data
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

    // Computed Filtered Data (Client-side Search)
    const filteredTransactions = useMemo(() => {
        return filterTransactions(transactions, searchQuery);
    }, [transactions, searchQuery]);

    // Computed Data for Charts
    const chartData = useMemo(() => {
        if (!filteredTransactions.length) return { lineData: [], pieData: [] };

        // 1. Line Chart: Daily Spending
        const dailyMap = new Map<string, number>();
        filteredTransactions.forEach(t => {
            const dateStr = t.timestamp.split(' ')[0];
            dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + t.amount);
        });

        const lineData = Array.from(dailyMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // 2. Pie Chart: Category Distribution
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
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Analytics & Insights</h2>
                        <p className="text-muted-foreground">Analyze your spending habits and trends.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleSeedData}>
                            Seed 5k Data (Local)
                        </Button>
                        <ModernDatePicker
                            date={dateRange ? { from: dateRange.from, to: dateRange.to } : undefined}
                            setDate={setDateRange}
                        />
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Splunk-like Search Bar */}
                <div className="relative group">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transactions... (e.g. category=Dining amount>50 description=Lunch)"
                        className="pl-10 font-mono text-sm h-11 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">SPL</span>
                        </kbd>
                    </div>
                </div>
            </div>

            {/* Personality Card */}
            {personality && (
                <Card className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-200 dark:border-indigo-800">
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                        <div className="text-4xl bg-background p-2 rounded-full shadow-sm">{personality.emoji}</div>
                        <div>
                            <CardTitle className="text-lg text-indigo-700 dark:text-indigo-300">
                                {personality.title}
                            </CardTitle>
                            <CardDescription className="text-base text-foreground/80">
                                {personality.description}
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {/* Key Metrics Row */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent (Selected)</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalSpentInRange)}</div>
                        <p className="text-xs text-muted-foreground">
                            In selected range
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(filteredTransactions.length ? totalSpentInRange / filteredTransactions.length : 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {filteredTransactions.length} transactions
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                        <Filter className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {chartData.pieData.length > 0 ? chartData.pieData[0].name : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {chartData.pieData.length > 0 ? formatCurrency(chartData.pieData[0].value) : "₹0.00"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Line/Area Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Spending Trend</CardTitle>
                        <CardDescription>Daily spending over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
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
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `₹${val}`}
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

                {/* Pie Chart */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Category Distribution</CardTitle>
                        <CardDescription>Where your money went.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
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
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {chartData.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Legend />
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
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                    <CardDescription>Review filtered transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                            {filteredTransactions.map((t) => (
                                <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 group">
                                    <div>
                                        <p className="text-sm font-medium">{t.description}</p>
                                        <p className="text-xs text-muted-foreground">{t.category} • {t.timestamp}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="font-semibold">{formatCurrency(t.amount)}</div>
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
                            {!loading && filteredTransactions.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No transactions found.</p>
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
