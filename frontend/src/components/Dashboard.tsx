"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { getService } from '@/services/dataService';
import { PieChart, Pie, Cell, Label } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart"

interface CategoryTotal {
    category: string;
    total: number;
    fill?: string;
}

const CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-1))",
];

export function Dashboard({ refreshTrigger }: { refreshTrigger: number }) {
    const [data, setData] = useState<CategoryTotal[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const service = getService();
                const categoryTotals = await service.getCategoryTotals();
                const processedData = categoryTotals.map((item: any, index: number) => ({
                    ...item,
                    fill: CHART_COLORS[index % CHART_COLORS.length]
                }));
                setData(processedData);
            } catch (error) {
                console.error("Error fetching insights:", error);
            }
        };
        fetchData();
    }, [refreshTrigger]);

    const totalSpent = useMemo(() => {
        return data.reduce((acc, curr) => acc + curr.total, 0);
    }, [data]);

    const chartConfig = useMemo(() => {
        const config: ChartConfig = {
            total: {
                label: "Total Spent",
            },
        };
        data.forEach((item, index) => {
            config[item.category] = {
                label: item.category,
                color: item.fill || CHART_COLORS[index % CHART_COLORS.length],
            };
        });
        return config;
    }, [data]);

    return (
        <Card className="flex flex-col h-full shadow-md border-0 bg-card/50">
            <CardHeader className="items-center pb-0 px-3 md:px-6">
                <CardTitle className="text-base md:text-lg">Spending by Category</CardTitle>
                <CardDescription>Current Month</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0 px-2 md:px-6">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground min-h-[200px]">
                        No data available
                    </div>
                ) : (
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto aspect-square max-h-[220px] md:max-h-[300px]"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Pie
                                data={data}
                                dataKey="total"
                                nameKey="category"
                                innerRadius={45}
                                strokeWidth={4}
                            >
                                <Label
                                    content={({ viewBox }) => {
                                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        className="fill-foreground text-xl md:text-3xl font-bold"
                                                    >
                                                        {totalSpent.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={(viewBox.cy || 0) + 20}
                                                        className="fill-muted-foreground text-xs"
                                                    >
                                                        Total
                                                    </tspan>
                                                </text>
                                            )
                                        }
                                    }}
                                />
                            </Pie>
                            <ChartLegend content={<ChartLegendContent nameKey="category" />} className="-translate-y-2 flex-wrap gap-1 md:gap-2 [&>*]:basis-1/3 md:[&>*]:basis-1/4 [&>*]:justify-center text-xs" />
                        </PieChart>
                    </ChartContainer>
                )}
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm px-3 md:px-6">
                <div className="leading-none text-muted-foreground text-xs md:text-sm">
                    Showing total spending for the current period
                </div>
            </CardFooter>
        </Card>
    );
}
