import React, { useState, useEffect } from 'react';
import { fetchServiceCatalog, fetchServicesForProvider } from '../lib/firestore-helpers';
import { Check, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface ServiceSelectorProps {
  selectedServices: string[]; // catalog IDs
  onChange: (ids: string[]) => void;
  providerId?: string; // filter by provider
  showPrice?: boolean;
  requireConsultation?: boolean;
  hideCategories?: string[]; // categories to exclude
  categoryOrder?: string[]; // order to display categories
  className?: string;
}

export function ServiceSelector({
  selectedServices,
  onChange,
  providerId,
  showPrice = true,
  requireConsultation = true,
  hideCategories = [],
  categoryOrder,
  className = '',
}: ServiceSelectorProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let data: any[];
        if (providerId) {
          data = await fetchServicesForProvider(providerId);
        } else {
          data = await fetchServiceCatalog();
        }
        setServices(data);
      } catch (err) {
        console.error('Failed to load service catalog:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [providerId]);

  const filtered = services.filter(s => {
    if (hideCategories.includes(s.category)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
  });

  const grouped = filtered.reduce((acc: Record<string, any[]>, s: any) => {
    const cat = s.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  const categoryLabels: Record<string, string> = {
    consultation: 'Consultations',
    vaccination: 'Vaccinations',
    lab: 'Lab Tests',
    diagnostic: 'Diagnostics',
    procedure: 'Procedures',
    grooming: 'Grooming',
    medication: 'Medications',
    supply: 'Supplies',
  };

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Initialize: expand first visible category, collapse others
  useEffect(() => {
    if (services.length > 0 && Object.keys(expandedCategories).length === 0) {
      const initial: Record<string, boolean> = {};
      const visible = (categoryOrder || Object.keys(grouped)).filter(cat => grouped[cat]);
      visible.forEach((cat, i) => { initial[cat] = i === 0; });
      setExpandedCategories(initial);
    }
  }, [services, grouped, categoryOrder]);

  const toggleService = (id: string) => {
    if (requireConsultation && isConsultation(services.find(s => s.id === id))) {
      return; // cannot remove consultation
    }
    if (selectedServices.includes(id)) {
      onChange(selectedServices.filter(s => s !== id));
    } else {
      onChange([...selectedServices, id]);
    }
  };

  const isConsultation = (service: any) => service?.category === 'consultation';

  // Auto-select consultation if required and none selected
  useEffect(() => {
    if (requireConsultation && services.length > 0) {
      const consultation = services.find(s => isConsultation(s));
      if (consultation && !selectedServices.includes(consultation.id)) {
        onChange([consultation.id, ...selectedServices]);
      }
    }
  }, [services, requireConsultation]);

  if (loading) {
    return <div className="text-sm text-gray-500 p-4">Loading services...</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search services..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Selected summary */}
      {selectedServices.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedServices.map(id => {
            const svc = services.find(s => s.id === id);
            if (!svc) return null;
            const isConsult = isConsultation(svc);
            return (
              <Badge
                key={id}
                variant={isConsult ? 'default' : 'secondary'}
                className={`text-xs cursor-${isConsult ? 'default' : 'pointer'} ${isConsult ? 'bg-blue-600' : ''}`}
                onClick={() => !isConsult && toggleService(id)}
              >
                {svc.name}
                {isConsult && <Check className="w-3 h-3 ml-1" />}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Services by category */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {(categoryOrder || Object.keys(grouped)).filter(cat => grouped[cat]).map((category: string) => {
          const isExpanded = expandedCategories[category] ?? false;
          const selectedInCategory = grouped[category].filter((s: any) => selectedServices.includes(s.id));

          return (
            <div key={category} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-semibold text-gray-700">{categoryLabels[category] || category}</h5>
                  <span className="text-xs text-gray-400">({grouped[category].length})</span>
                  {selectedInCategory.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">{selectedInCategory.length} selected</Badge>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {isExpanded && (
                <div className="p-2 space-y-1 border-t">
                  {grouped[category].map((svc: any) => {
                    const isSelected = selectedServices.includes(svc.id);
                    const isConsult = isConsultation(svc);

                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleService(svc.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{svc.name}</p>
                            {isConsult && (
                              <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">Required</Badge>
                            )}
                          </div>
                          {svc.description && (
                            <p className="text-xs text-gray-500 truncate">{svc.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {showPrice && (
                            <p className="text-sm font-bold">₱{svc.defaultPrice?.toFixed(2)}</p>
                          )}
                          {svc.durationMin && (
                            <p className="text-[10px] text-gray-400">{svc.durationMin} min</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No services found.</p>
            {providerId && <p className="text-xs mt-1">This provider has no active services in the catalog.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
