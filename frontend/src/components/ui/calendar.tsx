"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  showYearMonthSelect?: boolean
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  showYearMonthSelect = false,
  ...props
}: CalendarProps) {

  // Internal state for controlled/uncontrolled month handling
  const [internalMonth, setInternalMonth] = React.useState<Date>(props.defaultMonth || new Date())

  // If props.month is provided, use it (controlled). Otherwise use internal.
  const displayMonth = props.month || internalMonth

  const handleMonthChange = (monthStr: string) => {
    const newDate = new Date(displayMonth)
    newDate.setMonth(parseInt(monthStr))
    if (!props.month) {
      setInternalMonth(newDate)
    }
    props.onMonthChange?.(newDate)
  }

  const handleYearChange = (yearStr: string) => {
    const newDate = new Date(displayMonth)
    newDate.setFullYear(parseInt(yearStr))
    if (!props.month) {
      setInternalMonth(newDate)
    }
    props.onMonthChange?.(newDate)
  }

  // Generate Year Options (current year - 10 to + 10)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i)
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  return (
    <div className={cn("p-3", className)}>
      {showYearMonthSelect && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <Select
            value={displayMonth.getMonth().toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="h-8 w-[110px] shadow-sm">
              <SelectValue>{months[displayMonth.getMonth()]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={m} value={i.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={displayMonth.getFullYear().toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-8 w-[80px] shadow-sm">
              <SelectValue>{displayMonth.getFullYear()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <ScrollAreaWrapper className="h-[200px]">
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </ScrollAreaWrapper>
            </SelectContent>
          </Select>
        </div>
      )}
      <DayPicker
        showOutsideDays={showOutsideDays}
        month={displayMonth}
        onMonthChange={(m) => {
          if (!props.month) setInternalMonth(m);
          props.onMonthChange?.(m);
        }}
        className={cn(showYearMonthSelect ? "mt-0" : "p-0")}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 relative",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center absolute right-1", // Standard nav button positioning
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          Chevron: ({ orientation, ...props }) =>
            orientation === "left" ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ),
        }}
        {...props}
      />
    </div>
  )
}

function ScrollAreaWrapper({ className, children }: { className?: string; children: React.ReactNode }) {
  // Basic wrapper to ensure SelectContent doesn't overflow if too many years
  return <div className={cn("overflow-y-auto", className)}>{children}</div>;
}

Calendar.displayName = "Calendar"

export { Calendar }
