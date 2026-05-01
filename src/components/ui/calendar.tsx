import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  appointments?: { date: string }[];
}

export function Calendar({ selectedDate, onDateSelect, appointments = [] }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(startOfMonth(selectedDate));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Create a Set of appointment date strings for efficient lookup
  const appointmentDateSet = React.useMemo(() => {
    const dateSet = new Set<string>();
    appointments.forEach(apt => {
      if (apt.date) {
        dateSet.add(apt.date);
      }
    });
    return dateSet;
  }, [appointments]);

  const hasAppointment = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointmentDateSet.has(dateStr);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={previousMonth} className="hover:bg-emerald-50">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
        <Button variant="ghost" size="sm" onClick={nextMonth} className="hover:bg-emerald-50">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-bold text-stone-400 uppercase py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          const hasApt = hasAppointment(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              disabled={!isCurrentMonth}
              className={`
                relative p-2 rounded-xl text-sm transition-all
                ${!isCurrentMonth ? 'text-stone-300 cursor-default' : 'hover:bg-stone-100'}
                ${isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                ${isTodayDate && !isSelected ? 'font-bold text-emerald-600 ring-2 ring-emerald-600 ring-offset-1' : ''}
                ${hasApt && !isSelected && isCurrentMonth ? 'bg-emerald-50 font-medium ring-1 ring-emerald-200' : ''}
              `}
            >
              {format(day, 'd')}
              {hasApt && (
                <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                  isSelected ? 'bg-white' : 'bg-emerald-500'
                }`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-stone-100">
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <div className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded" />
          <span>Has appointments</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <div className="w-3 h-3 bg-emerald-600 rounded" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <div className="w-3 h-3 border-2 border-emerald-600 rounded" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
