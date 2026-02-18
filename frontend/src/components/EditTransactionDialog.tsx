"use client"

import React, { useState, useEffect } from 'react';
import { getService } from '@/services/dataService';
import { Transaction } from '@/lib/db';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Save, Trash2 } from 'lucide-react';

interface EditTransactionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    onSave: () => void;
}

export function EditTransactionDialog({ isOpen, onClose, transaction, onSave }: EditTransactionDialogProps) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (transaction) {
            setDescription(transaction.description);
            setAmount(transaction.amount.toString());
            setCategory(transaction.category);
            try {
                const dateObj = new Date(transaction.timestamp);
                setDate(dateObj.toISOString().split('T')[0]);
                setTime(dateObj.toTimeString().slice(0, 5));
            } catch {
                setDate('');
                setTime('');
            }
        }
    }, [transaction]);

    useEffect(() => {
        if (isOpen) {
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
    }, [isOpen]);

    const handleSave = async () => {
        if (!transaction) return;
        setIsLoading(true);
        try {
            const service = getService();
            const timestamp = date && time ? `${date}T${time}:00` : transaction.timestamp;
            await service.updateTransaction(transaction.id!, {
                description: description.trim(),
                amount: parseFloat(amount),
                category,
                timestamp,
            });
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to update transaction:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!transaction) return;
        setIsLoading(true);
        try {
            const service = getService();
            await service.deleteTransaction(transaction.id!);
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to delete transaction:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ResponsiveDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <ResponsiveDialogContent className="sm:max-w-[425px]">
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Edit Transaction</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Update the details of this transaction.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-desc">Description</Label>
                        <Input
                            id="edit-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="h-11"
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-amount">Amount (₹)</Label>
                        <Input
                            id="edit-amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-11"
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="edit-date">Date</Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="h-11"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-time">Time</Label>
                            <Input
                                id="edit-time"
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="h-11"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                    </div>
                </div>
                <ResponsiveDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full sm:w-auto h-11 touch-target">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this transaction.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto h-11 touch-target">
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
}
