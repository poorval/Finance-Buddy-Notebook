import React, { useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence, Variants } from "framer-motion";
import { getService } from '@/services/dataService';
import { Dashboard } from './Dashboard';
import { TransactionList } from './TransactionList';
import { BudgetFlipCard } from './BudgetFlipCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowLeftRight, DollarSign, TrendingDown, TrendingUp, CreditCard } from "lucide-react"

const AnalyticsView = lazy(() => import('./AnalyticsView'));
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
        total_spent: 0, budget: 0, remaining: 0, active_debts: 0
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

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    const budgetUsedPercent = stats.budget > 0
        ? Math.min(100, Math.max(0, (stats.total_spent / stats.budget) * 100))
        : 0;
    const isOverBudget = stats.remaining < 0;

    /* Shadcn stat card — matches their dashboard example exactly */
    const StatCard = ({ title, value, subtitle, icon: Icon }: {
        title: string; value: string; subtitle: string; icon: React.ElementType;
    }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-[11px] md:text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">{value}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground">{subtitle}</p>
            </CardContent>
        </Card>
    );

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 15, scale: 0.98 },
        visible: {
            opacity: 1, y: 0, scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        }
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-6 pt-4 md:pt-6 overflow-x-hidden">
            {!isMobile && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                    {onLayoutChange && (
                        <Button variant="outline" size="icon" onClick={onLayoutChange} title="Swap Layout">
                            <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                    )}
                </motion.div>
            )}

            {isMobile ? (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 pb-nav">
                    {/* Stats — 2x2 grid on mobile */}
                    <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                        <StatCard title="Total Spent" value={formatCurrency(stats.total_spent)} subtitle="This month" icon={DollarSign} />
                        <BudgetFlipCard
                            currentBudget={stats.budget}
                            onBudgetUpdate={() => { }}
                            onSuccess={(newVal) => setStats(prev => ({ ...prev, budget: newVal, remaining: newVal - prev.total_spent }))}
                        />
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                                <CardTitle className="text-[11px] font-medium text-muted-foreground">Remaining</CardTitle>
                                {isOverBudget ? <TrendingDown className="h-4 w-4 text-destructive" /> : <TrendingUp className="h-4 w-4 text-muted-foreground" />}
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className={`text-lg font-bold ${isOverBudget ? 'text-destructive' : ''}`}>{formatCurrency(stats.remaining)}</div>
                                {stats.budget > 0 && (
                                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.8, delay: 0.2, ease: "circOut" }}>
                                        <Progress value={budgetUsedPercent} className="mt-2 h-1 w-full" />
                                    </motion.div>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-1">{stats.budget > 0 ? `${budgetUsedPercent.toFixed(0)}% used` : 'No budget'}</p>
                            </CardContent>
                        </Card>
                        <StatCard title="Active Debts" value={formatCurrency(stats.active_debts)} subtitle="To collect" icon={CreditCard} />
                    </motion.div>

                    {/* Chart */}
                    <motion.div variants={itemVariants}>
                        <Dashboard refreshTrigger={refreshTrigger} />
                    </motion.div>

                    {/* Transactions */}
                    <motion.div variants={itemVariants}>
                        <TransactionList refreshTrigger={refreshTrigger} limit={100} />
                    </motion.div>
                </motion.div>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
                    </TabsList>
                    <AnimatePresence mode="wait">
                        <TabsContent key={activeTab} value="overview" className="mt-0 outline-none" asChild>
                            <motion.div variants={containerVariants} initial="hidden" animate="visible" exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }} className="space-y-4">
                                <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <StatCard title="Total Spent" value={formatCurrency(stats.total_spent)} subtitle="Total expenses" icon={DollarSign} />
                                    <BudgetFlipCard
                                        currentBudget={stats.budget}
                                        onBudgetUpdate={() => { }}
                                        onSuccess={(newVal) => setStats(prev => ({ ...prev, budget: newVal, remaining: newVal - prev.total_spent }))}
                                    />
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                                            {isOverBudget ? <TrendingDown className="h-4 w-4 text-destructive" /> : <TrendingUp className="h-4 w-4 text-muted-foreground" />}
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : ''}`}>{formatCurrency(stats.remaining)}</div>
                                            {stats.budget > 0 && (
                                                <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.8, delay: 0.2, ease: "circOut" }}>
                                                    <Progress value={budgetUsedPercent} className="mt-2 h-1.5 w-full" />
                                                </motion.div>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {stats.budget > 0 ? `${((stats.remaining / stats.budget) * 100).toFixed(1)}% of budget left` : 'No budget set'}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <StatCard title="Active Debts" value={formatCurrency(stats.active_debts)} subtitle="To be collected" icon={CreditCard} />
                                </motion.div>
                                <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                                    <div className="col-span-4">
                                        <Dashboard refreshTrigger={refreshTrigger} />
                                    </div>
                                    <div className="col-span-3">
                                        <TransactionList refreshTrigger={refreshTrigger} limit={100} onViewMore={() => setActiveTab("analytics")} />
                                    </div>
                                </motion.div>
                            </motion.div>
                        </TabsContent>
                    </AnimatePresence>
                    <TabsContent value="analytics" className="space-y-4">
                        <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
                            <AnalyticsView />
                        </Suspense>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
