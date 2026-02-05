import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import api from "@/utils/api";

interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (description: string, amount: string, category: string) => void;
}

export function AddExpenseDialog({ open, onOpenChange, onSubmit }: AddExpenseDialogProps) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState<string[]>(["Dining", "Groceries", "Transport", "Shopping", "Bills", "Entertainment", "Others"]);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState("");

    useEffect(() => {
        if (open) {
            // Reset form on open
            setDescription("");
            setAmount("");
            setCategory("");
            setIsCustomCategory(false);
            setCustomCategory("");

            // Optional: Fetch categories from backend
            fetchCategories();
        }
    }, [open]);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/insights');
            if (res.data && Array.isArray(res.data)) {
                const fetchedCats = res.data.map((c: any) => c.category);
                // Merge with defaults
                const unique = Array.from(new Set([...categories, ...fetchedCats]));
                setCategories(unique);
            }
        } catch (e) {
            console.error("Failed to fetch categories", e);
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalCategory = isCustomCategory ? customCategory : category;
        if (!description || !amount || !finalCategory) return;

        onSubmit(description, amount, finalCategory);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Description
                        </Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g. Lunch, Taxi, etc."
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Amount
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="col-span-3"
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                            Category
                        </Label>
                        <div className="col-span-3">
                            {!isCustomCategory ? (
                                <Select value={category} onValueChange={(val) => {
                                    if (val === 'new_custom_val') {
                                        setIsCustomCategory(true);
                                        setCategory("");
                                    } else {
                                        setCategory(val);
                                    }
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                        <SelectItem value="new_custom_val" className="text-primary font-medium">
                                            + Add New Category
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="New Category Name"
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                        required
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsCustomCategory(false)}>
                                        X
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Add Expense</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
