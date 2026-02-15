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
            // In local usage: getService() is available from '@/services/dataService' via import 
            // but we need to import { getService } in this file. 
            // It was not imported! It was 'import api'.
            // I need to add the import first.
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
        <div className="relative w-full h-full min-h-[120px]" style={{ perspective: "1000px" }}>
            <motion.div
                className="w-full h-full relative"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* Front Side */}
                <Card
                    className="absolute inset-0 w-full h-full flex flex-col justify-between bg-card backface-hidden"
                    style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden"
                    }}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Budget</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold">{formatCurrency(currentBudget)}</div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-primary z-10"
                                onClick={(e) => { e.stopPropagation(); handleFlip(); }}
                            >
                                <Edit2 className="h-3 w-3" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Total budget</p>
                    </CardContent>
                </Card>

                {/* Back Side */}
                <Card
                    className="absolute inset-0 w-full h-full flex flex-col justify-center bg-card backface-hidden"
                    style={{
                        transform: "rotateY(180deg)",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden"
                    }}
                >
                    <CardContent className="p-4 flex flex-col gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Set New Budget</label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={newBudget}
                                onChange={(e) => setNewBudget(e.target.value)}
                                className="h-8 text-sm"
                                placeholder="0.00"
                            />
                            <Button size="icon" className="h-8 w-8 shrink-0 bg-green-500 hover:bg-green-600" onClick={handleSave} disabled={loading}>
                                <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleFlip}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
