"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  error?: boolean
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  date,
  onSelect,
  disabled,
  placeholder = "Pick a date",
  className,
  error,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-2 whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50",
            "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
            "outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
            "dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
            "w-full h-[44px] rounded-[8px] px-[14px] py-[8px] text-[14px]",
            "justify-start text-left font-normal",
            !date && "text-[#717680]",
            error ? "border-red-500" : "border-[#d5d7da]",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {date ? (
            date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          ) : (
            <span>{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onSelect?.(selectedDate)
            setOpen(false)
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
