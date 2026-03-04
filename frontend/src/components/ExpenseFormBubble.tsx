import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { getService } from '@/services/dataService';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface ExpenseFormBubbleProps {
    onSubmit: (description: string, amount: string, category: string, timestamp: string) => void;
    onCancel?: () => void;
}

export function ExpenseFormBubble({ onSubmit, onCancel }: ExpenseFormBubbleProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState<string[]>(["Dining", "Groceries", "Transport", "Shopping", "Bills", "Entertainment", "Others"]);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState("");
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const service = getService();
                const cats = await service.getCategories();
                if (cats?.length > 0) setCategories(prev => Array.from(new Set([...prev, ...cats])));
            } catch (e) { console.error("Failed to fetch categories", e); }
        })();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalCategory = isCustomCategory ? customCategory : category;
        if (!description || !amount || !finalCategory || !date || !time) return;
        setSubmitted(true);
        setTimeout(() => onSubmit(description, amount, finalCategory, `${date} ${time}:00`), 300);
    };

    if (submitted) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="font-medium">Expense added</span>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-[320px]">
            <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-base">Add Expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-2">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label htmlFor="date" className="text-xs">Date</Label>
                        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="time" className="text-xs">Time</Label>
                        <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 text-sm" />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="desc" className="text-xs">Description</Label>
                    <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Lunch" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="amt" className="text-xs">Amount</Label>
                    <Input id="amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    {!isCustomCategory ? (
                        <Select value={category} onValueChange={(val) => {
                            if (val === 'new_custom_val') { setIsCustomCategory(true); setCategory(""); }
                            else setCategory(val);
                        }}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                <SelectItem value="new_custom_val">+ Add New</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="flex gap-1">
                            <Input placeholder="New Category" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="h-8 text-sm" />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCustomCategory(false)}>✕</Button>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="pt-2 pb-4 px-4 flex justify-between">
                <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">Skip</Button>
                <Button onClick={handleSubmit} size="sm" className="h-8 text-xs">Add</Button>
            </CardFooter>
        </Card>
    );
}
