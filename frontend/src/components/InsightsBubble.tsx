import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import api from "@/utils/api";
import { getService } from '@/services/dataService';

interface CategoryTotal {
    category: string;
    total: number;
}

export function InsightsBubble() {
    const [data, setData] = useState<CategoryTotal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const service = getService();
                const categoryTotals = await service.getCategoryTotals();
                // Ensure data is sorted by total descending
                const sorted = (categoryTotals || []).sort((a: CategoryTotal, b: CategoryTotal) => b.total - a.total);
                setData(sorted);
            } catch (err) {
                console.error("Failed to fetch insights", err);
                setError("Failed to load insights.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    };

    if (loading) {
        return (
            <Card className="w-full max-w-[350px] border-2 shadow-sm">
                <CardContent className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full max-w-[350px] border-red-200 border-2 shadow-sm">
                <CardContent className="py-4 text-center text-red-500 text-sm">
                    {error}
                </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card className="w-full max-w-[350px] border-2 shadow-sm">
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                    No spending data available.
                </CardContent>
            </Card>
        );
    }

    const totalSpent = data.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <Card className="w-full max-w-[400px] border-2 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-2 pt-4 px-4 border-b">
                <CardTitle className="text-base flex justify-between items-center">
                    <span>Spending Breakdown</span>
                    <span className="text-primary font-bold">{formatCurrency(totalSpent)}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[60%] pl-4">Category</TableHead>
                            <TableHead className="text-right pr-4">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.category} className="hover:bg-muted/20">
                                <TableCell className="font-medium pl-4 py-2">{item.category}</TableCell>
                                <TableCell className="text-right pr-4 py-2 text-muted-foreground">
                                    {formatCurrency(item.total)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
