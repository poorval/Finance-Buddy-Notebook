import React, { useEffect, useState, lazy, Suspense } from 'react';
import api from '@/utils/api';
import { getService } from '@/services/dataService';
import { Dashboard } from './Dashboard';
import { TransactionList } from './TransactionList';
import { BudgetFlipCard } from './BudgetFlipCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"

const AnalyticsView = lazy(() => import('./AnalyticsView'));
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CreditCard, Activity, Wallet, ArrowLeftRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

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
}

export function DashboardView({ refreshTrigger, onLayoutChange, isChatRight }: DashboardViewProps) {
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

    return (
        <div className="flex-1 space-y-4 p-4 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <div className="flex items-center space-x-2">
                    {onLayoutChange && (
                        <Button variant="outline" size="icon" onClick={onLayoutChange} title="Swap Layout">
                            <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
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
                            onBudgetUpdate={() => {
                                // Trigger refresh by toggling trigger or calling parent
                                // Since refreshTrigger is prop, we might need to handle it better.
                                // For now, we assume Stats will be refetched on refreshTrigger change
                                // But we can't change parent state easily. 
                                // Ideally we lift state or use context. 
                                // Hack: We can locally update stats.budget for immediate feedback?
                                // Better: DashboardView should key off stats fetch. 
                                // Let's just create a local refresh or assume parent handles globally?
                                // Let's just trigger a re-fetch if possible or optimistic update.
                            }}
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
        </div>
    );
}
