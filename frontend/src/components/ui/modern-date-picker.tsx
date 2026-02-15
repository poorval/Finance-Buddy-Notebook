"use client";

import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


interface ModernDatePickerProps {
    date: { from: Date | undefined; to: Date | undefined } | undefined;
    setDate: (range: { from: Date | undefined; to: Date | undefined } | undefined) => void;
    className?: string;
}

export function ModernDatePicker({ date, setDate, className }: ModernDatePickerProps) {

    const presets = [
        {
            label: 'Today',
            getValue: () => ({ from: new Date(), to: new Date() })
        },
        {
            label: 'Yesterday',
            getValue: () => {
                const yesterday = subDays(new Date(), 1);
                return { from: yesterday, to: yesterday }
            }
        },
        {
            label: 'Last 7 Days',
            getValue: () => ({ from: subDays(new Date(), 7), to: new Date() })
        },
        {
            label: 'Last 30 Days',
            getValue: () => ({ from: subDays(new Date(), 30), to: new Date() })
        },
        {
            label: 'This Month',
            getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
        },
        {
            label: 'Last Month',
            getValue: () => {
                const lastMonth = subDays(startOfMonth(new Date()), 1);
                return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
            }
        },
        {
            label: 'This Year',
            getValue: () => ({ from: startOfYear(new Date()), to: new Date() })
        }
    ];

    const handlePresetClick = (preset: typeof presets[0]) => {
        setDate(preset.getValue());
    };

    // Custom Header
    const renderCustomHeader = ({
        date,
        changeYear,
        changeMonth,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
    }: any) => {
        const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ];

        return (
            <div className="flex items-center justify-between px-2 py-2">
                <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    type="button"
                    className={cn("p-1 opacity-50 hover:opacity-100", prevMonthButtonDisabled && "invisible")}
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex gap-2">
                    <Select
                        value={months[date.getMonth()]}
                        onValueChange={(val) => changeMonth(months.indexOf(val))}
                    >
                        <SelectTrigger className="h-8 border-none shadow-none font-bold text-sm w-[110px] focus:ring-0 text-foreground bg-transparent">
                            <SelectValue>{months[date.getMonth()]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={date.getFullYear().toString()}
                        onValueChange={(val) => changeYear(parseInt(val))}
                    >
                        <SelectTrigger className="h-8 border-none shadow-none font-bold text-sm w-[80px] focus:ring-0 text-foreground bg-transparent">
                            <SelectValue>{date.getFullYear()}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <div className="max-h-[200px] overflow-y-auto">
                                {years.map((y) => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </div>
                        </SelectContent>
                    </Select>
                </div>

                <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    type="button"
                    className={cn("p-1 opacity-50 hover:opacity-100", nextMonthButtonDisabled && "invisible")}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        );
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal border-0 bg-background/50 hover:bg-accent/50 h-9 shadow-none",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none shadow-xl bg-popover" align="center">
                    <div className="flex flex-col md:flex-row">
                        {/* Presets Sidebar */}
                        <div className="w-full md:w-[150px] border-b md:border-b-0 md:border-r p-2 bg-muted/30 flex flex-nowrap md:flex-col overflow-x-auto md:overflow-visible gap-1">
                            {presets.map((preset) => (
                                <Button
                                    key={preset.label}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePresetClick(preset)}
                                    className="justify-start font-normal h-8 px-2 md:w-full"
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>

                        {/* Calendar */}
                        <div className="p-0">
                            <style jsx global>{`
                                .react-datepicker {
                                    font-family: inherit;
                                    border: none;
                                    background-color: transparent;
                                }
                                .react-datepicker__header {
                                    background-color: transparent;
                                    border-bottom: 1px solid hsl(var(--border));
                                    padding-top: 0;
                                }
                                .react-datepicker__day-name {
                                    color: hsl(var(--muted-foreground));
                                    width: 2.2rem;
                                    line-height: 2.2rem;
                                    margin: 0.1rem;
                                    font-size: 0.8rem;
                                }
                                .react-datepicker__day {
                                    color: hsl(var(--popover-foreground));
                                    width: 2.2rem;
                                    line-height: 2.2rem;
                                    margin: 0.1rem;
                                    border-radius: var(--radius);
                                }
                                .react-datepicker__day:hover {
                                    background-color: hsl(var(--accent));
                                    color: hsl(var(--accent-foreground));
                                }
                                .react-datepicker__day--selected,
                                .react-datepicker__day--in-selecting-range,
                                .react-datepicker__day--range-start,
                                .react-datepicker__day--range-end {
                                    background-color: hsl(var(--primary)) !important;
                                    color: hsl(var(--primary-foreground)) !important;
                                }
                                .react-datepicker__day--in-range {
                                    background-color: hsl(var(--accent)) !important;
                                    color: hsl(var(--accent-foreground)) !important;
                                    opacity: 1;
                                }
                                .react-datepicker__day--keyboard-selected {
                                    background-color: hsl(var(--accent));
                                }
                                .react-datepicker__month-container {
                                    float: left;
                                }
                                .react-datepicker__month {
                                    margin: 0.4em;
                                }
                            `}</style>

                            <div className="p-2 pb-0 text-center">
                                <span className={cn(
                                    "text-sm font-medium",
                                    !date?.from || date?.to ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {!date?.from || date?.to ? "Select Start Date" : "Select End Date"}
                                </span>
                            </div>

                            <DatePicker
                                selected={date?.from}
                                onChange={(dates) => {
                                    const [start, end] = dates as [Date | null, Date | null];
                                    setDate({ from: start || undefined, to: end || undefined });
                                }}
                                startDate={date?.from}
                                endDate={date?.to}
                                selectsRange
                                inline
                                monthsShown={1}
                                renderCustomHeader={renderCustomHeader}
                                formatWeekDay={(name) => name.substr(0, 2)}
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
