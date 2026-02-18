import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Edit2, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { getService } from '@/services/dataService';

interface BudgetFlipCardProps {
    currentBudget: number;
    onBudgetUpdate?: () => void;
    onSuccess: (val: number) => void;
}

export function BudgetFlipCard({ currentBudget, onBudgetUpdate, onSuccess }: BudgetFlipCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [newBudget, setNewBudget] = useState(currentBudget.toString());
    const [loading, setLoading] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const handleFlip = () => {
        setNewBudget(currentBudget.toString());
        setIsFlipped(!isFlipped);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const val = parseFloat(newBudget);
            if (isNaN(val) || val < 0) return;

            const service = getService();
            await service.updateBudget(val);

            onSuccess(val);
            setIsFlipped(false);
            if (onBudgetUpdate) onBudgetUpdate();
        } catch (error) {
            console.error("Failed to update budget", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full h-full" style={{ perspective: "1000px" }}>
            <motion.div
                className="w-full h-full relative"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* Front Side */}
                <Card
                    className="absolute inset-0 w-full h-full flex flex-col card-glow border-border/60"
                    style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden"
                    }}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                        <CardTitle className="text-[11px] md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Budget</CardTitle>
                        <div className="h-6 w-6 md:h-auto md:w-auto rounded-full bg-emerald-500/10 flex items-center justify-center md:bg-transparent">
                            <Wallet className="h-3 w-3 md:h-4 md:w-4 text-emerald-500 md:text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <div className="text-lg md:text-2xl font-bold tracking-tight">{formatCurrency(currentBudget)}</div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 md:h-6 md:w-6 text-muted-foreground hover:text-primary z-10"
                                onClick={(e) => { e.stopPropagation(); handleFlip(); }}
                            >
                                <Edit2 className="h-3 w-3" />
                            </Button>
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Monthly limit</p>
                    </CardContent>
                </Card>

                {/* Back Side */}
                <Card
                    className="absolute inset-0 w-full h-full flex flex-col justify-center card-glow border-border/60"
                    style={{
                        transform: "rotateY(180deg)",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden"
                    }}
                >
                    <CardContent className="p-3 md:p-4 flex flex-col gap-2">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Set Budget</label>
                        <div className="flex gap-1.5 md:gap-2">
                            <Input
                                type="number"
                                value={newBudget}
                                onChange={(e) => setNewBudget(e.target.value)}
                                className="h-8 text-sm rounded-lg border-border/50"
                                placeholder="0.00"
                                style={{ fontSize: '16px' }}
                            />
                            <Button size="icon" className="h-8 w-8 shrink-0 rounded-lg bg-emerald-500 hover:bg-emerald-600" onClick={handleSave} disabled={loading}>
                                <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-lg" onClick={handleFlip}>
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
