import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/utils/api";

interface ExpenseFormBubbleProps {
    onSubmit: (description: string, amount: string, category: string) => void;
    onCancel?: () => void;
}

export function ExpenseFormBubble({ onSubmit, onCancel }: ExpenseFormBubbleProps) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState<string[]>(["Dining", "Groceries", "Transport", "Shopping", "Bills", "Entertainment", "Others"]);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState("");
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/insights');
            if (res.data && Array.isArray(res.data)) {
                const fetchedCats = res.data.map((c: any) => c.category);
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

        setSubmitted(true);
        // Delay callback slightly to allow exit animation if needed, but here we just switch state
        setTimeout(() => {
            onSubmit(description, amount, finalCategory);
        }, 500);
    };

    return (
        <AnimatePresence mode="wait">
            {submitted ? (
                <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-4 py-2 rounded-full shadow-sm w-fit"
                >
                    <div className="bg-green-500 rounded-full p-1">
                        <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium">Expense Added</span>
                </motion.div>
            ) : (
                <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                >
                    <Card className="w-full max-w-[320px] shadow-sm border-2">
                        <CardHeader className="pb-3 pt-4 px-4">
                            <CardTitle className="text-base">Add Expense</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 px-4 pb-2">
                            <div className="space-y-1">
                                <Label htmlFor="desc" className="text-xs">Description</Label>
                                <Input
                                    id="desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Lunch"
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="amt" className="text-xs">Amount</Label>
                                <Input
                                    id="amt"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Category</Label>
                                {!isCustomCategory ? (
                                    <Select value={category} onValueChange={(val) => {
                                        if (val === 'new_custom_val') {
                                            setIsCustomCategory(true);
                                            setCategory("");
                                        } else {
                                            setCategory(val);
                                        }
                                    }}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                            <SelectItem value="new_custom_val" className="text-primary font-medium">
                                                + Add New
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="flex gap-1">
                                        <Input
                                            placeholder="New Category"
                                            value={customCategory}
                                            onChange={(e) => setCustomCategory(e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCustomCategory(false)}>
                                            X
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2 pb-4 px-4 flex justify-between">
                            <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">Skip</Button>
                            <Button onClick={handleSubmit} size="sm" className="h-8 text-xs">Add</Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
