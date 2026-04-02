import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";

interface DateFilterProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
}

export default function DateFilter({ selectedDate, onSelectDate }: DateFilterProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleClearDate = () => {
    onSelectDate(undefined);
    setShowPicker(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 transition-all shadow-sm ${
          selectedDate
            ? 'bg-primary text-primary-foreground border-primary shadow-md'
            : 'bg-card border-border hover:border-primary hover:bg-secondary'
        }`}
      >
        <CalendarDays className="size-5" />
        <div className="text-left">
          <div className="text-xs opacity-80">
            {selectedDate ? 'Filtered by' : 'Select Date'}
          </div>
          <div className="font-medium">
            {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'All Dates'}
          </div>
        </div>
        {selectedDate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearDate();
            }}
            className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </button>

      {showPicker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />
          
          {/* Date Picker Dropdown */}
          <div className="absolute top-full mt-2 left-0 z-50 bg-card border-2 border-primary rounded-xl shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Select Date</h3>
              <button
                onClick={() => setShowPicker(false)}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                onSelectDate(date);
                if (date) {
                  setShowPicker(false);
                }
              }}
            />
            {selectedDate && (
              <button
                onClick={handleClearDate}
                className="w-full mt-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                Clear Date
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
