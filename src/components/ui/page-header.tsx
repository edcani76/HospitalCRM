import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';
import { useNavigate, useLocation } from 'react-router-dom';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
  backText?: string;
  backTo?: string;
}

export function PageHeader({ title, subtitle, actions, onBack, backText, backTo }: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (location.state?.from) {
      navigate(location.state.from);
    } else if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  const getBackText = () => {
    if (backText) return backText;
    if (location.state?.backText) return location.state.backText;
    return 'Back';
  };

  return (
    <div className="mb-6">
      <Button 
        variant="ghost" 
        onClick={handleBack}
        className="mb-4 -ml-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 group transition-all"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        {getBackText()}
      </Button>
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
