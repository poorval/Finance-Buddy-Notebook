import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Transaction } from '@/lib/db';
import { getService } from '@/services/dataService';

interface EditTransactionDialogProps {
    transaction: Transaction | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function EditTransactionDialog({ transaction, isOpen, onClose, onSave }: EditTransactionDialogProps) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        if (transaction) {
            setDescription(transaction.description);
            setAmount(transaction.amount.toString());
            setCategory(transaction.category);

            // Parse timestamp "YYYY-MM-DD HH:MM:SS" or ISO
            try {
                const d = new Date(transaction.timestamp);
                setDate(d.toISOString().split('T')[0]);
                setTime(d.toTimeString().split(' ')[0].substring(0, 5));
            } catch (e) {
                // Fallback if parsing fails
                setDate("");
                setTime("");
            }
        }
        fetchCategories();
    }, [transaction]);

    const fetchCategories = async () => {
        try {
            const service = getService();
            const cats = await service.getCategories();
            if (cats) setCategories(cats);
        } catch (e) {
            console.error(e);
        }
    }

    const handleSave = async () => {
        if (!transaction) return;
        setLoading(true);
        try {
            const service = getService();
            const timestamp = `${date} ${time}:00`;

            if (transaction.id === undefined) return;
            await service.updateTransaction(transaction.id, {
                description,
                amount: parseFloat(amount),
                category,
                timestamp
            });
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to update transaction", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Transaction</DialogTitle>
                    <DialogDescription>
                        Make changes to your transaction here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">
                            Description
                        </Label>
                        <Input
                            id="desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
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
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                            Category
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Time</Label>
                        <div className="col-span-3 flex gap-2">
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-24"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
