import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  color?: 'blue' | 'emerald' | 'indigo' | 'stone';
}

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  className,
  color = 'blue'
}: SearchBarProps) {
  const colors = {
    blue: {
      icon: 'text-gray-400 group-focus-within:text-blue-500',
      border: 'border-gray-100',
      shadow: 'shadow-sm',
      ring: 'focus:ring-blue-500/10 focus:border-blue-500',
      bg: 'bg-white'
    },
    emerald: {
      icon: 'text-stone-400 group-focus-within:text-emerald-500',
      border: 'border-stone-200',
      shadow: '',
      ring: 'focus:ring-emerald-500/10 focus:border-emerald-500',
      bg: 'bg-stone-50'
    },
    indigo: {
      icon: 'text-gray-400 group-focus-within:text-indigo-500',
      border: 'border-gray-100',
      shadow: 'shadow-sm',
      ring: 'focus:ring-indigo-500/10 focus:border-indigo-500',
      bg: 'bg-white'
    },
    stone: {
      icon: 'text-stone-400 group-focus-within:text-stone-500',
      border: 'border-stone-200',
      shadow: '',
      ring: 'focus:ring-stone-500/10 focus:border-stone-500',
      bg: 'bg-white'
    }
  };

  const c = colors[color];

  return (
    <div className={cn("relative group", className)}>
      <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors", c.icon)} />
      <input
        type="text"
        className={cn(
          "block w-full pl-12 pr-4 py-4 border shadow-sm rounded-xl text-base transition-all placeholder:text-gray-300",
          c.bg, c.border, c.shadow, c.ring
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function CompactSearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className,
  color = 'stone'
}: SearchBarProps) {
  const colors = {
    blue: 'text-gray-400 focus-within:text-blue-500',
    emerald: 'text-stone-400 focus-within:text-emerald-500',
    indigo: 'text-gray-400 focus-within:text-indigo-500',
    stone: 'text-stone-400 focus-within:text-stone-500'
  };

  return (
    <div className={cn("relative group", className)}>
      <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", colors[color])} />
      <input
        type="text"
        className={cn(
          "pl-9 pr-4 py-2 border rounded-lg text-sm w-40 transition-all placeholder:text-stone-400",
          "bg-stone-50 border-stone-200",
          "focus:ring-2 focus:ring-stone-500/10 focus:border-stone-500"
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}