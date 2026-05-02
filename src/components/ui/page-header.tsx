import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
  backText?: string;
}

export function PageHeader({ title, subtitle, actions, onBack, backText = 'Back to Directory' }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {onBack && (
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-4 -ml-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 group transition-all"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          {backText}
        </Button>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && (
            <div className="text-gray-600 mt-1.5 text-lg">{subtitle}</div>
          )}
        </div>
        {actions && <div className="mt-4 md:mt-0 flex gap-3">{actions}</div>}
      </div>
    </div>
  );
}
