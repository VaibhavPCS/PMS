import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { format, subDays, isAfter, isBefore, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { type DateRange, DayPicker } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import "react-day-picker/dist/style.css";

interface DateRangeFilterProps {
  onChange?: (startDate: string, endDate: string) => void;
  className?: string;
}

interface PresetRange {
  label: string;
  days: number;
}

const presetRanges: PresetRange[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export const DateRangeFilter = ({ onChange, className }: DateRangeFilterProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>("");

  // Initialize date range from URL or default to last 30 days
  const getInitialDateRange = (): DateRange => {
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");

    if (startParam && endParam) {
      try {
        const from = new Date(startParam);
        const to = new Date(endParam);
        
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          return { from, to };
        }
      } catch (e) {
        console.error("Invalid date in URL params", e);
      }
    }

    // Default: Last 30 days
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 30)),
      to: startOfDay(today),
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange());

  // Update URL params when date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      // Update URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.set("startDate", startDate);
      newParams.set("endDate", endDate);
      setSearchParams(newParams, { replace: true });

      // Call onChange callback
      onChange?.(startDate, endDate);

      // Clear error if dates are valid
      setError("");
    }
  }, [dateRange]);

  // Validate date range
  const validateDateRange = (range: DateRange | undefined): boolean => {
    if (!range?.from || !range?.to) {
      setError("Please select both start and end dates");
      return false;
    }

    if (isAfter(range.from, range.to)) {
      setError("End date must be after start date");
      return false;
    }

    setError("");
    return true;
  };

  // Handle preset range selection
  const handlePresetSelect = (days: number) => {
    const today = new Date();
    const newRange: DateRange = {
      from: startOfDay(subDays(today, days)),
      to: startOfDay(today),
    };

    if (validateDateRange(newRange)) {
      setDateRange(newRange);
      setOpen(false);
    }
  };

  // Handle custom range selection
  const handleRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      if (validateDateRange(range)) {
        setDateRange(range);
      }
    } else if (range?.from) {
      // Only start date selected, keep calendar open
      setDateRange(range);
    }
  };

  // Format display text
  const getDisplayText = (): string => {
    if (!dateRange?.from) return "Select date range";
    
    if (!dateRange.to) {
      return `${format(dateRange.from, "MMM dd, yyyy")} - ...`;
    }

    return `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Preset Ranges Sidebar */}
            {/* <div className="border-r p-3 space-y-1">
              <div className="text-sm font-medium mb-2">Presets</div>
              {presetRanges.map((preset) => (
                <Button
                  key={preset.days}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => handlePresetSelect(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div> */}

            {/* Calendar */}
            <div className="p-3">
              <DayPicker
                mode="range"
                selected={dateRange}
                onSelect={handleRangeSelect}
                numberOfMonths={1}
                disabled={(date) => isAfter(date, new Date())}
                modifiersClassNames={{
                  selected: "bg-blue-500 text-white hover:bg-blue-600",
                  today: "font-bold text-blue-600",
                }}
              />
              
              {/* Apply Button */}
              {dateRange?.from && dateRange?.to && (
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (validateDateRange(dateRange)) {
                        setOpen(false);
                      }
                    }}
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
