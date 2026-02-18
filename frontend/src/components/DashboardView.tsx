import React, { useEffect, useState, lazy, Suspense } from 'react';
import { getService } from '@/services/dataService';
import { Dashboard } from './Dashboard';
import { TransactionList } from './TransactionList';
import { BudgetFlipCard } from './BudgetFlipCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"

const AnalyticsView = lazy(() => import('./AnalyticsView'));
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CreditCard, Activity, Wallet, ArrowLeftRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface DashboardStats {
    total_spent: number;
    budget: number;
    remaining: number;
    active_debts: number;
}

interface DashboardViewProps {
    refreshTrigger: number;
    onLayoutChange?: () => void;
    isChatRight?: boolean;
    isMobile?: boolean;
}

export function DashboardView({ refreshTrigger, onLayoutChange, isChatRight, isMobile }: DashboardViewProps) {
    const [stats, setStats] = useState<DashboardStats>({
        total_spent: 0,
        budget: 0,
        remaining: 0,
        active_debts: 0
    });

    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const service = getService();
                const data = await service.getStats();
                setStats(data);
            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        };
        fetchStats();
    }, [refreshTrigger]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const budgetUsedPercent = stats.budget > 0
        ? Math.min(100, Math.max(0, ((stats.total_spent / stats.budget) * 100)))
        : 0;

    const isOverBudget = stats.remaining < 0;

    // Stagger animation
    const cardVariants = {
        hidden: { opacity: 0, y: 12, scale: 0.97 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                delay: i * 0.08,
                type: "spring" as const,
                stiffness: 400,
                damping: 25,
            },
        }),
    };

    return (
        <div className="flex-1 space-y-5 p-4 md:p-4 pt-4 md:pt-6">
            {/* On mobile: no extra title — greeting is in header */}
            {!isMobile && (
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h2>
                    <div className="flex items-center space-x-2">
                        {onLayoutChange && (
                            <Button variant="outline" size="icon" onClick={onLayoutChange} title="Swap Layout">
                                <ArrowLeftRight className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* On mobile, show overview directly without tabs */}
            {isMobile ? (
                <div className="space-y-5">
                    {/* Section label */}
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Overview</p>

                    {/* Stats cards — horizontal scroll with stagger */}
                    <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x-mandatory pb-1 -mx-4 px-4">
                        <motion.div
                            custom={0}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            className="min-w-[155px] flex-shrink-0 snap-start"
                        >
                            <Card className="card-glow bg-gradient-to-br from-card to-card border-border/60 h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                                    <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Spent</CardTitle>
                                    <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center">
                                        <TrendingDown className="h-3 w-3 text-red-500" />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                    <div className="text-lg font-bold tracking-tight">{formatCurrency(stats.total_spent)}</div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">This month</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            custom={1}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            className="min-w-[155px] flex-shrink-0 snap-start"
                        >
                            <BudgetFlipCard
                                currentBudget={stats.budget}
                                onBudgetUpdate={() => { }}
                                onSuccess={(newVal) => setStats(prev => ({ ...prev, budget: newVal, remaining: newVal - prev.total_spent }))}
                            />
                        </motion.div>

                        <motion.div
                            custom={2}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            className="min-w-[155px] flex-shrink-0 snap-start"
                        >
                            <Card className={`card-glow h-full ${isOverBudget ? 'border-red-500/30' : 'border-border/60'}`}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                                    <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Left</CardTitle>
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isOverBudget ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                                        {isOverBudget
                                            ? <TrendingDown className="h-3 w-3 text-red-500" />
                                            : <TrendingUp className="h-3 w-3 text-emerald-500" />
                                        }
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                    <div className={`text-lg font-bold tracking-tight ${isOverBudget ? 'text-red-500' : ''}`}>
                                        {formatCurrency(stats.remaining)}
                                    </div>
                                    {/* Budget progress bar */}
                                    {stats.budget > 0 && (
                                        <div className="mt-1.5">
                                            <div className="h-1 rounded-full bg-muted overflow-hidden">
                                                <motion.div
                                                    className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
                                                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                {budgetUsedPercent.toFixed(0)}% used
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            custom={3}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            className="min-w-[155px] flex-shrink-0 snap-start"
                        >
                            <Card className="card-glow h-full border-border/60">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                                    <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Debts</CardTitle>
                                    <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                                        <CreditCard className="h-3 w-3 text-orange-500" />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                    <div className="text-lg font-bold tracking-tight">{formatCurrency(stats.active_debts)}</div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">To collect</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Section separator */}
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Spending</p>

                    {/* Charts and transactions stacked */}
                    <Dashboard refreshTrigger={refreshTrigger} />

                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Activity</p>

                    <TransactionList
                        refreshTrigger={refreshTrigger}
                        limit={100}
                    />
                </div>
            ) : (
                /* Desktop layout with tabs */
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(stats.total_spent)}</div>
                                    <p className="text-xs text-muted-foreground">Total expenses</p>
                                </CardContent>
                            </Card>
                            <BudgetFlipCard
                                currentBudget={stats.budget}
                                onBudgetUpdate={() => { }}
                                onSuccess={(newVal) => setStats(prev => ({ ...prev, budget: newVal, remaining: newVal - prev.total_spent }))}
                            />
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className={`text-2xl font-bold ${stats.remaining < 0 ? 'text-red-500' : ''}`}>
                                        {formatCurrency(stats.remaining)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {stats.budget > 0 ? `${((stats.remaining / stats.budget) * 100).toFixed(1)}% of budget left` : 'No budget set'}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Active Debts</CardTitle>
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(stats.active_debts)}</div>
                                    <p className="text-xs text-muted-foreground">To be collected</p>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <div className="col-span-4">
                                <Dashboard refreshTrigger={refreshTrigger} />
                            </div>
                            <div className="col-span-3">
                                <TransactionList
                                    refreshTrigger={refreshTrigger}
                                    limit={100}
                                    onViewMore={() => setActiveTab("analytics")}
                                />
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="analytics" className="space-y-4">
                        <div className="grid gap-4">
                            <Suspense fallback={
                                <div className="flex h-[400px] items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            }>
                                <AnalyticsView />
                            </Suspense>
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
