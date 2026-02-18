"use client"

import React, { useState, useEffect } from 'react';
import { getService } from '@/services/dataService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
} from "@/components/ui/ResponsiveDialog";
import { Plus, DollarSign, Tag, FileText } from 'lucide-react';

interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AddExpenseDialog({ open, onOpenChange, onSuccess }: AddExpenseDialogProps) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            const fetchCategories = async () => {
                try {
                    const service = getService();
                    const cats = await service.getCategories();
                    setCategories(cats);
                } catch (e) {
                    console.error("Error fetching categories", e);
                }
            };
            fetchCategories();
        }
    }, [open]);

    const handleSubmit = async () => {
        const finalCategory = category === '__custom__' ? customCategory : category;
        if (!description.trim() || !amount || !finalCategory) return;

        setIsLoading(true);
        try {
            const service = getService();
            await service.addTransaction({
                description: description.trim(),
                amount: parseFloat(amount),
                category: finalCategory,
                timestamp: new Date().toISOString(),
                user_id: 'local_user'
            });

            setDescription('');
            setAmount('');
            setCategory('');
            setCustomCategory('');
            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error("Failed to add expense:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent className="sm:max-w-[425px]">
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Add Expense</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Add a new expense transaction.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Description
                        </Label>
                        <Input
                            id="description"
                            placeholder="e.g., Coffee at Starbucks"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="h-11"
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount" className="text-sm font-medium flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5" />
                            Amount (₹)
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-11"
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" />
                            Category
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                                <SelectItem value="__custom__">+ Custom Category</SelectItem>
                            </SelectContent>
                        </Select>
                        {category === '__custom__' && (
                            <Input
                                placeholder="Enter custom category"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="h-11 mt-2"
                                style={{ fontSize: '16px' }}
                            />
                        )}
                    </div>
                </div>
                <ResponsiveDialogFooter>
                    <Button onClick={handleSubmit} disabled={isLoading} className="w-full h-11 touch-target">
                        <Plus className="h-4 w-4 mr-2" />
                        {isLoading ? 'Adding...' : 'Add Expense'}
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
}
