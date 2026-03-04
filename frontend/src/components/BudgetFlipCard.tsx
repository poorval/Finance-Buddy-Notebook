import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Pencil, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getService } from '@/services/dataService';

interface BudgetFlipCardProps {
    currentBudget: number;
    onBudgetUpdate?: () => void;
    onSuccess: (val: number) => void;
}

export function BudgetFlipCard({ currentBudget, onBudgetUpdate, onSuccess }: BudgetFlipCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [newBudget, setNewBudget] = useState(currentBudget.toString());
    const [loading, setLoading] = useState(false);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    const handleEdit = () => {
        setNewBudget(currentBudget.toString());
        setIsEditing(true);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const val = parseFloat(newBudget);
            if (isNaN(val) || val < 0) return;
            const service = getService();
            await service.updateBudget(val);
            onSuccess(val);
            setIsEditing(false);
            if (onBudgetUpdate) onBudgetUpdate();
        } catch (error) {
            console.error("Failed to update budget", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="h-full relative overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
                {isEditing ? (
                    <motion.div
                        key="edit"
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="h-full"
                    >
                        <CardContent className="p-3 md:p-6 h-full flex flex-col justify-center gap-2">
                            <p className="text-[11px] md:text-xs font-medium text-muted-foreground">Set Budget</p>
                            <div className="flex gap-1.5">
                                <Input
                                    type="number"
                                    value={newBudget}
                                    onChange={(e) => setNewBudget(e.target.value)}
                                    className="h-9 text-sm"
                                    placeholder="0.00"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    style={{ fontSize: '16px' }}
                                />
                                <motion.div whileTap={{ scale: 0.9 }}>
                                    <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSave} disabled={loading}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </motion.div>
                                <motion.div whileTap={{ scale: 0.9 }}>
                                    <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setIsEditing(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </motion.div>
                            </div>
                        </CardContent>
                    </motion.div>
                ) : (
                    <motion.div
                        key="view"
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="h-full"
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                            <CardTitle className="text-[11px] md:text-sm font-medium text-muted-foreground">Budget</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                            <div className="flex items-center gap-1.5">
                                <div className="text-lg md:text-2xl font-bold">{formatCurrency(currentBudget)}</div>
                                <motion.div whileTap={{ scale: 0.9 }}>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={handleEdit}>
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                </motion.div>
                            </div>
                            <p className="text-[10px] md:text-xs text-muted-foreground">Monthly limit</p>
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
